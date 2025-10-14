
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { DailyRentalCharge } from "@/types";
import { Textarea } from "@/components/ui/textarea";

const chargeSchema = z.object({
  date: z.date({ required_error: "La fecha es obligatoria." }),
  amount: z.coerce.number().min(0, "El monto no puede ser negativo."),
  note: z.string().optional(),
});
export type DailyChargeFormValues = z.infer<typeof chargeSchema>;

// --- helpers ---
const toMidday = (d: Date) => {
  const n = new Date(d);
  n.setHours(12, 0, 0, 0);
  return n;
};

function normalizeToDate(input: unknown): Date | null {
  if (!input) return null;
  if (input instanceof Date) return input;
  // @ts-expect-error toDate puede existir en Timestamp
  if (typeof input === "object" && typeof input?.toDate === "function") {
    // @ts-expect-error
    const d = input.toDate();
    return d instanceof Date && !isNaN(d.getTime()) ? d : null;
  }
  if (typeof input === "string" || typeof input === "number") {
    const d = new Date(input);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
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
      date: new Date(),
      amount: 0,
      note: '',
    },
  });

  useEffect(() => {
    if(open && charge) {
        form.reset({
            date: toMidday(normalizeToDate(charge.date) ?? new Date()),
            amount: charge.amount,
            note: (charge as any).note || '',
        });
    }
  }, [open, charge, form]);

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
            Ajusta la fecha, monto o descripción del cargo.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 pt-4">
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
                          type="button"
                          variant={"outline"}
                          className={cn(
                            "pl-3 text-left font-normal bg-white",
                            !field.value && "text-muted-foreground"
                          )}
                          onClick={() => setIsCalendarOpen(true)}
                        >
                          {field.value
                            ? format(field.value, "PPP", { locale: es })
                            : "Seleccionar fecha"}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        value={field.value}
                        onChange={(d: any) => {
                            if (d && !Array.isArray(d)) {
                                field.onChange(toMidday(d));
                                setIsCalendarOpen(false);
                            }
                        }}
                        locale="es-MX"
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
                  <FormLabel>Monto del Cargo ($)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" min={0} {...field} className="bg-white" />
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
                    <Textarea {...field} className="bg-white" placeholder="Ej: Renta diaria" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4">
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
