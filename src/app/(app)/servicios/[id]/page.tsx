// src/app/(app)/servicios/[id]/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { serviceService, inventoryService, adminService } from '@/lib/services';
import { Loader2, Share2, MessageSquare, Save, Ban, Trash2 } from 'lucide-react';
import { ServiceForm } from '../components/ServiceForm';
import type { ServiceRecord, Vehicle, User, InventoryItem, ServiceTypeRecord, InventoryCategory, Supplier, QuoteRecord } from '@/types'; 
import type { VehicleFormValues } from '../../vehiculos/components/vehicle-form';
import type { ServiceFormValues } from '@/schemas/service-form';
import { PageHeader } from '@/components/page-header';
import { AUTH_USER_LOCALSTORAGE_KEY } from '@/lib/placeholder-data';
import { ShareServiceDialog } from '@/components/shared/ShareServiceDialog';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';

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
  const [recordForSharing, setRecordForSharing] = useState<ServiceRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);


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
    setRecordForSharing(service);
    setIsShareDialogOpen(true);
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
  
  const handleVehicleCreated = async (data: VehicleFormValues) => {
      await inventoryService.addVehicle(data);
      toast({ title: "Vehículo Creado" });
  };

  const handleCancelService = async () => {
      if (!initialData?.id) return;
      const reason = prompt("Motivo de la cancelación:");
      if (reason) {
        await serviceService.cancelService(initialData.id, reason);
        toast({ title: "Servicio Cancelado" });
        router.push('/servicios?tab=historial');
      }
  };
  
  const handleDeleteQuote = async () => {
      if (!initialData?.id) return;
      await serviceService.deleteService(initialData.id);
      toast({ title: "Cotización Eliminada", variant: "destructive" });
      router.push('/servicios?tab=cotizaciones');
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
    
  return (
    <div className="flex flex-col h-full">
      <header className="sticky top-0 z-10 bg-background border-b p-4">
        <PageHeader 
          title={pageTitle}
          description={pageDescription}
          actions={(
            <div className="flex items-center gap-2">
              {isEditMode && initialData && (
                <Button variant="outline" onClick={() => handleShowShareDialog(initialData)} size="icon" title="Compartir Documento">
                  <Share2 className="h-4 w-4"/>
                </Button>
              )}
               {initialData?.id && (
                  <ConfirmDialog
                      triggerButton={
                          <Button variant="destructive" size="icon" title={isQuote ? "Eliminar Cotización" : "Cancelar Servicio"}>
                              {isQuote ? <Trash2 className="h-4 w-4"/> : <Ban className="h-4 w-4"/>}
                          </Button>
                      }
                      title={isQuote ? '¿Eliminar esta cotización?' : '¿Cancelar este servicio?'}
                      description={
                          isQuote 
                          ? 'Esta acción eliminará permanentemente el registro de la cotización. No se puede deshacer.'
                          : 'Esta acción marcará el servicio como cancelado, pero no se podrá deshacer.'
                      }
                      onConfirm={isQuote ? handleDeleteQuote : handleCancelService}
                  />
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
            onVehicleCreated={handleVehicleCreated}
            mode={isQuote ? 'quote' : 'service'}
        />
      </main>
       {recordForSharing && (
          <ShareServiceDialog 
            open={isShareDialogOpen} 
            onOpenChange={setIsShareDialogOpen} 
            service={recordForSharing}
            vehicle={vehicles.find(v => v.id === recordForSharing.vehicleId)}
          />
       )}
    </div>
  );
}
