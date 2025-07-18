
"use client";

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DollarSign } from 'lucide-react';
import type { Vehicle } from '@/types';

const expenseSchema = z.object({
  vehicleId: z.string().min(1, "Debe seleccionar un vehículo."),
  amount: z.coerce.number().min(0.01, "El monto debe ser mayor a cero."),
  description: z.string().min(3, "La descripción es obligatoria (ej. Pago de tenencia)."),
});

export type VehicleExpenseFormValues = z.infer<typeof expenseSchema>;

interface VehicleExpenseDialogProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  fleetVehicles: Vehicle[];
  onSave: (values: VehicleExpenseFormValues) => void;
}

export function VehicleExpenseDialog({
  open,
  onOpenChange,
  fleetVehicles,
  onSave,
}: VehicleExpenseDialogProps) {
  const form = useForm<VehicleExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
  });

  const handleSubmit = (values: VehicleExpenseFormValues) => {
    onSave(values);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle>Registrar Gasto de Vehículo</DialogTitle>
          <DialogDescription>
            Registre un gasto asociado a un vehículo de la flotilla, como pago de placas, tenencia, etc.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="px-6 space-y-6">
            <FormField
              control={form.control}
              name="vehicleId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vehículo de la Flotilla</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Seleccione un vehículo" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {[...fleetVehicles]
                        .sort((a,b) => a.licensePlate.localeCompare(b.licensePlate))
                        .map(v => (
                        <SelectItem key={v.id} value={v.id}>{v.licensePlate} - {v.make} {v.model}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monto del Gasto</FormLabel>
                  <div className="relative">
                    <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <FormControl>
                      <Input type="number" step="0.01" {...field} value={field.value ?? ''} className="pl-8" placeholder="Ej: 850.00"/>
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción del Gasto</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Ej: Pago de tenencia 2024" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="p-6 pt-4 -mx-6 -mb-6">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Registrando..." : "Registrar Gasto"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
