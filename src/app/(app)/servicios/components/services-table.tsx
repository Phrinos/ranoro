
"use client";

import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Clock, CheckCircle, Wrench, CalendarCheck } from "lucide-react";
import type { ServiceRecord, Vehicle, Technician, InventoryItem, QuoteRecord } from "@/types";
import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { ServiceDialog } from './service-dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";


interface ServicesTableProps {
  services: ServiceRecord[];
  vehicles: Vehicle[]; 
  technicians: Technician[]; 
  inventoryItems: InventoryItem[];
  onServiceUpdated: (updatedService: ServiceRecord) => void;
  onServiceDeleted: (serviceId: string) => void;
  onVehicleCreated?: (newVehicle: Vehicle) => void; 
  isHistoryView?: boolean;
}

export function ServicesTable({ 
  services, 
  vehicles, 
  technicians, 
  inventoryItems, 
  onServiceUpdated, 
  onServiceDeleted,
  onVehicleCreated,
  isHistoryView = false,
}: ServicesTableProps) {
  const { toast } = useToast();
  const [editingService, setEditingService] = useState<ServiceRecord | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const getStatusVariant = (status: ServiceRecord['status']): "default" | "secondary" | "outline" | "destructive" | "success" => {
    switch (status) {
      case "Completado": return "success"; 
      case "Reparando": return "secondary"; 
      case "Cancelado": return "destructive"; 
      case "Agendado": return "default"; 
      default: return "default";
    }
  };
  
  const handleOpenEditDialog = (service: ServiceRecord) => {
    setEditingService(service);
    setIsEditDialogOpen(true);
  };

  const handleDialogSave = async (serviceDataFromForm: ServiceRecord | QuoteRecord) => {
    if (!('status' in serviceDataFromForm)) {
      toast({ title: "Error de Tipo", description: "Se esperaba un registro de servicio para actualizar.", variant: "destructive" });
      return;
    }
    const finalServiceData = { ...serviceDataFromForm, id: editingService!.id };
    onServiceUpdated(finalServiceData);
    setEditingService(null);
    setIsEditDialogOpen(false); 
  };

  const memoizedServices = useMemo(() => services.map(service => {
    const vehicle = vehicles.find(v => v.id === service.vehicleId);
    const technician = technicians.find(t => t.id === service.technicianId);
    const serviceDateObj = service.serviceDate ? parseISO(service.serviceDate) : null;
    const deliveryDateObj = service.deliveryDateTime ? parseISO(service.deliveryDateTime) : null;

    return {
      ...service,
      vehicleIdentifier: vehicle ? `${vehicle.make} ${vehicle.model} ${vehicle.licensePlate}` : String(service.vehicleId),
      vehiclePlate: vehicle ? vehicle.licensePlate : 'N/A',
      vehicleMakeModelYear: vehicle ? `${vehicle.make} ${vehicle.model} ${vehicle.year}` : 'N/A',
      technicianName: technician ? technician.name : service.technicianId,
      formattedServiceDate: serviceDateObj && isValid(serviceDateObj) ? format(serviceDateObj, "dd MMM yy, HH:mm", { locale: es }) : 'N/A',
      formattedDeliveryDateTime: deliveryDateObj && isValid(deliveryDateObj) ? format(deliveryDateObj, "dd MMM yy, HH:mm", { locale: es }) : 'N/A',
      totalCostFormatted: `$${service.totalCost.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      totalSuppliesCostFormatted: service.totalSuppliesCost !== undefined ? `$${service.totalSuppliesCost.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A',
      serviceProfitFormatted: service.serviceProfit !== undefined ? `$${service.serviceProfit.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A',
      mileageFormatted: service.mileage !== undefined && service.mileage !== null ? `${service.mileage.toLocaleString('es-ES')} km` : 'N/A',
    };
  }), [services, vehicles, technicians]);

  if (!memoizedServices.length) {
    return <p className="text-muted-foreground text-center py-8">No hay órdenes de servicio que coincidan con los filtros.</p>;
  }

  return (
    <>
      <div className="space-y-4">
        {memoizedServices.map((service) => {
          const serviceReceptionTime = service.serviceDate && isValid(parseISO(service.serviceDate)) ? format(parseISO(service.serviceDate), "HH:mm", { locale: es }) : 'N/A';
          const vehicle = vehicles.find(v => v.id === service.vehicleId);

          return (
            <Card key={service.id} className="shadow-sm">
              <CardContent className="p-0">
                <div className="flex items-center">
                    <div className="w-48 shrink-0 flex flex-col justify-center items-start text-left pl-6 py-4">
                        <p className="font-bold text-lg text-foreground">
                            {service.totalCostFormatted}
                        </p>
                         <p className="text-xs text-muted-foreground -mt-1">Costo</p>
                        <p className="font-semibold text-lg text-green-600 mt-1">
                            {service.serviceProfitFormatted}
                        </p>
                         <p className="text-xs text-muted-foreground -mt-1">Ganancia</p>
                    </div>
                    
                    <div className="flex-grow border-l border-r p-4 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1.5" title="Hora de Recepción">
                                {(service.status === 'Reparando' || service.status === 'Completado') ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Clock className="h-4 w-4" />}
                                <span>Recepción: {serviceReceptionTime}</span>
                            </div>
                            <div className="flex items-center gap-1.5" title="Fecha de Entrega">
                                {service.status === 'Completado' ? <CheckCircle className="h-4 w-4 text-green-600" /> : <CalendarCheck className="h-4 w-4" />}
                                <span>Entrega: {service.formattedDeliveryDateTime}</span>
                            </div>
                            <div className="flex items-center gap-1.5" title="ID de Servicio">
                                <span>ID: {service.id}</span>
                            </div>
                        </div>
                        <div className="mt-4 flex items-center gap-4">
                            <div className="flex-grow">
                                <h4 className="font-semibold text-lg" title={service.vehicleMakeModelYear}>
                                    {vehicle ? `${vehicle.licensePlate} - ${service.vehicleMakeModelYear}` : service.vehicleIdentifier}
                                </h4>
                                <p className="text-sm text-muted-foreground mt-1 truncate" title={service.description}>
                                    {service.description}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="w-48 shrink-0 flex flex-col items-center justify-center p-4 gap-y-2">
                        <div className="text-center">
                            <p className="font-medium text-sm truncate" title={service.technicianName}>{service.technicianName}</p>
                            <p className="text-xs text-muted-foreground -mt-1">Técnico</p>
                        </div>
                        <Badge variant={getStatusVariant(service.status)} className="w-full justify-center text-center">{service.status}</Badge>
                        <div className="flex">
                            <Button variant="ghost" size="icon" onClick={() => handleOpenEditDialog(services.find(s => s.id === service.id)!)} title="Editar Servicio">
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
                                        onClick={() => onServiceDeleted(service.id)}
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
        })}
      </div>

      {isEditDialogOpen && editingService && (
        <ServiceDialog
            open={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
            service={editingService} 
            vehicles={vehicles} 
            technicians={technicians}
            inventoryItems={inventoryItems}
            onSave={handleDialogSave as any}
            onVehicleCreated={onVehicleCreated} 
        />
      )}
    </>
  );
}
