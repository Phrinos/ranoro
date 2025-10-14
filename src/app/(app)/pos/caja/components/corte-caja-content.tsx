// src/app/(app)/pos/page.tsx

"use client";

import React, { useState, useEffect, useCallback, Suspense, lazy, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { TabbedPageLayout } from '@/components/layout/tabbed-page-layout';
import { Loader2, PlusCircle, Printer, Copy, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import type { SaleReceipt, InventoryItem, User, WorkshopInfo, ServiceRecord, CashDrawerTransaction, InitialCashBalance } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { inventoryService, saleService, serviceService, adminService } from '@/lib/services';
import { AUTH_USER_LOCALSTORAGE_KEY } from '@/lib/placeholder-data';
import { UnifiedPreviewDialog } from '@/components/shared/unified-preview-dialog';
import { TicketContent } from '@/components/ticket-content';
import { ViewSaleDialog } from './components/view-sale-dialog';
import { PaymentDetailsDialog } from '@/components/shared/PaymentDetailsDialog';
import { formatCurrency } from '@/lib/utils';
import html2canvas from 'html2canvas';
import ReactDOMServer from 'react-dom/server';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";


const VentasPosContent = lazy(() => import('./components/ventas-pos-content').then(module => ({ default: module.VentasPosContent })));
const InformePosContent = lazy(() => import('./components/informe-pos-content').then(module => ({ default: module.InformePosContent })));


function PosPageComponent({ tab }: { tab?: string }) {
  const defaultTab = tab || 'ventas';
  const { toast } = useToast();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Data states
  const [allSales, setAllSales] = useState<SaleReceipt[]>([]);
  const [allInventory, setAllInventory] = useState<InventoryItem[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allServices, setAllServices] = useState<ServiceRecord[]>([]);

  // Dialog states
  const [isReprintDialogOpen, setIsReprintDialogOpen] = useState(false);
  const [saleForReprint, setSaleForReprint] = useState<SaleReceipt | null>(null);
  const [isViewSaleDialogOpen, setIsViewSaleDialogOpen] = useState(false);
  const [viewingSale, setViewingSale] = useState<SaleReceipt | null>(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  
  const [workshopInfo, setWorkshopInfo] = useState<WorkshopInfo | null>(null);
  const ticketContentRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    setIsLoading(true);
    const authUserString = localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY);
    if (authUserString) setCurrentUser(JSON.parse(authUserString));

    const storedWorkshopInfo = localStorage.getItem('workshopTicketInfo');
    if (storedWorkshopInfo) setWorkshopInfo(JSON.parse(storedWorkshopInfo));

    const unsubs = [
      saleService.onSalesUpdate(setAllSales),
      inventoryService.onItemsUpdate(setAllInventory),
      serviceService.onServicesUpdate(setAllServices),
      adminService.onUsersUpdate((users) => {
        setAllUsers(users);
        setIsLoading(false);
      }),
    ];
    return () => unsubs.forEach(unsub => unsub());
  }, []);

  const handleReprintTicket = (sale: SaleReceipt) => {
    setSaleForReprint(sale);
    setIsReprintDialogOpen(true);
  };
  
  const handleViewSale = (sale: SaleReceipt) => {
    setViewingSale(sale);
    setIsViewSaleDialogOpen(true);
  };
  
  const handleDeleteSale = async (saleId: string) => {
    await saleService.deleteSale(saleId, currentUser);
    toast({ title: 'Venta Eliminada', description: 'La venta ha sido eliminada permanentemente.', variant: 'destructive'});
  };
  
  const handleCancelSale = async (saleId: string, reason: string) => {
    await saleService.cancelSale(saleId, reason, currentUser);
    toast({ title: 'Venta Cancelada', description: `La venta #${saleId.slice(-6)} ha sido cancelada.`});
  };
  
  const handleEditPayment = (sale: SaleReceipt) => {
    setViewingSale(sale);
    setIsPaymentDialogOpen(true);
  };
  
  const handlePaymentUpdate = async (saleId: string, paymentDetails: any) => {
    await saleService.updateSale(saleId, { payments: paymentDetails.payments });
    toast({ title: 'Pago Actualizado' });
    setIsPaymentDialogOpen(false);
  };
  
  const handleSendWhatsapp = (record: SaleReceipt | ServiceRecord) => {
     const text = `Hola, aquí está tu ticket de compra: [enlace]`;
     window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const pageActions = (
    <Button asChild>
      <Link href="/pos/nuevo"><PlusCircle className="mr-2 h-4 w-4" />Nueva Venta</Link>
    </Button>
  );

  const tabs = [
    { value: 'ventas', label: 'Historial de Ventas', content: (
        <VentasPosContent 
          allSales={allSales} 
          allInventory={allInventory}
          allUsers={allUsers}
          currentUser={currentUser}
          onReprintTicket={handleReprintTicket}
          onViewSale={handleViewSale}
          onDeleteSale={handleDeleteSale}
          onCancelSale={handleCancelSale}
          onEditPayment={handleEditPayment}
        />
    )},
    { value: 'resumen', label: 'Resumen', content: <InformePosContent allSales={allSales} allServices={allServices} allInventory={allInventory}/> },
  ];

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <Suspense fallback={<div className="flex h-64 w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <TabbedPageLayout
        title="Punto de Venta"
        description="Gestiona ventas de mostrador, revisa el historial y realiza tu corte de caja."
        activeTab={activeTab}
        onTabChange={setActiveTab}
        tabs={tabs}
        actions={pageActions}
      />

       {saleForReprint && (
        <UnifiedPreviewDialog
          open={isReprintDialogOpen}
          onOpenChange={setIsReprintDialogOpen}
          title={`Ticket Venta #${saleForReprint.id.slice(-6)}`}
          footerContent={<Button onClick={() => window.print()}><Printer className="mr-2 h-4 w-4"/>Imprimir</Button>}
        >
          <TicketContent ref={ticketContentRef} sale={saleForReprint} previewWorkshopInfo={workshopInfo || undefined} />
        </UnifiedPreviewDialog>
      )}

      {viewingSale && (
        <ViewSaleDialog
          open={isViewSaleDialogOpen}
          onOpenChange={setIsViewSaleDialogOpen}
          sale={viewingSale}
          inventory={allInventory}
          users={allUsers}
          categories={[]}
          suppliers={[]}
          onCancelSale={handleCancelSale}
          onDeleteSale={handleDeleteSale}
          onPaymentUpdate={handlePaymentUpdate}
          onSendWhatsapp={() => handleSendWhatsapp(viewingSale)}
        />
      )}
      
      {viewingSale && isPaymentDialogOpen && (
        <PaymentDetailsDialog
          open={isPaymentDialogOpen}
          onOpenChange={setIsPaymentDialogOpen}
          record={viewingSale}
          onConfirm={handlePaymentUpdate as any}
          recordType="sale"
        />
      )}
    </Suspense>
  );
}

export default function POSPageWrapper() {
  return (
    <Suspense fallback={<div className="flex h-64 w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <PosPageComponent />
    </Suspense>
  );
}
