
"use client";

import { useState, useEffect } from 'react';
import { PageHeader } from "@/components/page-header";
import { ServiceDialog } from "../components/service-dialog";
import { PrintTicketDialog } from '@/components/ui/print-ticket-dialog';
import { TicketContent } from '@/components/ticket-content';
import { placeholderVehicles, placeholderTechnicians, placeholderInventory, placeholderServiceRecords } from "@/lib/placeholder-data";
import type { ServiceRecord, Vehicle, Technician } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from 'next/navigation';
import { isValid, parseISO } from 'date-fns';

export default function NuevoServicioPage() {
  const { toast } = useToast();
  const router = useRouter();
  
  const [vehicles, setVehicles] = useState<Vehicle[]>(placeholderVehicles);
  const technicians = placeholderTechnicians; 
  const inventoryItems = placeholderInventory; 

  const [isServiceDialogOpen, setIsServiceDialogOpen] = useState(true); 
  const [showPrintTicketDialog, setShowPrintTicketDialog] = useState(false);
  const [currentServiceForTicket, setCurrentServiceForTicket] = useState<ServiceRecord | null>(null);
  const [currentVehicleForTicket, setCurrentVehicleForTicket] = useState<Vehicle | null>(null);
  const [currentTechnicianForTicket, setCurrentTechnicianForTicket] = useState<Technician | null>(null);


  useEffect(() => {
    setIsServiceDialogOpen(true);
  }, []);

  const handleSaveNewService = async (serviceData: ServiceRecord) => {
    const newService: ServiceRecord = {
      ...serviceData,
      id: `S${String(placeholderServiceRecords.length + 1).padStart(3, '0')}${Date.now().toString().slice(-3)}`,
    };
    placeholderServiceRecords.push(newService); 
    
    toast({
      title: "Servicio Creado",
      description: `El nuevo servicio para ${vehicles.find(v => v.id === newService.vehicleId)?.licensePlate} ha sido registrado.`,
    });
    
    setIsServiceDialogOpen(false); 

    if (newService.status === 'Completado') {
      setCurrentServiceForTicket(newService);
      setCurrentVehicleForTicket(vehicles.find(v => v.id === newService.vehicleId) || null);
      setCurrentTechnicianForTicket(technicians.find(t => t.id === newService.technicianId) || null);
      setShowPrintTicketDialog(true);
    } else {
      router.push('/servicios/agenda');
    }
  };

  const handleServiceDialogClose = (isOpen: boolean) => {
    setIsServiceDialogOpen(isOpen);
    if (!isOpen && !currentServiceForTicket) { // Closed without saving or completing
        router.push('/servicios/agenda'); 
    }
  };

  const handlePrintDialogClose = () => {
    setShowPrintTicketDialog(false);
    setCurrentServiceForTicket(null);
    router.push('/servicios/agenda'); 
  };


  const handleVehicleCreated = (newVehicle: Vehicle) => {
    setVehicles(prev => {
      if (prev.find(v => v.id === newVehicle.id)) return prev; 
      return [...prev, newVehicle];
    });
     // Also update the global placeholder if necessary for other parts of the app
    const existsInGlobal = placeholderVehicles.some(v => v.id === newVehicle.id);
    if (!existsInGlobal) {
        placeholderVehicles.push(newVehicle);
    }
  };

  return (
    <>
      <PageHeader
        title="Registrar Nuevo Servicio"
        description="Complete los detalles para la nueva orden de servicio."
      />
      {isServiceDialogOpen && (
        <ServiceDialog
          open={isServiceDialogOpen}
          onOpenChange={handleServiceDialogClose}
          service={null} 
          vehicles={vehicles}
          technicians={technicians}
          inventoryItems={inventoryItems}
          onSave={handleSaveNewService}
          onVehicleCreated={handleVehicleCreated}
        />
      )}

      {currentServiceForTicket && (
        <PrintTicketDialog
          open={showPrintTicketDialog}
          onOpenChange={setShowPrintTicketDialog} 
          title="Comprobante de Servicio"
          onDialogClose={handlePrintDialogClose}
        >
          <TicketContent 
            service={currentServiceForTicket} 
            vehicle={currentVehicleForTicket || undefined}
            technician={currentTechnicianForTicket || undefined}
          />
        </PrintTicketDialog>
      )}

      {!isServiceDialogOpen && !showPrintTicketDialog && <p className="text-center text-muted-foreground">Redireccionando...</p>}
    </>
  );
}
