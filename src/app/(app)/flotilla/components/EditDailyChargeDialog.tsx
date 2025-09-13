// src/app/(app)/flotilla/components/EditDailyChargeDialog.tsx
"use client";

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { DailyRentalCharge } from '@/types';

const chargeSchema = z.object({
  date: z.date({ required_error: "La fecha es obligatoria." }),
  amount: z.coerce.number().min(0, "El monto no puede ser negativo."),
});

export type DailyChargeFormValues = z.infer<typeof chargeSchema>;

interface EditDailyChargeDialogProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  charge: DailyRentalCharge | null;
  onSave: (values: DailyChargeFormValues) => Promise<void>;
}

export function EditDailyChargeDialog({ open, onOpenChange, charge, onSave }: EditDailyChargeDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const form = useForm<DailyChargeFormValues>({
    resolver: zodResolver(chargeSchema),
  });

  useEffect(() => {
    if (charge) {
      form.reset({
        date: new Date(charge.date),
        amount: charge.amount,
      });
    }
  }, [charge, form, open]);
  
  const handleFormSubmit = async (values: DailyChargeFormValues) => {
    setIsSubmitting(true);
    await onSave(values);
    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Cargo de Renta Diaria</DialogTitle>
          <DialogDescription>
            Ajusta la fecha o el monto de un cargo de renta. Usa esto para casos especiales (ej. día no cobrado por falla).
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 pt-4">
            <FormField control={form.control} name="date" render={({ field }) => (
              <FormItem className="flex flex-col"><FormLabel>Fecha del Cargo</FormLabel>
                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button variant={"outline"} className={cn("pl-3 text-left font-normal bg-white", !field.value && "text-muted-foreground")}>
                        {field.value ? format(field.value, "PPP", { locale: es }) : <span>Seleccionar fecha</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={(date) => {
                        field.onChange(date);
                        setIsCalendarOpen(false);
                      }}
                      initialFocus
                      locale={es}
                    />
                  </PopoverContent>
                </Popover>
              <FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="amount" render={({ field }) => (
                <FormItem><FormLabel>Monto del Cargo ($)</FormLabel><FormControl><Input type="number" step="0.01" {...field} className="bg-white" /></FormControl><FormMessage /></FormItem>
            )}/>
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
