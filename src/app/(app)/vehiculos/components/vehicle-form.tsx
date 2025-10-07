// src/app/(app)/vehiculos/components/vehicle-form.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
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
import { vehicleFormSchema, type VehicleFormValues } from '@/schemas/vehicle-form-schema';
import { capitalizeWords } from "@/lib/utils";

interface VehicleFormProps {
  id?: string;
  initialData?: Vehicle | null;
  onSubmit: (values: VehicleFormValues) => Promise<void>;
}

export function VehicleForm({ id, initialData, onSubmit }: VehicleFormProps) {
  const form = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleFormSchema),
    defaultValues: initialData || {
      make: "",
      model: "",
      year: new Date().getFullYear(),
      licensePlate: "",
      vin: "",
      color: "",
      ownerName: "",
      ownerPhone: "",
      chatMetaLink: "",
      notes: "",
    },
  });

  // Reset al cambiar initialData (ediciones sucesivas cargan bien)
  useEffect(() => {
    if (initialData) {
      form.reset({
        make: initialData.make ?? "",
        model: initialData.model ?? "",
        year: initialData.year ?? new Date().getFullYear(),
        licensePlate: initialData.licensePlate ?? "",
        vin: initialData.vin ?? "",
        color: initialData.color ?? "",
        ownerName: initialData.ownerName ?? "",
        ownerPhone: initialData.ownerPhone ?? "",
        chatMetaLink: (initialData as any).chatMetaLink ?? "",
        notes: initialData.notes ?? "",
      });
    } else {
      form.reset({
        make: "",
        model: "",
        year: new Date().getFullYear(),
        licensePlate: "",
        vin: "",
        color: "",
        ownerName: "",
        ownerPhone: "",
        chatMetaLink: "",
        notes: "",
      });
    }
  }, [initialData]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Form {...form}>
      <form id={id} onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="make"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Marca</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: Nissan" {...field} onChange={e => field.onChange(capitalizeWords(e.target.value))} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="model"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Modelo</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: Versa" {...field} onChange={e => field.onChange(capitalizeWords(e.target.value))} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="year"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Año</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="Ej: 2023" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="licensePlate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Placa</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: ABC-123" {...field} onChange={e => field.onChange(e.target.value.toUpperCase())} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="vin"
            render={({ field }) => (
              <FormItem>
                <FormLabel>VIN (Opcional)</FormLabel>
                <FormControl>
                  <Input placeholder="Número de Serie" {...field} onChange={e => field.onChange(e.target.value.toUpperCase())} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="color"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Color (Opcional)</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: Blanco" {...field} onChange={e => field.onChange(capitalizeWords(e.target.value))} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="ownerName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre del Propietario</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Juan Pérez" {...field} onChange={e => field.onChange(capitalizeWords(e.target.value))} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="ownerPhone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Teléfono del Propietario (Opcional)</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: 449-123-4567" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="chatMetaLink"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Chat Meta (Opcional)</FormLabel>
                <FormControl>
                  <Input placeholder="https://wa.me/..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notas Adicionales (Opcional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Detalles importantes sobre el vehículo..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}
