
"use client";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { ServicesTable } from "../components/services-table"; 
import { ServiceDialog } from "../components/service-dialog"; 
import { placeholderServiceRecords, placeholderVehicles, placeholderTechnicians, placeholderInventory } from "@/lib/placeholder-data";
import type { ServiceRecord, Vehicle } from "@/types";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useRouter } from "next/navigation";

export default function HistorialServiciosPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [services, setServices] = useState<ServiceRecord[]>(placeholderServiceRecords);
  const [vehicles, setVehicles] = useState<Vehicle[]>(placeholderVehicles); 
  const [technicians, setTechniciansState] = useState(placeholderTechnicians);
  const [inventoryItems, setInventoryItemsState] = useState(placeholderInventory);
  
  const [isNewServiceDialogOpen, setIsNewServiceDialogOpen] = useState(false); // For opening new service dialog from here

   // Effect to re-sync if global placeholders change
  useEffect(() => {
    setServices(placeholderServiceRecords);
    setVehicles(placeholderVehicles);
  }, []);


  const handleSaveNewService = async (data: any) => { // For creating a service from this page's dialog
    const newService: ServiceRecord = {
      id: `S${String(services.length + 1).padStart(3, '0')}${Date.now().toString().slice(-3)}`,
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
    const updatedServices = [...services, newService];
    setServices(updatedServices);
    placeholderServiceRecords.push(newService); 
    
    toast({
      title: "Servicio Creado",
      description: `El nuevo servicio para ${vehicles.find(v => v.id === newService.vehicleId)?.licensePlate} ha sido registrado.`,
    });
    setIsNewServiceDialogOpen(false);
  };

  const handleUpdateService = (updatedService: ServiceRecord) => {
    setServices(prevServices => 
        prevServices.map(s => s.id === updatedService.id ? updatedService : s)
    );
    const pIndex = placeholderServiceRecords.findIndex(s => s.id === updatedService.id);
    if (pIndex !== -1) {
        placeholderServiceRecords[pIndex] = updatedService;
    }
  };

  const handleDeleteService = (serviceId: string) => {
     const serviceToDelete = services.find(s => s.id === serviceId);
    setServices(prevServices => prevServices.filter(s => s.id !== serviceId));
    const pIndex = placeholderServiceRecords.findIndex(s => s.id === serviceId);
    if (pIndex !== -1) {
        placeholderServiceRecords.splice(pIndex, 1);
    }
    toast({
      title: "Servicio Eliminado",
      description: `El servicio con ID ${serviceId} (${serviceToDelete?.description}) ha sido eliminado.`,
    });
  };

  const handleVehicleCreated = (newVehicle: Vehicle) => {
    setVehicles(prev => {
      if(prev.find(v=> v.id === newVehicle.id)) return prev;
      return [...prev, newVehicle];
    });
  };

  return (
    <>
      <PageHeader
        title="Historial de Servicios"
        description="Consulta todas las órdenes de servicio registradas."
        actions={
          <Button onClick={() => router.push('/servicios/nuevo')}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Nuevo Servicio
          </Button>
        }
      />
      <ServicesTable 
        services={services.sort((a,b) => new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime())} 
        vehicles={vehicles}
        technicians={technicians}
        inventoryItems={inventoryItems}
        onServiceUpdated={handleUpdateService}
        onServiceDeleted={handleDeleteService}
        onVehicleCreated={handleVehicleCreated}
      />
       {isNewServiceDialogOpen && (
        <ServiceDialog
          open={isNewServiceDialogOpen}
          onOpenChange={setIsNewServiceDialogOpen}
          service={null}
          vehicles={vehicles}
          technicians={technicians}
          inventoryItems={inventoryItems}
          onSave={handleSaveNewService}
          onVehicleCreated={handleVehicleCreated}
        />
      )}
    </>
  );
}
