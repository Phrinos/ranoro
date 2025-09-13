// src/app/(app)/flotilla/components/EditRentalSystemDialog.tsx
"use client";

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { Vehicle } from '@/types';
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
import { Loader2 } from 'lucide-react';

const rentalSystemSchema = z.object({
  dailyRentalCost: z.coerce.number().min(0, "El costo debe ser positivo."),
  gpsCost: z.coerce.number().min(0, "El costo debe ser positivo."),
  insuranceCost: z.coerce.number().min(0, "El costo debe ser positivo."),
  adminCost: z.coerce.number().min(0, "El costo debe ser positivo."),
});

export type RentalSystemFormValues = z.infer<typeof rentalSystemSchema>;

interface EditRentalSystemDialogProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  vehicle: Vehicle;
  onSave: (values: RentalSystemFormValues) => Promise<void>;
}

export function EditRentalSystemDialog({ open, onOpenChange, vehicle, onSave }: EditRentalSystemDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<RentalSystemFormValues>({
    resolver: zodResolver(rentalSystemSchema),
  });

  useEffect(() => {
    if (vehicle) {
      form.reset({
        dailyRentalCost: vehicle.dailyRentalCost || 0,
        gpsCost: vehicle.gpsCost || 0,
        insuranceCost: vehicle.insuranceCost || 0,
        adminCost: vehicle.adminCost || 0,
      });
    }
  }, [vehicle, form, open]);

  const handleFormSubmit = async (values: RentalSystemFormValues) => {
    setIsSubmitting(true);
    await onSave(values);
    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Sistema de Renta</DialogTitle>
          <DialogDescription>
            Actualiza los costos fijos y de operación del vehículo.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 pt-4">
              <FormField control={form.control} name="dailyRentalCost" render={({ field }) => (
                <FormItem><FormLabel>Renta Diaria ($)</FormLabel><FormControl><Input type="number" step="0.01" {...field} className="bg-white" /></FormControl><FormMessage /></FormItem>
              )}/>
              <FormField control={form.control} name="gpsCost" render={({ field }) => (
                <FormItem><FormLabel>GPS Mensual ($)</FormLabel><FormControl><Input type="number" step="0.01" {...field} className="bg-white" /></FormControl><FormMessage /></FormItem>
              )}/>
              <FormField control={form.control} name="insuranceCost" render={({ field }) => (
                <FormItem><FormLabel>Seguro Mensual ($)</FormLabel><FormControl><Input type="number" step="0.01" {...field} className="bg-white" /></FormControl><FormMessage /></FormItem>
              )}/>
              <FormField control={form.control} name="adminCost" render={({ field }) => (
                <FormItem><FormLabel>Administración Mensual ($)</FormLabel><FormControl><Input type="number" step="0.01" {...field} className="bg-white" /></FormControl><FormMessage /></FormItem>
              )}/>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
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
