
"use client";

import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Ban, Clock, CheckCircle, Wrench, CalendarCheck, FileText } from "lucide-react";
import type { ServiceRecord, Vehicle, Technician, InventoryItem, QuoteRecord } from "@/types";
import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { ServiceDialog } from './service-dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ServicesTableProps {
  services: ServiceRecord[];
  vehicles: Vehicle[]; 
  technicians: Technician[]; 
  inventoryItems: InventoryItem[];
  onServiceUpdated: (updatedService: ServiceRecord) => void;
  onServiceCancelled: (serviceId: string, reason: string) => void;
  onVehicleCreated?: (newVehicle: Vehicle) => void; 
  onShowSheet?: (service: ServiceRecord) => void;
  isHistoryView?: boolean;
}

export const ServicesTable = React.memo(({ 
  services, 
  vehicles, 
  technicians, 
  inventoryItems, 
  onServiceUpdated, 
  onServiceCancelled,
  onVehicleCreated,
  onShowSheet,
  isHistoryView = false,
}: ServicesTableProps) => {
  const { toast } = useToast();
  const [editingService, setEditingService] = useState<ServiceRecord | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');

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
                            <div className="flex items-center gap-1.5" title="Técnico">
                                <Wrench className="h-4 w-4" />
                                <span>{service.technicianName}</span>
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
                        <Badge variant={getStatusVariant(service.status)} className="w-full justify-center text-center text-base">{service.status}</Badge>
                        <div className="flex">
                            {onShowSheet && (
                                <Button variant="ghost" size="icon" onClick={() => onShowSheet(services.find(s => s.id === service.id)!)} title="Ver Hoja de Servicio">
                                    <FileText className="h-4 w-4" />
                                </Button>
                            )}
                            <Button variant="ghost" size="icon" onClick={() => handleOpenEditDialog(services.find(s => s.id === service.id)!)} title="Editar Servicio">
                                <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog onOpenChange={(open) => !open && setCancellationReason('')}>
                                <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" title="Cancelar Servicio" disabled={service.status === 'Cancelado'}>
                                    <Ban className="h-4 w-4 text-destructive" />
                                </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                    <AlertDialogTitle>¿Cancelar Servicio?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Esta acción no se puede deshacer. El servicio se marcará como cancelado.
                                      <div className="mt-4">
                                        <Label htmlFor={`cancel-reason-${service.id}`} className="text-left font-semibold">Motivo de la cancelación (obligatorio)</Label>
                                        <Textarea
                                            id={`cancel-reason-${service.id}`}
                                            placeholder="Ej: El cliente no se presentó, no se consiguieron las refacciones..."
                                            value={cancellationReason}
                                            onChange={(e) => setCancellationReason(e.target.value)}
                                            className="mt-2"
                                        />
                                      </div>
                                    </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                    <AlertDialogCancel>Cerrar</AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={() => {
                                            onServiceCancelled(service.id, cancellationReason);
                                        }}
                                        disabled={!cancellationReason.trim()}
                                        className="bg-destructive hover:bg-destructive/90"
                                    >
                                        Confirmar Cancelación
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
});

ServicesTable.displayName = 'ServicesTable';
