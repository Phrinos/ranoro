
"use client";

import React, { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, Edit, Trash2, Eye, Clock } from "lucide-react";
import type { ServiceRecord, Vehicle, Technician, InventoryItem } from "@/types";
import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { ServiceDialog } from './service-dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";


interface ServicesTableProps {
  services: ServiceRecord[];
  vehicles: Vehicle[]; 
  technicians: Technician[]; 
  inventoryItems: InventoryItem[];
  onServiceUpdated: (updatedService: ServiceRecord) => void;
  onServiceDeleted: (serviceId: string) => void;
  onVehicleCreated?: (newVehicle: Vehicle) => void; 
  isHistoryView?: boolean; // To control column visibility and order for history
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

  const handleDialogSave = async (serviceDataFromForm: ServiceRecord) => {
    // serviceDataFromForm is the complete ServiceRecord object constructed by ServiceForm.
    // It already includes calculated totalCost, subTotal, taxAmount, profit, etc.,
    // and the correct id if it was an edit operation.
    
    // Ensure the ID from the original editingService is preserved, just in case
    // ServiceForm logic for ID assignment had a different temporary ID for new items.
    // For edits, ServiceForm correctly uses initialDataService.id.
    const finalServiceData = {
      ...serviceDataFromForm,
      id: editingService!.id, // Crucial for ensuring we update the correct record
    };

    onServiceUpdated(finalServiceData);
    setEditingService(null);
    setIsEditDialogOpen(false); 
    // Toast message is handled by the parent page (HistorialServiciosPage or AgendaServiciosPage)
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
      formattedServiceDate: serviceDateObj && isValid(serviceDateObj) ? format(serviceDateObj, "dd MMM yyyy, HH:mm", { locale: es }) : 'Fecha Inválida',
      formattedDeliveryDateTime: deliveryDateObj && isValid(deliveryDateObj) ? format(deliveryDateObj, "dd MMM yyyy, HH:mm", { locale: es }) : 'N/A',
      totalCostFormatted: `$${service.totalCost.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      serviceProfitFormatted: service.serviceProfit !== undefined ? `$${service.serviceProfit.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A',
      mileageFormatted: service.mileage !== undefined && service.mileage !== null ? `${service.mileage.toLocaleString('es-ES')} km` : 'N/A',
    };
  }), [services, vehicles, technicians]);


  if (!memoizedServices.length) {
    return <p className="text-muted-foreground text-center py-8">No hay órdenes de servicio que coincidan con los filtros.</p>;
  }

  return (
    <>
      <div className="rounded-lg border shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-white">
            {isHistoryView ? (
              <TableRow>
                <TableHead className="font-bold">ID</TableHead>
                <TableHead className="font-bold">Fecha Servicio</TableHead>
                <TableHead className="font-bold">Fecha Entrega</TableHead>
                <TableHead className="font-bold">Placas</TableHead>
                <TableHead className="font-bold">Vehículo</TableHead>
                <TableHead className="font-bold">Kilometraje</TableHead>
                <TableHead className="font-bold">Descripción</TableHead>
                <TableHead className="font-bold">Técnico</TableHead>
                <TableHead className="font-bold">Precio Total</TableHead>
                <TableHead className="font-bold">Ganancia</TableHead>
                <TableHead className="font-bold">Estado</TableHead>
                <TableHead className="font-bold">Acciones</TableHead>
              </TableRow>
            ) : ( // Default for Agenda and Lista de Servicios
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Vehículo</TableHead>
                <TableHead>Técnico</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Recepción</TableHead>
                <TableHead>Entrega</TableHead>
                <TableHead className="text-right">Precio Total</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            )}
          </TableHeader>
          <TableBody>
            {memoizedServices.map((service) => (
              <TableRow key={service.id}>
                {isHistoryView ? (
                  <>
                    <TableCell className="font-medium">{service.id}</TableCell>
                    <TableCell>{service.formattedServiceDate}</TableCell>
                    <TableCell>{service.formattedDeliveryDateTime}</TableCell>
                    <TableCell className="font-bold">{service.vehiclePlate}</TableCell>
                    <TableCell>{service.vehicleMakeModelYear}</TableCell>
                    <TableCell>{service.mileageFormatted}</TableCell>
                    <TableCell className="font-bold max-w-xs truncate">{service.description}</TableCell>
                    <TableCell>{service.technicianName}</TableCell>
                    <TableCell className="text-right">{service.totalCostFormatted}</TableCell>
                    <TableCell className="text-right">{service.serviceProfitFormatted}</TableCell>
                    <TableCell><Badge variant={getStatusVariant(service.status)}>{service.status}</Badge></TableCell>
                  </>
                ) : ( // Default for Agenda and Lista de Servicios
                  <>
                    <TableCell className="font-medium">{service.id}</TableCell>
                    <TableCell>{service.vehicleIdentifier}</TableCell>
                    <TableCell>{service.technicianName}</TableCell>
                    <TableCell className="max-w-xs truncate">{service.description}</TableCell>
                    <TableCell>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3"/>
                            {service.formattedServiceDate}
                        </div>
                    </TableCell>
                    <TableCell>
                      {service.deliveryDateTime ? (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3"/>
                            {service.formattedDeliveryDateTime}
                        </div>
                      ) : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">{service.totalCostFormatted}</TableCell>
                    <TableCell><Badge variant={getStatusVariant(service.status)}>{service.status}</Badge></TableCell>
                  </>
                )}
                <TableCell className="text-right">
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
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
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

