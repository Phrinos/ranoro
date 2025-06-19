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

interface ServicesTableProps {
  services: ServiceRecord[];
  vehicles: Vehicle[]; 
  technicians: Technician[]; 
  inventoryItems: InventoryItem[]; 
}

export function ServicesTable({ services: initialServices, vehicles, technicians, inventoryItems }: ServicesTableProps) {
  const [services, setServices] = useState<ServiceRecord[]>(initialServices);
  const { toast } = useToast();

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
  
  const handleUpdateService = async (updatedServiceData: any) => {
    setServices(prevServices => 
        prevServices.map(s => s.id === updatedServiceData.id ? { ...s, ...updatedServiceData, serviceDate: format(new Date(updatedServiceData.serviceDate), 'yyyy-MM-dd') } : s)
    );
  };

  const handleDeleteService = (serviceId: string) => {
    setServices(prevServices => prevServices.filter(s => s.id !== serviceId));
    toast({
      title: "Servicio Eliminado",
      description: `El servicio con ID ${serviceId} ha sido eliminado.`,
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
      mileageFormatted: service.mileage ? `${service.mileage.toLocaleString('es-ES')} km` : 'N/A',
    };
  }), [services, vehicles, technicians]);


  if (!memoizedServices.length) {
    return <p className="text-muted-foreground text-center py-8">No hay órdenes de servicio registradas.</p>;
  }

  return (
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
            <TableHead>Costo Total</TableHead>
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
              <TableCell>{service.totalCostFormatted}</TableCell>
              <TableCell>
                <Badge variant={getStatusVariant(service.status)}>{service.status}</Badge>
              </TableCell>
              <TableCell className="text-right">
                <ServiceDialog
                  trigger={
                    <Button variant="ghost" size="icon" aria-label="Editar Servicio">
                      <Edit className="h-4 w-4" />
                    </Button>
                  }
                  service={services.find(s => s.id === service.id)} 
                  vehicles={vehicles}
                  technicians={technicians}
                  inventoryItems={inventoryItems}
                  onSave={async (data) => handleUpdateService({ ...data, id: service.id })}
                />
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
                      <AlertDialogAction onClick={() => handleDeleteService(service.id)} className="bg-destructive hover:bg-destructive/90">
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
  );
}
