
"use client";

import { useState, useEffect }
from 'react';
import { PageHeader } from "@/components/page-header";
import { ServiceDialog } from "../components/service-dialog";
import { placeholderVehicles, placeholderTechnicians, placeholderInventory, placeholderServiceRecords } from "@/lib/placeholder-data";
import type { ServiceRecord, Vehicle } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';

export default function NuevoServicioPage() {
  const { toast } = useToast();
  const router = useRouter();
  
  // Manage local state for vehicles that might be created on this page
  const [vehicles, setVehicles] = useState<Vehicle[]>(placeholderVehicles);
  const technicians = placeholderTechnicians; // Assuming static for now
  const inventoryItems = placeholderInventory; // Assuming static for now

  // The dialog should always be open on this page
  const [isDialogOpen, setIsDialogOpen] = useState(true); 

  useEffect(() => {
    // Ensure dialog is open when component mounts
    setIsDialogOpen(true);
  }, []);

  const handleSaveNewService = async (data: any) => {
    const newService: ServiceRecord = {
      id: `S${String(placeholderServiceRecords.length + 1).padStart(3, '0')}${Date.now().toString().slice(-3)}`,
      vehicleId: data.vehicleId, 
      description: data.description,
      technicianId: data.technicianId,
      status: data.status,
      notes: data.notes,
      mileage: data.mileage,
      suppliesUsed: data.suppliesUsed,
      serviceDate: format(new Date(data.serviceDate), 'yyyy-MM-dd'),
      totalCost: Number(data.totalServicePrice), 
      totalSuppliesCost: Number(data.totalSuppliesCost),
      serviceProfit: Number(data.serviceProfit),
    };
    placeholderServiceRecords.push(newService); 
    
    toast({
      title: "Servicio Creado",
      description: `El nuevo servicio para ${vehicles.find(v => v.id === newService.vehicleId)?.licensePlate} ha sido registrado. Se redireccionará a la lista.`,
    });
    setIsDialogOpen(false); 
    router.push('/servicios'); 
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    router.push('/servicios'); 
  };

  const handleVehicleCreated = (newVehicle: Vehicle) => {
    // This updates the local 'vehicles' state used by the dialog on this page.
    setVehicles(prev => {
      if (prev.find(v => v.id === newVehicle.id)) return prev; // Avoid duplicates
      return [...prev, newVehicle];
    });
    // The global placeholderVehicles is updated by the VehicleDialog/Form itself in this demo setup.
  };

  return (
    <>
      <PageHeader
        title="Registrar Nuevo Servicio"
        description="Complete los detalles para la nueva orden de servicio."
      />
      <ServiceDialog
        open={isDialogOpen}
        onOpenChange={(isOpen) => {
          if (!isOpen) { // If dialog is being closed (e.g. by X or Esc)
            handleDialogClose();
          } else {
            setIsDialogOpen(true);
          }
        }}
        service={null} 
        vehicles={vehicles}
        technicians={technicians}
        inventoryItems={inventoryItems}
        onSave={handleSaveNewService}
        onVehicleCreated={handleVehicleCreated}
      />
      {!isDialogOpen && <p className="text-center text-muted-foreground">Redireccionando...</p>}
    </>
  );
}
