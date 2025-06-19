"use client";

import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Edit, Trash2, History, Eye } from "lucide-react";
import type { Vehicle } from "@/types";
import { VehicleDialog } from './vehicle-dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

interface VehiclesTableProps {
  vehicles: Vehicle[];
}

export function VehiclesTable({ vehicles: initialVehicles }: VehiclesTableProps) {
  const [vehicles, setVehicles] = useState<Vehicle[]>(initialVehicles);
  const { toast } = useToast();
  
  const handleUpdateVehicle = async (updatedVehicleData: any) => {
    setVehicles(prevVehicles => 
        prevVehicles.map(v => v.id === updatedVehicleData.id ? { ...v, ...updatedVehicleData } : v)
    );
  };

  const handleDeleteVehicle = (vehicleId: string) => {
    setVehicles(prevVehicles => prevVehicles.filter(v => v.id !== vehicleId));
    toast({
      title: "Vehículo Eliminado",
      description: `El vehículo con ID ${vehicleId} ha sido eliminado.`,
    });
  };

  if (!vehicles.length) {
    return <p className="text-muted-foreground text-center py-8">No hay vehículos registrados.</p>;
  }
  
  return (
    <div className="rounded-lg border shadow-sm overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Placa</TableHead>
            <TableHead>Marca</TableHead>
            <TableHead>Modelo</TableHead>
            <TableHead>Año</TableHead>
            <TableHead>Propietario</TableHead>
            <TableHead>Contacto</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {vehicles.map((vehicle) => (
            <TableRow key={vehicle.id}>
              <TableCell className="font-medium">{vehicle.licensePlate}</TableCell>
              <TableCell>{vehicle.make}</TableCell>
              <TableCell>{vehicle.model}</TableCell>
              <TableCell>{vehicle.year}</TableCell>
              <TableCell>{vehicle.ownerName}</TableCell>
              <TableCell>{vehicle.ownerContact}</TableCell>
              <TableCell className="text-right">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="Ver Historial">
                      <History className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Historial de Servicios - {vehicle.make} {vehicle.model} ({vehicle.licensePlate})</DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="h-[300px] mt-4">
                      {vehicle.serviceHistory && vehicle.serviceHistory.length > 0 ? (
                        <ul className="space-y-2">
                          {vehicle.serviceHistory.map(service => (
                            <li key={service.id} className="text-sm p-2 border rounded-md">
                              <p><strong>Fecha:</strong> {format(parseISO(service.serviceDate as unknown as string), "dd MMM yyyy", { locale: es })}</p>
                              <p><strong>Descripción:</strong> {service.description}</p>
                              <p><strong>Costo:</strong> ${service.totalCost.toLocaleString('es-ES')}</p>
                              <p><strong>Estado:</strong> {service.status}</p>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-muted-foreground">No hay historial de servicios para este vehículo.</p>
                      )}
                    </ScrollArea>
                  </DialogContent>
                </Dialog>

                <VehicleDialog
                  trigger={
                    <Button variant="ghost" size="icon" aria-label="Editar Vehículo">
                      <Edit className="h-4 w-4" />
                    </Button>
                  }
                  vehicle={vehicle}
                  onSave={async (data) => handleUpdateVehicle({ ...data, id: vehicle.id })}
                />
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="Eliminar Vehículo">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta acción no se puede deshacer. Esto eliminará permanentemente el vehículo y su historial asociado.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDeleteVehicle(vehicle.id)} className="bg-destructive hover:bg-destructive/90">
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
