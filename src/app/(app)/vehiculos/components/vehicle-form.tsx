// src/app/(app)/vehiculos/components/vehicle-form.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import { useFormContext } from "react-hook-form";
import {
  FormField,
  FormItem,
  FormControl,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { capitalizeWords } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/firebaseClient";
import { collection, getDocs } from 'firebase/firestore';
import { VEHICLE_COLLECTION } from "@/lib/vehicle-constants";
import type { VehicleFormValues } from '@/schemas/vehicle-form-schema';

interface VehicleMake {
  make: string;
  models: string[] | { name: string; generations?: any[] }[];
}

export function VehicleForm() {
  const [vehicleDb, setVehicleDb] = useState<VehicleMake[]>([]);
  const [isLoadingDb, setIsLoadingDb] = useState(true);

  const { control, watch, setValue } = useFormContext<VehicleFormValues>();
  
  const watchedMake = watch("make");

  useEffect(() => {
    const fetchVehicleData = async () => {
      setIsLoadingDb(true);
      try {
        if (!db) return;
        const querySnapshot = await getDocs(collection(db, VEHICLE_COLLECTION));
        const data = querySnapshot.docs.map(doc => ({ make: doc.id, ...doc.data() })) as VehicleMake[];
        setVehicleDb(data);
      } catch (error) {
        console.error("Error loading vehicle database:", error);
      } finally {
        setIsLoadingDb(false);
      }
    };
    fetchVehicleData();
  }, []);
  
    const makes = useMemo(() => {
        const makeNames = vehicleDb.map(db => db.make).filter(Boolean);
        return Array.from(new Set(makeNames)).sort();
    }, [vehicleDb]);
    
    const models = useMemo(() => {
        if (!watchedMake) return [];
        const selected = vehicleDb.find(db => db.make === watchedMake);
        if (!selected || !selected.models) return [];
        const modelNames = selected.models.map(m => {
          if (typeof m === 'string') return m;
          return m.name;
        }).filter(Boolean);
        return Array.from(new Set(modelNames)).sort();
    }, [watchedMake, vehicleDb]);

    const currentYear = new Date().getFullYear();
    const allYears = Array.from({ length: 50 }, (_, i) => currentYear + 1 - i);

  return (
    <div className="space-y-6">
        <Card>
          <CardHeader className="pb-4 flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Detalles del Vehículo</CardTitle>
            <FormField
              control={control}
              name="isFleetVehicle"
              render={({ field }) => (
                <FormItem className="flex items-center gap-3 space-y-0">
                  <Label className="text-sm font-semibold text-muted-foreground cursor-pointer" htmlFor="fleet-switch">Flotilla</Label>
                  <FormControl>
                     <Switch 
                        id="fleet-switch"
                        checked={field.value} 
                        onCheckedChange={field.onChange} 
                     />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <FormField control={control} name="licensePlate" render={({ field }) => ( <FormItem><Label>Placa</Label><FormControl><Input placeholder="Ej: ABC-123" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value.toUpperCase())} className="bg-card" /></FormControl><FormMessage /></FormItem> )}/>

              <FormField control={control} name="make" render={({ field }) => ( 
                <FormItem>
                  <Label>Marca</Label>
                  <Select 
                    onValueChange={(value) => { 
                      field.onChange(value); 
                      setValue("model", ""); 
                    }} 
                    value={field.value ?? ''} 
                    disabled={isLoadingDb}
                  >
                    <FormControl>
                      <SelectTrigger className="bg-card">
                        <SelectValue placeholder={isLoadingDb ? "Cargando..." : "Seleccione..."} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {makes.map(make => <SelectItem key={`make-${make}`} value={make}>{make}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem> 
              )}/>
              
              <FormField control={control} name="model" render={({ field }) => ( 
                <FormItem>
                  <Label>Modelo</Label>
                  <Select 
                    onValueChange={(value) => { 
                      field.onChange(value); 
                    }} 
                    value={field.value ?? ''} 
                    disabled={!watchedMake}
                  >
                    <FormControl>
                      <SelectTrigger className="bg-card">
                        <SelectValue placeholder="Seleccione..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {models.map(model => <SelectItem key={`model-${model}`} value={model}>{model}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem> 
              )}/>
              
              <FormField control={control} name="year" render={({ field }) => ( 
                <FormItem>
                  <Label>Año</Label>
                  <Select 
                    onValueChange={(val) => { 
                      const num = Number(val);
                      field.onChange(isNaN(num) ? undefined : num); 
                    }} 
                    value={field.value ? String(field.value) : ''} 
                  >
                    <FormControl>
                      <SelectTrigger className="bg-card">
                        <SelectValue placeholder="Seleccione..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {allYears.map(year => <SelectItem key={`year-${year}`} value={String(year)}>{year}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem> 
              )}/>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <FormField control={control} name="color" render={({ field }) => ( <FormItem><Label>Color (Opcional)</Label><FormControl><Input placeholder="Ej: Blanco" {...field} value={field.value ?? ''} onChange={e => field.onChange(capitalizeWords(e.target.value))} className="bg-card" /></FormControl><FormMessage /></FormItem> )}/>

              <FormField control={control} name="engine" render={({ field }) => ( 
                <FormItem>
                  <Label>Tipo de Motor (Opcional)</Label>
                  <FormControl>
                     <Input placeholder="Ej: 2.0L 4 Cilindros" {...field} value={field.value ?? ''} className="bg-card" />
                  </FormControl>
                  <FormMessage />
                </FormItem> 
              )}/>

              <FormField control={control} name="vin" render={({ field }) => ( <FormItem><Label>Serie (VIN)</Label><FormControl><Input placeholder="Número de Serie" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value.toUpperCase())} className="bg-card" /></FormControl><FormMessage /></FormItem> )}/>
              <FormField control={control} name="engineSerialNumber" render={({ field }) => ( <FormItem><Label>Número de Motor</Label><FormControl><Input placeholder="Serie del Motor" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value.toUpperCase())} className="bg-card" /></FormControl><FormMessage /></FormItem> )}/>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Datos del Propietario</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={control}
              name="ownerName"
              render={({ field }) => (
                <FormItem>
                  <Label>Nombre del Propietario</Label>
                  <FormControl>
                    <Input
                      placeholder="Ej: Juan Pérez"
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(capitalizeWords(e.target.value))}
                      className="bg-card"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField control={control} name="ownerPhone" render={({ field }) => ( <FormItem><Label>Teléfono (Opcional)</Label><FormControl><Input placeholder="Ej: 449-123-4567" {...field} value={field.value ?? ''} className="bg-card" /></FormControl><FormMessage /></FormItem> )}/>
          </CardContent>
        </Card>
    </div>
  );
}
