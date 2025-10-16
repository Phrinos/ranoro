
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { NewCalendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Car, User, AlertCircle, Save, CalendarIcon, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { serviceService, inventoryService } from '@/lib/services';
import type { Vehicle, PaymentMethod } from '@/types';
import { cn, formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';

const individualServiceSchema = z.object({
  serviceDate: z.date({ required_error: "La fecha es obligatoria." }),
  licensePlate: z.string().min(3, "La placa es obligatoria."),
  vehicleId: z.string().min(1, "Debe seleccionar un vehículo válido."),
  description: z.string().min(5, "La descripción del servicio es obligatoria."),
  totalCost: z.coerce.number().min(0.01, "El costo total debe ser mayor a 0."),
  suppliesCost: z.coerce.number().min(0, "El costo de insumos debe ser positivo."),
  paymentMethod: z.string().min(1, "Seleccione un método de pago."),
});

type FormValues = z.infer<typeof individualServiceSchema>;

const paymentMethods: PaymentMethod[] = ['Efectivo', 'Tarjeta', 'Transferencia', 'Efectivo+Transferencia', 'Tarjeta+Transferencia'];

export function RegistroIndividualContent() {
  const { toast } = useToast();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoadingVehicles, setIsLoadingVehicles] = useState(true);
  const [searchedVehicle, setSearchedVehicle] = useState<Vehicle | null>(null);
  const [vehicleNotFound, setVehicleNotFound] = useState(false);
  const [searchResults, setSearchResults] = useState<Vehicle[]>([]);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(individualServiceSchema),
    defaultValues: {
      serviceDate: new Date(),
      licensePlate: '',
      vehicleId: '',
      description: '',
      totalCost: 0,
      suppliesCost: 0,
      paymentMethod: 'Efectivo',
    },
  });

  const { watch, setValue } = form;
  const totalCost = watch('totalCost');
  const suppliesCost = watch('suppliesCost');
  const licensePlateSearch = watch('licensePlate');
  const serviceProfit = useMemo(() => {
      const tc = totalCost || 0;
      const sc = suppliesCost || 0;
      return tc > 0 ? tc - sc : 0;
  }, [totalCost, suppliesCost]);

  useEffect(() => {
    const unsubscribe = inventoryService.onVehiclesUpdate((data) => {
      setVehicles(data);
      setIsLoadingVehicles(false);
    });
    return () => unsubscribe();
  }, []);
  
  useEffect(() => {
    if (!licensePlateSearch || licensePlateSearch.length < 2) {
      setSearchResults([]);
      return;
    }
    if (searchedVehicle && searchedVehicle.licensePlate === licensePlateSearch) {
      setSearchResults([]);
      return;
    }
    
    const lowerSearch = licensePlateSearch.toLowerCase();
    const results = vehicles.filter(v => 
      v.licensePlate.toLowerCase().includes(lowerSearch) ||
      v.make.toLowerCase().includes(lowerSearch) ||
      v.model.toLowerCase().includes(lowerSearch) ||
      (v.ownerName && v.ownerName.toLowerCase().includes(lowerSearch))
    ).slice(0, 5);
    
    setSearchResults(results);
    if (results.length === 0) setVehicleNotFound(true);
  }, [licensePlateSearch, vehicles, searchedVehicle]);

  const handleSelectVehicle = useCallback((vehicle: Vehicle) => {
    setSearchedVehicle(vehicle);
    setValue('vehicleId', vehicle.id, { shouldValidate: true });
    setValue('licensePlate', vehicle.licensePlate);
    setVehicleNotFound(false);
    setSearchResults([]);
  }, [setValue]);
  
  const onSubmit = async (data: FormValues) => {
    try {
      await serviceService.saveMigratedServices([data] as any, []);
      toast({ title: 'Servicio Registrado', description: `El servicio para ${data.licensePlate} ha sido guardado.` });
      form.reset({ 
        serviceDate: new Date(), 
        paymentMethod: 'Efectivo', 
        licensePlate: '', 
        vehicleId: '', 
        description: '', 
        totalCost: 0, 
        suppliesCost: 0 
      });
      setSearchedVehicle(null);
    } catch (e) {
      console.error(e);
      toast({ title: 'Error al Guardar', description: 'No se pudo registrar el servicio.', variant: 'destructive' });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registro de Servicio Individual</CardTitle>
        <CardDescription>Añade un servicio histórico a la base de datos de forma manual.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4 p-4 border rounded-md">
              <h3 className="font-semibold">1. Buscar Vehículo</h3>
              <FormField
                control={form.control}
                name="licensePlate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Buscar Vehículo (Placa, Marca, Modelo, Propietario)</FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input
                          placeholder="Ej: ABC-123"
                          {...field}
                          onChange={(e) => {
                            field.onChange(e.target.value.toUpperCase());
                            setSearchedVehicle(null);
                            setVehicleNotFound(false);
                            setValue('vehicleId', '');
                          }}
                        />
                      </FormControl>
                      {searchResults.length > 0 && (
                        <div className="absolute top-full mt-1 w-full z-10">
                          <ScrollArea className="h-auto max-h-[150px] rounded-md border bg-background shadow-lg">
                            <div className="p-2">
                              {searchResults.map(v => (
                                <button
                                  type="button"
                                  key={v.id}
                                  onClick={() => handleSelectVehicle(v)}
                                  className="w-full text-left p-2 rounded-md hover:bg-muted"
                                >
                                  <p className="font-semibold">{v.licensePlate}</p>
                                  <p className="text-sm text-muted-foreground">{v.make} {v.model} - {v.ownerName}</p>
                                </button>
                              ))}
                            </div>
                          </ScrollArea>
                        </div>
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {isLoadingVehicles && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cargando vehículos...
                </div>
              )}
              {vehicleNotFound && !searchedVehicle && (
                <div className="flex items-center text-sm text-destructive">
                  <AlertCircle className="mr-2 h-4 w-4" /> Vehículo no encontrado. Verifique los datos.
                </div>
              )}
              {searchedVehicle && (
                <Card className="bg-muted/50">
                  <CardHeader className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Car className="h-5 w-5"/> {searchedVehicle.make} {searchedVehicle.model} ({searchedVehicle.year})
                      </CardTitle>
                      <CardDescription>Placa: {searchedVehicle.licensePlate}</CardDescription>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-sm font-semibold flex items-center gap-2">
                        <User className="h-4 w-4"/> {searchedVehicle.ownerName}
                      </p>
                      <p className="text-xs text-muted-foreground">{searchedVehicle.ownerPhone}</p>
                    </div>
                  </CardHeader>
                </Card>
              )}
            </div>
            
            <div className="space-y-4 p-4 border rounded-md">
              <h3 className="font-semibold">2. Detalles del Servicio</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="serviceDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Fecha del Servicio</FormLabel>
                      <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                              {field.value ? format(field.value, "PPP", { locale: es }) : <span>Seleccione fecha</span>}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <NewCalendar
                            value={field.value}
                            onChange={(date: any) => {
                              field.onChange(date);
                              setIsCalendarOpen(false);
                            }}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Servicio Realizado</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: Cambio de balatas delanteras" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="space-y-4 p-4 border rounded-md">
              <h3 className="font-semibold">3. Costos y Pago</h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                <FormField
                  control={form.control}
                  name="totalCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Costo Total (Cliente)</FormLabel>
                      <div className="relative">
                        <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="1200.00" {...field} value={field.value ?? ''} className="pl-8"/>
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="suppliesCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Costo Insumos (Taller)</FormLabel>
                      <div className="relative">
                        <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="750.00" {...field} value={field.value ?? ''} className="pl-8"/>
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div>
                  <FormLabel>Ganancia</FormLabel>
                  <div className="h-10 flex items-center p-2 border rounded-md bg-muted/50 font-semibold">
                    {formatCurrency(serviceProfit)}
                  </div>
                </div>
                <FormField
                  control={form.control}
                  name="paymentMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Método de Pago</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione método" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {paymentMethods.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            <div className="flex justify-end">
              <Button type="submit" disabled={form.formState.isSubmitting || !searchedVehicle}>
                <Save className="mr-2 h-4 w-4" />
                {form.formState.isSubmitting ? "Guardando..." : "Guardar Servicio Histórico"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
