

"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from 'lucide-react';
import { PageHeader } from "@/components/page-header";
import { ServiceForm } from "../components/service-form";
import { operationsService, inventoryService, personnelService } from '@/lib/services';
import type { ServiceRecord, Vehicle, Technician, InventoryItem, ServiceTypeRecord, QuoteRecord, WorkshopInfo } from "@/types";
import { Button } from '@/components/ui/button';
import { UnifiedPreviewDialog } from '@/components/shared/unified-preview-dialog';


// This page now renders the form for creating a new service record locally.
export default function NuevoServicioPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceTypeRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [serviceForPreview, setServiceForPreview] = useState<ServiceRecord | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);


  useEffect(() => {
    const unsubs = [
      inventoryService.onVehiclesUpdate(setVehicles),
      personnelService.onTechniciansUpdate(setTechnicians),
      inventoryService.onItemsUpdate(setInventoryItems),
      inventoryService.onServiceTypesUpdate((data) => {
        setServiceTypes(data);
        setIsLoading(false);
      }),
    ];
    return () => unsubs.forEach(unsub => unsub());
  }, []);

  const handleSaveNewService = async (data: ServiceRecord | QuoteRecord) => {
    try {
      const savedRecord = await operationsService.saveService(data);
      toast({ title: 'Registro Creado', description: `El registro #${savedRecord.id} se ha guardado.` });
      
      // Open the preview dialog immediately after saving a new record
      setServiceForPreview(savedRecord);
      setIsPreviewOpen(true);
      
    } catch (error) {
      console.error('Error creating service:', error);
      toast({ title: 'Error al Guardar', description: 'No se pudo crear el nuevo registro.', variant: 'destructive' });
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
      <ServiceForm
        vehicles={vehicles}
        technicians={technicians}
        inventoryItems={inventoryItems}
        serviceTypes={serviceTypes}
        onSubmit={handleSaveNewService}
        onClose={() => router.push('/servicios/historial')}
        mode="quote" // Start as a quote by default
      >
        <div className="flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => router.push('/servicios/historial')}>Cancelar</Button>
            <Button type="submit" form="service-form">
                Crear Registro
            </Button>
        </div>
      </ServiceForm>
      
      {serviceForPreview && (
        <UnifiedPreviewDialog
          open={isPreviewOpen}
          onOpenChange={(isOpen) => {
              setIsPreviewOpen(isOpen);
              // If dialog is closed, redirect to the appropriate history page
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
