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

import ReactCalendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

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

  const selectedDate = form.watch("date");

  useEffect(() => {
    const base = toMidday(toDate(debtToEdit?.date) ?? new Date());
    form.reset({
      date: base,
      amount: debtToEdit?.amount ?? undefined,
      note: debtToEdit?.note ?? "",
    });
  }, [open, debtToEdit?.id, debtToEdit?.date, debtToEdit?.amount, debtToEdit?.note, form]);

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
            {/* Fecha */}
            <FormField
              control={form.control}
              name="date"
              render={() => (
                <FormItem className="flex flex-col gap-2">
                  <FormLabel>Fecha del Cargo</FormLabel>
                  <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <div
                          className="relative w-full cursor-pointer"
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") setIsCalendarOpen((o) => !o);
                          }}
                          onClick={() => setIsCalendarOpen(true)}
                        >
                          <Input
                            readOnly
                            className="bg-white pr-10"
                            value={selectedDate ? format(selectedDate, "PPP", { locale: es }) : ""}
                            placeholder="Seleccionar fecha"
                          />
                          <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-60" />
                        </div>
                      </FormControl>
                    </PopoverTrigger>

                    <PopoverContent className="p-2 w-auto" align="start" sideOffset={8}>
                      <ReactCalendar
                        value={selectedDate ?? new Date()}
                        onChange={(val) => {
                          const d = Array.isArray(val) ? val[0] : val;
                          if (!d) return;
                          form.setValue("date", toMidday(d), {
                            shouldDirty: true,
                            shouldTouch: true,
                            shouldValidate: true,
                          });
                          setIsCalendarOpen(false);
                        }}
                        locale="es-MX"
                        calendarType="iso8601"
                        selectRange={false}
                        minDetail="month"
                        maxDetail="month"
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Monto */}
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

            {/* Nota */}
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