"use client";

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarIcon } from 'lucide-react';
import { format as formatDate } from 'date-fns';
import { es } from 'date-fns/locale';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { NewCalendar } from "@/components/ui/calendar";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Driver } from "@/types";
import * as z from "zod";

const financialInfoSchema = z.object({
  contractDate: z.date().optional(),
  requiredDepositAmount: z.coerce.number().min(0),
  depositAmount: z.coerce.number().min(0),
});

export type FinancialInfoFormValues = z.infer<typeof financialInfoSchema>;

interface EditFinancialInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: FinancialInfoFormValues) => Promise<void>;
  driver?: Driver;
}

export function EditFinancialInfoDialog({ open, onOpenChange, onSave, driver }: EditFinancialInfoDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<FinancialInfoFormValues>({
    resolver: zodResolver(financialInfoSchema),
    defaultValues: {
      contractDate: new Date(),
      requiredDepositAmount: 0,
      depositAmount: 0,
    },
  });

  useEffect(() => {
    if (open && driver) {
      form.reset({
        contractDate: driver.contractDate ? new Date(driver.contractDate) : new Date(),
        requiredDepositAmount: driver.requiredDepositAmount || 0,
        depositAmount: driver.depositAmount || 0,
      });
    }
  }, [open, driver, form]);

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
          <DialogTitle>Información Financiera</DialogTitle>
          <DialogDescription>Ajusta el contrato y depósitos del conductor.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="contractDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Fecha de Contrato</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn("w-full pl-3 text-left font-normal bg-white", !field.value && "text-muted-foreground")}
                        >
                          {field.value ? formatDate(field.value, "PPP", { locale: es }) : "Seleccione fecha"}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <NewCalendar
                        value={field.value}
                        onChange={(d: any) => field.onChange(d)}
                        locale="es-MX"
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField control={form.control} name="requiredDepositAmount" render={({ field }) => (
              <FormItem><FormLabel>Depósito Requerido ($)</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === "" ? undefined : e.target.valueAsNumber)} className="bg-white"/></FormControl><FormMessage /></FormItem>
            )}/>

            <FormField control={form.control} name="depositAmount" render={({ field }) => (
              <FormItem><FormLabel>Depósito Entregado ($)</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === "" ? undefined : e.target.valueAsNumber)} className="bg-white"/></FormControl><FormMessage /></FormItem>
            )}/>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting}>Guardar</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
