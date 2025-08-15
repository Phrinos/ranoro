

"use client";

import { useState, useMemo, useEffect, useCallback, Suspense, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { PlusCircle, Printer, Copy, MessageSquare, Share2, Wallet } from "lucide-react";
import { TicketContent } from '@/components/ticket-content';
import type { SaleReceipt, InventoryItem, WorkshopInfo, ServiceRecord, CashDrawerTransaction, InitialCashBalance, User, Payment } from '@/types'; 
import { useToast } from "@/hooks/use-toast";
import { useRouter } from 'next/navigation';
import { operationsService, inventoryService, adminService, saleService } from '@/lib/services';
import { Loader2 } from 'lucide-react';
import { cn, formatCurrency } from "@/lib/utils";
import { writeBatch, doc } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';
import { AUTH_USER_LOCALSTORAGE_KEY } from '@/lib/placeholder-data';
import { VentasPosContent } from './components/ventas-pos-content';
import { TabbedPageLayout } from '@/components/layout/tabbed-page-layout';
import { isToday, startOfDay, endOfDay, isWithinInterval, isValid, parseISO } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { PaymentDetailsFormValues } from '@/schemas/payment-details-form-schema';
import { UnifiedPreviewDialog } from '@/components/shared/unified-preview-dialog';
import ReactDOMServer from 'react-dom/server';

export default function PosPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);

  // States for data from Firestore
  const [allSales, setAllSales] = useState<SaleReceipt[]>([]);
  const [allInventory, setAllInventory] = useState<InventoryItem[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allCategories, setAllCategories] = useState<any[]>([]);
  const [allSuppliers, setAllSuppliers] = useState<any[]>([]);
  
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
    unsubs.push(inventoryService.onCategoriesUpdate(setAllCategories));
    unsubs.push(inventoryService.onSuppliersUpdate(setAllSuppliers));
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
  
  const handleCopyServiceForWhatsapp = useCallback((sale: SaleReceipt) => {
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

  const handleUpdatePaymentDetails = useCallback(async (saleId: string, paymentDetails: PaymentDetailsFormValues) => {
    await saleService.updateSale(saleId, { payments: paymentDetails.payments });
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
        onCancelSale={handleCancelSale}
      />
      
      {selectedSaleForReprint && (
          <UnifiedPreviewDialog
            open={isReprintDialogOpen}
            onOpenChange={setIsReprintDialogOpen}
            title="Reimprimir Ticket"
            documentType="text"
            textContent={
              ReactDOMServer.renderToString(
                <TicketContent sale={selectedSaleForReprint} previewWorkshopInfo={workshopInfo || undefined} />
              )
            }
          />
      )}
      
      {selectedSale && <ViewSaleDialog
        open={isViewDialogOpen} 
        onOpenChange={setIsViewDialogOpen} 
        sale={selectedSale} 
        inventory={allInventory}
        users={allUsers}
        categories={allCategories}
        suppliers={allSuppliers}
        onCancelSale={handleCancelSale}
        onDeleteSale={handleDeleteSale}
        onPaymentUpdate={handleUpdatePaymentDetails as any} 
        onSendWhatsapp={handleCopyServiceForWhatsapp} 
      />}
    </>
  );
}
