
"use client";

import { useState, useEffect } from 'react';
import { PageHeader } from "@/components/page-header";
import { ServiceDialog } from "../components/service-dialog";
import { placeholderVehicles, placeholderTechnicians, placeholderInventory, placeholderServiceRecords } from "@/lib/placeholder-data";
import type { ServiceRecord, Vehicle } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from 'next/navigation';
import { isValid, parseISO } from 'date-fns';

export default function NuevoServicioPage() {
  const { toast } = useToast();
  const router = useRouter();
  
  const [vehicles, setVehicles] = useState<Vehicle[]>(placeholderVehicles);
  const technicians = placeholderTechnicians; 
  const inventoryItems = placeholderInventory; 

  const [isDialogOpen, setIsDialogOpen] = useState(true); 

  useEffect(() => {
    setIsDialogOpen(true);
  }, []);

  const handleSaveNewService = async (data: any) => {
    const serviceDate = data.serviceDate && isValid(new Date(data.serviceDate)) ? new Date(data.serviceDate).toISOString() : new Date().toISOString();
    const deliveryDateTime = data.deliveryDateTime && isValid(new Date(data.deliveryDateTime)) ? new Date(data.deliveryDateTime).toISOString() : undefined;

    const newService: ServiceRecord = {
      id: `S${String(placeholderServiceRecords.length + 1).padStart(3, '0')}${Date.now().toString().slice(-3)}`,
      vehicleId: data.vehicleId, 
      description: data.description,
      technicianId: data.technicianId,
      status: data.status || "Agendado", 
      notes: data.notes,
      mileage: data.mileage,
      suppliesUsed: data.suppliesUsed,
      serviceDate: serviceDate,
      deliveryDateTime: deliveryDateTime,
      totalCost: Number(data.totalServicePrice), 
      totalSuppliesCost: Number(data.totalSuppliesCost),
      serviceProfit: Number(data.serviceProfit),
    };
    placeholderServiceRecords.push(newService); 
    
    toast({
      title: "Servicio Creado",
      description: `El nuevo servicio para ${vehicles.find(v => v.id === newService.vehicleId)?.licensePlate} ha sido registrado. Se redireccionará a la agenda.`,
    });
    setIsDialogOpen(false); 
    router.push('/servicios/agenda'); 
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    router.push('/servicios/agenda'); 
  };

  const handleVehicleCreated = (newVehicle: Vehicle) => {
    setVehicles(prev => {
      if (prev.find(v => v.id === newVehicle.id)) return prev; 
      return [...prev, newVehicle];
    });
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
          if (!isOpen) { 
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

