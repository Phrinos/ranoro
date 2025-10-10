"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { DailyRentalCharge } from "@/types";

import ReactCalendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

const chargeSchema = z.object({
  date: z.date({ required_error: "La fecha es obligatoria." }),
  amount: z.coerce.number().min(0, "El monto no puede ser negativo."),
});
export type DailyChargeFormValues = z.infer<typeof chargeSchema>;

// --- helpers ---
const toMidday = (d: Date) => {
  const n = new Date(d);
  n.setHours(12, 0, 0, 0);
  return n;
};

// Acepta Date | string | Firestore Timestamp
function toDate(value: any): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  if (typeof value?.toDate === "function") return value.toDate();
  const d = new Date(value);
  return isNaN(d.getTime()) ? undefined : d;
}

interface EditDailyChargeDialogProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  charge: DailyRentalCharge | null;
  onSave: (values: DailyChargeFormValues) => Promise<void>;
}

export function EditDailyChargeDialog({
  open,
  onOpenChange,
  charge,
  onSave,
}: EditDailyChargeDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const form = useForm<DailyChargeFormValues>({
    resolver: zodResolver(chargeSchema),
    defaultValues: {
      date: toMidday(new Date()),
      amount: charge?.amount ?? 0,
    },
  });

  const selectedDate = form.watch("date");

  useEffect(() => {
    const base = toMidday(toDate(charge?.date) ?? new Date());
    form.reset({
      date: base,
      amount: charge?.amount ?? 0,
    });
  }, [open, charge?.id, charge?.date, charge?.amount, form]);

  const handleFormSubmit = async (values: DailyChargeFormValues) => {
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
          <DialogTitle>Editar Cargo de Renta Diaria</DialogTitle>
          <DialogDescription>
            Ajusta la fecha o el monto del cargo de renta diaria.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 pt-2">
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
                  <FormLabel>Monto del Cargo ($)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" min={0} {...field} className="bg-white" />
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
                Guardar Cambios
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
