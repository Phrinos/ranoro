// src/app/(app)/flotilla/components/RegisterPaymentDialog.tsx
"use client";

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const paymentSchema = z.object({
  paymentDate: z.date({ required_error: "La fecha es obligatoria." }),
  amount: z.coerce.number().min(0.01, "El monto debe ser positivo."),
  note: z.string().optional(),
  paymentMethod: z.string().optional(),
});

export type PaymentFormValues = z.infer<typeof paymentSchema>;

interface RegisterPaymentDialogProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (values: PaymentFormValues) => Promise<void>;
}

export function RegisterPaymentDialog({ open, onOpenChange, onSave }: RegisterPaymentDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      paymentDate: new Date(),
      amount: undefined,
      note: 'Abono de Renta',
      paymentMethod: 'Efectivo',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        paymentDate: new Date(),
        amount: undefined,
        note: 'Abono de Renta',
        paymentMethod: 'Efectivo',
      });
    }
  }, [open, form]);

  const handleFormSubmit = async (values: PaymentFormValues) => {
    setIsSubmitting(true);
    await onSave(values);
    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle>Registrar Pago</DialogTitle>
          <DialogDescription>Registra un nuevo abono o pago a la cuenta del conductor.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 p-6">
            <FormField control={form.control} name="paymentDate" render={({ field }) => (
              <FormItem className="flex flex-col"><FormLabel>Fecha del Pago</FormLabel>
                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                  <PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                      {field.value ? format(field.value, "PPP", { locale: es }) : <span>Seleccionar fecha</span>}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button></FormControl></PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
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
            <FormField control={form.control} name="paymentMethod" render={({ field }) => (
              <FormItem><FormLabel>Método de Pago</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent><SelectItem value="Efectivo">Efectivo</SelectItem><SelectItem value="Transferencia">Transferencia</SelectItem></SelectContent>
                </Select>
              <FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="amount" render={({ field }) => (
              <FormItem><FormLabel>Monto del Pago ($)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="note" render={({ field }) => (
              <FormItem><FormLabel>Descripción</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
            <DialogFooter className="pt-4 px-0">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar Pago
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
