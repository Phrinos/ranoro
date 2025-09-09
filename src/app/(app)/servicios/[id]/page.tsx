
// src/app/(app)/servicios/[id]/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { serviceService, inventoryService, adminService } from '@/lib/services';
import { Loader2, Share2, Save, Ban, Trash2, Printer, Copy } from 'lucide-react';
import { ServiceForm } from '../components/ServiceForm';
import type { ServiceRecord, Vehicle, User, InventoryItem, ServiceTypeRecord, InventoryCategory, Supplier, QuoteRecord } from '@/types'; 
import type { VehicleFormValues } from '../../vehiculos/components/vehicle-form';
import type { ServiceFormValues } from '@/schemas/service-form';
import { PageHeader } from '@/components/page-header';
import { AUTH_USER_LOCALSTORAGE_KEY } from '@/lib/placeholder-data';
import { ShareServiceDialog } from '@/components/shared/ShareServiceDialog';
import { Button } from '@/components/ui/button';
import { UnifiedPreviewDialog } from '@/components/shared/unified-preview-dialog';
import { TicketContent } from '@/components/ticket-content';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import html2canvas from 'html2canvas';
import { formatCurrency } from '@/lib/utils';
import { PaymentDetailsDialog } from '@/components/shared/PaymentDetailsDialog';
import type { PaymentDetailsFormValues } from '@/schemas/payment-details-form-schema';
import { writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';


export default function ServicioPage() {
  const { toast } = useToast(); 
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams()
  const serviceId = params.id as string | undefined;

  const [initialData, setInitialData] = useState<ServiceRecord | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceTypeRecord[]>([]);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [serviceHistory, setServiceHistory] = useState<ServiceRecord[]>([]);
  
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isTicketDialogOpen, setIsTicketDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [recordForPreview, setRecordForPreview] = useState<ServiceRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const ticketContentRef = React.useRef<HTMLDivElement>(null);


  const isEditMode = serviceId !== 'nuevo';
  const isQuoteModeParam = searchParams.get('mode') === 'quote';

  useEffect(() => {
    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [
              vehiclesData, usersData, inventoryData,
              serviceTypesData, categoriesData, suppliersData, allServicesData
            ] = await Promise.all([
              inventoryService.onVehiclesUpdatePromise(),
              adminService.onUsersUpdatePromise(),
              inventoryService.onItemsUpdatePromise(),
              inventoryService.onServiceTypesUpdatePromise(),
              inventoryService.onCategoriesUpdatePromise(),
              inventoryService.onSuppliersUpdatePromise(),
              serviceService.onServicesUpdatePromise(),
            ]);
            
            setVehicles(vehiclesData);
            setUsers(usersData);
            setInventoryItems(inventoryData);
            setServiceTypes(serviceTypesData);
            setCategories(categoriesData);
            setSuppliers(suppliersData);
            setServiceHistory(allServicesData);
            
            if (isEditMode && serviceId) {
                const serviceData = await serviceService.getDocById('serviceRecords', serviceId);
                if (!serviceData) {
                  toast({ title: 'Error', description: 'Servicio no encontrado.', variant: 'destructive' });
                  router.push('/servicios/historial');
                  return;
                }
                setInitialData(serviceData);
                setRecordForPreview(serviceData); // Pre-load data for preview
            } else {
                const authUserString = typeof window !== 'undefined' ? localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY) : null;
                const currentUser = authUserString ? JSON.parse(authUserString) : null;

                setInitialData({
                    status: 'Cotizacion',
                    serviceDate: new Date(),
                    ...(currentUser && {
                        serviceAdvisorId: currentUser.id,
                        serviceAdvisorName: currentUser.name,
                        serviceAdvisorSignatureDataUrl: currentUser.signatureDataUrl,
                    }),
                } as ServiceRecord);
            }

        } catch (error) {
            console.error("Error fetching data:", error);
            toast({ title: 'Error', description: 'No se pudieron cargar los datos.', variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    fetchData();
  }, [serviceId, isEditMode, isQuoteModeParam, router, toast]);
  
  const handleShowShareDialog = useCallback((service: ServiceRecord) => {
    setRecordForPreview(service);
    setIsShareDialogOpen(true);
  }, []);
  
  const handleShowTicketDialog = useCallback((service: ServiceRecord) => {
    setRecordForPreview(service); 
    setIsTicketDialogOpen(true);
  }, []);

  const handleSaveService = async (values: ServiceFormValues) => {
    setIsSubmitting(true);
    try {
      const savedRecord = await serviceService.saveService(values as ServiceRecord);
      toast({ title: 'Registro Creado', description: `El registro #${savedRecord.id.slice(-6)} se ha guardado.` });
      
      const targetTab = savedRecord.status === 'Cotizacion' ? 'cotizaciones' : 'activos';
      router.push(`/servicios?tab=${targetTab}`);
        
    } catch(e) {
      console.error(e);
      toast({ title: 'Error al Registrar', variant: 'destructive'});
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleUpdateService = async (values: ServiceFormValues) => {
    if (!initialData) return;
    setIsSubmitting(true);
    try {
      await serviceService.saveService({ ...values, id: serviceId });
      toast({ title: 'Servicio Actualizado', description: `El registro #${serviceId?.slice(-6)} ha sido actualizado.` });
      router.push(`/servicios?tab=activos`);
    } catch(e) {
      console.error(e);
      toast({ title: 'Error al Actualizar', variant: 'destructive'});
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleCompleteService = (values: ServiceFormValues) => {
    setInitialData(values as ServiceRecord);
    setIsPaymentDialogOpen(true);
  };
  
  const handleConfirmPayment = async (recordId: string, paymentDetails: PaymentDetailsFormValues) => {
    if (!initialData) return;
    setIsSubmitting(true);
    try {
      const batch = writeBatch(db);
      await serviceService.completeService(initialData, paymentDetails, batch);
      await batch.commit();
      
      toast({
        title: "Servicio Completado",
        description: `El servicio #${recordId.slice(-6)} ha sido completado y cobrado.`,
      });
      setIsPaymentDialogOpen(false);
      router.push('/servicios?tab=historial');
    } catch (e: any) {
      console.error("Error al completar el servicio:", e);
      toast({
        title: "Error al Completar",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleVehicleCreated = async (data: VehicleFormValues) => {
      await inventoryService.addVehicle(data);
      toast({ title: "Vehículo Creado" });
  };

  const handleCancelService = async () => {
      if (!initialData?.id) return;
      // Removed prompt, reason will be handled by the service
      await serviceService.cancelService(initialData.id, "Cancelado desde el panel");
      toast({ title: "Servicio Cancelado" });
      router.push('/servicios?tab=historial');
  };
  
  const handleDeleteQuote = async () => {
      if (!initialData?.id) return;
      await serviceService.deleteService(initialData.id);
      toast({ title: "Cotización Eliminada", variant: "destructive" });
      router.push('/servicios?tab=cotizaciones');
  };
  
  const handleCopyTicketAsImage = useCallback(async (isForSharing: boolean = false) => {
    if (!ticketContentRef.current || !recordForPreview) return null;
    try {
        const canvas = await html2canvas(ticketContentRef.current, { scale: 2.5, backgroundColor: null });
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
        if (!blob) throw new Error("No se pudo crear el blob de la imagen.");

        if (isForSharing) {
            return new File([blob], `ticket_servicio_${recordForPreview.id}.png`, { type: 'image/png' });
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
  }, [recordForPreview, toast]);
  
  const handleShareTicket = async () => {
    const imageFile = await handleCopyTicketAsImage(true);
    if (imageFile && navigator.share) {
        try {
            await navigator.share({
                files: [imageFile],
                title: 'Ticket de Servicio',
                text: `Ticket de tu servicio.`,
            });
        } catch (error) {
            if (!String(error).includes('AbortError')) {
               toast({ title: 'No se pudo compartir', description: 'El error se ha registrado.', variant: 'default' });
            }
        }
    } else {
        toast({ title: 'No disponible', description: 'La función de compartir no está disponible en este navegador.', variant: 'default' });
    }
  };
  
  const handlePrintTicket = () => {
    requestAnimationFrame(() => setTimeout(() => window.print(), 100));
  };

  if (isLoading || (isEditMode && !initialData)) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="mr-2 h-8 w-8 animate-spin" />
        {isEditMode ? 'Cargando servicio...' : 'Cargando...'}
      </div>
    );
  }

  const isQuote = initialData?.status === 'Cotizacion' || isQuoteModeParam;
  
  const pageTitle = isEditMode 
    ? `Editar ${isQuote ? 'Cotización' : 'Servicio'} #${initialData?.id?.slice(-6)}`
    : `Nueva ${isQuote ? 'Cotización' : 'Servicio'}`;
    
  const pageDescription = isEditMode 
    ? `Modifica los detalles para el vehículo ${initialData?.vehicleIdentifier || ''}.`
    : "Completa los datos para crear un nuevo registro.";
    
  const ticketDialogFooter = (
    <div className="flex w-full justify-end gap-2">
      <TooltipProvider>
        <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" className="h-12 w-12 bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200" onClick={() => handleCopyTicketAsImage(false)}><Copy className="h-6 w-6" /></Button></TooltipTrigger><TooltipContent><p>Copiar Imagen</p></TooltipContent></Tooltip>
        <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" className="h-12 w-12 bg-green-100 text-green-700 border-green-200 hover:bg-green-200" onClick={handleShareTicket}><Share2 className="h-6 w-6" /></Button></TooltipTrigger><TooltipContent><p>Compartir</p></TooltipContent></Tooltip>
        <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" className="h-12 w-12 bg-red-100 text-red-700 border-red-200 hover:bg-red-200" onClick={handlePrintTicket}><Printer className="h-6 w-6" /></Button></TooltipTrigger><TooltipContent><p>Imprimir</p></TooltipContent></Tooltip>
      </TooltipProvider>
    </div>
  );
    
  return (
    <div className="flex flex-col h-full">
      <header className="sticky top-0 z-10 bg-background border-b p-4">
        <PageHeader 
          title={pageTitle}
          description={pageDescription}
          actions={(
            <div className="flex items-center gap-2">
              {isEditMode && initialData && (
                 <>
                    <Button variant="destructive" onClick={() => handleShowTicketDialog(initialData)} size="sm" title="Imprimir Ticket">
                      <Printer className="h-4 w-4"/>
                    </Button>
                    <Button onClick={() => handleShowShareDialog(initialData)} size="sm" title="Compartir Documento" className="bg-green-600 hover:bg-green-700 text-white">
                      <Share2 className="h-4 w-4"/>
                    </Button>
                 </>
              )}
            </div>
          )}
        />
      </header>
      <main className="flex-1 overflow-y-auto">
        <ServiceForm
            initialData={initialData}
            vehicles={vehicles}
            technicians={users}
            inventoryItems={inventoryItems}
            serviceTypes={serviceTypes}
            categories={categories}
            suppliers={suppliers}
            serviceHistory={serviceHistory}
            onSave={isEditMode ? handleUpdateService : handleSaveService}
            onComplete={handleCompleteService}
            onVehicleCreated={handleVehicleCreated}
            onCancel={isQuote ? handleDeleteQuote : handleCancelService}
            mode={isQuote ? 'quote' : 'service'}
        />
      </main>
       {recordForPreview && (
          <>
            <ShareServiceDialog 
              open={isShareDialogOpen} 
              onOpenChange={setIsShareDialogOpen} 
              service={recordForPreview}
              vehicle={vehicles.find(v => v.id === recordForPreview.vehicleId)}
            />
            <UnifiedPreviewDialog
              open={isTicketDialogOpen}
              onOpenChange={setIsTicketDialogOpen}
              title="Ticket de Servicio"
              service={recordForPreview}
              footerContent={ticketDialogFooter}
            >
              <TicketContent ref={ticketContentRef} service={recordForPreview} />
            </UnifiedPreviewDialog>
          </>
       )}
       {initialData && (
        <PaymentDetailsDialog
          open={isPaymentDialogOpen}
          onOpenChange={setIsPaymentDialogOpen}
          record={initialData}
          onConfirm={handleConfirmPayment}
          recordType="service"
          isCompletionFlow={true}
        />
      )}
    </div>
  );
}
