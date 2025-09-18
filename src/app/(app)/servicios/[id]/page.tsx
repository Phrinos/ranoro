
// src/app/(app)/servicios/[id]/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { serviceService, inventoryService, adminService } from '@/lib/services';
import { Loader2, Share2, Save, Ban, Trash2, Printer, Copy, FileWarning } from 'lucide-react';
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
import { writeBatch, doc, collection } from 'firebase/firestore';
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
  const [notFound, setNotFound] = useState(false);
  
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isTicketDialogOpen, setIsTicketDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [recordForPreview, setRecordForPreview] = useState<ServiceRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const redirectUrl = useRef<string | null>(null);

  const ticketContentRef = React.useRef<HTMLDivElement>(null);


  const isEditMode = serviceId !== 'nuevo';
  const isQuoteModeParam = searchParams.get('mode') === 'quote';

  useEffect(() => {
    const fetchData = async () => {
        setIsLoading(true);
        setNotFound(false);
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
                  setNotFound(true);
                  toast({ 
                      title: 'Error al Cargar',
                      description: `El documento con ID "${serviceId.slice(0,12)}..." no fue encontrado.`, 
                      variant: 'destructive' 
                  });
                  return;
                }
                setInitialData(serviceData);
                setRecordForPreview(serviceData);
            } else {
                const authUserString = typeof window !== 'undefined' ? localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY) : null;
                const currentUser = authUserString ? JSON.parse(authUserString) : null;

                const newId = doc(collection(db, 'serviceRecords')).id;
                setInitialData({
                    id: newId,
                    status: 'Cotizacion',
                    serviceDate: new Date(),
                    vehicleId: '', 
                    serviceItems: [],
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
  
  const handleShowShareDialog = useCallback((service: ServiceRecord, redirect?: string) => {
    setRecordForPreview(service);
    setIsShareDialogOpen(true);
    if(redirect) redirectUrl.current = redirect;
  }, []);
  
  const handleShareDialogClose = (isOpen: boolean) => {
    setIsShareDialogOpen(isOpen);
    if (!isOpen && redirectUrl.current) {
        router.push(redirectUrl.current);
        redirectUrl.current = null;
    }
  };

  const handleShowTicketDialog = useCallback((service: ServiceRecord) => {
    setRecordForPreview(service); 
    setIsTicketDialogOpen(true);
  }, []);

  const handleSaveService = async (values: ServiceFormValues): Promise<ServiceRecord | void> => {
    setIsSubmitting(true);
    try {
      const savedRecord = await serviceService.saveService(values as ServiceRecord);
      toast({ title: 'Registro Creado', description: `El folio #${savedRecord.folio} se ha guardado.` });
      
      const targetTab = savedRecord.status === 'Cotizacion' ? 'cotizaciones' : 'activos';
      redirectUrl.current = `/servicios?tab=${targetTab}`;
      return savedRecord;
        
    } catch(e) {
      console.error(e);
      toast({ title: 'Error al Registrar', variant: 'destructive'});
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleUpdateService = async (values: ServiceFormValues): Promise<ServiceRecord | void> => {
    if (!initialData) return;
    setIsSubmitting(true);
    try {
      const updatedRecord = await serviceService.saveService({ ...values, id: serviceId });
      toast({ title: 'Servicio Actualizado', description: `El folio #${updatedRecord.folio} ha sido actualizado.` });
      redirectUrl.current = `/servicios?tab=activos`;
      return updatedRecord;
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
      if(!db) return;
      const batch = writeBatch(db);
      await serviceService.completeService(initialData, paymentDetails, batch);
      await batch.commit();
      
      toast({
        title: "Servicio Completado",
        description: `El servicio #${initialData.folio} ha sido completado y cobrado.`,
      });
      setIsPaymentDialogOpen(false);
      
      const updatedServiceData = await serviceService.getDocById('serviceRecords', recordId);
      if (updatedServiceData) {
        handleShowShareDialog(updatedServiceData, '/servicios?tab=historial');
      } else {
        router.push('/servicios?tab=historial');
      }

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
  
  const handleVehicleCreated = async (data: VehicleFormValues): Promise<Vehicle> => {
      const newVehicle = await inventoryService.addVehicle(data);
      setVehicles(prev => [...prev, newVehicle]);
      toast({ title: "Vehículo Creado" });
      return newVehicle;
  };

  const handleCancelService = async () => {
      if (!initialData?.id) return;
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
        const canvas = await html2canvas(ticketContentRef.current, { scale: 2.5, backgroundColor: null, useCORS: true });
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

  if (isLoading || (isEditMode && !initialData && !notFound)) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="mr-2 h-8 w-8 animate-spin" />
        {isEditMode ? 'Cargando servicio...' : 'Cargando...'}
      </div>
    );
  }

  if (notFound) {
    return (
        <div className="flex h-screen w-full flex-col items-center justify-center text-center">
            <FileWarning className="h-16 w-16 text-destructive mb-4" />
            <h1 className="text-2xl font-bold">Documento no Encontrado</h1>
            <p className="text-muted-foreground mb-6">El servicio que buscas no existe o ha sido eliminado.</p>
            <Button onClick={() => router.push('/servicios')}>Volver a Servicios</Button>
        </div>
    );
  }

  const isQuote = initialData?.status === 'Cotizacion' || isQuoteModeParam;
  
  const pageTitle = isEditMode 
    ? `Editar ${isQuote ? 'Cotización' : 'Servicio'} #${initialData?.folio || initialData?.id?.slice(-6)}`
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
    <>
      <PageHeader 
          title={pageTitle}
          description={pageDescription}
          actions={
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
          }
        />
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
            onSaveSuccess={handleShowShareDialog}
            onComplete={handleCompleteService}
            onVehicleCreated={handleVehicleCreated}
            onCancel={isQuote ? handleDeleteQuote : handleCancelService}
            mode={isQuote ? 'quote' : 'service'}
        />
       {recordForPreview && (
          <>
            <ShareServiceDialog 
              open={isShareDialogOpen} 
              onOpenChange={handleShareDialogClose} 
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
    </>
  );
}
