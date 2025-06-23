
"use client";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle, Edit, Trash2, Clock, CheckCircle, Wrench, CalendarCheck } from "lucide-react";
import { ServiceDialog } from "./components/service-dialog";
import { placeholderServiceRecords, placeholderVehicles, placeholderTechnicians, placeholderInventory } from "@/lib/placeholder-data";
import type { ServiceRecord, Vehicle, Technician, QuoteRecord } from "@/types";
import { useState, useEffect, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { isValid, parseISO, compareDesc, compareAsc, format } from "date-fns";
import { es } from 'date-fns/locale';
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export default function ServiciosPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [services, setServices] = useState<ServiceRecord[]>(placeholderServiceRecords);
  const [vehicles, setVehicles] = useState<Vehicle[]>(placeholderVehicles); 
  const [technicians, setTechniciansState] = useState(placeholderTechnicians); 
  const [inventoryItems, setInventoryItemsState] = useState(placeholderInventory); 
  
  const [isServiceDialogOpen, setIsServiceDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceRecord | null>(null);

  useEffect(() => {
    setServices(placeholderServiceRecords);
    setVehicles(placeholderVehicles);
    setTechniciansState(placeholderTechnicians);
    setInventoryItemsState(placeholderInventory);
  }, []);
  
  const handleOpenDialog = (service: ServiceRecord | null = null) => {
    setEditingService(service);
    setIsServiceDialogOpen(true);
  };

  const handleSaveService = async (data: ServiceRecord | QuoteRecord) => {
     if (!('status' in data)) { // Ensure it's a ServiceRecord
        toast({ title: "Error de tipo", description: "Se intentó guardar una cotización como servicio.", variant: "destructive" });
        return; 
    }
    const serviceData = data as ServiceRecord;

    if (editingService) {
      const updatedService = { ...editingService, ...serviceData };
      setServices(services.map(s => s.id === updatedService.id ? updatedService : s));
      const pIndex = placeholderServiceRecords.findIndex(s => s.id === updatedService.id);
      if (pIndex !== -1) placeholderServiceRecords[pIndex] = updatedService;
      
      toast({
        title: "Servicio Actualizado",
        description: `El servicio ${updatedService.id} ha sido actualizado.`,
      });
    } else {
      const newService: ServiceRecord = {
        ...serviceData,
        id: `S${String(services.length + 1).padStart(3, '0')}${Date.now().toString().slice(-3)}`,
      };
      setServices(prev => [...prev, newService]);
      placeholderServiceRecords.push(newService);
      toast({
        title: "Servicio Creado",
        description: `El nuevo servicio para ${vehicles.find(v => v.id === newService.vehicleId)?.licensePlate} ha sido registrado.`,
      });
    }

    setIsServiceDialogOpen(false);
    setEditingService(null);
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
      const updatedList = [...prev, newVehicle];
      if(!placeholderVehicles.find(v => v.id === newVehicle.id)) {
        placeholderVehicles.push(newVehicle);
      }
      return updatedList;
    });
  };

  const sortedServicesForList = useMemo(() => {
    return [...services].sort((a, b) => {
      const statusOrder = { "Agendado": 1, "Reparando": 2, "Completado": 3, "Cancelado": 4 };
      const statusAVal = statusOrder[a.status as keyof typeof statusOrder] || 5;
      const statusBVal = statusOrder[b.status as keyof typeof statusOrder] || 5;

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
  }, [services]);

  const getStatusVariant = (status: ServiceRecord['status']): "default" | "secondary" | "outline" | "destructive" | "success" => {
    switch (status) {
      case "Completado": return "success"; 
      case "Reparando": return "secondary"; 
      case "Cancelado": return "destructive"; 
      case "Agendado": return "default"; 
      default: return "default";
    }
  };


  return (
    <>
      <div className="space-y-4">
        {sortedServicesForList.length > 0 ? sortedServicesForList.map(service => {
              const vehicle = vehicles.find(v => v.id === service.vehicleId);
              const technician = technicians.find(t => t.id === service.technicianId);
              
              const formattedDelivery = service.deliveryDateTime && isValid(parseISO(service.deliveryDateTime))
                  ? format(parseISO(service.deliveryDateTime), "dd MMM, HH:mm", { locale: es })
                  : 'N/A';
              
              const serviceReceptionTime = service.serviceDate && isValid(parseISO(service.serviceDate)) ? format(parseISO(service.serviceDate), "HH:mm", { locale: es }) : 'N/A';

              return (
                <Card key={service.id} className="shadow-sm">
                  <CardContent className="p-0">
                    <div className="flex items-center">
                        <div className="w-48 shrink-0 flex flex-col justify-center items-start text-left pl-6">
                            <p className="text-xs text-muted-foreground">ID Servicio</p>
                            <p className="font-semibold text-lg text-foreground">
                                {service.id}
                            </p>
                            <p className="text-xs text-muted-foreground mt-2">Costo</p>
                            <p className="font-bold text-2xl text-foreground">
                                ${service.totalCost.toLocaleString('es-ES')}
                            </p>
                        </div>
                        
                        <div className="flex-grow border-l border-r p-4 space-y-3">
                            {/* Top line */}
                            <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1.5" title="Hora de Recepción">
                                    {(service.status === 'Reparando' || service.status === 'Completado') ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Clock className="h-4 w-4" />}
                                    <span>Recepción: {serviceReceptionTime}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Wrench className="h-4 w-4" />
                                    <span>{technician ? technician.name : 'N/A'}</span>
                                </div>
                                <div className="flex items-center gap-1.5" title="Fecha de Entrega">
                                    {service.status === 'Completado' ? <CheckCircle className="h-4 w-4 text-green-600" /> : <CalendarCheck className="h-4 w-4" />}
                                    <span>Entrega: {formattedDelivery}</span>
                                </div>
                            </div>
                             {/* Bottom part */}
                            <div className="mt-4 flex items-center gap-4">
                                <div className="flex-grow">
                                    <h4 className="font-semibold text-base">
                                        {vehicle ? `${vehicle.licensePlate} - ${vehicle.make} ${vehicle.model} ${vehicle.year}` : `Vehículo ID: ${service.vehicleId}`}
                                    </h4>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {service.description}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Actions Column */}
                        <div className="w-48 shrink-0 flex flex-col items-center justify-center p-4 gap-y-2">
                             <Badge variant={getStatusVariant(service.status)} className="w-full justify-center text-center">{service.status}</Badge>
                            <div className="flex">
                                <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(service)} title="Editar Servicio">
                                    <Edit className="h-4 w-4" />
                                </Button>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" title="Eliminar Servicio">
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>¿Eliminar Servicio?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                        Esta acción no se puede deshacer. ¿Seguro que quieres eliminar este servicio?
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction
                                        onClick={() => handleDeleteService(service.id)}
                                        className="bg-destructive hover:bg-destructive/90"
                                        >
                                        Sí, Eliminar
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </div>
                    </div>
                  </CardContent>
                </Card>
              );
            }) : <p className="text-muted-foreground text-center py-8">No hay órdenes de servicio registradas.</p>}
      </div>

      <div className="mt-6">
        <PageHeader
          title="Lista de Servicios"
          description="Visualiza, crea y actualiza las órdenes de servicio."
          actions={
              <Button onClick={() => handleOpenDialog()}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Nuevo Servicio
              </Button>
          }
        />
      </div>
      
      {isServiceDialogOpen && (
        <ServiceDialog
          open={isServiceDialogOpen}
          onOpenChange={setIsServiceDialogOpen}
          service={editingService} 
          vehicles={vehicles} 
          technicians={technicians}
          inventoryItems={inventoryItems}
          onSave={handleSaveService}
          onVehicleCreated={handleVehicleCreated}
          mode="service"
        />
      )}
    </>
  );
}
