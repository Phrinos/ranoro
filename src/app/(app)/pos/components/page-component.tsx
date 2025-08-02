

"use client";

import { useState, useMemo, useEffect, useCallback, Suspense, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { PlusCircle, Printer, Copy, MessageSquare, Share2 } from "lucide-react";
import { PrintTicketDialog } from '@/components/ui/print-ticket-dialog';
import { TicketContent } from '@/components/ticket-content';
import type { SaleReceipt, InventoryItem, WorkshopInfo, ServiceRecord, CashDrawerTransaction, InitialCashBalance } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { operationsService, inventoryService } from '@/lib/services';
import { Loader2 } from 'lucide-react';
import { cn, formatCurrency } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ViewSaleDialog } from "./view-sale-dialog";
import { writeBatch, doc } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';
import { AUTH_USER_LOCALSTORAGE_KEY } from '@/lib/placeholder-data';
import { InformePosContent } from './informe-pos-content';
import { VentasPosContent } from './ventas-pos-content';
import { CajaPosContent } from './caja-pos-content';


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
    { value: "informe", label: "Informe" },
    { value: "ventas", label: "Ventas" },
    { value: "caja", label: "Caja" },
  ];

  if (isLoading) { return <div className="flex h-[50vh] w-full items-center justify-center"><Loader2 className="mr-2 h-5 w-5 animate-spin" /><p className="text-lg ml-4">Cargando datos...</p></div>; }
  
  return (
    <>
      <div className="bg-primary text-primary-foreground rounded-lg p-6 mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Punto de Venta</h1>
        <p className="text-primary-foreground/80 mt-1">Registra ventas, gestiona tu caja y analiza el rendimiento de tus operaciones.</p>
      </div>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="w-full">
            <div className="flex flex-wrap w-full gap-2 sm:gap-4">
              {posTabs.map((tabInfo) => (
                <button
                  key={tabInfo.value}
                  onClick={() => setActiveTab(tabInfo.value)}
                  className={cn(
                    'flex-1 min-w-[30%] sm:min-w-0 text-center px-3 py-2 rounded-md transition-colors duration-200 text-sm sm:text-base',
                    'break-words whitespace-normal leading-snug',
                    activeTab === tabInfo.value
                      ? 'bg-primary text-primary-foreground shadow'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  )}
                >
                  {tabInfo.label}
                </button>
              ))}
            </div>
        </div>
        <TabsContent value="informe" className="mt-6 space-y-6">
            <InformePosContent
              allSales={allSales}
              allServices={allServices}
              allInventory={allInventory}
            />
        </TabsContent>
        <TabsContent value="ventas" className="mt-6 space-y-6">
            <VentasPosContent
              allSales={allSales}
              allInventory={allInventory}
              onReprintTicket={handleReprintSale}
              onViewSale={(sale) => { setSelectedSale(sale); setIsViewDialogOpen(true); }}
            />
        </TabsContent>
        <TabsContent value="caja" className="mt-6 space-y-6">
             <CajaPosContent
                allSales={allSales}
                allServices={allServices}
                allCashTransactions={allCashTransactions}
                initialCashBalance={initialCashBalance}
             />
        </TabsContent>
      </Tabs>
      
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

