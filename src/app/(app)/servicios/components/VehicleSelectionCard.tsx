
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useFormContext } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Car as CarIcon, AlertCircle, User, Fingerprint, History, Phone, CalendarCheck, ArrowRight, Edit, Search } from 'lucide-react';
import type { Vehicle, ServiceRecord } from '@/types';
import { format, isValid, parseISO, addMonths, addYears } from 'date-fns';
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


interface VehicleSelectionCardProps {
  isReadOnly?: boolean;
  localVehicles: Vehicle[];
  onVehicleSelected: (vehicle: Vehicle | null) => void;
  onOpenNewVehicleDialog: (plate?: string) => void;
}

export function VehicleSelectionCard({
  isReadOnly,
  localVehicles,
  onVehicleSelected,
  onOpenNewVehicleDialog,
}: VehicleSelectionCardProps) {
  const { control, setValue, getValues, watch } = useFormContext();
  const { toast } = useToast();

  const [isSelectionDialogOpen, setIsSelectionDialogOpen] = useState(false);
  const [vehicleLicensePlateSearch, setVehicleLicensePlateSearch] = useState("");
  const [vehicleSearchResults, setVehicleSearchResults] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [lastService, setLastService] = useState<ServiceRecord | null>(null);
  const [serviceHistory, setServiceHistory] = useState<ServiceRecord[]>([]);
  
  const vehicleId = watch('vehicleId');
  const watchedStatus = watch('status');
  const watchedSubStatus = watch('subStatus');

  useEffect(() => {
    serviceService.onServicesUpdate(setServiceHistory);
  }, []);
  
  const showNextServiceCard = useMemo(() => {
    return (watchedStatus === 'En Taller' && watchedSubStatus === 'Completado') || watchedStatus === 'Entregado';
  }, [watchedStatus, watchedSubStatus]);

  useEffect(() => {
    const findVehicleData = (vId: string) => {
      const vehicle = localVehicles.find(v => v.id === vId);
      if (vehicle) {
        setSelectedVehicle(vehicle);
        setVehicleLicensePlateSearch(vehicle.licensePlate);
        const vehicleServices = serviceHistory
          .filter(s => s.vehicleId === vehicle.id)
          .sort((a, b) => {
              const dateA = parseDate(a.deliveryDateTime) || parseDate(a.serviceDate) || new Date(0);
              const dateB = parseDate(b.deliveryDateTime) || parseDate(b.serviceDate) || new Date(0);
              if (!isValid(dateA)) return 1;
              if (!isValid(dateB)) return -1;
              return dateB.getTime() - dateA.getTime();
          });
        setLastService(vehicleServices[0] || null);
      } else {
        setSelectedVehicle(null);
        setLastService(null);
      }
    };
    if (vehicleId) {
      findVehicleData(vehicleId);
    }
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
    const description = service.description || service.serviceItems?.map(item => item.name).join(', ') || 'Servicio General';
    if (!relevantDate || !isValid(relevantDate)) return 'Fecha inválida.';
    return `${service.mileage ? `${service.mileage.toLocaleString('es-ES')} km - ` : ''}${format(relevantDate, "dd MMM yyyy", { locale: es })} - ${description}`;
  };

  if (selectedVehicle) {
    return (
      <div className="space-y-4">
        <Card className="relative">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5"><User className="h-4 w-4" /> {selectedVehicle.ownerName}</span>
                  <span className="flex items-center gap-1.5"><Phone className="h-4 w-4" /> {selectedVehicle.ownerPhone || 'N/A'}</span>
                </div>
                <p className="text-xl font-bold mt-1">{selectedVehicle.licensePlate} - {selectedVehicle.make} {selectedVehicle.model} ({selectedVehicle.year})</p>
              </div>
              <Button asChild variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0">
                  <Link href={`/vehiculos/${selectedVehicle.id}`} target="_blank" title="Ver perfil completo del vehículo">
                      <Edit className="h-4 w-4" />
                  </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <FormField
              control={control}
              name="mileage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kilometraje (Opcional)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="Ej: 55000 km" {...field} value={field.value ?? ''} disabled={isReadOnly} />
                  </FormControl>
                </FormItem>
              )}
            />
            <div className="flex justify-start pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => { setSelectedVehicle(null); setValue('vehicleId', undefined); onVehicleSelected(null); }}>
                  Cambiar Vehículo
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
            <CardHeader className="p-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Último Servicio Registrado
                </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
                 <p className="text-sm text-muted-foreground truncate" title={formatServiceInfo(lastService)}>
                    {formatServiceInfo(lastService)}
                </p>
            </CardContent>
        </Card>

        {showNextServiceCard && (
          <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/30">
            <CardHeader className="p-4">
                <CardTitle className="text-base flex items-center gap-2 text-blue-800 dark:text-blue-300">
                    <CalendarCheck className="h-5 w-5" />Próximo Servicio Recomendado
                </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                    <FormLabel>Fecha</FormLabel>
                    <div className="flex gap-2 items-center">
                        <FormField
                            control={control}
                            name="nextServiceInfo.date"
                            render={({ field }) => ( <FormControl><Input type="date" value={field.value ? format(parseDate(field.value)!, 'yyyy-MM-dd') : ''} onChange={(e) => field.onChange(e.target.valueAsDate?.toISOString())} disabled={isReadOnly} className="flex-grow"/></FormControl>)}
                        />
                        <Button type="button" size="sm" variant="outline" onClick={() => setValue('nextServiceInfo.date', addMonths(new Date(), 6).toISOString())} className="bg-white hover:bg-gray-100 text-black">6m</Button>
                        <Button type="button" size="sm" variant="outline" onClick={() => setValue('nextServiceInfo.date', addYears(new Date(), 1).toISOString())} className="bg-white hover:bg-gray-100 text-black">1a</Button>
                    </div>
                </div>
                <div className="space-y-1">
                    <FormLabel>Kilometraje</FormLabel>
                    <div className="flex gap-2 items-center">
                        <FormField
                            control={control}
                            name="nextServiceInfo.mileage"
                            render={({ field }) => (<FormControl><Input type="number" placeholder="Ej: 135000" {...field} value={field.value ?? ''} disabled={isReadOnly} className="flex-grow" /></FormControl>)}
                        />
                        <Button type="button" size="sm" variant="outline" onClick={() => setValue('nextServiceInfo.mileage', Number(getValues('mileage') || 0) + 10000)} className="bg-white hover:bg-gray-100 text-black">+10k</Button>
                    </div>
                </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="w-full h-24 border-2 border-dashed bg-muted/30 hover:bg-muted/50 text-muted-foreground"
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
            <ScrollArea className="h-60 border rounded-md">
              <div className="p-2 space-y-1">
                {vehicleSearchResults.length > 0 ? (
                  vehicleSearchResults.map((v) => (
                    <Button
                      key={v.id}
                      variant="ghost"
                      className="w-full justify-start text-left h-auto"
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
              </div>
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
