// src/app/(app)/flotilla/components/EditDailyChargeDialog.tsx
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea"; // Añadido
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { format, isValid } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { DailyRentalCharge } from "@/types";
import { parseDate } from '@/lib/forms';

/** Schema */
const chargeSchema = z.object({
  date: z.date({ required_error: "La fecha es obligatoria." }),
  amount: z.coerce.number().min(0, "El monto no puede ser negativo."),
  note: z.string().optional(), // Añadido
});

export type DailyChargeFormValues = z.infer<typeof chargeSchema>;

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

  const initialDate = useMemo(() => {
    const d = parseDate(charge?.date) ?? new Date();
    return d;
  }, [charge?.date]);

  const form = useForm<DailyChargeFormValues>({
    resolver: zodResolver(chargeSchema),
    defaultValues: {
      date: initialDate,
      amount: charge?.amount ?? 0,
      note: (charge as any)?.note || `Renta Diaria (${charge?.vehicleLicensePlate || ''})`
    },
  });

  useEffect(() => {
    form.reset({
      date: initialDate,
      amount: charge?.amount ?? 0,
      note: (charge as any)?.note || `Renta Diaria (${charge?.vehicleLicensePlate || ''})`
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [charge?.id, open]);

  const handleFormSubmit = useCallback(
    async (values: DailyChargeFormValues) => {
      setIsSubmitting(true);
      try {
        await onSave(values);
        onOpenChange(false);
      } finally {
        setIsSubmitting(false);
      }
    },
    [onSave, onOpenChange]
  );
  
  const handleSelectDate = useCallback(
    (d: Date | undefined) => {
      if (!d) return;
      form.setValue("date", d, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
      setIsCalendarOpen(false); // Cierra el popover al seleccionar
    },
    [form]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Cargo de Renta Diaria</DialogTitle>
          <DialogDescription>
            Ajusta la fecha o el monto de un cargo de renta. Úsalo para excepciones
            (ej. día no cobrado por falla).
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 pt-2">
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
                          variant="outline"
                          type="button"
                          className={cn(
                            "pl-3 text-left font-normal bg-white",
                            !field.value && "text-muted-foreground"
                          )}
                          aria-label="Seleccionar fecha"
                          onClick={() => setIsCalendarOpen((o) => !o)}
                        >
                          {field.value && isValid(field.value)
                            ? format(field.value, "PPP", { locale: es })
                            : "Seleccionar fecha"}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={handleSelectDate}
                        initialFocus
                        locale={es}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField control={form.control} name="amount" render={({ field }) => (
                <FormItem>
                  <FormLabel>Monto del Cargo ($)</FormLabel>
                  <FormControl>
                    <Input type="number" inputMode="decimal" step="0.01" min={0} className="bg-white" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
            )}/>
            
            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Ej: Renta diaria..."
                      {...field}
                      value={field.value ?? ''}
                      className="bg-white"
                    />
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
