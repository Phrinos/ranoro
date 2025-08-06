

"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PageHeader } from "@/components/page-header";
import { ServiceForm } from "../form";
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
  const formRef = useRef<HTMLFormElement>(null);


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

        } catch (error) {
            console.error("Error fetching data for edit page:", error);
            toast({ title: 'Error', description: 'No se pudieron cargar los datos del servicio.', variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    fetchData();
  }, [serviceId, router, toast]);

  const handleUpdateService = async (values: ServiceRecord | QuoteRecord) => {
    if (!initialData) return;

    if ('status' in values && values.status === 'Entregado') {
        setServiceToComplete({ ...initialData, ...values } as ServiceRecord);
        setIsPaymentDialogOpen(true);
        return;
    }

    try {
      await serviceService.saveService({ ...values, id: serviceId });
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
        await serviceService.completeService(serviceToComplete, paymentDetails, batch);
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

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="mr-2 h-8 w-8 animate-spin" />
        Cargando servicio...
      </div>
    );
  }
  
  if (!initialData) {
    return <div className="text-center p-8">Servicio no encontrado.</div>;
  }

  return (
    <>
      <PageHeader
        title={`Editar Servicio #${initialData.id.slice(-6)}`}
        description={`Modifica los detalles para el vehículo ${initialData.vehicleIdentifier || ''}.`}
      />
      
      <ServiceForm
        ref={formRef}
        initialDataService={initialData}
        vehicles={vehicles}
        technicians={users}
        inventoryItems={inventoryItems}
        serviceTypes={serviceTypes}
        onSubmit={handleUpdateService}
        onClose={() => router.push('/servicios/historial')}
        onCancelService={handleCancelService}
        onVehicleCreated={() => {}} // This should ideally not happen here
        onTotalCostChange={() => {}} // No-op for this page
      />
      
      <div className="mt-6 flex justify-between items-center">
        <ConfirmDialog
            triggerButton={<Button variant="destructive" disabled={initialData.status === 'Cancelado'}><Ban className="mr-2 h-4 w-4"/>Cancelar Servicio</Button>}
            title="¿Cancelar este servicio?"
            description="Esta acción marcará el servicio como cancelado, pero no se eliminará del historial. No se puede deshacer."
            onConfirm={handleCancelService}
        />
        <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.back()}>
                <X className="mr-2 h-4 w-4" />
                Cerrar
            </Button>
            <Button
                type="button" 
                onClick={() => formRef.current?.requestSubmit()}
            >
                <Save className="mr-2 h-4 w-4" />
                Guardar Cambios
            </Button>
        </div>
      </div>

      {serviceToComplete && (
        <PaymentDetailsDialog
          open={isPaymentDialogOpen}
          onOpenChange={setIsPaymentDialogOpen}
          record={serviceToComplete}
          onConfirm={(id, details) => handleCompleteService(details)}
          isCompletionFlow={true}
        />
      )}
    </>
  );
}
