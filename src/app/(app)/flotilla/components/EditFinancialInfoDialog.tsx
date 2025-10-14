// src/app/(app)/flotilla/components/EditFinancialInfoDialog.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
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

const financialInfoSchema = z.object({
  contractDate: z.date().optional(),
  requiredDepositAmount: z.coerce.number().min(0, "El monto debe ser positivo."),
  depositAmount: z.coerce.number().min(0, "El monto debe ser positivo."),
});

export type FinancialInfoFormValues = z.infer<typeof financialInfoSchema>;

interface EditFinancialInfoDialogProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  driver: Driver;
  onSave: (values: FinancialInfoFormValues) => Promise<void>;
}

export function EditFinancialInfoDialog({
  open,
  onOpenChange,
  driver,
  onSave,
}: EditFinancialInfoDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const form = useForm<FinancialInfoFormValues>({
    resolver: zodResolver(financialInfoSchema),
  });

  useEffect(() => {
    if (driver) {
      form.reset({
        contractDate: driver?.contractDate ? new Date(driver.contractDate) : undefined,
        requiredDepositAmount: driver?.requiredDepositAmount || 0,
        depositAmount: driver?.depositAmount || 0,
      });
    }
  }, [driver, form, open]);

  const handleFormSubmit = async (values: FinancialInfoFormValues) => {
    setIsSubmitting(true);
    await onSave(values);
    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Información Financiera</DialogTitle>
          <DialogDescription>
            Actualiza los detalles del contrato y los depósitos.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="contractDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Fecha de Contrato</FormLabel>
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
                        onChange={(d: any) => {
                            if(d) {
                                field.onChange(d);
                                setIsCalendarOpen(false);
                            }
                        }}
                        value={field.value}
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
              name="requiredDepositAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Depósito Requerido ($)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      {...field}
                      className="bg-white"
                      value={field.value ?? ""}
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
                      {...field}
                      className="bg-white"
                      value={field.value ?? ""}
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
