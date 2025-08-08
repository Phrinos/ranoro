

"use client";

import { useState, useMemo, useEffect, useCallback, Suspense, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { PlusCircle, Printer, Copy, MessageSquare, Share2, Wallet } from "lucide-react";
import { DocumentPreviewDialog } from '@/components/shared/DocumentPreviewDialog';
import { TicketContent } from '@/components/ticket-content';
import type { SaleReceipt, InventoryItem, WorkshopInfo, ServiceRecord, User, Payment } from '@/types'; 
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { operationsService, inventoryService, adminService, saleService } from '@/lib/services';
import { Loader2 } from 'lucide-react';
import { cn, formatCurrency } from "@/lib/utils";
import { ViewSaleDialog } from "./components/view-sale-dialog";
import { writeBatch, doc } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';
import { AUTH_USER_LOCALSTORAGE_KEY } from '@/lib/placeholder-data';
import { VentasPosContent } from './components/ventas-pos-content';
import { TabbedPageLayout } from '@/components/layout/tabbed-page-layout';
import { isToday, startOfDay, endOfDay, isWithinInterval, isValid, parseISO } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PaymentDetailsDialog } from '@/components/shared/PaymentDetailsDialog';
import type { PaymentDetailsFormValues } from '@/schemas/payment-details-form-schema';


export default function PosPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  // States for data from Firestore
  const [allSales, setAllSales] = useState<SaleReceipt[]>([]);
  const [allInventory, setAllInventory] = useState<InventoryItem[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  
  // States for UI control
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<SaleReceipt | null>(null);
  const [isReprintDialogOpen, setIsReprintDialogOpen] = useState(false);
  const [selectedSaleForReprint, setSelectedSaleForReprint] = useState<SaleReceipt | null>(null);
  const [workshopInfo, setWorkshopInfo] = useState<WorkshopInfo | null>(null);
  const ticketContentRef = useRef<HTMLDivElement>(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [saleToEditPayment, setSaleToEditPayment] = useState<SaleReceipt | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);


  useEffect(() => {
    const unsubs: (() => void)[] = [];
    setIsLoading(true);

    const authUserString = typeof window !== 'undefined' ? localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY) : null;
    if (authUserString) {
      try { setCurrentUser(JSON.parse(authUserString)); } catch (e) { console.error("Error parsing auth user", e); }
    }

    unsubs.push(saleService.onSalesUpdate(setAllSales));
    unsubs.push(inventoryService.onItemsUpdate(setAllInventory));
    unsubs.push(adminService.onUsersUpdate((users) => {
        setAllUsers(users);
        setIsLoading(false);
    }));

    const storedWorkshopInfo = localStorage.getItem('workshopTicketInfo');
    if (storedWorkshopInfo) {
      try { setWorkshopInfo(JSON.parse(storedWorkshopInfo)); } catch (e) { console.error(e); }
    }

    return () => unsubs.forEach(unsub => unsub());
  }, []);
  
  const handleCancelSale = useCallback(async (saleId: string, reason: string) => {
    try {
        await saleService.cancelSale(saleId, reason, currentUser);
        toast({ title: 'Venta Cancelada', description: 'El stock ha sido restaurado.' });
        setIsViewDialogOpen(false);
    } catch(e) {
        toast({ title: "Error", description: "No se pudo cancelar la venta.", variant: "destructive"});
    }
  }, [currentUser, toast]);

  const handleDeleteSale = useCallback(async (saleId: string) => {
    try {
        await saleService.deleteSale(saleId, currentUser);
        toast({ title: 'Venta Eliminada', description: 'La venta se ha eliminado permanentemente.' });
        setIsViewDialogOpen(false);
    } catch(e) {
        toast({ title: "Error", description: "No se pudo eliminar la venta.", variant: "destructive"});
    }
  }, [currentUser, toast]);


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
        if(!String(error).includes('AbortError')) {
           toast({ title: 'No se pudo compartir', description: 'Copiando texto para WhatsApp como alternativa.', variant: 'default' });
           handleCopySaleForWhatsapp(selectedSaleForReprint!);
        }
      }
    } else {
        // Fallback for desktop browsers that don't support navigator.share with files
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
  
  const handleOpenPaymentDialog = useCallback((sale: SaleReceipt) => {
    setSaleToEditPayment(sale);
    setIsPaymentDialogOpen(true);
  }, []);

  const handleUpdatePaymentDetails = useCallback(async (saleId: string, paymentDetails: any) => {
    await saleService.updateSale(saleId, paymentDetails);
    toast({ title: "Detalles de Pago Actualizados" });
    setIsPaymentDialogOpen(false);
  }, [toast]);
  

  if (isLoading) { return <div className="flex h-[50vh] w-full items-center justify-center"><Loader2 className="mr-2 h-5 w-5 animate-spin" /><p className="text-lg ml-4">Cargando datos...</p></div>; }
  
  return (
    <>
      <div className="bg-primary text-primary-foreground rounded-lg p-6 mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Punto de Venta</h1>
        <p className="text-primary-foreground/80 mt-1">Registra ventas y gestiona las transacciones de mostrador.</p>
      </div>
      <VentasPosContent 
        allSales={allSales} 
        allInventory={allInventory} 
        allUsers={allUsers}
        currentUser={currentUser}
        onReprintTicket={handleReprintSale} 
        onViewSale={(sale) => { setSelectedSale(sale); setIsViewDialogOpen(true); }}
        onEditPayment={handleOpenPaymentDialog}
        onDeleteSale={handleDeleteSale}
      />

      <DocumentPreviewDialog
        open={isReprintDialogOpen && !!selectedSaleForReprint}
        onOpenChange={setIsReprintDialogOpen}
        title="Reimprimir Ticket"
      >
        <div id="printable-ticket">
          {selectedSaleForReprint && <TicketContent ref={ticketContentRef} sale={selectedSaleForReprint} previewWorkshopInfo={workshopInfo || undefined} />}
        </div>
      </DocumentPreviewDialog>
      
      {selectedSale && <ViewSaleDialog
        open={isViewDialogOpen} 
        onOpenChange={setIsViewDialogOpen} 
        sale={selectedSale} 
        inventory={allInventory}
        users={allUsers}
        categories={[]}
        suppliers={[]}
        onCancelSale={handleCancelSale}
        onDeleteSale={handleDeleteSale}
        onPaymentUpdate={handleUpdatePaymentDetails} 
        onSendWhatsapp={handleCopySaleForWhatsapp} 
      />}

      {saleToEditPayment && (
        <PaymentDetailsDialog
          open={isPaymentDialogOpen}
          onOpenChange={setIsPaymentDialogOpen}
          record={saleToEditPayment}
          onConfirm={handleUpdatePaymentDetails}
          recordType="sale"
        />
      )}
    </>
  );
}
