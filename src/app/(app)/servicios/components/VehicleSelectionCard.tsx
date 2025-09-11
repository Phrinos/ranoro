// src/app/(app)/servicios/components/VehicleSelectionCard.tsx

"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useFormContext, Controller } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Car as CarIcon, History, Search } from 'lucide-react';
import type { Vehicle, ServiceRecord } from '@/types';
import { format, isValid, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from "@/lib/utils";
import Link from 'next/link';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { VehicleDialog } from '../../vehiculos/components/vehicle-dialog';
import type { VehicleFormValues } from '../../vehiculos/components/vehicle-form';

interface VehicleSelectionCardProps {
  isReadOnly?: boolean;
  vehicles: Vehicle[];
  serviceHistory: ServiceRecord[];
  onVehicleCreated: (newVehicleData: VehicleFormValues) => Promise<Vehicle>;
  onOpenNewVehicleDialog: (plate?: string) => void;
  initialVehicleId?: string;
}

export function VehicleSelectionCard({
  isReadOnly,
  vehicles,
  serviceHistory,
  onVehicleCreated,
  onOpenNewVehicleDialog,
  initialVehicleId,
}: VehicleSelectionCardProps) {
  const { control, setValue, watch, formState: { errors } } = useFormContext();
  
  const [isSelectionDialogOpen, setIsSelectionDialogOpen] = useState(false);
  const [isNewVehicleDialogOpen, setIsNewVehicleDialogOpen] = useState(false);
  const [newVehiclePlate, setNewVehiclePlate] = useState('');

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [lastService, setLastService] = useState<ServiceRecord | null>(null);
  
  const vehicleId = watch('vehicleId');
  const localVehicles: Vehicle[] = Array.isArray(vehicles) ? vehicles : [];

  useEffect(() => {
    const vehicle = localVehicles.find(v => v.id === vehicleId);
    if (vehicle) {
      setSelectedVehicle(vehicle);
      setSearchTerm(vehicle.licensePlate || '');
      const vehicleServices = serviceHistory
        .filter(s => s.vehicleId === vehicle.id && s.status === 'Entregado')
        .sort((a, b) => new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime());
      setLastService(vehicleServices[0] || null);
    } else {
      setSelectedVehicle(null);
      setLastService(null);
      if(!isSelectionDialogOpen){
         setSearchTerm('');
      }
    }
  }, [vehicleId, localVehicles, serviceHistory, isSelectionDialogOpen]);

  const handleSelectVehicle = (vehicle: Vehicle) => {
    setValue('vehicleId', vehicle.id, { shouldValidate: true, shouldDirty: true });
    if (vehicle.currentMileage) {
      setValue('mileage', vehicle.currentMileage, { shouldDirty: true });
    }
    setIsSelectionDialogOpen(false);
  };
  
  const handleOpenNewVehicleFromSearch = () => {
    setIsSelectionDialogOpen(false);
    setNewVehiclePlate(searchTerm);
    setIsNewVehicleDialogOpen(true);
  };
  
  const handleNewVehicleSave = async (data: VehicleFormValues) => {
    const newVehicle = await onVehicleCreated(data);
    handleSelectVehicle(newVehicle);
    setIsNewVehicleDialogOpen(false);
  };

  const filteredVehicles = useMemo(() => {
    const safeVehicles: Vehicle[] = Array.isArray(vehicles) ? vehicles : [];
    if (!searchTerm.trim()) {
        return [];
    }
    const lowercasedTerm = searchTerm.toLowerCase();
    
    const norm = (s?: string) => (s ?? "").toLowerCase();

    return safeVehicles.filter(v =>
        norm(v.licensePlate).includes(lowercasedTerm) ||
        norm(v.make).includes(lowercasedTerm) ||
        norm(v.model).includes(lowercasedTerm) ||
        norm(v.ownerName).includes(lowercasedTerm)
    ).slice(0, 10);
  },[searchTerm, vehicles]);


  const formatServiceInfo = (service: ServiceRecord | null): string => {
    if (!service) return 'No hay registro de servicio previo.';
    const date = service.deliveryDateTime || service.serviceDate;
    if (!date || !isValid(new Date(date))) return 'Fecha inválida';
    const description = service.serviceItems?.map(item => item.name).join(', ') || service.description || 'Servicio General';
    return `${format(new Date(date), "dd MMM yyyy", { locale: es })} - ${description}`;
  };

  if (selectedVehicle) {
    return (
      <Card>
        <CardHeader><CardTitle>Vehículo Seleccionado</CardTitle></CardHeader>
        <CardContent className="space-y-4">
           <div className="p-3 border rounded-md bg-background/30">
              <p className="text-xs text-muted-foreground">{selectedVehicle.ownerName}</p>
              <p className="font-bold text-lg">{selectedVehicle.licensePlate} - {selectedVehicle.make} {selectedVehicle.model} ({selectedVehicle.year})</p>
          </div>
          <FormField
            control={control}
            name="mileage"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2"><History className="h-4 w-4 text-muted-foreground"/>Kilometraje</FormLabel>
                <FormControl><Input type="number" {...field} value={field.value ?? ''} disabled={isReadOnly} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="text-left mt-2 pt-2 border-t">
              <p className="text-sm font-medium text-muted-foreground">Último Servicio:</p>
              <p className="font-semibold text-base truncate">{formatServiceInfo(lastService)}</p>
          </div>
          <div className="flex justify-end pt-2 gap-2">
              <Button type="button" variant="link" size="sm" asChild><Link href={`/vehiculos/${selectedVehicle.id}`} target="_blank">Ver Perfil</Link></Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setValue('vehicleId', '', { shouldValidate: true })}>Cambiar Vehículo</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Controller
        name="vehicleId"
        control={control}
        render={({ field }) => (
            <Button
                type="button"
                variant="outline"
                className={cn(
                  "w-full h-24 border-2 border-dashed bg-yellow-50 border-yellow-400 text-yellow-800 hover:bg-yellow-100",
                  errors.vehicleId && "border-destructive text-destructive bg-destructive/10 border-destructive/50 hover:bg-destructive/20"
                )}
                onClick={() => setIsSelectionDialogOpen(true)}
                disabled={isReadOnly}
            >
                <CarIcon className="mr-4 h-8 w-8" />
                <span className="text-lg">Seleccionar Vehículo</span>
            </Button>
        )}
      />

      <Dialog open={isSelectionDialogOpen} onOpenChange={setIsSelectionDialogOpen}>
        <DialogContent className="sm:max-w-lg p-6">
          <DialogHeader><DialogTitle>Buscar Vehículo</DialogTitle><DialogDescription>Busque por placa, marca, modelo o propietario.</DialogDescription></DialogHeader>
          <div className="py-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-8" />
            </div>
            <ScrollArea className="h-60 border rounded-md p-2">
              {filteredVehicles.length > 0 ? (
                filteredVehicles.map((v) => (
                  <Button key={v.id} variant="ghost" className="w-full justify-start h-auto py-2" onClick={() => handleSelectVehicle(v)}>
                    <p className="font-semibold truncate">
                      {v.licensePlate}, {v.make} {v.model} {v.year}, {v.color}
                    </p>
                  </Button>
                ))
              ) : <div className="text-center p-4 text-sm">No se encontraron vehículos.</div>}
            </ScrollArea>
             <Button type="button" variant="secondary" className="w-full" onClick={handleOpenNewVehicleFromSearch}>
                <CarIcon className="mr-2 h-4 w-4" /> Registrar Nuevo Vehículo
              </Button>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setIsSelectionDialogOpen(false)}>Cerrar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      
      <VehicleDialog
        open={isNewVehicleDialogOpen}
        onOpenChange={setIsNewVehicleDialogOpen}
        vehicle={{ licensePlate: newVehiclePlate }}
        onSave={handleNewVehicleSave}
      />
    </>
  );
}
