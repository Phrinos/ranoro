// src/app/(app)/servicios/page.tsx
"use client";
import React, { useState, useEffect, useCallback, Suspense, lazy, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { TabbedPageLayout } from '@/components/layout/tabbed-page-layout';
import { Loader2, PlusCircle, Printer, Copy, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import type { ServiceRecord, Vehicle, User, WorkshopInfo } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { inventoryService, adminService, serviceService } from '@/lib/services';
import { AUTH_USER_LOCALSTORAGE_KEY } from '@/lib/placeholder-data';
import { writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';
import { ShareServiceDialog } from '@/components/shared/ShareServiceDialog';
import { UnifiedPreviewDialog } from '@/components/shared/unified-preview-dialog';
import { TicketContent } from '@/components/ticket-content';
import { formatCurrency } from '@/lib/utils';
import html2canvas from 'html2canvas';
import ReactDOMServer from 'react-dom/server';

const ActivosTabContent = lazy(() => import('./components/tab-activos'));
const HistorialTabContent = lazy(() => import('./components/tab-historial'));
const AgendaTabContent = lazy(() => import('./components/tab-agenda'));
const CotizacionesTabContent = lazy(() => import('./components/tab-cotizaciones'));
const PaymentDetailsDialog = lazy(() => import('@/components/shared/PaymentDetailsDialog').then(module => ({ default: module.PaymentDetailsDialog })));

function ServiciosPage() {
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab');
  const { toast } = useToast();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(tab || 'activos');

  const [allServices, setAllServices] = useState<ServiceRecord[]>([]);
  
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [personnel, setPersonnel] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [recordForSharing, setRecordForSharing] = useState<ServiceRecord | null>(null);
  
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [serviceToComplete, setServiceToComplete] = useState<ServiceRecord | null>(null);

  const [isTicketDialogOpen, setIsTicketDialogOpen] = useState(false);
  const [serviceForTicket, setServiceForTicket] = useState<ServiceRecord | null>(null);
  const ticketContentRef = useRef<HTMLDivElement>(null);
  const [workshopInfo, setWorkshopInfo] = useState<WorkshopInfo | null>(null);


  useEffect(() => {
    const authUserString = typeof window !== 'undefined' ? localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY) : null;
    if (authUserString) {
      try { setCurrentUser(JSON.parse(authUserString)); } catch (e) { console.error("Error parsing auth user", e); }
    }
    
    const storedWorkshopInfo = localStorage.getItem('workshopTicketInfo');
    if (storedWorkshopInfo) {
      try { setWorkshopInfo(JSON.parse(storedWorkshopInfo)); } catch (e) { console.error(e); }
    }

    const unsubs = [
        serviceService.onServicesUpdate((services) => {
            setAllServices(services);
            setIsLoading(false);
        }),
        inventoryService.onVehiclesUpdate(setVehicles),
        adminService.onUsersUpdate(setPersonnel),
    ];
    
    return () => unsubs.forEach((unsub) => unsub());
  }, []);

  const handleShowShareDialog = useCallback((service: ServiceRecord) => {
    setRecordForSharing(service);
    setIsShareDialogOpen(true);
  }, []);

  const handleShowTicketDialog = useCallback((service: ServiceRecord) => {
    setServiceForTicket(service);
    setIsTicketDialogOpen(true);
  }, []);

  const handleOpenCompletionDialog = useCallback((service: ServiceRecord) => {
    setServiceToComplete(service);
    setIsPaymentDialogOpen(true);
  }, []);
  
  const handleConfirmCompletion = useCallback(async (service: ServiceRecord, paymentDetails: any, nextServiceInfo?: any) => {
    if(!db) return toast({ title: "Error de base de datos", variant: "destructive"});
    try {
      const batch = writeBatch(db);
      await serviceService.completeService(service, { ...paymentDetails, nextServiceInfo }, batch);
      await batch.commit();
      toast({ title: "Servicio Completado" });
      const updatedService = { ...service, ...paymentDetails, status: 'Entregado', deliveryDateTime: new Date().toISOString() } as ServiceRecord;
      setRecordForSharing(updatedService);
      setIsShareDialogOpen(true);
    } catch (e) {
      toast({ title: "Error", description: "No se pudo completar el servicio.", variant: "destructive"});
    } finally {
      setIsPaymentDialogOpen(false);
    }
  }, [toast]);
  
  const handleDeleteService = async (serviceId: string) => {
    try {
        await serviceService.deleteService(serviceId);
        toast({ title: "Servicio Eliminado", description: `El registro ha sido eliminado permanentemente.` });
    } catch(e) {
        toast({ title: "Error al Eliminar", description: `No se pudo eliminar el servicio. ${e instanceof Error ? e.message : ''}`, variant: "destructive"});
    }
  };

  const handleCopyTicketAsImage = useCallback(async (isForSharing: boolean = false) => {
    if (!ticketContentRef.current || !serviceForTicket) return null;
    try {
        const canvas = await html2canvas(ticketContentRef.current, { scale: 2.5, backgroundColor: null });
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
        if (!blob) throw new Error("No se pudo crear el blob de la imagen.");

        if (isForSharing) {
            return new File([blob], `ticket_servicio_${serviceForTicket.id}.png`, { type: 'image/png' });
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
  }, [serviceForTicket, toast]);
  
  const handleCopyWhatsAppMessage = useCallback(() => {
    if (!serviceForTicket) return;
    const vehicle = vehicles.find(v => v.id === serviceForTicket.vehicleId);
    const message = `Hola ${serviceForTicket.customerName || 'Cliente'}, aquí tienes un resumen de tu servicio en ${workshopInfo?.name || 'nuestro taller'}.
Folio: ${serviceForTicket.id}
Vehículo: ${vehicle ? `${vehicle.make} ${vehicle.model} (${vehicle.licensePlate})` : serviceForTicket.vehicleIdentifier}
Total: ${formatCurrency(serviceForTicket.totalCost)}
¡Gracias por tu preferencia!`;

    navigator.clipboard.writeText(message).then(() => {
        toast({ title: 'Mensaje Copiado', description: 'El mensaje para WhatsApp ha sido copiado.' });
    });
  }, [serviceForTicket, vehicles, workshopInfo, toast]);

  const handleShareTicket = async () => {
    const imageFile = await handleCopyTicketAsImage(true);
    if (imageFile && navigator.share) {
        try {
            await navigator.share({
                files: [imageFile],
                title: 'Ticket de Servicio',
                text: `Ticket de tu servicio en ${workshopInfo?.name || 'nuestro taller'}.`,
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
    const content = document.querySelector('.ticket-preview-content')?.innerHTML;
    if (!content) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`<html><head><title>Imprimir Ticket</title><style>@media print{ @page { size: 80mm auto; margin: 2mm; } body { margin: 0; } }</style></head><body onload="window.print();window.close()">${content}</body></html>`);
    printWindow.document.close();
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  const pageActions = (
    <Button asChild>
      <Link href="/servicios/nuevo">
        <PlusCircle className="mr-2 h-4 w-4" /> Nuevo Servicio
      </Link>
    </Button>
  );

  const tabs = [
    { value: 'activos', label: 'Activos', content: <ActivosTabContent allServices={allServices} vehicles={vehicles} personnel={personnel} onShowShareDialog={handleShowShareDialog} onCompleteService={handleOpenCompletionDialog} currentUser={currentUser} onDelete={handleDeleteService} onShowTicket={handleShowTicketDialog}/> },
    { value: 'agenda', label: 'Agenda', content: <AgendaTabContent services={allServices} vehicles={vehicles} personnel={personnel} onShowPreview={handleShowShareDialog} /> },
    { value: 'cotizaciones', label: 'Cotizaciones', content: <CotizacionesTabContent services={allServices} vehicles={vehicles} personnel={personnel} onShowShareDialog={handleShowShareDialog} currentUser={currentUser} onDelete={handleDeleteService}/> },
    { value: 'historial', label: 'Historial', content: <HistorialTabContent services={allServices} vehicles={vehicles} personnel={personnel} onShowShareDialog={handleShowShareDialog} currentUser={currentUser} onDelete={handleDeleteService} /> }
  ];

  return (
    <Suspense fallback={<div className="flex h-64 w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
        <TabbedPageLayout
            title="Gestión de Servicios"
            description="Planifica, gestiona y consulta todo el ciclo de vida de los servicios."
            activeTab={activeTab}
            onTabChange={setActiveTab}
            tabs={tabs}
            actions={pageActions}
        />
        <Suspense fallback={null}>
            {recordForSharing && (
            <ShareServiceDialog 
                open={isShareDialogOpen} 
                onOpenChange={setIsShareDialogOpen} 
                service={recordForSharing}
                vehicle={vehicles.find(v => v.id === recordForSharing.vehicleId)}
            />
            )}
            {serviceToComplete && (
            <PaymentDetailsDialog
                open={isPaymentDialogOpen}
                onOpenChange={setIsPaymentDialogOpen}
                record={serviceToComplete}
                onConfirm={(id, details) => handleConfirmCompletion(serviceToComplete, details, serviceToComplete.nextServiceInfo)}
                recordType="service"
                isCompletionFlow={true}
            />
            )}
            {serviceForTicket && (
              <UnifiedPreviewDialog
                open={isTicketDialogOpen}
                onOpenChange={setIsTicketDialogOpen}
                title="Ticket de Servicio"
                documentType="text"
                textContent={ReactDOMServer.renderToString(
                    <div ref={ticketContentRef} className="ticket-preview-content">
                        <TicketContent 
                            service={serviceForTicket} 
                            vehicle={vehicles.find(v => v.id === serviceForTicket.vehicleId)}
                            previewWorkshopInfo={workshopInfo || undefined} 
                        />
                    </div>
                )}
              >
                 <div className="flex flex-col sm:flex-row gap-2 w-full justify-end">
                    <Button variant="outline" onClick={() => handleCopyTicketAsImage(false)}><Copy className="mr-2 h-4 w-4"/>Copiar Imagen</Button>
                    <Button variant="outline" onClick={handleShareTicket} className="bg-green-100 text-green-800 border-green-200 hover:bg-green-200"><Share2 className="mr-2 h-4 w-4"/>Compartir</Button>
                    <Button onClick={handlePrintTicket}><Printer className="mr-2 h-4 w-4"/>Imprimir</Button>
                </div>
              </UnifiedPreviewDialog>
            )}
        </Suspense>
    </Suspense>
  );
}

export default function ServiciosPageWrapper() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-64"><p>Cargando...</p></div>}>
      <ServiciosPage />
    </Suspense>
  );
}
