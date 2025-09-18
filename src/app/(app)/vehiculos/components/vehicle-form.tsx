// src/app/(app)/vehiculos/components/vehicle-form.tsx

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Vehicle } from "@/types";
import { useEffect } from "react";
import { capitalizeWords } from "@/lib/utils";
import { DollarSign } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { vehicleFormSchema, type VehicleFormValues } from "@/schemas/vehicle-form-schema";


interface VehicleFormProps {
  id?: string;
  initialData?: Partial<Vehicle> | null;
  onSubmit: (values: VehicleFormValues) => Promise<void>;
}

export function VehicleForm({ id, initialData, onSubmit }: VehicleFormProps) {
  const form = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleFormSchema),
    defaultValues: {
      make: initialData?.make || "",
      model: initialData?.model || "",
      year: initialData?.year || new Date().getFullYear(),
      vin: initialData?.vin || "",
      licensePlate: initialData?.licensePlate || "",
      color: initialData?.color || "",
      ownerName: initialData?.ownerName || "",
      ownerPhone: initialData?.ownerPhone || "",
      ownerEmail: initialData?.ownerEmail || "",
      notes: initialData?.notes || "",
      dailyRentalCost: initialData?.dailyRentalCost ?? undefined,
      gpsMonthlyCost: initialData?.gpsMonthlyCost ?? undefined,
      adminMonthlyCost: initialData?.adminMonthlyCost ?? undefined,
      insuranceMonthlyCost: initialData?.insuranceMonthlyCost ?? undefined,
    },
  });

  useEffect(() => {
    if(initialData?.licensePlate) {
        form.setValue('licensePlate', initialData.licensePlate);
    }
  }, [initialData, form]);

  const handleFormSubmit = async (values: VehicleFormValues) => {
    const submissionData = {
      ...values,
      dailyRentalCost: values.dailyRentalCost || null,
      gpsMonthlyCost: values.gpsMonthlyCost || null,
      adminMonthlyCost: values.adminMonthlyCost || null,
      insuranceMonthlyCost: values.insuranceMonthlyCost || null,
    };
    await onSubmit(submissionData);
  };

  return (
    <Form {...form}>
      <form id={id} onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6 pt-4">
        
        <div className="space-y-2">
            <h3 className="font-semibold">Datos del Vehículo</h3>
            <div className="space-y-4 rounded-md border p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="make" render={({ field }) => ( <FormItem><FormLabel>Marca</FormLabel><FormControl><Input placeholder="Ej: Toyota" {...field} onChange={(e) => field.onChange(capitalizeWords(e.target.value))} className="bg-white" /></FormControl><FormMessage /></FormItem> )}/>
                    <FormField control={form.control} name="model" render={({ field }) => ( <FormItem><FormLabel>Modelo</FormLabel><FormControl><Input placeholder="Ej: Corolla" {...field} onChange={(e) => field.onChange(capitalizeWords(e.target.value))} className="bg-white" /></FormControl><FormMessage /></FormItem> )}/>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField control={form.control} name="year" render={({ field }) => ( <FormItem><FormLabel>Año</FormLabel><FormControl><Input type="number" placeholder="Ej: 2020" {...field} value={field.value ?? ''} className="bg-white" /></FormControl><FormMessage /></FormItem> )}/>
                    <FormField control={form.control} name="licensePlate" render={({ field }) => ( <FormItem><FormLabel>Placa</FormLabel><FormControl><Input placeholder="Ej: PQR-123" {...field} onChange={(e) => field.onChange(e.target.value.toUpperCase())} className="bg-white" /></FormControl><FormMessage /></FormItem> )}/>
                    <FormField control={form.control} name="color" render={({ field }) => ( <FormItem><FormLabel>Color (Opcional)</FormLabel><FormControl><Input placeholder="Ej: Rojo" {...field} value={field.value ?? ''} onChange={(e) => field.onChange(capitalizeWords(e.target.value))} className="bg-white" /></FormControl><FormMessage /></FormItem> )}/>
                </div>
                <FormField control={form.control} name="vin" render={({ field }) => ( <FormItem><FormLabel>VIN (Número de Chasis) (Opcional)</FormLabel><FormControl><Input placeholder="17 caracteres" {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value.toUpperCase())} className="bg-white" /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={form.control} name="notes" render={({ field }) => ( <FormItem><FormLabel>Notas (Opcional)</FormLabel><FormControl><Textarea placeholder="Notas adicionales sobre el vehículo..." {...field} value={field.value ?? ''} className="bg-white" /></FormControl><FormMessage /></FormItem> )}/>
            </div>
        </div>

        <div className="space-y-2">
            <h3 className="font-semibold">Datos del Propietario</h3>
            <div className="space-y-4 rounded-md border p-4">
              <FormField control={form.control} name="ownerName" render={({ field }) => ( <FormItem><FormLabel>Nombre del Propietario</FormLabel><FormControl><Input placeholder="Ej: Juan Pérez" {...field} onChange={(e) => field.onChange(capitalizeWords(e.target.value))} className="bg-white" /></FormControl><FormMessage /></FormItem> )}/>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="ownerPhone" render={({ field }) => ( <FormItem><FormLabel>Teléfono del Propietario</FormLabel><FormControl><Input placeholder="Ej: 555-123456" {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value.replace(/[^0-9]/g, ''))} className="bg-white" /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={form.control} name="ownerEmail" render={({ field }) => ( <FormItem><FormLabel>Email del Propietario (Opcional)</FormLabel><FormControl><Input type="email" placeholder="Ej: juan.perez@email.com" {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value.toLowerCase())} className="bg-white" /></FormControl><FormMessage /></FormItem> )}/>
              </div>
            </div>
        </div>

        {initialData?.isFleetVehicle && (
          <div className="space-y-2">
            <h3 className="font-semibold">Costos de Flotilla</h3>
            <div className="space-y-4 rounded-md border p-4">
              <FormField control={form.control} name="dailyRentalCost" render={({ field }) => ( <FormItem><FormLabel>Costo de Renta Diario</FormLabel><FormControl><div className="relative"><DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="number" step="0.01" placeholder="250.00" {...field} value={field.value ?? ''} className="pl-8 bg-white" onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))}/></div></FormControl><FormMessage/></FormItem> )}/>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <FormField control={form.control} name="gpsMonthlyCost" render={({ field }) => ( <FormItem><FormLabel>Deducción GPS (Mensual)</FormLabel><FormControl><div className="relative"><DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="number" step="0.01" placeholder="150.00" {...field} value={field.value ?? ''} className="pl-8 bg-white" onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))}/></div></FormControl><FormMessage/></FormItem> )}/>
                 <FormField control={form.control} name="adminMonthlyCost" render={({ field }) => ( <FormItem><FormLabel>Deducción Admin (Mensual)</FormLabel><FormControl><div className="relative"><DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="number" step="0.01" placeholder="200.00" {...field} value={field.value ?? ''} className="pl-8 bg-white" onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))}/></div></FormControl><FormMessage/></FormItem> )}/>
                 <FormField control={form.control} name="insuranceMonthlyCost" render={({ field }) => ( <FormItem><FormLabel>Deducción Seguro (Mensual)</FormLabel><FormControl><div className="relative"><DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="number" step="0.01" placeholder="250.00" {...field} value={field.value ?? ''} className="pl-8 bg-white" onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))}/></div></FormControl><FormMessage/></FormItem> )}/>
              </div>
            </div>
          </div>
        )}
      </form>
    </Form>
  );
}
