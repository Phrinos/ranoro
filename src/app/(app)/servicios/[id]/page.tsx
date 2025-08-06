
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PageHeader } from "@/components/page-header";
import type { ServiceRecord, QuoteRecord, Vehicle, User, InventoryItem, ServiceTypeRecord, InventoryCategory, Supplier, Payment } from '@/types'; 
import { useToast } from '@/hooks/use-toast';
import { useRouter, useParams } from 'next/navigation';
import { serviceService, inventoryService, adminService } from '@/lib/services';
import { Loader2, Save, X, Ban, DollarSign } from 'lucide-react';
import { serviceFormSchema } from '@/schemas/service-form';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { PaymentDetailsDialog, type PaymentDetailsFormValues } from '../components/PaymentDetailsDialog';
import { writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';
import { VehicleSelectionCard } from '../components/VehicleSelectionCard';
import type { VehicleFormValues } from '../../vehiculos/components/vehicle-form';
import { ServiceItemsList } from '../components/ServiceItemsList';
import { PaymentSection } from '../components/PaymentSection';
import { VehicleDialog } from '../../vehiculos/components/vehicle-dialog';


export default function EditarServicioPage() {
  const { toast } = useToast(); 
  const router = useRouter();
  const params = useParams();
  const serviceId = params.id as string;
  
  const [initialData, setInitialData] = useState<ServiceRecord | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceTypeRecord[]>([]);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [serviceToComplete, setServiceToComplete] = useState<ServiceRecord | null>(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isNewVehicleDialogOpen, setIsNewVehicleDialogOpen] = useState(false);
  const [newVehicleInitialPlate, setNewVehicleInitialPlate] = useState<string | undefined>(undefined);

  const methods = useForm<z.infer<typeof serviceFormSchema>>({
    resolver: zodResolver(serviceFormSchema),
  });

  const { reset, handleSubmit } = methods;

  useEffect(() => {
    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [
              serviceData,
              vehiclesData,
              usersData,
              inventoryData,
              serviceTypesData,
              categoriesData,
              suppliersData
            ] = await Promise.all([
              serviceService.getDocById('serviceRecords', serviceId),
              inventoryService.onVehiclesUpdatePromise(),
              adminService.onUsersUpdatePromise(),
              inventoryService.onItemsUpdatePromise(),
              inventoryService.onServiceTypesUpdatePromise(),
              inventoryService.onCategoriesUpdatePromise(),
              inventoryService.onSuppliersUpdatePromise(),
            ]);

            if (!serviceData) {
              toast({ title: 'Error', description: 'Servicio no encontrado.', variant: 'destructive' });
              router.push('/servicios/historial');
              return;
            }

            setInitialData(serviceData);
            setVehicles(vehiclesData);
            setUsers(usersData);
            setInventoryItems(inventoryData);
            setServiceTypes(serviceTypesData);
            setCategories(categoriesData);
            setSuppliers(suppliersData);
            
            reset({
                ...serviceData,
                allVehiclesForDialog: vehiclesData,
            });

        } catch (error) {
            console.error("Error fetching data for edit page:", error);
            toast({ title: 'Error', description: 'No se pudieron cargar los datos del servicio.', variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    fetchData();
  }, [serviceId, router, toast, reset]);
  
  const handleOpenNewVehicleDialog = useCallback((plate?: string) => {
    setNewVehicleInitialPlate(plate);
    setIsNewVehicleDialogOpen(true);
  }, []);
  
  const handleVehicleCreated = async (newVehicleData: VehicleFormValues) => {
      const newVehicle = await inventoryService.addVehicle(newVehicleData);
      toast({ title: "Vehículo Creado" });
      methods.setValue('vehicleId', newVehicle.id); // Set the newly created vehicle in the form
      setIsNewVehicleDialogOpen(false);
  };
  
  const handleNewInventoryItemCreated = async (formData: InventoryItemFormValues): Promise<InventoryItem> => {
    const newItem = await inventoryService.addItem(formData);
    toast({ title: "Producto Creado", description: `"${newItem.name}" ha sido agregado al inventario.` });
    return newItem;
  };

  const handleUpdateService = async (values: z.infer<typeof serviceFormSchema>) => {
    if (!initialData) return;

    const serviceRecordValues = values as ServiceRecord;

    if (serviceRecordValues.status === 'Entregado') {
        setServiceToComplete({ ...initialData, ...serviceRecordValues });
        setIsPaymentDialogOpen(true);
        return;
    }

    try {
      await serviceService.saveService({ ...serviceRecordValues, id: serviceId });
      toast({ title: 'Servicio Actualizado', description: `El registro #${serviceId} ha sido actualizado.` });
      router.push('/servicios/historial');
    } catch(e) {
      console.error(e);
      toast({ title: 'Error al Actualizar', variant: 'destructive'});
    }
  };
  
  const handleCompleteService = async (paymentDetails: PaymentDetailsFormValues) => {
    if (!serviceToComplete || !db) return;
    try {
        const batch = writeBatch(db);
        await serviceService.completeService(serviceToComplete, { ...paymentDetails, nextServiceInfo: serviceToComplete.nextServiceInfo }, batch);
        await batch.commit();
        toast({ title: "Servicio Completado" });
        setIsPaymentDialogOpen(false);
        setServiceToComplete(null);
        router.push('/servicios/historial');
    } catch(e) {
        toast({ title: "Error al completar", variant: "destructive"});
    }
  };

  const handleCancelService = async () => {
    const reason = prompt("Por favor, ingrese un motivo para la cancelación:");
    if (reason && initialData) {
      try {
        await serviceService.cancelService(initialData.id, reason);
        toast({ title: "Servicio Cancelado" });
        router.push('/servicios/historial');
      } catch (error) {
        toast({ title: "Error", description: "No se pudo cancelar el servicio.", variant: "destructive"});
      }
    }
  };

  if (isLoading || !initialData) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="mr-2 h-8 w-8 animate-spin" />
        Cargando servicio...
      </div>
    );
  }

  return (
    <FormProvider {...methods}>
        <form id="service-form" onSubmit={handleSubmit(handleUpdateService)} className="space-y-6">
            <PageHeader
                title={`Editar Servicio #${initialData.id.slice(-6)}`}
                description={`Modifica los detalles para el vehículo ${initialData.vehicleIdentifier || ''}.`}
            />
            
            <VehicleSelectionCard
                isReadOnly={false}
                localVehicles={vehicles}
                onVehicleSelected={(v) => methods.setValue('vehicleIdentifier', v?.licensePlate)}
                onOpenNewVehicleDialog={handleOpenNewVehicleDialog}
            />

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
                <div className="lg:col-span-3">
                <ServiceItemsList
                    isReadOnly={false}
                    inventoryItems={inventoryItems}
                    mode={initialData.status === 'Cotizacion' ? 'quote' : 'service'}
                    onNewInventoryItemCreated={handleNewInventoryItemCreated}
                    categories={categories}
                    suppliers={suppliers}
                    serviceTypes={serviceTypes}
                />
                </div>
                <div className="lg:col-span-2 space-y-6">
                    <PaymentSection />
                </div>
            </div>

            <div className="mt-6 flex justify-between items-center">
                <ConfirmDialog
                    triggerButton={<Button variant="destructive" type="button" disabled={initialData.status === 'Cancelado'}><Ban className="mr-2 h-4 w-4"/>Cancelar Servicio</Button>}
                    title="¿Cancelar este servicio?"
                    description="Esta acción marcará el servicio como cancelado, pero no se eliminará del historial. No se puede deshacer."
                    onConfirm={handleCancelService}
                />
                <div className="flex gap-2">
                    <Button variant="outline" type="button" onClick={() => router.back()}>
                        <X className="mr-2 h-4 w-4" />
                        Cerrar
                    </Button>
                    <Button type="submit">
                        <Save className="mr-2 h-4 w-4" />
                        Guardar Cambios
                    </Button>
                </div>
            </div>
        </form>

        <VehicleDialog
            open={isNewVehicleDialogOpen}
            onOpenChange={setIsNewVehicleDialogOpen}
            onSave={handleVehicleCreated}
            vehicle={{ licensePlate: newVehicleInitialPlate }}
        />

        {serviceToComplete && (
            <PaymentDetailsDialog
            open={isPaymentDialogOpen}
            onOpenChange={setIsPaymentDialogOpen}
            record={serviceToComplete}
            onConfirm={(id, details) => handleCompleteService(serviceToComplete, details)}
            isCompletionFlow={true}
            />
        )}
    </FormProvider>
  );
}
