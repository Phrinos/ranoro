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

export type { VehicleInfoFormValues };

interface EditVehicleInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: VehicleInfoFormValues) => Promise<void> | void;
  vehicle?: Vehicle;
}

const buildDefaults = (vehicle?: Vehicle): VehicleInfoFormValues => ({
  ownerName: vehicle?.ownerName ?? "",
  ownerLicence: vehicle?.ownerLicence ?? "",
  ownerAddress: vehicle?.ownerAddress ?? "",
});

export function EditVehicleInfoDialog({ open, onOpenChange, onSave, vehicle }: EditVehicleInfoDialogProps) {
  const resolver = zodResolver(vehicleInfoSchema) as unknown as Resolver<VehicleInfoFormValues>;

  const form = useForm<VehicleInfoFormValues>({
    resolver,
    defaultValues: buildDefaults(vehicle),
    mode: "onBlur",
  });

  const { handleSubmit, reset, formState } = form;

  useEffect(() => {
    if (open) reset(buildDefaults(vehicle));
  }, [open, reset, vehicle]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Editar información del vehículo</DialogTitle>
          <DialogDescription>Actualiza los datos del propietario del vehículo.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit(async (data) => onSave(data))} className="space-y-4">
            <FormField
              control={form.control}
              name="ownerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del propietario</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="ownerLicence"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Licencia del propietario</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="ownerAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dirección del propietario</FormLabel>
                  <FormControl>
                    <Input {...field} />
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
                Guardar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
