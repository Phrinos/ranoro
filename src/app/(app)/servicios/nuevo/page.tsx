

"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PageHeader } from "@/components/page-header";
import { ServiceForm } from "../components/service-form";
import type { SaleReceipt, InventoryItem, PaymentMethod, InventoryCategory, Supplier, WorkshopInfo, ServiceRecord, Vehicle, Technician, ServiceTypeRecord, QuoteRecord } from '@/types'; 
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { inventoryService, operationsService, personnelService } from '@/lib/services';
import { Loader2, Copy, Printer, MessageSquare, Save, X } from 'lucide-react';
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
import { UnifiedPreviewDialog } from '@/components/shared/unified-preview-dialog';
import type { VehicleFormValues } from '../../vehiculos/components/vehicle-form';


type POSFormValues = z.infer<typeof serviceFormSchema>;

export default function NuevoServicioPage() {
  const { toast } = useToast(); 
  const router = useRouter();
  
  const [currentInventoryItems, setCurrentInventoryItems] = useState<InventoryItem[]>([]);
  const [allCategories, setAllCategories] = useState<InventoryCategory[]>([]);
  const [allSuppliers, setAllSuppliers] = useState<Supplier[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
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
      personnelService.onTechniciansUpdate(setTechnicians),
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
  
  const handleSaveNewService = async (data: ServiceRecord | QuoteRecord) => {
    try {
      const savedRecord = await operationsService.saveService(data);
      toast({ title: 'Registro Creado', description: `El registro #${savedRecord.id} se ha guardado.` });
      
      setServiceForPreview(savedRecord);
      setIsPreviewOpen(true);
      
    } catch (error) {
      console.error('Error creating service:', error);
      toast({ title: 'Error al Guardar', description: 'No se pudo crear el nuevo registro.', variant: 'destructive' });
    }
  };
  
  const handleVehicleCreated = async (newVehicle: VehicleFormValues) => {
      try {
        await inventoryService.addVehicle(newVehicle);
        toast({ title: 'Vehículo Creado', description: 'El nuevo vehículo ha sido registrado.' });
      } catch (error) {
        toast({ title: 'Error', description: 'No se pudo crear el vehículo', variant: 'destructive' });
      }
  };


  if (isLoading) {
      return <div className="flex h-64 w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /><span className="ml-3 text-lg">Cargando datos...</span></div>;
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
          technicians={technicians}
          inventoryItems={currentInventoryItems}
          serviceTypes={serviceTypes}
          onSubmit={handleSaveNewService}
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
          onOpenChange={(isOpen) => {
              setIsPreviewOpen(isOpen);
              if (!isOpen) {
                  const targetPath = serviceForPreview.status === 'Cotizacion' 
                      ? '/cotizaciones/historial' 
                      : '/servicios/historial';
                  router.push(targetPath);
              }
          }}
          service={serviceForPreview}
        />
      )}
    </>
  );
}
