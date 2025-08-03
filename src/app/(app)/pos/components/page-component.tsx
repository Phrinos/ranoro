

"use client";

import { useState, useMemo, useEffect, useCallback, Suspense, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { PlusCircle, Printer, Copy, MessageSquare, Share2, Wallet } from "lucide-react";
import { PrintTicketDialog } from '@/components/ui/print-ticket-dialog';
import { TicketContent } from '@/components/ticket-content';
import type { SaleReceipt, InventoryItem, WorkshopInfo, ServiceRecord, CashDrawerTransaction, InitialCashBalance } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from 'next/navigation';
import { operationsService, inventoryService } from '@/lib/services';
import { Loader2 } from 'lucide-react';
import { cn, formatCurrency } from "@/lib/utils";
import { ViewSaleDialog } from "./view-sale-dialog";
import { writeBatch, doc } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';
import { AUTH_USER_LOCALSTORAGE_KEY } from '@/lib/placeholder-data';
import { InformePosContent } from './informe-pos-content';
import { VentasPosContent } from './ventas-pos-content';
import { CajaPosContent } from './caja-pos-content';
import { TabbedPageLayout } from '@/components/layout/tabbed-page-layout';
import { isToday, startOfDay, endOfDay, isWithinInterval, isValid, parseISO } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';


export function PosPageComponent({ tab }: { tab?: string }) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState(tab || 'informe');
  const [isLoading, setIsLoading] = useState(true);

  // States for data from Firestore
  const [allSales, setAllSales] = useState<SaleReceipt[]>([]);
  const [allInventory, setAllInventory] = useState<InventoryItem[]>([]);
  const [allServices, setAllServices] = useState<ServiceRecord[]>([]);
  const [allCashTransactions, setAllCashTransactions] = useState<CashDrawerTransaction[]>([]);
  const [initialCashBalance, setInitialCashBalance] = useState<InitialCashBalance | null>(null);
  
  // States for UI control
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<SaleReceipt | null>(null);
  const [isReprintDialogOpen, setIsReprintDialogOpen] = useState(false);
  const [selectedSaleForReprint, setSelectedSaleForReprint] = useState<SaleReceipt | null>(null);
  const [workshopInfo, setWorkshopInfo] = useState<WorkshopInfo | null>(null);
  const ticketContentRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    const unsubs: (() => void)[] = [];
    setIsLoading(true);

    unsubs.push(operationsService.onSalesUpdate(setAllSales));
    unsubs.push(inventoryService.onItemsUpdate(setAllInventory));
    unsubs.push(operationsService.onServicesUpdate(setAllServices));
    unsubs.push(operationsService.onCashTransactionsUpdate(setAllCashTransactions));
    unsubs.push(operationsService.onInitialCashBalanceUpdate((data) => {
        setInitialCashBalance(data);
        setIsLoading(false);
    }));

    const storedWorkshopInfo = localStorage.getItem('workshopTicketInfo');
    if (storedWorkshopInfo) {
      try { setWorkshopInfo(JSON.parse(storedWorkshopInfo)); } catch (e) { console.error(e); }
    }

    return () => unsubs.forEach(unsub => unsub());
  }, []);
  
  const totalCashBalanceToday = useMemo(() => {
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());
    const interval = { start: todayStart, end: todayEnd };

    const balanceDoc = (initialCashBalance && isSameDay(parseISO(initialCashBalance.date), todayStart)) ? initialCashBalance : null;
    const initialBalance = balanceDoc?.amount || 0;
    
    const salesToday = allSales.filter(s => s.status !== 'Cancelado' && isValid(parseISO(s.saleDate)) && isWithinInterval(parseISO(s.saleDate), interval));
    const servicesToday = allServices.filter(s => s.status === 'Entregado' && s.deliveryDateTime && isValid(parseISO(s.deliveryDateTime)) && isWithinInterval(parseISO(s.deliveryDateTime), interval));
    
    const cashFromSales = salesToday
        .filter(s => s.paymentMethod?.includes('Efectivo'))
        .reduce((sum, s) => sum + (s.paymentMethod === 'Efectivo' ? s.totalAmount : s.amountInCash || 0), 0);
    const cashFromServices = servicesToday
        .filter(s => s.paymentMethod?.includes('Efectivo'))
        .reduce((sum, s) => sum + (s.paymentMethod === 'Efectivo' ? (s.totalCost || 0) : s.amountInCash || 0), 0);
    const totalCashOperations = cashFromSales + cashFromServices;
    
    const cashInManual = allCashTransactions.filter(t => t.type === 'Entrada' && isWithinInterval(parseISO(t.date), interval)).reduce((sum, t) => sum + t.amount, 0);
    const cashOutManual = allCashTransactions.filter(t => t.type === 'Salida' && isWithinInterval(parseISO(t.date), interval)).reduce((sum, t) => sum + t.amount, 0);

    return initialBalance + totalCashOperations + cashInManual - cashOutManual;
  }, [allSales, allServices, allCashTransactions, initialCashBalance]);

  const handleCancelSale = useCallback(async (saleId: string, reason: string) => {
    if (!db) return;
    const saleToCancel = allSales.find(s => s.id === saleId);
    if (!saleToCancel || saleToCancel.status === 'Cancelado') return;
    
    const authUserString = localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY);
    const currentUser: User | null = authUserString ? JSON.parse(authUserString) : null;
    
    const batch = writeBatch(db);
    // Restore stock
    saleToCancel.items.forEach(item => {
        const invItem = allInventory.find(i => i.id === item.inventoryItemId);
        if (invItem && !invItem.isService) {
            const itemRef = doc(db, 'inventory', item.inventoryItemId);
            batch.update(itemRef, { quantity: invItem.quantity + item.quantity });
        }
    });
    
    // Update sale status
    const saleRef = doc(db, 'sales', saleId);
    batch.update(saleRef, { status: 'Cancelado', cancellationReason: reason, cancelledBy: currentUser?.name || 'Sistema' });

    await batch.commit();
    toast({ title: 'Venta Cancelada', description: 'El stock ha sido restaurado.' });
    setIsViewDialogOpen(false);
  }, [allSales, allInventory, toast]);

  const handleReprintSale = useCallback((sale: SaleReceipt) => { setSelectedSaleForReprint(sale); setIsReprintDialogOpen(true); }, []);
  
  const handleCopyAsImage = useCallback(async (isForSharing: boolean = false) => {
    if (!ticketContentRef.current || !selectedSaleForReprint) return null;
    const html2canvas = (await import('html2canvas')).default;
    try {
      const canvas = await html2canvas(ticketContentRef.current, { scale: 2.5, backgroundColor: null });
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error("Could not create blob from canvas.");
      
      if (isForSharing) {
        return new File([blob], `ticket_${selectedSaleForReprint.id}.png`, { type: 'image/png' });
      } else {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        toast({ title: "Copiado", description: "La imagen ha sido copiada." });
        return null;
      }
    } catch (e) {
      console.error('Error handling image:', e);
      toast({ title: "Error", description: "No se pudo procesar la imagen del ticket.", variant: "destructive" });
      return null;
    }
  }, [selectedSaleForReprint, toast]);
  
  const handleShare = async () => {
    const imageFile = await handleCopyAsImage(true);
    if (imageFile && navigator.share) {
      try {
        await navigator.share({
          files: [imageFile],
          title: 'Ticket de Venta',
          text: `Ticket de tu compra en ${workshopInfo?.name || 'nuestro taller'}.`,
        });
      } catch (error) {
        console.error('Error sharing:', error);
        if(!String(error).includes('AbortError')) {
           toast({ title: 'Error al compartir', variant: 'destructive' });
        }
      }
    } else {
        handleCopySaleForWhatsapp(selectedSaleForReprint!);
    }
  };

  const handlePrint = () => {
    requestAnimationFrame(() => setTimeout(() => window.print(), 100));
  };

  const handleCopySaleForWhatsapp = useCallback((sale: SaleReceipt) => {
    const workshopName = workshopInfo?.name || 'nuestro taller';
    const message = `Hola ${sale.customerName || 'Cliente'}, aquí tienes los detalles de tu compra en ${workshopName}.
Folio de Venta: ${sale.id}
Total: ${formatCurrency(sale.totalAmount)}
¡Gracias por tu preferencia!`;

    navigator.clipboard.writeText(message).then(() => {
      toast({ title: 'Mensaje Copiado', description: 'El mensaje para WhatsApp ha sido copiado.' });
    });
  }, [toast, workshopInfo]);
  
  const posTabs = [
    { value: "informe", label: "Informe", content: <InformePosContent allSales={allSales} allServices={allServices} allInventory={allInventory} /> },
    { value: "ventas", label: "Ventas", content: <VentasPosContent allSales={allSales} allInventory={allInventory} onReprintTicket={handleReprintSale} onViewSale={(sale) => { setSelectedSale(sale); setIsViewDialogOpen(true); }} /> },
    { value: "movimientos", label: "Movimientos", content: <CajaPosContent allSales={allSales} allServices={allServices} allCashTransactions={allCashTransactions} initialCashBalance={initialCashBalance} /> },
  ];

  if (isLoading) { return <div className="flex h-[50vh] w-full items-center justify-center"><Loader2 className="mr-2 h-5 w-5 animate-spin" /><p className="text-lg ml-4">Cargando datos...</p></div>; }
  
  return (
    <>
      <Card className="mb-6 bg-secondary/50 border-secondary">
        <CardHeader>
            <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2 text-primary">
                    <Wallet className="h-6 w-6"/>
                    Caja (Hoy)
                </CardTitle>
                <span className="text-2xl font-bold text-primary">{formatCurrency(totalCashBalanceToday)}</span>
            </div>
        </CardHeader>
      </Card>
    
      <TabbedPageLayout
        title="Punto de Venta"
        description="Registra ventas, gestiona tu caja y analiza el rendimiento de tus operaciones."
        activeTab={activeTab}
        onTabChange={setActiveTab}
        tabs={posTabs}
      />
      
      <PrintTicketDialog
        open={isReprintDialogOpen && !!selectedSaleForReprint}
        onOpenChange={setIsReprintDialogOpen}
        title="Reimprimir Ticket"
        footerActions={<>
          <Button onClick={() => handleCopyAsImage()} className="w-full bg-white hover:bg-gray-100 text-black border"><Copy className="mr-2 h-4 w-4"/>Copiar Imagen</Button>
          <Button onClick={handleShare} className="w-full bg-green-100 hover:bg-green-200 text-green-800"><Share2 className="mr-2 h-4 w-4" /> Compartir</Button>
          <Button onClick={handlePrint} className="w-full"><Printer className="mr-2 h-4 w-4"/>Imprimir</Button>
        </>}
      >
        <div id="printable-ticket">
          {selectedSaleForReprint && <TicketContent ref={ticketContentRef} sale={selectedSaleForReprint} previewWorkshopInfo={workshopInfo || undefined} />}
        </div>
      </PrintTicketDialog>
      
      {selectedSale && <ViewSaleDialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen} sale={selectedSale} onCancelSale={handleCancelSale} onSendWhatsapp={handleCopySaleForWhatsapp} />}
    </>
  );
}
