

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
import { inventoryService, operationsService, adminService } from '@/lib/services';
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

  const methods = useForm<POSFormValues>({
    resolver: zodResolver(serviceFormSchema),
  });

  useEffect(() => {
    const unsubs = [
      inventoryService.onItemsUpdate(setCurrentInventoryItems),
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
  
  const handleCopySaleForWhatsapp = useCallback(() => {
    if (!serviceForPreview) return;
    const workshopName = workshopInfo?.name || 'nuestro taller';
    const message = `Hola ${serviceForPreview.customerName || 'Cliente'}, aquí tienes los detalles de tu compra en ${workshopName}.
Folio de Venta: ${serviceForPreview.id}
Total: ${formatCurrency(serviceForPreview.totalCost)}
¡Gracias por tu preferencia!`;

    navigator.clipboard.writeText(message).then(() => {
      toast({ title: 'Mensaje Copiado', description: 'El mensaje para WhatsApp ha sido copiado.' });
    });
  }, [serviceForPreview, workshopInfo, toast]);

  const handleSaleCompletion = async (values: POSFormValues) => {
    if (!db) return toast({ title: 'Error de base de datos', variant: 'destructive'});
    
    try {
        const authUserString = localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY);
        const currentUser: User | null = authUserString ? JSON.parse(authUserString) : null;

        const dataWithAdvisor = {
            ...values,
            serviceAdvisorId: currentUser?.id,
            serviceAdvisorName: currentUser?.name
        };

        const savedRecord = await operationsService.saveService(dataWithAdvisor as ServiceRecord);
        
        toast({ title: 'Registro Creado', description: `El registro #${savedRecord.id} se ha guardado.` });
        
        setServiceForPreview(savedRecord);
        setIsPreviewOpen(true);
      
    } catch(e) {
      console.error(e);
      toast({ title: 'Error al Registrar', variant: 'destructive'});
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
      await inventoryService.addVehicle(newVehicleData);
      toast({ title: "Vehículo Creado" });
  };

  if (isLoading) {
      return <div className="text-center p-8 text-muted-foreground flex justify-center items-center"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Cargando...</div>;
  }

  return (
    <>
      <PageHeader
        title="Nuevo Servicio / Cotización"
        description="Complete la información. El registro se guardará en la base de datos al finalizar."
      />
      
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
        />
        <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" onClick={() => router.push('/servicios/historial')}>
                <X className="mr-2 h-4 w-4" />
                Cancelar
            </Button>
            <Button
                type="submit"
                form="service-form"
                disabled={methods.formState.isSubmitting}
            >
                {methods.formState.isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <Save className="mr-2 h-4 w-4" />
                )}
                Crear Registro
            </Button>
        </div>
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
    </>
  );
}
