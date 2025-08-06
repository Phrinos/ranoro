
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { SaleReceipt, InventoryItem, PaymentMethod, InventoryCategory, Supplier, WorkshopInfo, ServiceRecord, Vehicle, Technician, ServiceTypeRecord, QuoteRecord, User, Payment } from '@/types'; 
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { inventoryService, serviceService, adminService } from '@/lib/services';
import { Loader2, Copy, Printer, MessageSquare, Save, X, Share2 } from 'lucide-react';
import type { InventoryItemFormValues } from '../../inventario/components/inventory-item-form';
import { db } from '@/lib/firebaseClient';
import { writeBatch, doc } from 'firebase/firestore';
import { PrintTicketDialog } from '@/components/ui/print-ticket-dialog';
import { TicketContent } from '@/components/ticket-content';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { nanoid } from 'nanoid';
import html2canvas from 'html2canvas';
import { serviceFormSchema } from '@/schemas/service-form';
import { AUTH_USER_LOCALSTORAGE_KEY } from '@/lib/placeholder-data';
import { UnifiedPreviewDialog } from '@/components/shared/unified-preview-dialog';
import type { VehicleFormValues } from '../../vehiculos/components/vehicle-form';
import { VehicleDialog } from '../../vehiculos/components/vehicle-dialog';
import { PaymentDetailsDialog, type PaymentDetailsFormValues } from '../components/PaymentDetailsDialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { VehicleSelectionCard } from '../components/VehicleSelectionCard';
import { ServiceItemsList } from '../components/ServiceItemsList';
import { ServiceSummary } from '../components/ServiceSummary';

type ServiceCreationFormValues = z.infer<typeof serviceFormSchema>;

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
  
  const [isNewVehicleDialogOpen, setIsNewVehicleDialogOpen] = useState(false)
  const [newVehicleInitialPlate, setNewVehicleInitialPlate] = useState<string | undefined>(undefined);

  const methods = useForm<ServiceCreationFormValues>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      serviceItems: [],
      payments: [{ method: 'Efectivo', amount: undefined }],
      status: 'Cotizacion', // Default status
    },
  });

  const { control, watch, formState, handleSubmit, setValue } = methods;
  const watchedStatus = watch('status');

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
  
  const handleSaleCompletion = async (values: ServiceCreationFormValues) => {
    if (!db) return toast({ title: 'Error de base de datos', variant: 'destructive'});
    
    if (values.status === 'Entregado') {
        const tempService = { ...values, id: 'new_service_temp' } as ServiceRecord;
        setServiceToComplete(tempService);
        setIsPaymentDialogOpen(true);
        return;
    }

    try {
        const savedRecord = await serviceService.saveService(values as ServiceRecord);
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
      const savedService = await serviceService.saveService(serviceData as ServiceRecord);

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
    methods.reset();
    const targetPath = serviceForPreview?.status === 'Cotizacion' 
                      ? '/cotizaciones/historial' 
                      : '/servicios/historial';
    router.push(targetPath);
  };
  
  const handleVehicleCreated = async (newVehicleData: VehicleFormValues) => {
      const newVehicle = await inventoryService.addVehicle(newVehicleData);
      toast({ title: "Vehículo Creado" });
      setValue('vehicleId', newVehicle.id); // Set the newly created vehicle in the form
      setIsNewVehicleDialogOpen(false);
  };

  const handleOpenNewVehicleDialog = useCallback((plate?: string) => {
    setNewVehicleInitialPlate(plate);
    setIsNewVehicleDialogOpen(true);
  }, []);

  if (isLoading) {
      return <div className="text-center p-8 text-muted-foreground flex justify-center items-center"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Cargando...</div>;
  }

  return (
    <FormProvider {...methods}>
      <Card className="bg-card border rounded-lg p-6 shadow-sm mb-6">
        <CardHeader className="p-0">
            <CardTitle>Nuevo Servicio / Cotización</CardTitle>
            <CardDescription>Completa la información para crear un nuevo registro.</CardDescription>
        </CardHeader>
        <CardContent className="p-0 mt-4">
            <div className="max-w-sm">
                <FormField
                control={control}
                name="status"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Paso 1: Seleccione el estado inicial del registro</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                        <SelectTrigger className="font-bold">
                            <SelectValue placeholder="Seleccione un estado" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        {["Cotizacion", "Agendado", "En Taller"].map(s => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    </FormItem>
                )}
                />
            </div>
        </CardContent>
      </Card>
      
      <form id="service-form" onSubmit={handleSubmit(handleSaleCompletion)} className="space-y-6">
          <VehicleSelectionCard
              isReadOnly={false}
              localVehicles={vehicles}
              onVehicleSelected={(v) => setValue('vehicleIdentifier', v?.licensePlate)}
              onOpenNewVehicleDialog={handleOpenNewVehicleDialog}
          />

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
              <div className="lg:col-span-3">
              <ServiceItemsList
                  isReadOnly={false}
                  inventoryItems={currentInventoryItems}
                  mode={watchedStatus === 'Cotizacion' ? 'quote' : 'service'}
                  onNewInventoryItemCreated={handleNewInventoryItemCreated}
                  categories={allCategories}
                  suppliers={allSuppliers}
              />
              </div>
              <div className="lg:col-span-2 space-y-6">
                  <ServiceSummary />
              </div>
          </div>

          <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" type="button" onClick={() => router.back()}>
                  <X className="mr-2 h-4 w-4" />
                  Cancelar
              </Button>
              <Button
                  type="submit"
                  disabled={formState.isSubmitting}
              >
                  {formState.isSubmitting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                      <Save className="mr-2 h-4 w-4" />
                  )}
                  {"Crear Registro"}
              </Button>
          </div>
      </form>
      
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
          onConfirm={(id, paymentDetails) => handleCompleteNewService(paymentDetails)}
          isCompletionFlow={true}
        />
      )}

      <VehicleDialog
        open={isNewVehicleDialogOpen}
        onOpenChange={setIsNewVehicleDialogOpen}
        onSave={handleVehicleCreated}
        vehicle={{ licensePlate: newVehicleInitialPlate }}
      />
    </FormProvider>
  );
}

