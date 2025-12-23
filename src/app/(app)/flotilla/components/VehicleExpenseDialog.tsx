// src/app/(app)/flotilla/components/VehicleExpenseDialog.tsx
"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useForm, type Resolver } from "react-hook-form";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const expenseSchema = z.object({
  vehicleId: z.string().min(1, "Debe seleccionar un vehículo."),
  amount: z.coerce.number().min(0.01, "El monto debe ser positivo."),
  description: z.string().min(3, "La descripción es obligatoria."),
});

type ExpenseFormInput = z.input<typeof expenseSchema>;
export type VehicleExpenseFormValues = z.infer<typeof expenseSchema>;

interface VehicleExpenseDialogProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  vehicles: Vehicle[];
  onSave: (values: VehicleExpenseFormValues) => Promise<void>;
}

export function VehicleExpenseDialog({ open, onOpenChange, vehicles, onSave }: VehicleExpenseDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ExpenseFormInput, any, VehicleExpenseFormValues>({
    resolver: zodResolver(expenseSchema) as Resolver<ExpenseFormInput, any, VehicleExpenseFormValues>,
    defaultValues: {
      vehicleId: "",
      amount: "",
      description: "",
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({ vehicleId: "", amount: "", description: "" });
  }, [open, form]);

  const handleFormSubmit = async (values: VehicleExpenseFormValues) => {
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Gasto de Vehículo</DialogTitle>
          <DialogDescription>
            Registra una salida de dinero de la caja como un gasto asociado a un vehículo.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 p-4">
            <FormField
              control={form.control as any}
              name="vehicleId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vehículo</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <FormControl>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Seleccionar vehículo..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {vehicles.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.make} {v.model} ({v.licensePlate})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monto del Gasto ($)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      className="bg-white"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción del Gasto</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Ej: Cambio de aceite, llanta nueva..."
                      className="bg-white"
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Registrar Gasto
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
