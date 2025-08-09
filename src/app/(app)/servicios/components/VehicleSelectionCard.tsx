// src/app/(app)/servicios/components/VehicleSelectionCard.tsx

"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useFormContext, Controller } from "react-hook-form";
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Car as CarIcon, AlertCircle, User, Fingerprint, History, Phone, CalendarCheck, ArrowRight, Edit, Search, Calendar as CalendarDateIcon, Link2Icon } from 'lucide-react';
import type { Vehicle, ServiceRecord } from '@/types';
import { format, isValid, parseISO, addMonths, addYears, setHours, setMinutes } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { serviceService } from '@/lib/services';
import Link from 'next/link';
import { parseDate } from '@/lib/forms';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

interface VehicleSelectionCardProps {
  isReadOnly?: boolean;
  localVehicles: Vehicle[];
  serviceHistory: ServiceRecord[];
  onVehicleSelected: (vehicle: Vehicle | null) => void;
  onOpenNewVehicleDialog: (plate?: string) => void;
}

export function VehicleSelectionCard({
  isReadOnly,
  localVehicles,
  serviceHistory,
  onVehicleSelected,
  onOpenNewVehicleDialog,
}: VehicleSelectionCardProps) {
  const { control, setValue, getValues, watch, formState: { errors } } = useFormContext();
  const { toast } = useToast();
  const router = useRouter();

  const [isSelectionDialogOpen, setIsSelectionDialogOpen] = useState(false);
  const [vehicleLicensePlateSearch, setVehicleLicensePlateSearch] = useState("");
  const [vehicleSearchResults, setVehicleSearchResults] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [lastService, setLastService] = useState<ServiceRecord | null>(null);
  
  const vehicleId = watch('vehicleId');
  
  useEffect(() => {
    const findVehicleData = (vId: string) => {
      if (!vId) {
        setSelectedVehicle(null);
        setLastService(null);
        return;
      }
      const vehicle = localVehicles.find(v => v.id === vId);
      if (vehicle) {
        setSelectedVehicle(vehicle);
        setVehicleLicensePlateSearch(vehicle.licensePlate);
        if (serviceHistory && serviceHistory.length > 0) {
            const vehicleServices = serviceHistory
              .filter(s => s.vehicleId === vehicle.id && (s.status === 'Entregado' || s.status === 'Completado'))
              .sort((a, b) => {
                  const dateA = parseDate(a.deliveryDateTime) || parseDate(a.serviceDate) || new Date(0);
                  const dateB = parseDate(b.deliveryDateTime) || parseDate(b.serviceDate) || new Date(0);
                  if (!isValid(dateA)) return 1;
                  if (!isValid(dateB)) return -1;
                  return dateB.getTime() - dateA.getTime();
              });
            setLastService(vehicleServices[0] || null);
        } else {
            setLastService(null);
        }
      } else {
        setSelectedVehicle(null);
        setLastService(null);
      }
    };
    findVehicleData(vehicleId);
  }, [vehicleId, localVehicles, serviceHistory]);

  const handleSelectVehicle = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setValue('vehicleId', vehicle.id, { shouldValidate: true });
    if (vehicle.isFleetVehicle && vehicle.currentMileage) {
      setValue('mileage', vehicle.currentMileage, { shouldDirty: true });
    }
    onVehicleSelected(vehicle);
    setIsSelectionDialogOpen(false);
  };

  useEffect(() => {
    if (!vehicleLicensePlateSearch || vehicleLicensePlateSearch.length < 2) {
      setVehicleSearchResults([]);
      return;
    }
    const lowerSearch = vehicleLicensePlateSearch.toLowerCase();
    const results = localVehicles.filter(v =>
      v.licensePlate.toLowerCase().includes(lowerSearch) ||
      v.make.toLowerCase().includes(lowerSearch) ||
      v.model.toLowerCase().includes(lowerSearch) ||
      v.ownerName.toLowerCase().includes(lowerSearch)
    ).slice(0, 5);
    setVehicleSearchResults(results);
  }, [vehicleLicensePlateSearch, localVehicles]);

  const formatServiceInfo = (service: ServiceRecord | null): string => {
    if (!service) return 'No hay registro de servicio previo.';
    const relevantDate = parseDate(service.deliveryDateTime) || parseDate(service.serviceDate);
    
    // Updated logic to use service items for description
    const description = service.serviceItems?.map(item => item.name).join(', ') || service.description || 'Servicio General';
    
    if (!relevantDate || !isValid(relevantDate)) return 'Fecha inválida.';
    const mileagePart = service.mileage ? `${service.mileage.toLocaleString('es-ES')} km - ` : '';
    return `${mileagePart}${format(relevantDate, "dd MMM yyyy", { locale: es })} - ${description}`;
  };

  const handleViewProfile = () => {
    if (selectedVehicle) {
        window.open(`/vehiculos/${selectedVehicle.id}`, '_blank');
    }
  };

  if (selectedVehicle) {
    return (
      <Card className="relative bg-muted">
        <CardHeader>
          <CardTitle>Vehículo Seleccionado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
           <div className="p-3 border rounded-md bg-background/30">
              <p className="text-xs text-muted-foreground">{selectedVehicle.ownerName} - {selectedVehicle.ownerPhone}</p>
              <p className="font-bold text-lg">{selectedVehicle.licensePlate} - {selectedVehicle.make} {selectedVehicle.model} ({selectedVehicle.year})</p>
          </div>
          <FormField
            control={control}
            name="mileage"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                    <History className="h-4 w-4 text-muted-foreground"/>
                    Kilometraje Actual
                </FormLabel>
                <FormControl>
                  <Input type="number" placeholder="Ej: 55000 km" {...field} value={field.value ?? ''} disabled={isReadOnly} />
                </FormControl>
                 <FormMessage />
              </FormItem>
            )}
          />
          <div className="text-left mt-2 pt-2 border-t">
              <p className="text-sm font-medium text-muted-foreground">Último Servicio:</p>
              <p className="font-semibold text-base truncate" title={formatServiceInfo(lastService)}>
                  {formatServiceInfo(lastService)}
              </p>
          </div>
          <div className="flex justify-end items-center pt-2 gap-2">
              <Button type="button" variant="outline" size="sm" onClick={handleViewProfile}>
                Perfil del Vehículo
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => { setSelectedVehicle(null); setValue('vehicleId', ''); onVehicleSelected(null); }}>
                Cambiar Vehículo
              </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="w-full h-24 border-2 border-dashed bg-white hover:bg-gray-100 text-muted-foreground"
        onClick={() => setIsSelectionDialogOpen(true)}
        disabled={isReadOnly}
      >
        <CarIcon className="mr-4 h-8 w-8" />
        <span className="text-lg">Seleccionar Vehículo</span>
      </Button>

      <Dialog open={isSelectionDialogOpen} onOpenChange={setIsSelectionDialogOpen}>
        <DialogContent className="sm:max-w-lg p-6">
          <DialogHeader>
            <DialogTitle>Buscar Vehículo</DialogTitle>
            <DialogDescription>
              Busque por placa, marca, modelo o propietario.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar vehículo..."
                value={vehicleLicensePlateSearch}
                onChange={(e) => setVehicleLicensePlateSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <ScrollArea className="h-60 border rounded-md p-2 space-y-1">
              {vehicleSearchResults.length > 0 ? (
                vehicleSearchResults.map((v) => (
                  <Button
                    key={v.id}
                    variant="ghost"
                    className="w-full justify-start text-left h-auto py-1.5"
                    onClick={() => handleSelectVehicle(v)}
                  >
                    <div>
                      <p className="font-semibold">{v.licensePlate}</p>
                      <p className="text-sm text-muted-foreground">{v.make} {v.model} - {v.ownerName}</p>
                    </div>
                  </Button>
                ))
              ) : (
                <div className="text-center p-4 text-sm text-muted-foreground">
                  {vehicleLicensePlateSearch.length > 1
                    ? "No se encontraron vehículos."
                    : "Escriba para buscar..."}
                </div>
              )}
            </ScrollArea>
             <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={() => {
                  setIsSelectionDialogOpen(false);
                  onOpenNewVehicleDialog(vehicleLicensePlateSearch);
                }}
              >
                <CarIcon className="mr-2 h-4 w-4" /> Registrar Nuevo Vehículo
              </Button>
          </div>
          <DialogFooter>
             <Button variant="outline" onClick={() => setIsSelectionDialogOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
