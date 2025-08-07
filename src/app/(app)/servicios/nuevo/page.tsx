// src/app/(app)/servicios/nuevo/page.tsx

"use client";

import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { SaleReceipt, InventoryItem, PaymentMethod, InventoryCategory, Supplier, WorkshopInfo, ServiceRecord, Vehicle, Technician, ServiceTypeRecord, QuoteRecord, User, Payment } from '@/types'; 
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { inventoryService, serviceService, adminService, operationsService } from '@/lib/services';
import { Loader2, Copy, Printer, MessageSquare, Save, X, Share2, CalendarIcon as CalendarDateIcon, BrainCircuit, Wrench, ShieldCheck, Camera, FileText, Eye } from 'lucide-react';
import { db } from '@/lib/firebaseClient';
import { writeBatch, doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { serviceFormSchema } from '@/schemas/service-form';
import { AUTH_USER_LOCALSTORAGE_KEY } from '@/lib/placeholder-data';
import { UnifiedPreviewDialog } from '@/components/shared/unified-preview-dialog';
import { PaymentDetailsDialog, type PaymentDetailsFormValues } from '../components/PaymentDetailsDialog';
import { ServiceForm } from '../components/service-form';
import type { VehicleFormValues } from '../../vehiculos/components/vehicle-form';

type ServiceCreationFormValues = z.infer<typeof serviceFormSchema>;

export default function NuevoServicioPage() {
  const { toast } = useToast(); 
  const router = useRouter();
  
  const [currentInventoryItems, setCurrentInventoryItems] = useState<InventoryItem[]>([]);
  const [allCategories, setAllCategories] = useState<InventoryCategory[]>([]);
  const [allSuppliers, setAllSuppliers] = useState<Supplier[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [allServices, setAllServices] = useState<ServiceRecord[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceTypeRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [serviceForPreview, setServiceForPreview] = useState<ServiceRecord | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [workshopInfo, setWorkshopInfo] = useState<WorkshopInfo | null>(null);

  const [serviceToComplete, setServiceToComplete] = useState<ServiceRecord | null>(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  
  useEffect(() => {
    const unsubs = [
      inventoryService.onItemsUpdate((items) => {
        setCurrentInventoryItems(items);
        setIsLoading(false);
      }),
      inventoryService.onCategoriesUpdate(setAllCategories),
      inventoryService.onSuppliersUpdate(setAllSuppliers),
      inventoryService.onVehiclesUpdate(setVehicles),
      serviceService.onServicesUpdate(setAllServices),
      adminService.onUsersUpdate(setUsers),
      inventoryService.onServiceTypesUpdate((data) => {
        setServiceTypes(data);
      }),
    ];
    
    const storedWorkshopInfo = localStorage.getItem('workshopTicketInfo');
    if (storedWorkshopInfo) {
      try { setWorkshopInfo(JSON.parse(storedWorkshopInfo)); } catch (e) { console.error(e); }
    }
    
    return () => unsubs.forEach(unsub => unsub());
  }, []);
  
  const handleSaleCompletion = async (values: ServiceCreationFormValues) => {
    if (!db) return toast({ title: 'Error de base de datos', variant: 'destructive'});
    
    const now = new Date();
    const serviceDataWithTotals: Partial<ServiceRecord> = {
        ...values,
        serviceDate: values.serviceDate || now,
    };
    
    // Auto-set reception and delivery dates based on status change
    if (values.status === 'En Taller' && !values.receptionDateTime) {
        serviceDataWithTotals.receptionDateTime = now;
    }

    if (values.status === 'Entregado') {
        serviceDataWithTotals.deliveryDateTime = now;
        const tempService = { ...serviceDataWithTotals, id: 'new_service_temp' } as ServiceRecord;
        setServiceToComplete(tempService);
        setIsPaymentDialogOpen(true);
        return;
    }

    try {
        const savedRecord = await serviceService.saveService(serviceDataWithTotals as ServiceRecord);
        toast({ title: 'Registro Creado', description: `El registro #${savedRecord.id} se ha guardado.` });
        setServiceForPreview(savedRecord);
        setIsPreviewOpen(true);
    } catch(e) {
      console.error(e);
      toast({ title: 'Error al Registrar', variant: 'destructive'});
    }
  };

  const handleCompleteNewService = async (paymentDetails: PaymentDetailsFormValues) => {
    if (!serviceToComplete) return;

    try {
      const { id: _, ...serviceData } = serviceToComplete;
      const finalServiceData = { ...serviceData, payments: paymentDetails.payments };
      
      const savedService = await serviceService.saveService(finalServiceData as ServiceRecord);

      toast({ title: 'Servicio Completado', description: `El servicio #${savedService.id} ha sido creado y completado.` });
      setServiceForPreview(savedService);
      setIsPreviewOpen(true);

    } catch(e) {
       console.error(e);
       toast({ title: 'Error al Completar', variant: 'destructive'});
    } finally {
        setIsPaymentDialogOpen(false);
        setServiceToComplete(null);
    }
  };
  
  const handleVehicleCreated = async (newVehicleData: VehicleFormValues) => {
      await inventoryService.addVehicle(newVehicleData);
      toast({ title: "Vehículo Creado" });
  };
  
  const handleDialogClose = () => {
    setIsPreviewOpen(false);
    setServiceForPreview(null);
    const targetPath = serviceForPreview?.status === 'Cotizacion' 
                      ? '/servicios?tab=cotizaciones'
                      : '/servicios/historial';
    router.push(targetPath);
  };

  if (isLoading) {
      return <div className="text-center p-8 text-muted-foreground flex justify-center items-center"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Cargando...</div>;
  }

  return (
    <>
        <ServiceForm
          vehicles={vehicles}
          technicians={users}
          inventoryItems={currentInventoryItems}
          serviceTypes={serviceTypes}
          categories={allCategories}
          suppliers={allSuppliers}
          onSubmit={handleSaleCompletion}
          onClose={() => router.back()}
          onVehicleCreated={handleVehicleCreated}
        />

      {serviceToComplete && (
        <PaymentDetailsDialog
          open={isPaymentDialogOpen}
          onOpenChange={setIsPaymentDialogOpen}
          record={serviceToComplete}
          onConfirm={(id, paymentDetails) => handleCompleteNewService(paymentDetails)}
          isCompletionFlow={true}
        />
      )}
      {serviceForPreview && (
        <UnifiedPreviewDialog
          open={isPreviewOpen}
          onOpenChange={handleDialogClose}
          service={serviceForPreview}
          vehicle={vehicles.find(v => v.id === serviceForPreview.vehicleId)}
          title="Registro Creado con Éxito"
        />
      )}
    </>
  );
}
