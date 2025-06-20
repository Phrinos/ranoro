
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

type DialogStep = 'service' | 'print' | 'closed';

export default function NuevoServicioPage() {
  const { toast } = useToast();
  const router = useRouter();
  
  const [vehicles, setVehicles] = useState<Vehicle[]>(placeholderVehicles);
  const technicians = placeholderTechnicians; 
  const inventoryItems = placeholderInventory; 

  const [dialogStep, setDialogStep] = useState<DialogStep>('service');
  const [currentServiceForTicket, setCurrentServiceForTicket] = useState<ServiceRecord | null>(null);
  const [currentVehicleForTicket, setCurrentVehicleForTicket] = useState<Vehicle | null>(null);
  const [currentTechnicianForTicket, setCurrentTechnicianForTicket] = useState<Technician | null>(null);

  useEffect(() => {
    if (dialogStep === 'closed') {
      router.push('/servicios/agenda');
    }
  }, [dialogStep, router]);

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
    
    if (newService.status === 'Completado') {
      setCurrentServiceForTicket(newService);
      setCurrentVehicleForTicket(vehicles.find(v => v.id === newService.vehicleId) || null);
      setCurrentTechnicianForTicket(technicians.find(t => t.id === newService.technicianId) || null);
      setDialogStep('print');
    } else {
      setDialogStep('closed'); 
    }
  };

  const handleServiceDialogExternalClose = () => { // Called when ServiceDialog is closed by X or overlay
     if (dialogStep === 'service') { // Only redirect if it was closed from 'service' step without completion
      setDialogStep('closed');
    }
  };

  const handlePrintDialogClose = () => {
    setCurrentServiceForTicket(null);
    setCurrentVehicleForTicket(null);
    setCurrentTechnicianForTicket(null);
    setDialogStep('closed'); 
  };

  const handleVehicleCreated = (newVehicle: Vehicle) => {
    setVehicles(prev => {
      if (prev.find(v => v.id === newVehicle.id)) return prev; 
      const updatedVehicles = [...prev, newVehicle];
      if (!placeholderVehicles.find(v => v.id === newVehicle.id)) {
         placeholderVehicles.push(newVehicle);
      }
      return updatedVehicles;
    });
  };

  return (
    <>
      <PageHeader
        title="Registrar Nuevo Servicio"
        description="Complete los detalles para la nueva orden de servicio."
      />
      {dialogStep === 'service' && (
        <ServiceDialog
          open={true}
          onOpenChange={(isOpen) => {
             if (!isOpen) handleServiceDialogExternalClose();
          }}
          service={null} 
          vehicles={vehicles}
          technicians={technicians}
          inventoryItems={inventoryItems}
          onSave={handleSaveNewService}
          onVehicleCreated={handleVehicleCreated}
        />
      )}

      {dialogStep === 'print' && currentServiceForTicket && (
        <PrintTicketDialog
          open={true}
          onOpenChange={(isOpen) => {
            if (!isOpen) handlePrintDialogClose();
          }} 
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

      {dialogStep === 'closed' && <p className="text-center text-muted-foreground">Redireccionando...</p>}
    </>
  );
}
