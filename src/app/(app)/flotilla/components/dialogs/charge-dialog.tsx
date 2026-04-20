// src/app/(app)/flotilla/components/dialogs/charge-dialog.tsx
"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Driver, ManualDebtEntry } from "@/types";
import { PlusCircle } from "lucide-react";

const schema = z.object({
  driverId: z.string().min(1, "Selecciona un conductor"),
  amount: z.coerce.number().positive("El monto debe ser positivo"),
  date: z.string().min(1, "Selecciona una fecha"),
  note: z.string().min(1, "Describe el cargo"),
});

export type ChargeFormValues = z.infer<typeof schema>;

interface ChargeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (values: ChargeFormValues) => Promise<void>;
  drivers?: Driver[];
  preselectedDriverId?: string;
  debtToEdit?: ManualDebtEntry | null;
}

export function ChargeDialog({ open, onOpenChange, onSave, drivers, preselectedDriverId, debtToEdit }: ChargeDialogProps) {
  const form = useForm<ChargeFormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      driverId: preselectedDriverId ?? "",
      amount: 0,
      date: format(new Date(), "yyyy-MM-dd"),
      note: "",
    },
  });

  useEffect(() => {
    if (open) {
      if (debtToEdit) {
        form.reset({
          driverId: debtToEdit.driverId ?? preselectedDriverId ?? "",
          amount: debtToEdit.amount,
          date: debtToEdit.date ? debtToEdit.date.slice(0, 10) : format(new Date(), "yyyy-MM-dd"),
          note: debtToEdit.note || debtToEdit.reason || "",
        });
      } else {
        form.reset({ driverId: preselectedDriverId ?? "", amount: 0, date: format(new Date(), "yyyy-MM-dd"), note: "" });
      }
    }
  }, [open, debtToEdit, preselectedDriverId]);

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSave(values);
    onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PlusCircle className="h-5 w-5 text-amber-600" />
            {debtToEdit ? "Editar Cargo" : "Registrar Cargo Manual"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!preselectedDriverId && drivers && (
              <FormField control={form.control} name="driverId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Conductor</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecciona un conductor" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {drivers.filter(d => !d.isArchived).map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            )}
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="amount" render={({ field }) => (
                <FormItem>
                  <FormLabel>Monto</FormLabel>
                  <FormControl><Input type="number" min={0} step="0.01" placeholder="0.00" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="date" render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="note" render={({ field }) => (
              <FormItem>
                <FormLabel>Descripción del Cargo</FormLabel>
                <FormControl><Input placeholder="Ej: Multa de tránsito, daño a vehículo..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Guardando..." : debtToEdit ? "Actualizar" : "Registrar Cargo"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
