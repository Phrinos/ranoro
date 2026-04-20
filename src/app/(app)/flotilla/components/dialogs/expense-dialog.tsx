// src/app/(app)/flotilla/components/dialogs/expense-dialog.tsx
"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Vehicle } from "@/types";
import { Wrench } from "lucide-react";

const schema = z.object({
  vehicleId: z.string().min(1, "Selecciona un vehículo"),
  description: z.string().min(1, "Describe el gasto"),
  amount: z.coerce.number().positive("El monto debe ser positivo"),
  note: z.string().optional(),
});

export type ExpenseFormValues = z.infer<typeof schema>;

interface ExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (values: ExpenseFormValues) => Promise<void>;
  vehicles: Vehicle[];
  preselectedVehicleId?: string;
}

export function ExpenseDialog({ open, onOpenChange, onSave, vehicles, preselectedVehicleId }: ExpenseDialogProps) {
  const form = useForm<ExpenseFormValues, any, ExpenseFormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: { vehicleId: preselectedVehicleId ?? "", description: "", amount: 0, note: "" },
  });

  useEffect(() => {
    if (open) {
      form.reset({ vehicleId: preselectedVehicleId ?? "", description: "", amount: 0, note: "" });
    }
  }, [open, preselectedVehicleId]);

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSave(values);
    onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-red-500" />
            Registrar Gasto de Vehículo
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!preselectedVehicleId && (
              <FormField control={form.control} name="vehicleId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Vehículo</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecciona un vehículo" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.make} {v.model} ({v.licensePlate})</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            )}
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Descripción del Gasto</FormLabel>
                <FormControl><Input placeholder="Ej: Cambio de aceite, reparación..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="amount" render={({ field }) => (
              <FormItem>
                <FormLabel>Monto</FormLabel>
                <FormControl><Input type="number" min={0} step="0.01" placeholder="0.00" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="note" render={({ field }) => (
              <FormItem>
                <FormLabel>Nota (opcional)</FormLabel>
                <FormControl><Input placeholder="Información adicional..." {...field} /></FormControl>
              </FormItem>
            )} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" variant="destructive" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Guardando..." : "Registrar Gasto"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
