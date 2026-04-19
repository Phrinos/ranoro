// src/app/(app)/flotilla/components/dialogs/payment-dialog.tsx
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
import type { Driver, RentalPayment } from "@/types";
import { HandCoins } from "lucide-react";

const schema = z.object({
  driverId: z.string().min(1, "Selecciona un conductor"),
  amount: z.coerce.number().positive("El monto debe ser positivo"),
  paymentDate: z.string().min(1, "Selecciona una fecha"),
  paymentMethod: z.enum(["Efectivo", "Transferencia", "Tarjeta"]),
  note: z.string().optional(),
});

export type PaymentFormValues = z.infer<typeof schema>;

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (values: PaymentFormValues) => Promise<void>;
  drivers?: Driver[];
  /** Pre-selected driver (hides selector) */
  preselectedDriverId?: string;
  /** For editing an existing payment */
  paymentToEdit?: RentalPayment | null;
}

export function PaymentDialog({
  open,
  onOpenChange,
  onSave,
  drivers,
  preselectedDriverId,
  paymentToEdit,
}: PaymentDialogProps) {
  const form = useForm<PaymentFormValues, any, PaymentFormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      driverId: preselectedDriverId ?? "",
      amount: 0,
      paymentDate: format(new Date(), "yyyy-MM-dd"),
      paymentMethod: "Efectivo",
      note: "",
    },
  });

  useEffect(() => {
    if (open) {
      if (paymentToEdit) {
        form.reset({
          driverId: paymentToEdit.driverId ?? preselectedDriverId ?? "",
          amount: paymentToEdit.amount,
          paymentDate: paymentToEdit.paymentDate
            ? paymentToEdit.paymentDate.slice(0, 10)
            : format(new Date(), "yyyy-MM-dd"),
          paymentMethod: (paymentToEdit.paymentMethod as any) ?? "Efectivo",
          note: paymentToEdit.note ?? "",
        });
      } else {
        form.reset({
          driverId: preselectedDriverId ?? "",
          amount: 0,
          paymentDate: format(new Date(), "yyyy-MM-dd"),
          paymentMethod: "Efectivo",
          note: "",
        });
      }
    }
  }, [open, paymentToEdit, preselectedDriverId]);

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSave(values);
    onOpenChange(false);
  });

  const isEditing = !!paymentToEdit;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HandCoins className="h-5 w-5 text-emerald-600" />
            {isEditing ? "Editar Pago" : "Registrar Abono"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Driver selector — only when no preselect */}
            {!preselectedDriverId && drivers && (
              <FormField control={form.control} name="driverId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Conductor</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecciona un conductor" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {drivers.filter(d => !d.isArchived).map(d => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
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
                  <FormControl>
                    <Input type="number" min={0} step="0.01" placeholder="0.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="paymentDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha del Pago</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="paymentMethod" render={({ field }) => (
              <FormItem>
                <FormLabel>Método de Pago</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="Efectivo">Efectivo</SelectItem>
                    <SelectItem value="Transferencia">Transferencia</SelectItem>
                    <SelectItem value="Tarjeta">Tarjeta</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="note" render={({ field }) => (
              <FormItem>
                <FormLabel>Nota (opcional)</FormLabel>
                <FormControl><Input placeholder="Descripción del pago..." {...field} /></FormControl>
              </FormItem>
            )} />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Guardando..." : isEditing ? "Actualizar" : "Registrar Abono"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
