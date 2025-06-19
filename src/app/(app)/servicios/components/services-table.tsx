
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
import { MoreHorizontal, Edit, Trash2, Eye } from "lucide-react";
import type { ServiceRecord, Vehicle, Technician, InventoryItem } from "@/types";
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { ServiceDialog } from './service-dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
// Removed globalPlaceholderServices import as services are passed via props


interface ServicesTableProps {
  services: ServiceRecord[];
  vehicles: Vehicle[]; 
  technicians: Technician[]; 
  inventoryItems: InventoryItem[];
  onServiceUpdated: (updatedService: ServiceRecord) => void;
  onServiceDeleted: (serviceId: string) => void;
  onVehicleCreated?: (newVehicle: Vehicle) => void; // Make optional if not all tables need it
}

export function ServicesTable({ 
  services, 
  vehicles, 
  technicians, 
  inventoryItems, 
  onServiceUpdated, 
  onServiceDeleted,
  onVehicleCreated 
}: ServicesTableProps) {
  const { toast } = useToast();
  const [editingService, setEditingService] = useState<ServiceRecord | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const getStatusVariant = (status: ServiceRecord['status']): "default" | "secondary" | "outline" | "destructive" | "success" => {
    switch (status) {
      case "Completado":
        return "success";
      case "En Progreso":
        return "secondary";
      case "Pendiente":
        return "outline";
      case "Cancelado":
        return "destructive";
      default:
        return "default";
    }
  };
  
  const handleOpenEditDialog = (service: ServiceRecord) => {
    setEditingService(service);
    setIsEditDialogOpen(true);
  };

  const handleDialogSave = async (formDataFromDialog: any) => {
    // This function is called by ServiceDialog's onSave
    // It should then call the prop function to update state in the parent (ServiciosPage)
    // Ensure all necessary fields are correctly mapped from formDataFromDialog to ServiceRecord
    const updatedServiceRecord: ServiceRecord = {
      ...(editingService as ServiceRecord), // Base with existing data like ID
      ...formDataFromDialog, // Form data from dialog
      id: editingService!.id, // Ensure ID from the service being edited
      serviceDate: format(new Date(formDataFromDialog.serviceDate), 'yyyy-MM-dd'),
      totalCost: Number(formDataFromDialog.totalServicePrice), 
      totalSuppliesCost: Number(formDataFromDialog.totalSuppliesCost),
      serviceProfit: Number(formDataFromDialog.serviceProfit),
      suppliesUsed: formDataFromDialog.suppliesUsed.map((s: any) => ({
        supplyId: s.supplyId,
        quantity: Number(s.quantity),
        unitPrice: Number(s.unitPrice),
        supplyName: s.supplyName,
      })),
    };

    onServiceUpdated(updatedServiceRecord);
    setEditingService(null);
    setIsEditDialogOpen(false); 
    toast({
      title: "Servicio Actualizado",
      description: `El servicio para ${vehicles.find(v => v.id === updatedServiceRecord.vehicleId)?.licensePlate} ha sido actualizado.`,
    });
  };


  const memoizedServices = useMemo(() => services.map(service => {
    const vehicle = vehicles.find(v => v.id === service.vehicleId);
    const technician = technicians.find(t => t.id === service.technicianId);
    return {
      ...service,
      vehicleIdentifier: vehicle ? `${vehicle.make} ${vehicle.model} (${vehicle.licensePlate})` : String(service.vehicleId),
      technicianName: technician ? technician.name : service.technicianId,
      formattedDate: format(parseISO(service.serviceDate), "dd MMM yyyy", { locale: es }),
      totalCostFormatted: `$${service.totalCost.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      serviceProfitFormatted: service.serviceProfit !== undefined ? `$${service.serviceProfit.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A',
      mileageFormatted: service.mileage ? `${service.mileage.toLocaleString('es-ES')} km` : 'N/A',
    };
  }), [services, vehicles, technicians]);


  if (!memoizedServices.length) {
    return <p className="text-muted-foreground text-center py-8">No hay órdenes de servicio registradas.</p>;
  }

  return (
    <>
      <div className="rounded-lg border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID Servicio</TableHead>
              <TableHead>Vehículo</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Kilometraje</TableHead> 
              <TableHead>Técnico</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead className="text-right">Precio Total</TableHead>
              <TableHead className="text-right">Ganancia</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {memoizedServices.map((service) => (
              <TableRow key={service.id}>
                <TableCell className="font-medium">{service.id}</TableCell>
                <TableCell>{service.vehicleIdentifier}</TableCell>
                <TableCell>{service.formattedDate}</TableCell>
                <TableCell>{service.mileageFormatted}</TableCell> 
                <TableCell>{service.technicianName}</TableCell>
                <TableCell className="max-w-xs truncate">{service.description}</TableCell>
                <TableCell className="text-right">{service.totalCostFormatted}</TableCell>
                <TableCell className="text-right">{service.serviceProfitFormatted}</TableCell>
                <TableCell>
                  <Badge variant={getStatusVariant(service.status)}>{service.status}</Badge>
                </TableCell>
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
            vehicles={vehicles} // Pass current list of vehicles
            technicians={technicians}
            inventoryItems={inventoryItems}
            onSave={handleDialogSave} 
            onVehicleCreated={onVehicleCreated} // Pass down if needed
        />
      )}
    </>
  );
}
