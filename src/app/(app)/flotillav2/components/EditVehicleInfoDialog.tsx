
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import type { Vehicle } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

const vehicleInfoSchema = z.object({
  make: z.string().min(1, "La marca es obligatoria."),
  model: z.string().min(1, "El modelo es obligatorio."),
  year: z.coerce.number().min(1900, "Año inválido."),
  color: z.string().optional(),
  vin: z.string().optional(),
  engineSerialNumber: z.string().optional(), // ✅ Añadido
  ownerName: z.string().min(1, "El nombre del propietario es obligatorio."),
  ownerPhone: z.string().optional(),
  notes: z.string().optional(),
});

export type VehicleInfoFormValues = z.infer<typeof vehicleInfoSchema>;

interface EditVehicleInfoDialogProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  vehicle: Vehicle;
  onSave: (values: VehicleInfoFormValues) => Promise<void>;
}

export function EditVehicleInfoDialog({ open, onOpenChange, vehicle, onSave }: EditVehicleInfoDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const defaults = useMemo<VehicleInfoFormValues>(
    () => ({
      make: vehicle?.make ?? "",
      model: vehicle?.model ?? "",
      year: Number(vehicle?.year ?? new Date().getFullYear()),
      color: vehicle?.color ?? "",
      vin: vehicle?.vin ?? "",
      engineSerialNumber: vehicle?.engineSerialNumber ?? "", // ✅ Añadido
      ownerName: vehicle?.ownerName ?? "",
      ownerPhone: vehicle?.ownerPhone ?? "",
      notes: vehicle?.notes ?? "",
    }),
    [vehicle]
  );

  const form = useForm<VehicleInfoFormValues>({
    resolver: zodResolver(vehicleInfoSchema) as any,
    defaultValues: defaults,
  });

  useEffect(() => {
    if (!open) return;
    form.reset(defaults);
  }, [open, defaults, form]);

  const handleFormSubmit = async (values: VehicleInfoFormValues) => {
    setIsSubmitting(true);
    try {
      await onSave(values);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar Información del Vehículo</DialogTitle>
          <DialogDescription>Actualiza los detalles generales y del propietario.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control as any}
                name="make"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Marca</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} className="bg-white" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control as any}
                name="model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Modelo</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} className="bg-white" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control as any}
                name="year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Año</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === "" ? undefined : e.target.valueAsNumber)} className="bg-white" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control as any}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Color</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} className="bg-white" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control as any}
                name="vin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Serie (VIN)</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} className="bg-white" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control as any}
                name="engineSerialNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número de Motor</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} className="bg-white" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control as any}
              name="ownerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del Propietario</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} className="bg-white" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar Cambios
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
