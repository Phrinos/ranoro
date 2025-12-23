"use client";

import React, { useEffect } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

import { vehicleInfoSchema, type VehicleInfoFormValues } from "@/schemas/vehicle-info-schema";
import type { Vehicle } from "@/types";

interface EditVehicleInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle?: Partial<Vehicle> | null;
  onSave: (data: VehicleInfoFormValues) => Promise<void> | void;
}

const buildDefaults = (v?: Partial<Vehicle> | null): VehicleInfoFormValues => ({
  make: v?.make ?? "",
  model: v?.model ?? "",
  year: Number(v?.year ?? new Date().getFullYear()),
  licensePlate: (v as any)?.licensePlate ?? "",
});

export function EditVehicleInfoDialog({ open, onOpenChange, vehicle, onSave }: EditVehicleInfoDialogProps) {
  const resolver = zodResolver(vehicleInfoSchema) as unknown as Resolver<VehicleInfoFormValues>;

  const form = useForm<VehicleInfoFormValues>({
    resolver,
    defaultValues: buildDefaults(vehicle),
    mode: "onBlur",
  });

  const { handleSubmit, reset, formState } = form;

  useEffect(() => {
    if (open) reset(buildDefaults(vehicle));
  }, [open, vehicle, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Editar vehículo</DialogTitle>
          <DialogDescription>Actualiza la información del vehículo.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit(async (data) => onSave(data))} className="space-y-4">
            <FormField
              control={form.control}
              name="make"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Marca</FormLabel>
                  <FormControl>
                    <Input className="bg-white" {...field} value={field.value ?? ""} />
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
                    <Input className="bg-white" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 👇 clave: NO hacer {...field} en number si te viene como unknown; setear value/onChange */}
            <FormField
              control={form.control}
              name="year"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Año</FormLabel>
                  <FormControl>
                    <Input
                      className="bg-white"
                      type="number"
                      name={field.name}
                      ref={field.ref}
                      onBlur={field.onBlur}
                      value={typeof field.value === "number" ? field.value : Number(field.value ?? "") || ""}
                      onChange={(e) => field.onChange(e.target.value === "" ? undefined : e.target.valueAsNumber)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="licensePlate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Placas</FormLabel>
                  <FormControl>
                    <Input className="bg-white" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={formState.isSubmitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={formState.isSubmitting}>
                Guardar cambios
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
