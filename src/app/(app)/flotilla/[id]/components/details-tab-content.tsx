

"use client";

import React, { useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { Car, Gauge, Edit, User as UserIcon, CalendarDays, History, StickyNote } from 'lucide-react';
import type { Vehicle, Driver } from '@/types';
import { format, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { parseISO } from 'date-fns';
import { formatCurrency } from '@/lib/utils';
import { parseDate } from '@/lib/forms';
import { personnelService, inventoryService } from '@/lib/services';
import { toast } from '@/hooks/use-toast';
import { writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';


interface DetailsTabContentProps {
  vehicle: Vehicle;
  drivers: Driver[];
  allVehicles: Vehicle[];
  onEdit: () => void;
  onRefresh: () => void;
}

export function DetailsTabContent({ vehicle, drivers, allVehicles, onEdit, onRefresh }: DetailsTabContentProps) {
  
  const assignedDriver = useMemo(() => {
    return drivers.find(d => d.id === vehicle.assignedDriverId);
  }, [drivers, vehicle.assignedDriverId]);

  const handleAssignDriver = useCallback(async (newDriverId: string | null) => {
    if (!vehicle || !db) return toast({ title: "Error", description: "No se encontró el vehículo.", variant: "destructive" });

    const batch = writeBatch(db);
    const oldDriverId = vehicle.assignedDriverId;

    // 1. Unassign the old driver from this vehicle
    if (oldDriverId) {
        batch.update(personnelService.getDriverDocRef(oldDriverId), { assignedVehicleId: null });
    }

    // 2. Unassign the new driver from any other vehicle they might be assigned to
    if (newDriverId) {
        const otherVehicleAssignedToNewDriver = allVehicles.find(v => v.assignedDriverId === newDriverId && v.id !== vehicle.id);
        if (otherVehicleAssignedToNewDriver) {
            batch.update(inventoryService.getVehicleDocRef(otherVehicleAssignedToNewDriver.id), { assignedDriverId: null });
        }
        
        // 3. Assign this vehicle to the new driver
        batch.update(personnelService.getDriverDocRef(newDriverId), { assignedVehicleId: vehicle.id });
    }
    
    // 4. Update the vehicle's assigned driver ID
    batch.update(inventoryService.getVehicleDocRef(vehicle.id), { assignedDriverId: newDriverId });

    try {
        await batch.commit();
        onRefresh();
        toast({ title: "Conductor Asignado", description: "La asignación ha sido actualizada." });
    } catch(e) {
        console.error("Error al asignar conductor:", e);
        toast({ title: "Error al Asignar", description: `Ocurrió un error: ${e instanceof Error ? e.message : 'Error desconocido'}`, variant: "destructive"});
    }
  }, [vehicle, allVehicles, onRefresh, toast]);


  const formatServiceInfo = (date?: string | Date, mileage?: number): string => {
    if (!date) return 'No hay registro.';
    const parsedDate = parseDate(date);
    if (!parsedDate || !isValid(parsedDate)) return 'Fecha inválida.';
    
    const datePart = format(parsedDate, "dd MMM yyyy", { locale: es });
    const mileagePart = mileage ? `${mileage.toLocaleString('es-ES')} km - ` : '';
    
    return `${mileagePart}${datePart}`;
  };

  const availableDrivers = useMemo(() => {
    return drivers.filter(d => !d.isArchived && (!d.assignedVehicleId || d.assignedVehicleId === vehicle.id));
  }, [drivers, vehicle.id]);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Información del Vehículo</CardTitle>
           <Button variant="outline" size="sm" onClick={onEdit}>
              <Edit className="mr-2 h-4 w-4" />
              Editar Vehículo
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 text-sm">
            
            <div className="space-y-1">
              <p className="font-medium text-muted-foreground flex items-center gap-2"><Car className="h-4 w-4" />Vehículo</p>
              <p className="font-bold text-lg">{vehicle.licensePlate}</p>
              <p className="text-base">{vehicle.make} {vehicle.model} ({vehicle.year})</p>
              <p className="text-sm">Color: {vehicle.color || 'N/A'}</p>
            </div>
            
            <div className="space-y-1">
              <p className="font-medium text-muted-foreground flex items-center gap-2"><UserIcon className="h-4 w-4" />Propietario</p>
              <p className="font-semibold text-base">{vehicle.ownerName}</p>
            </div>

            <div className="space-y-1">
                <p className="font-medium text-muted-foreground flex items-center gap-2"><Gauge className="h-4 w-4" />Kilometraje Actual</p>
                <p className="font-semibold text-base">{vehicle.currentMileage ? `${vehicle.currentMileage.toLocaleString('es-ES')} km` : 'N/A'}</p>
                {vehicle.lastMileageUpdate && <p className="text-xs text-muted-foreground">Últ. act: {format(parseISO(vehicle.lastMileageUpdate), "dd MMM yyyy", { locale: es })}</p>}
            </div>

            <div className="space-y-1">
                <p className="font-medium text-muted-foreground flex items-center gap-2"><History className="h-4 w-4" />Último Servicio Registrado</p>
                <p className="font-semibold text-base">{formatServiceInfo(vehicle.lastServiceDate, vehicle.currentMileage)}</p>
            </div>
            
            <div className="space-y-1 md:col-span-2">
              <p className="font-medium text-muted-foreground flex items-center gap-2"><StickyNote className="h-4 w-4" />Notas</p>
              <p className="whitespace-pre-wrap">{vehicle.notes || 'Sin notas.'}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
       <Card>
        <CardHeader>
          <CardTitle>Asignación de Conductor</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2">
            <div className="flex-grow">
              <Label>Conductor Asignado</Label>
              <Select onValueChange={handleAssignDriver} value={vehicle.assignedDriverId || ""}>
                <SelectTrigger><SelectValue placeholder="Seleccionar un conductor..."/>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={"null"}>-- Ninguno --</SelectItem>
                  {availableDrivers.map(d => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Costos y Deducciones Fijas</CardTitle>
          <Button variant="outline" size="sm" onClick={onEdit}>
              <Edit className="mr-2 h-4 w-4" />
              Editar Costos
          </Button>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="p-2 bg-muted/50 rounded-md">
            <p className="text-xs font-medium text-muted-foreground">RENTA DIARIA</p>
            <p className="text-lg font-bold">{formatCurrency(vehicle.dailyRentalCost || 0)}</p>
          </div>
          <div className="p-2 bg-muted/50 rounded-md">
            <p className="text-xs font-medium text-muted-foreground">GPS (MENSUAL)</p>
            <p className="text-lg font-bold">{formatCurrency(vehicle.gpsMonthlyCost || 0)}</p>
          </div>
          <div className="p-2 bg-muted/50 rounded-md">
            <p className="text-xs font-medium text-muted-foreground">ADMIN (MENSUAL)</p>
            <p className="text-lg font-bold">{formatCurrency(vehicle.adminMonthlyCost || 0)}</p>
          </div>
          <div className="p-2 bg-muted/50 rounded-md">
            <p className="text-xs font-medium text-muted-foreground">SEGURO (MENSUAL)</p>
            <p className="text-lg font-bold">{formatCurrency(vehicle.insuranceMonthlyCost || 0)}</p>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
