// src/app/(app)/flotilla/components/EditFinancialInfoDialog.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import type { Driver } from "@/types";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { NewCalendar } from "@/components/ui/calendar";

const financialInfoSchema = z.object({
  contractDate: z.coerce.date().optional(),
  requiredDepositAmount: z.coerce.number().min(0, "El monto debe ser positivo."),
  depositAmount: z.coerce.number().min(0, "El monto debe ser positivo."),
});

type FormInput = z.input<typeof financialInfoSchema>;
export type FinancialInfoFormValues = z.output<typeof financialInfoSchema>;

interface EditFinancialInfoDialogProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  driver: Driver;
  onSave: (values: FinancialInfoFormValues) => Promise<void>;
}

const toMidday = (d: Date) => {
  const n = new Date(d);
  n.setHours(12, 0, 0, 0);
  return n;
};

const toDateSafe = (v: any): Date | undefined => {
  if (!v) return undefined;
  if (v instanceof Date) return v;
  if (typeof v?.toDate === "function") return v.toDate();
  const d = new Date(v);
  return isNaN(d.getTime()) ? undefined : d;
};

export function EditFinancialInfoDialog({ open, onOpenChange, driver, onSave }: EditFinancialInfoDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const defaults = useMemo(
    () => ({
      contractDate: driver?.contractDate ? toMidday(toDateSafe((driver as any).contractDate) ?? new Date()) : undefined,
      requiredDepositAmount: Number(driver?.requiredDepositAmount ?? 0),
      depositAmount: Number(driver?.depositAmount ?? 0),
    }),
    [driver]
  );

  const form = useForm<FormInput, any, FinancialInfoFormValues>({
    resolver: zodResolver(financialInfoSchema),
    defaultValues: defaults,
  });

  useEffect(() => {
    if (!open) return;
    form.reset(defaults);
  }, [open, defaults, form]);

  const handleFormSubmit = async (values: FinancialInfoFormValues) => {
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
          <DialogTitle>Editar Información Financiera</DialogTitle>
          <DialogDescription>Actualiza los detalles del contrato y los depósitos.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="contractDate"
              render={({ field }) => {
                const dateValue = field.value instanceof Date ? field.value : undefined;
                return (
                <FormItem className="flex flex-col">
                  <FormLabel>Fecha de Contrato</FormLabel>
                  <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          type="button"
                          variant={"outline"}
                          className={cn("w-full pl-3 text-left font-normal bg-white", !dateValue && "text-muted-foreground")}
                        >
                          {dateValue ? format(dateValue, "PPP", { locale: es }) : <span>Seleccionar fecha</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <NewCalendar
                        onChange={(d: any) => {
                            if (d) {
                                field.onChange(toMidday(d));
                                setIsCalendarOpen(false);
                            }
                        }}
                        value={dateValue ?? undefined}
                        locale="es-MX"
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}}
            />

            <FormField
              control={form.control}
              name="requiredDepositAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Depósito Requerido ($)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      inputMode="decimal"
                      className="bg-white"
                      value={field.value ?? 0}
                      onChange={(e) => field.onChange(e.target.value === "" ? 0 : e.target.valueAsNumber)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="depositAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Depósito Entregado ($)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      inputMode="decimal"
                      className="bg-white"
                      value={field.value ?? 0}
                      onChange={(e) => field.onChange(e.target.value === "" ? 0 : e.target.valueAsNumber)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
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
