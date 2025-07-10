

"use client";

import { useState, useEffect, useRef } from 'react';
import { PageHeader } from "@/components/page-header";
import { ServiceDialog } from "../components/service-dialog";
import { placeholderVehicles, placeholderTechnicians, placeholderInventory, placeholderServiceRecords, persistToFirestore } from "@/lib/placeholder-data"; 
import type { ServiceRecord, Vehicle, Technician, InventoryItem, WorkshopInfo, QuoteRecord } from '@/types'; 
import { useToast } from "@/hooks/use-toast";
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Printer, Copy, MessageSquare } from 'lucide-react';
import { UnifiedPreviewDialog } from '@/components/shared/unified-preview-dialog';

type DialogStep = 'form' | 'preview' | 'closed';

export default function NuevoServicioPage() {
  const { toast } = useToast(); 
  const router = useRouter();
  
  const [vehicles, setVehicles] = useState<Vehicle[]>(placeholderVehicles);
  const technicians = placeholderTechnicians; 
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>(placeholderInventory);

  const [dialogStep, setDialogStep] = useState<DialogStep>('form');
  const [lastSavedRecord, setLastSavedRecord] = useState<ServiceRecord | null>(null);

  useEffect(() => {
    const handleDatabaseUpdate = () => {
      setVehicles([...placeholderVehicles]);
      setInventoryItems([...placeholderInventory]);
    };
    window.addEventListener('databaseUpdated', handleDatabaseUpdate);

    return () => {
      window.removeEventListener('databaseUpdated', handleDatabaseUpdate);
    };
  }, []);

  useEffect(() => {
    if (dialogStep === 'closed') {
      router.push('/servicios/agenda'); // Redirect after closing preview
    }
  }, [dialogStep, router]);

  const handleSaveComplete = (data: ServiceRecord | QuoteRecord) => {
    const savedRecord = data as ServiceRecord;
    setLastSavedRecord(savedRecord);
    setDialogStep('preview');
  };

  const handleFormDialogClose = () => { 
     if (dialogStep === 'form') { 
      router.push('/servicios/agenda'); // Go back if form is closed without saving
    }
  };
  
  const handlePreviewDialogClose = () => {
    setLastSavedRecord(null); 
    setDialogStep('closed'); 
  };
  
  const handleVehicleCreated = (newVehicle: Vehicle) => {
    setVehicles(prev => [...prev, newVehicle]);
  };

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
          mode="service" // Start in service mode by default
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
