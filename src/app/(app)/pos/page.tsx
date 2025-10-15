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

const InformePosContent = lazy(() => import('./components/informe-pos-content').then(module => ({ default: module.InformePosContent })));

function PosPageComponent({ tab }: { tab?: string }) {
  const defaultTab = tab || 'resumen';
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  
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

  useEffect(() => {
    const saleIdToShow = searchParams.get('saleId');
    if (saleIdToShow && allSales.length > 0) {
        const sale = allSales.find(s => s.id === saleIdToShow);
        if (sale) {
            handleViewSale(sale);
            // Optional: remove the query param from URL after showing
            router.replace('/pos?tab=ventas', { scroll: false });
        }
    }
  }, [searchParams, allSales, router]);


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
  
  const handleCopyTicketAsImage = useCallback(async (isForSharing: boolean = false) => {
    if (!ticketContentRef.current || !saleForReprint) return null;
    try {
        const canvas = await html2canvas(ticketContentRef.current, { scale: 2.5, backgroundColor: null, useCORS: true });
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
        if (!blob) throw new Error("No se pudo crear el blob de la imagen.");

        if (isForSharing) {
            return new File([blob], `ticket_venta_${saleForReprint.id}.png`, { type: 'image/png' });
        } else {
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
            toast({ title: "Copiado", description: "La imagen del ticket ha sido copiada." });
            return null;
        }
    } catch (e) {
        console.error("Error al manejar la imagen:", e);
        toast({ title: "Error", description: "No se pudo procesar la imagen del ticket.", variant: "destructive" });
        return null;
    }
  }, [saleForReprint, toast]);

  const handleCopyWhatsAppMessage = useCallback(() => {
    if (!saleForReprint) return;
    const message = `Hola ${saleForReprint.customerName || 'Cliente'}, aquí tienes un resumen de tu compra en ${workshopInfo?.name || 'nuestro taller'}.
Folio: ${saleForReprint.id}
Total: ${formatCurrency(saleForReprint.totalAmount)}
¡Gracias por tu preferencia!`;

    navigator.clipboard.writeText(message).then(() => {
        toast({ title: 'Mensaje Copiado', description: 'El mensaje para WhatsApp ha sido copiado.' });
    });
  }, [saleForReprint, workshopInfo, toast]);

  const handleShareTicket = async () => {
    const imageFile = await handleCopyTicketAsImage(true);
    if (imageFile && navigator.share) {
        try {
            await navigator.share({
                files: [imageFile],
                title: 'Ticket de Venta',
                text: `Ticket de tu compra en ${workshopInfo?.name || 'nuestro taller'}.`,
            });
        } catch (error) {
            if (!String(error).includes('AbortError')) {
                toast({ title: 'No se pudo compartir', description: 'Copiando texto para WhatsApp como alternativa.', variant: 'default' });
                handleCopyWhatsAppMessage();
            }
        }
    } else {
        handleCopyWhatsAppMessage();
    }
  };

  const handlePrintTicket = () => {
    requestAnimationFrame(() => setTimeout(() => window.print(), 100));
  };

  const pageActions = (
    <Button asChild>
      <Link href="/pos/nuevo"><PlusCircle className="mr-2 h-4 w-4" />Nueva Venta</Link>
    </Button>
  );

  const tabs = [
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
          footerContent={
             <div className="flex w-full justify-end gap-2">
                <TooltipProvider>
                    <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" className="h-12 w-12 bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200" onClick={() => handleCopyTicketAsImage(false)}><Copy className="h-6 w-6"/></Button></TooltipTrigger><TooltipContent><p>Copiar Imagen</p></TooltipContent></Tooltip>
                    <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" className="h-12 w-12 bg-green-100 text-green-700 border-green-200 hover:bg-green-200" onClick={handleShareTicket}><Share2 className="h-6 w-6"/></Button></TooltipTrigger><TooltipContent><p>Compartir</p></TooltipContent></Tooltip>
                    <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" className="h-12 w-12 bg-red-100 text-red-700 border-red-200 hover:bg-red-200" onClick={handlePrintTicket}><Printer className="h-6 w-6"/></Button></TooltipTrigger><TooltipContent><p>Imprimir</p></TooltipContent></Tooltip>
                </TooltipProvider>
              </div>
          }
          sale={saleForReprint}
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
