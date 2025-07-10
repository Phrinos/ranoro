

"use client";

import { useState, useEffect, useRef } from 'react';
import { PageHeader } from "@/components/page-header";
import { ServiceDialog } from "../components/service-dialog";
import { UnifiedPreviewDialog } from '@/components/shared/unified-preview-dialog';
import { placeholderVehicles, placeholderTechnicians, placeholderInventory, persistToFirestore, hydrateReady } from "@/lib/placeholder-data"; 
import type { ServiceRecord, Vehicle, Technician, InventoryItem, QuoteRecord } from '@/types'; 
import { useToast } from "@/hooks/use-toast";
import { useRouter } from 'next/navigation';

type DialogStep = 'form' | 'preview' | 'closed';

export default function NuevoServicioPage() {
  const { toast } = useToast(); 
  const router = useRouter();
  
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const [dialogStep, setDialogStep] = useState<DialogStep>('form');
  const [lastSavedRecord, setLastSavedRecord] = useState<ServiceRecord | null>(null);
  
  useEffect(() => {
    hydrateReady.then(() => {
      setVehicles([...placeholderVehicles]);
      setTechnicians([...placeholderTechnicians]);
      setInventoryItems([...placeholderInventory]);
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (dialogStep === 'closed') {
      router.push('/cotizaciones/historial'); // Redirect to quotes list
    }
  }, [dialogStep, router]);

  const handleSaveComplete = (data: ServiceRecord | QuoteRecord) => {
    const savedRecord = data as ServiceRecord;
    setLastSavedRecord(savedRecord);
    setDialogStep('preview');
  };

  const handleFormDialogClose = () => { 
     if (dialogStep === 'form') { 
      router.push('/dashboard'); 
    }
  };
  
  const handlePreviewDialogClose = () => {
    setLastSavedRecord(null); 
    setDialogStep('closed'); 
  };
  
  const handleVehicleCreated = (newVehicle: Vehicle) => {
    setVehicles(prev => [...prev, newVehicle]);
    placeholderVehicles.push(newVehicle); // Also update the global placeholder
    persistToFirestore(['vehicles']);
  };

  if (!hydrated) {
    return <div className="text-center py-10">Cargando...</div>;
  }

  return (
    <>
      <PageHeader
        title="Nuevo Registro"
        description="Crear una nueva cotización o una orden de servicio."
      />
      {dialogStep === 'form' && (
        <ServiceDialog
          open={true} 
          onOpenChange={(isOpen) => { 
            if (!isOpen) handleFormDialogClose();
          }}
          service={null} 
          vehicles={vehicles}
          technicians={technicians}
          inventoryItems={inventoryItems}
          onSave={async (data) => {
            handleSaveComplete(data as ServiceRecord);
          }}
          onVehicleCreated={handleVehicleCreated}
          mode="quote"
        />
      )}
      
      {dialogStep === 'preview' && lastSavedRecord && (
        <UnifiedPreviewDialog
          open={true}
          onOpenChange={(isOpen) => !isOpen && handlePreviewDialogClose()}
          service={lastSavedRecord}
        />
      )}

      {dialogStep === 'closed' && <p className="text-center text-muted-foreground">Redireccionando...</p>}
    </>
  );
}
