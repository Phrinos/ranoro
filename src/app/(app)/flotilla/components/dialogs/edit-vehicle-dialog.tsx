// src/app/(app)/flotilla/components/dialogs/edit-vehicle-dialog.tsx
"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Vehicle } from "@/types";

const schema = z.object({
  make: z.string().min(1),
  model: z.string().min(1),
  year: z.coerce.number().int().min(1900).max(2100),
  licensePlate: z.string().min(1),
  color: z.string().optional(),
  vin: z.string().optional(),
  engineSerialNumber: z.string().optional(),
  engine: z.string().optional(),
  notes: z.string().optional(),
  ownerName: z.string().optional(),
  ownerPhone: z.string().optional(),
  ownerAddress: z.string().optional(),
  ownerLicence: z.string().optional(),
  dailyRentalCost: z.coerce.number().optional(),
  gpsCost: z.coerce.number().optional(),
  insuranceCost: z.coerce.number().optional(),
  adminCost: z.coerce.number().optional(),
});

export type EditVehicleFormValues = z.infer<typeof schema>;

interface EditVehicleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle: Vehicle | null;
  onSave: (values: EditVehicleFormValues) => Promise<void>;
  defaultTab?: "info" | "rental" | "owner";
}

export function EditVehicleDialog({ open, onOpenChange, vehicle, onSave, defaultTab = "info" }: EditVehicleDialogProps) {
  const form = useForm<EditVehicleFormValues>({ resolver: zodResolver(schema) as any });

  useEffect(() => {
    if (open && vehicle) {
      form.reset({
        make: vehicle.make ?? "",
        model: vehicle.model ?? "",
        year: vehicle.year ?? new Date().getFullYear(),
        licensePlate: vehicle.licensePlate ?? "",
        color: vehicle.color ?? "",
        vin: vehicle.vin ?? "",
        engineSerialNumber: vehicle.engineSerialNumber ?? "",
        engine: vehicle.engine ?? "",
        notes: vehicle.notes ?? "",
        ownerName: vehicle.ownerName ?? "",
        ownerPhone: vehicle.ownerPhone ?? "",
        ownerAddress: vehicle.ownerAddress ?? "",
        ownerLicence: vehicle.ownerLicence ?? "",
        dailyRentalCost: vehicle.dailyRentalCost ?? 0,
        gpsCost: vehicle.gpsCost ?? 0,
        insuranceCost: vehicle.insuranceCost ?? 0,
        adminCost: vehicle.adminCost ?? 0,
      });
    }
  }, [open, vehicle]);

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSave(values);
    onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Vehículo</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit}>
            <Tabs defaultValue={defaultTab} className="w-full">
              <TabsList className="grid grid-cols-3 mb-4">
                <TabsTrigger value="info">Info</TabsTrigger>
                <TabsTrigger value="rental">Renta</TabsTrigger>
                <TabsTrigger value="owner">Propietario</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <FormField control={form.control} name="make" render={({ field }) => (
                    <FormItem><FormLabel>Marca</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="model" render={({ field }) => (
                    <FormItem><FormLabel>Modelo</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="year" render={({ field }) => (
                    <FormItem><FormLabel>Año</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="licensePlate" render={({ field }) => (
                    <FormItem><FormLabel>Placa</FormLabel><FormControl><Input className="uppercase" {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="color" render={({ field }) => (
                    <FormItem><FormLabel>Color</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="vin" render={({ field }) => (
                  <FormItem><FormLabel>VIN / Serie</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                )} />
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="engineSerialNumber" render={({ field }) => (
                    <FormItem><FormLabel>No. Motor</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="engine" render={({ field }) => (
                    <FormItem><FormLabel>Motor</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem><FormLabel>Notas</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                )} />
              </TabsContent>

              <TabsContent value="rental" className="space-y-3">
                <FormField control={form.control} name="dailyRentalCost" render={({ field }) => (
                  <FormItem><FormLabel>Renta Diaria ($)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl></FormItem>
                )} />
                <div className="grid grid-cols-3 gap-3">
                  <FormField control={form.control} name="gpsCost" render={({ field }) => (
                    <FormItem><FormLabel>GPS</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="insuranceCost" render={({ field }) => (
                    <FormItem><FormLabel>Seguro</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="adminCost" render={({ field }) => (
                    <FormItem><FormLabel>Admin</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl></FormItem>
                  )} />
                </div>
              </TabsContent>

              <TabsContent value="owner" className="space-y-3">
                <FormField control={form.control} name="ownerName" render={({ field }) => (
                  <FormItem><FormLabel>Nombre del Propietario</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                )} />
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="ownerPhone" render={({ field }) => (
                    <FormItem><FormLabel>Teléfono</FormLabel><FormControl><Input type="tel" {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="ownerLicence" render={({ field }) => (
                    <FormItem><FormLabel>Licencia</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="ownerAddress" render={({ field }) => (
                  <FormItem><FormLabel>Dirección</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                )} />
              </TabsContent>
            </Tabs>

            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
