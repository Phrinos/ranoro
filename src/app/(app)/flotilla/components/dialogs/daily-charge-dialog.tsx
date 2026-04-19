// src/app/(app)/flotilla/components/dialogs/daily-charge-dialog.tsx
"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { DailyRentalCharge } from "@/types";
import { parseFleetDate } from "../../hooks/use-fleet-data";
import { format } from "date-fns";

const schema = z.object({
  amount: z.coerce.number().positive(),
  date: z.string().min(1),
  note: z.string().optional(),
});

export type DailyChargeFormValues = z.infer<typeof schema>;

interface DailyChargeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  charge: DailyRentalCharge | null;
  onSave: (values: DailyChargeFormValues) => Promise<void>;
}

export function DailyChargeDialog({ open, onOpenChange, charge, onSave }: DailyChargeDialogProps) {
  const form = useForm<DailyChargeFormValues, any, DailyChargeFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { amount: 0, date: format(new Date(), "yyyy-MM-dd"), note: "" },
  });

  useEffect(() => {
    if (open && charge) {
      const d = parseFleetDate(charge.date);
      form.reset({
        amount: charge.amount,
        date: d ? format(d, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
        note: (charge as any).note ?? "",
      });
    }
  }, [open, charge]);

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSave(values);
    onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Editar Cargo Diario</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="amount" render={({ field }) => (
                <FormItem>
                  <FormLabel>Monto</FormLabel>
                  <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="date" render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="note" render={({ field }) => (
              <FormItem>
                <FormLabel>Nota</FormLabel>
                <FormControl><Input placeholder="Opcional..." {...field} /></FormControl>
              </FormItem>
            )} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Guardando..." : "Guardar"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
