
"use client";

import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, DollarSign, Wrench, Calendar, User, Tag, FileText, TrendingUp, CalendarCheck } from "lucide-react";
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
      vehicleIdentifier: vehicle ? `${vehicle.make} ${vehicle.model} (${vehicle.licensePlate})` : String(service.vehicleId),
      vehiclePlate: vehicle ? vehicle.licensePlate : 'N/A',
      vehicleMakeModelYear: vehicle ? `${vehicle.make} ${vehicle.model} (${vehicle.year})` : 'N/A',
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
        {memoizedServices.map((service) => (
          <Card key={service.id} className="shadow-sm">
            <CardContent className="p-4 space-y-3">
              {/* Linea 1 */}
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <span className="font-bold text-primary">{service.id}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{service.formattedServiceDate}</span>
                </div>
                <div className="flex items-center gap-2 text-sm font-medium text-foreground flex-1 min-w-[200px]">
                  <Wrench className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate" title={`${service.vehicleMakeModelYear} - ${service.mileageFormatted}`}>
                    {service.vehicleMakeModelYear} - {service.mileageFormatted}
                  </span>
                </div>
                <div className="flex items-center gap-2 font-semibold text-lg text-foreground">
                  <DollarSign className="h-5 w-5 text-muted-foreground"/>
                  <span>{service.totalCostFormatted}</span>
                </div>
                <div>
                  <Badge variant={getStatusVariant(service.status)}>{service.status}</Badge>
                </div>
              </div>

              <div className="border-t border-dashed -mx-4 my-2"></div>
              
              {/* Linea 2 */}
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                 <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <DollarSign className="h-4 w-4"/>
                    <span>Costo: {service.totalSuppliesCostFormatted}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarCheck className="h-4 w-4" />
                  <span>Entrega: {service.formattedDeliveryDateTime}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-foreground flex-1 min-w-[300px]">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <p className="truncate" title={`${service.description} (Téc: ${service.technicianName})`}>
                    {service.description} <span className="text-muted-foreground">({service.technicianName})</span>
                  </p>
                </div>
                <div className="flex items-center gap-2 font-semibold text-green-600">
                  <TrendingUp className="h-4 w-4" />
                  <span>Ganancia: {service.serviceProfitFormatted}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" aria-label="Editar Servicio" onClick={() => handleOpenEditDialog(services.find(s => s.id === service.id)!)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" aria-label="Eliminar Servicio">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta acción no se puede deshacer. Esto eliminará permanentemente la orden de servicio.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onServiceDeleted(service.id)} className="bg-destructive hover:bg-destructive/90">
                          Eliminar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
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
