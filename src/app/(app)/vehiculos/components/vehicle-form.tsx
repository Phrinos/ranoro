// src/app/(app)/vehiculos/components/vehicle-form.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Vehicle } from "@/types";
import { vehicleFormSchema, type VehicleFormValues } from '@/schemas/vehicle-form-schema';
import { capitalizeWords } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { db } from "@/lib/firebaseClient";
import { collection, getDocs } from 'firebase/firestore';
import { VEHICLE_COLLECTION } from "@/lib/vehicle-constants";

// Tipos para la data que viene de Firestore
interface VehicleMake {
  make: string;
  models: {
    name: string;
    generations: {
      startYear: number;
      endYear: number;
      engines: { name: string; [key: string]: any }[]; // Engine is an object with a name property
    }[];
  }[];
}

interface VehicleFormProps {
  id?: string;
  initialData?: Partial<Vehicle> | null;
  onSubmit: (values: VehicleFormValues) => Promise<void>;
}

export function VehicleForm({ id, initialData, onSubmit }: VehicleFormProps) {
  const [vehicleDb, setVehicleDb] = useState<VehicleMake[]>([]);
  const [isLoadingDb, setIsLoadingDb] = useState(true);

  const form = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleFormSchema),
    defaultValues: {
      make: "", model: "", year: new Date().getFullYear(),
      licensePlate: "", vin: "", color: "", ownerName: "",
      ownerPhone: "", chatMetaLink: "", notes: "",
      isFleetVehicle: false,
    },
  });
  
  const { watch, setValue } = form;
  const watchedMake = watch("make");
  const watchedModel = watch("model");
  const watchedYear = watch("year");

  // Cargar datos de Firestore al montar el componente
  useEffect(() => {
    const fetchVehicleData = async () => {
      setIsLoadingDb(true);
      try {
        if (!db) return;
        const querySnapshot = await getDocs(collection(db, VEHICLE_COLLECTION));
        const data = querySnapshot.docs.map(doc => ({ make: doc.id, ...doc.data() })) as VehicleMake[];
        setVehicleDb(data);
      } catch (error) {
        console.error("Error al cargar la base de datos de vehículos:", error);
      } finally {
        setIsLoadingDb(false);
      }
    };
    fetchVehicleData();
  }, []);

  // Resetear el formulario cuando cambian los datos iniciales
  useEffect(() => {
    if (initialData) {
      form.reset({
        make: initialData.make ?? "",
        model: initialData.model ?? "",
        year: initialData.year ?? new Date().getFullYear(),
        engine: (initialData as any).engine ?? "",
        licensePlate: initialData.licensePlate ?? "",
        vin: initialData.vin ?? "",
        color: initialData.color ?? "",
        ownerName: initialData.ownerName ?? "",
        ownerPhone: initialData.ownerPhone ?? "",
        chatMetaLink: (initialData as any).chatMetaLink ?? "",
        notes: initialData.notes ?? "",
        isFleetVehicle: initialData.isFleetVehicle ?? false,
      });
    } else {
      form.reset({
        make: "", model: "", year: new Date().getFullYear(),
        engine: "", licensePlate: "", vin: "", color: "", ownerName: "",
        ownerPhone: "", chatMetaLink: "", notes: "",
        isFleetVehicle: false,
      });
    }
  }, [initialData, form]);
  
    // Hooks para obtener listas dependientes (marcas, modelos, etc.)
    const makes = useMemo(() => vehicleDb.map(db => db.make).sort(), [vehicleDb]);
    const models = useMemo(() => {
        if (!watchedMake) return [];
        const selected = vehicleDb.find(db => db.make === watchedMake);
        return selected ? selected.models.map(m => m.name).sort() : [];
    }, [watchedMake, vehicleDb]);

    const years = useMemo(() => {
        if (!watchedMake || !watchedModel) return [];
        const makeData = vehicleDb.find(db => db.make === watchedMake);
        const modelData = makeData?.models.find(m => m.name === watchedModel);
        if (!modelData) return [];
        const yearSet = new Set<number>();
        modelData.generations.forEach(g => {
            for (let y = g.startYear; y <= g.endYear; y++) yearSet.add(y);
        });
        return Array.from(yearSet).sort((a, b) => b - a);
    }, [watchedMake, watchedModel, vehicleDb]);

    const engines = useMemo(() => {
        if (!watchedMake || !watchedModel || !watchedYear) return [];
        const makeData = vehicleDb.find(db => db.make === watchedMake);
        const modelData = makeData?.models.find(m => m.name === watchedModel);
        const generation = modelData?.generations.find(g => watchedYear >= g.startYear && watchedYear <= g.endYear);
        return generation ? generation.engines.sort((a, b) => a.name.localeCompare(b.name)) : [];
    }, [watchedMake, watchedModel, watchedYear, vehicleDb]);

  const handleFormSubmit = (values: VehicleFormValues) => {
    console.log("Vehicle form submitted with values:", values);
    onSubmit(values);
  };

  return (
    <Form {...form}>
      <form id={id} onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        
        <FormField
          control={form.control}
          name="isFleetVehicle"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-muted/50">
              <div className="space-y-0.5">
                <FormLabel className="text-base">¿Es un Vehículo de Flotilla?</FormLabel>
                <FormDescription>Marque si el vehículo pertenece a su flotilla de renta.</FormDescription>
              </div>
              <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <FormField control={form.control} name="make" render={({ field }) => ( <FormItem><FormLabel>Marca</FormLabel><Select onValueChange={(value) => { field.onChange(value); setValue("model", ""); setValue("year", 0); setValue("engine", ""); }} value={field.value ?? ''} disabled={isLoadingDb}><FormControl><SelectTrigger className="bg-card"><SelectValue placeholder={isLoadingDb ? "Cargando..." : "Seleccione..."} /></SelectTrigger></FormControl><SelectContent>{makes.map(make => <SelectItem key={make} value={make}>{make}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )}/>
            <FormField control={form.control} name="model" render={({ field }) => ( <FormItem><FormLabel>Modelo</FormLabel><Select onValueChange={(value) => { field.onChange(value); setValue("year", 0); setValue("engine", ""); }} value={field.value ?? ''} disabled={!watchedMake}><FormControl><SelectTrigger className="bg-card"><SelectValue placeholder="Seleccione..." /></SelectTrigger></FormControl><SelectContent>{models.map(model => <SelectItem key={model} value={model}>{model}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )}/>
            <FormField control={form.control} name="year" render={({ field }) => ( <FormItem><FormLabel>Año</FormLabel><Select onValueChange={(val) => { field.onChange(parseInt(val, 10)); setValue("engine", ""); }} value={String(field.value || '')} disabled={!watchedModel}><FormControl><SelectTrigger className="bg-card"><SelectValue placeholder="Seleccione..." /></SelectTrigger></FormControl><SelectContent>{years.map(year => <SelectItem key={year} value={String(year)}>{year}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )}/>
            <FormField control={form.control} name="engine" render={({ field }) => ( <FormItem><FormLabel>Motor (Opcional)</FormLabel><Select onValueChange={field.onChange} value={field.value ?? ''} disabled={!watchedYear || engines.length === 0}><FormControl><SelectTrigger className="bg-card"><SelectValue placeholder={engines.length === 0 ? "No disponible" : "Seleccione..."} /></SelectTrigger></FormControl><SelectContent>{engines.map((engine, index) => <SelectItem key={`${engine.name}-${index}`} value={engine.name}>{engine.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )}/>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField control={form.control} name="licensePlate" render={({ field }) => ( <FormItem><FormLabel>Placa</FormLabel><FormControl><Input placeholder="Ej: ABC-123" {...field} onChange={e => field.onChange(e.target.value.toUpperCase())} className="bg-card" /></FormControl><FormMessage /></FormItem> )}/>
          <FormField control={form.control} name="vin" render={({ field }) => ( <FormItem><FormLabel>VIN (Opcional)</FormLabel><FormControl><Input placeholder="Número de Serie" {...field} onChange={e => field.onChange(e.target.value.toUpperCase())} className="bg-card" /></FormControl><FormMessage /></FormItem> )}/>
          <FormField control={form.control} name="color" render={({ field }) => ( <FormItem><FormLabel>Color (Opcional)</FormLabel><FormControl><Input placeholder="Ej: Blanco" {...field} onChange={e => field.onChange(capitalizeWords(e.target.value))} className="bg-card" /></FormControl><FormMessage /></FormItem> )}/>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="ownerName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre del Propietario</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Ej: Juan Pérez"
                    {...field}
                    onChange={(e) => field.onChange(capitalizeWords(e.target.value))}
                    className="bg-card"
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField control={form.control} name="ownerPhone" render={({ field }) => ( <FormItem><FormLabel>Teléfono (Opcional)</FormLabel><FormControl><Input placeholder="Ej: 449-123-4567" {...field} className="bg-card" /></FormControl><FormMessage /></FormItem> )}/>
        </div>

        <FormField control={form.control} name="chatMetaLink" render={({ field }) => ( <FormItem><FormLabel>Chat Meta (Opcional)</FormLabel><FormControl><Input placeholder="https://wa.me/..." {...field} className="bg-card"/></FormControl><FormMessage /></FormItem> )}/>
        
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notas Adicionales (Opcional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Detalles importantes..."
                  {...field}
                  className="bg-card"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}
