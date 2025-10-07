
// src/app/(app)/servicios/page.tsx
"use client";
import React, { useState, useEffect, useCallback, Suspense, lazy, useRef } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
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
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const ActivosTabContent = lazy(() => import('./components/tab-activos'));
const HistorialTabContent = lazy(() => import('./components/tab-historial'));
const AgendaTabContent = lazy(() => import('./components/tab-agenda'));
const CotizacionesTabContent = lazy(() => import('./components/tab-cotizaciones'));
const PaymentDetailsDialog = lazy(() => import('@/components/shared/PaymentDetailsDialog').then(module => ({ default: module.PaymentDetailsDialog })));

const generatePublicId = (length = 16) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};


function ServiciosPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const activeTab = searchParams.get('tab') || 'activos';

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
    setIsLoading(true);

    const unsubs = [
        serviceService.onServicesUpdate(setAllServices),
        inventoryService.onVehiclesUpdate(setVehicles),
        adminService.onUsersUpdate((users) => {
          setPersonnel(users);
          setIsLoading(false);
        }),
    ];

    return () => unsubs.forEach(unsub => unsub());
  }, []);

  const handleTabChange = useCallback((tab: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.push(`${pathname}?${params.toString()}`);
  }, [searchParams, router, pathname]);
  
  const handleShowShareDialog = useCallback(async (service: ServiceRecord) => {
    let serviceToShare = { ...service };

    // Si el servicio no tiene un ID público, genéralo y guárdalo.
    // La Cloud Function se encargará de la sincronización.
    if (!serviceToShare.publicId) {
      try {
        toast({ title: "Generando enlace público..." });
        const newPublicId = generatePublicId();
        await serviceService.updateService(service.id, { publicId: newPublicId });
        serviceToShare.publicId = newPublicId; // Actualiza el objeto local
      } catch (error) {
        console.error("Error generating public link:", error);
        toast({
          title: "Error al crear enlace",
          description: "No se pudo generar el enlace público para compartir.",
          variant: "destructive"
        });
        return; // Detener si falla la actualización
      }
    }
  
    setRecordForSharing(serviceToShare);
    setIsShareDialogOpen(true);

  }, [toast]);

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
        const canvas = await html2canvas(ticketContentRef.current, { scale: 2.5, backgroundColor: null, useCORS: true });
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
    requestAnimationFrame(() => setTimeout(() => window.print(), 100));
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  const pageActions = (
    <Button asChild className="w-full sm:w-auto">
      <Link href="/servicios/nuevo">
        <PlusCircle className="mr-2 h-4 w-4" /> Nuevo Servicio
      </Link>
    </Button>
  );

  const tabs = [
    { value: 'activos', label: 'Activos', content: <ActivosTabContent allServices={allServices} vehicles={vehicles} personnel={personnel} onShowShareDialog={handleShowShareDialog} onCompleteService={handleOpenCompletionDialog} currentUser={currentUser} onDelete={handleDeleteService} onShowTicket={handleShowTicketDialog}/> },
    { value: 'agenda', label: 'Agenda', content: <AgendaTabContent services={allServices.filter(s => s.status === 'Agendado')} vehicles={vehicles} personnel={personnel} onShowPreview={handleShowShareDialog} /> },
    { value: 'cotizaciones', label: 'Cotizaciones', content: <CotizacionesTabContent services={allServices.filter(s => s.status === 'Cotizacion')} vehicles={vehicles} personnel={personnel} onShowShareDialog={handleShowShareDialog} currentUser={currentUser} onDelete={handleDeleteService}/> },
    { value: 'historial', label: 'Historial', content: <HistorialTabContent services={allServices.filter(s => s.status === 'Entregado' || s.status === 'Cancelado')} vehicles={vehicles} personnel={personnel} onShowShareDialog={handleShowShareDialog} currentUser={currentUser} onDelete={handleDeleteService} onShowTicket={handleShowTicketDialog} /> }
  ];

  return (
    <Suspense fallback={<div className="flex h-64 w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
        <div className="bg-primary text-primary-foreground rounded-lg p-6 mb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Gestión de Servicios</h1>
                    <p className="text-primary-foreground/80 mt-1">Planifica, gestiona y consulta todo el ciclo de vida de los servicios.</p>
                </div>
            </div>
        </div>

        <TabbedPageLayout
            title=""
            description=""
            activeTab={activeTab}
            onTabChange={handleTabChange}
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
                service={serviceForTicket}
                footerContent={
                  <div className="flex w-full justify-end gap-2">
                    <TooltipProvider>
                        <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" className="h-12 w-12 bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200" onClick={() => handleCopyTicketAsImage(false)}><Copy className="h-6 w-6"/></Button></TooltipTrigger><TooltipContent><p>Copiar Imagen</p></TooltipContent></Tooltip>
                        <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" className="h-12 w-12 bg-green-100 text-green-700 border-green-200 hover:bg-green-200" onClick={handleShareTicket}><Share2 className="h-6 w-6"/></Button></TooltipTrigger><TooltipContent><p>Compartir</p></TooltipContent></Tooltip>
                        <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" className="h-12 w-12 bg-red-100 text-red-700 border-red-200 hover:bg-red-200" onClick={handlePrintTicket}><Printer className="h-6 w-6"/></Button></TooltipTrigger><TooltipContent><p>Imprimir</p></TooltipContent></Tooltip>
                    </TooltipProvider>
                  </div>
                }
              >
                <TicketContent 
                  ref={ticketContentRef}
                  service={serviceForTicket} 
                  vehicle={vehicles.find(v => v.id === serviceForTicket.vehicleId)}
                  previewWorkshopInfo={workshopInfo || undefined} 
                />
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
