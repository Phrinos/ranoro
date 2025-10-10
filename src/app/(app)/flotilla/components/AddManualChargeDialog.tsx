// src/app/(app)/flotilla/components/AddManualChargeDialog.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import type { ManualDebtEntry } from "@/types";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";


const chargeSchema = z.object({
  date: z.date({ required_error: "La fecha es obligatoria." }),
  amount: z.coerce.number().min(0.01, "El monto debe ser positivo."),
  note: z.string().optional(),
});
export type ManualChargeFormValues = z.infer<typeof chargeSchema>;

interface AddManualChargeDialogProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (values: ManualChargeFormValues) => Promise<void> | void;
  debtToEdit?: ManualDebtEntry | null;
}

const toMidday = (d: Date) => {
  const n = new Date(d);
  n.setHours(12, 0, 0, 0);
  return n;
};

// Normaliza Date | string | Firestore Timestamp a Date
function toDate(value: any): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  if (typeof value?.toDate === "function") return value.toDate();
  const d = new Date(value);
  return isNaN(d.getTime()) ? undefined : d;
}

export function AddManualChargeDialog({
  open,
  onOpenChange,
  onSave,
  debtToEdit = null,
}: AddManualChargeDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const form = useForm<ManualChargeFormValues>({
    resolver: zodResolver(chargeSchema),
    defaultValues: {
      date: toMidday(new Date()),
      amount: debtToEdit?.amount ?? undefined,
      note: debtToEdit?.note ?? "",
    },
  });

  useEffect(() => {
    const base = toMidday(toDate(debtToEdit?.date) ?? new Date());
    form.reset({
      date: base,
      amount: debtToEdit?.amount ?? undefined,
      note: debtToEdit?.note ?? "",
    });
  }, [open, debtToEdit, form]);

  const handleSubmit = async (values: ManualChargeFormValues) => {
    setIsSubmitting(true);
    try {
      await onSave(values);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isEditing = Boolean(debtToEdit?.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Cargo Manual" : "Añadir Cargo Manual"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifica los detalles del cargo existente."
              : "Registra un cargo manual extraordinario para el conductor."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 pt-2">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Fecha del Cargo</FormLabel>
                  <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal bg-white",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP", { locale: es })
                          ) : (
                            <span>Seleccionar fecha</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={(d) => {
                          if (d) {
                            field.onChange(toMidday(d));
                            setIsCalendarOpen(false);
                          }
                        }}
                        initialFocus
                        locale={es}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monto ($)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      inputMode="decimal"
                      {...field}
                      className="bg-white"
                      placeholder="0.00"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Textarea {...field} className="bg-white" placeholder="Ej: Multa, reparación, etc." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Actualizar Cargo" : "Guardar Cargo"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
