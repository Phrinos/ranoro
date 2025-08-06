
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PageHeader } from "@/components/page-header";
import { ServiceForm } from "../components/service-form";
import type { SaleReceipt, InventoryItem, PaymentMethod, InventoryCategory, Supplier, WorkshopInfo, ServiceRecord, Vehicle, Technician, ServiceTypeRecord, QuoteRecord, User } from '@/types'; 
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { inventoryService, serviceService, purchaseService, adminService } from '@/lib/services';
import { Loader2, Copy, Printer, MessageSquare, Save, X, Share2 } from 'lucide-react';
import type { InventoryItemFormValues } from '../../inventario/components/inventory-item-form';
import { db } from '@/lib/firebaseClient';
import { writeBatch, doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { nanoid } from 'nanoid';
import { serviceFormSchema } from '@/schemas/service-form';
import { UnifiedPreviewDialog } from '@/components/shared/unified-preview-dialog';
import type { VehicleFormValues } from '../../vehiculos/components/vehicle-form';
import html2canvas from 'html2canvas';
import { AUTH_USER_LOCALSTORAGE_KEY } from '@/lib/placeholder-data';
import { PaymentDetailsDialog, type PaymentDetailsFormValues } from '../components/PaymentDetailsDialog';

type POSFormValues = z.infer<typeof serviceFormSchema>;

export default function NuevoServicioPage() {
  const { toast } = useToast(); 
  const router = useRouter();
  
  const [currentInventoryItems, setCurrentInventoryItems] = useState<InventoryItem[]>([]);
  const [allCategories, setAllCategories] = useState<InventoryCategory[]>([]);
  const [allSuppliers, setAllSuppliers] = useState<Supplier[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceTypeRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [serviceForPreview, setServiceForPreview] = useState<ServiceRecord | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [workshopInfo, setWorkshopInfo] = useState<WorkshopInfo | null>(null);

  const [serviceToComplete, setServiceToComplete] = useState<ServiceRecord | null>(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);

  const methods = useForm<POSFormValues>({
    resolver: zodResolver(serviceFormSchema),
  });

  useEffect(() => {
    const unsubs = [
      inventoryService.onItemsUpdate((items) => {
        setCurrentInventoryItems(items);
        setIsLoading(false);
      }),
      inventoryService.onCategoriesUpdate(setAllCategories),
      inventoryService.onSuppliersUpdate(setAllSuppliers),
      inventoryService.onVehiclesUpdate(setVehicles),
      adminService.onUsersUpdate(setUsers),
      inventoryService.onServiceTypesUpdate((data) => {
        setServiceTypes(data);
        setIsLoading(false);
      }),
    ];
    
    const storedWorkshopInfo = localStorage.getItem('workshopTicketInfo');
    if (storedWorkshopInfo) {
      try { setWorkshopInfo(JSON.parse(storedWorkshopInfo)); } catch (e) { console.error(e); }
    }

    return () => unsubs.forEach(unsub => unsub());
  }, []);
  
  const handleSaleCompletion = async (values: POSFormValues) => {
    if (!db) return toast({ title: 'Error de base de datos', variant: 'destructive'});
    
    // If creating a service directly as "Entregado", open the payment dialog first.
    if (values.status === 'Entregado') {
        const tempService = { ...values, id: 'new_service_temp' } as ServiceRecord;
        setServiceToComplete(tempService);
        setIsPaymentDialogOpen(true);
        return;
    }

    // Standard save for other statuses
    try {
        const savedRecord = await serviceService.saveService(values);
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
      // First, save the service to get an ID
      const { id: _, ...serviceData } = serviceToComplete; // Remove temp ID
      const savedService = await serviceService.saveService(serviceData as ServiceRecord);

      // Now, complete the just-saved service
      const batch = writeBatch(db);
      await serviceService.completeService(savedService, paymentDetails, batch);
      await batch.commit();

      const finalServiceRecord = { ...savedService, ...paymentDetails, status: 'Entregado', deliveryDateTime: new Date().toISOString() } as ServiceRecord;

      toast({ title: 'Servicio Completado', description: `El servicio #${finalServiceRecord.id} ha sido creado y completado.` });
      setServiceForPreview(finalServiceRecord);
      setIsPreviewOpen(true);

    } catch(e) {
       console.error(e);
       toast({ title: 'Error al Completar', variant: 'destructive'});
    } finally {
        setIsPaymentDialogOpen(false);
        setServiceToComplete(null);
    }
  };
  
  const handleNewInventoryItemCreated = async (formData: InventoryItemFormValues): Promise<InventoryItem> => {
    const newItem = await inventoryService.addItem(formData);
    return newItem;
  };
  
  const handleDialogClose = () => {
    setIsPreviewOpen(false);
    setServiceForPreview(null);
    methods.reset(); // Reset the form for a new sale
    const targetPath = serviceForPreview?.status === 'Cotizacion' 
                      ? '/cotizaciones/historial' 
                      : '/servicios/historial';
    router.push(targetPath);
  };
  
  const handleVehicleCreated = async (newVehicleData: VehicleFormValues) => {
      await inventoryService.addVehicle(newVehicleData);
      toast({ title: "Vehículo Creado" });
  };

  if (isLoading) {
      return <div className="text-center p-8 text-muted-foreground flex justify-center items-center"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Cargando...</div>;
  }

  return (
    <>
      <FormProvider {...methods}>
        <ServiceForm
          vehicles={vehicles}
          technicians={users}
          inventoryItems={currentInventoryItems}
          serviceTypes={serviceTypes}
          onSubmit={handleSaleCompletion}
          onClose={() => router.push('/servicios/historial')}
          mode="quote" // Start as a quote by default
          onVehicleCreated={handleVehicleCreated}
          onTotalCostChange={() => {}} // No-op for this page as total is not displayed in header
          categories={allCategories}
          suppliers={allSuppliers}
        />
      </FormProvider>
      
      {serviceForPreview && (
         <UnifiedPreviewDialog
            open={isPreviewOpen}
            onOpenChange={handleDialogClose}
            service={serviceForPreview}
            vehicle={vehicles.find(v => v.id === serviceForPreview.vehicleId)}
            title="Registro Creado con Éxito"
          />
      )}

      {serviceToComplete && (
        <PaymentDetailsDialog
          open={isPaymentDialogOpen}
          onOpenChange={setIsPaymentDialogOpen}
          record={serviceToComplete}
          onConfirm={(serviceId, paymentDetails) => handleCompleteNewService(paymentDetails)}
          isCompletionFlow={true}
        />
      )}
    </>
  );
}
