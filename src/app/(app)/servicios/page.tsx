
"use client";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { ServicesTable } from "./components/services-table";
import { ServiceDialog } from "./components/service-dialog";
import { placeholderServiceRecords, placeholderVehicles, placeholderTechnicians, placeholderInventory } from "@/lib/placeholder-data";
import type { ServiceRecord, Vehicle } from "@/types";
import { useState, useEffect, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { isValid, parseISO, compareDesc, compareAsc } from "date-fns";
import { useRouter } from "next/navigation";

export default function ServiciosPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [services, setServices] = useState<ServiceRecord[]>(placeholderServiceRecords);
  const [vehicles, setVehicles] = useState<Vehicle[]>(placeholderVehicles); 
  const [technicians, setTechniciansState] = useState(placeholderTechnicians); 
  const [inventoryItems, setInventoryItemsState] = useState(placeholderInventory); 
  
  const [isNewServiceDialogOpen, setIsNewServiceDialogOpen] = useState(false);

  useEffect(() => {
    setServices(placeholderServiceRecords);
    setVehicles(placeholderVehicles);
  }, []);


  const handleSaveNewService = async (data: any) => {
    const serviceDate = data.serviceDate && isValid(new Date(data.serviceDate)) ? new Date(data.serviceDate).toISOString() : new Date().toISOString();
    const deliveryDateTime = data.deliveryDateTime && isValid(new Date(data.deliveryDateTime)) ? new Date(data.deliveryDateTime).toISOString() : undefined;
    
    const newService: ServiceRecord = {
      id: `S${String(services.length + 1).padStart(3, '0')}${Date.now().toString().slice(-3)}`,
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
      if (prev.find(v => v.id === newVehicle.id)) return prev;
      return [...prev, newVehicle];
    });
  };

  const sortedServicesForTable = useMemo(() => {
    const servicesToSort = [...services];
    servicesToSort.sort((a, b) => {
      const statusOrder = { "Agendado": 1, "Reparando": 2, "Completado": 3, "Cancelado": 3 };
      const statusAVal = statusOrder[a.status as keyof typeof statusOrder] || 4;
      const statusBVal = statusOrder[b.status as keyof typeof statusOrder] || 4;

      if (statusAVal !== statusBVal) {
        return statusAVal - statusBVal;
      }
      
      const dateA = parseISO(a.serviceDate);
      const dateB = parseISO(b.serviceDate);

      if (isValid(dateA) && isValid(dateB)) {
         const dateComparison = compareDesc(dateA, dateB);
         if (dateComparison !== 0) return dateComparison;
      }
      return a.id.localeCompare(b.id); // Fallback
    });
    return servicesToSort;
  }, [services]);


  return (
    <>
      <PageHeader
        title="Lista de Servicios"
        description="Visualiza, crea y actualiza las órdenes de servicio."
      />
      <ServicesTable 
        services={sortedServicesForTable} 
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

