// src/app/(app)/flotilla/components/GlobalTransactionDialog.tsx
"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { Driver, PaymentMethod } from '@/types';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Loader2, ChevronsUpDown, Check } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const transactionSchema = z.object({
  driverId: z.string({ required_error: "Debe seleccionar un conductor." }),
  date: z.date({ required_error: "La fecha es obligatoria." }),
  amount: z.coerce.number().min(0.01, "El monto debe ser positivo."),
  note: z.string().min(3, "La descripción es obligatoria."),
  paymentMethod: z.string().optional(),
});

export type GlobalTransactionFormValues = z.infer<typeof transactionSchema>;

interface GlobalTransactionDialogProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (values: GlobalTransactionFormValues) => Promise<void>;
  transactionType: 'payment' | 'charge';
  drivers: Driver[];
}

export function GlobalTransactionDialog({ open, onOpenChange, onSave, transactionType, drivers }: GlobalTransactionDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDriverPopoverOpen, setIsDriverPopoverOpen] = useState(false);
  
  const form = useForm<GlobalTransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: { date: new Date(), paymentMethod: 'Efectivo' },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        driverId: undefined,
        date: new Date(),
        amount: undefined,
        note: transactionType === 'payment' ? 'Abono de Renta' : '',
        paymentMethod: 'Efectivo',
      });
    }
  }, [open, form, transactionType]);

  const handleFormSubmit = async (values: GlobalTransactionFormValues) => {
    setIsSubmitting(true);
    await onSave(values);
    setIsSubmitting(false);
  };
  
  const title = transactionType === 'payment' ? 'Registrar Pago Global' : 'Registrar Cargo Global';
  const description = transactionType === 'payment' ? 'Registra un abono para cualquier conductor.' : 'Registra un cargo para cualquier conductor.';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 pt-4">
            <FormField control={form.control} name="driverId" render={({ field }) => (
              <FormItem className="flex flex-col"><FormLabel>Conductor</FormLabel>
                <Popover open={isDriverPopoverOpen} onOpenChange={setIsDriverPopoverOpen}>
                  <PopoverTrigger asChild><FormControl><Button variant="outline" role="combobox" className={cn("justify-between", !field.value && "text-muted-foreground")}>
                      {field.value ? drivers.find(d => d.id === field.value)?.name : "Seleccionar conductor"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button></FormControl></PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0"><Command>
                    <CommandInput placeholder="Buscar conductor..." />
                    <CommandList><CommandEmpty>No se encontraron conductores.</CommandEmpty><CommandGroup>
                      {drivers.map(driver => (
                        <CommandItem value={driver.name} key={driver.id} onSelect={() => { form.setValue("driverId", driver.id); setIsDriverPopoverOpen(false); }}>
                          <Check className={cn("mr-2 h-4 w-4", driver.id === field.value ? "opacity-100" : "opacity-0")} />
                          {driver.name}
                        </CommandItem>
                      ))}
                    </CommandGroup></CommandList>
                  </Command></PopoverContent>
                </Popover>
              <FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="date" render={({ field }) => (
              <FormItem className="flex flex-col"><FormLabel>Fecha</FormLabel>
                <Popover>
                  <PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                      {field.value ? format(field.value, "PPP", { locale: es }) : <span>Seleccionar fecha</span>}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button></FormControl></PopoverTrigger>
                  <PopoverContent><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent>
                </Popover>
              <FormMessage /></FormItem>
            )}/>
             {transactionType === 'payment' && (
              <FormField control={form.control} name="paymentMethod" render={({ field }) => (
                <FormItem><FormLabel>Método de Pago</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent><SelectItem value="Efectivo">Efectivo</SelectItem><SelectItem value="Transferencia">Transferencia</SelectItem></SelectContent>
                  </Select>
                <FormMessage /></FormItem>
              )}/>
            )}
            <FormField control={form.control} name="amount" render={({ field }) => (
              <FormItem><FormLabel>Monto ($)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="note" render={({ field }) => (
              <FormItem><FormLabel>Descripción</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
