// src/app/(app)/flotilla/components/GlobalTransactionDialog.tsx
"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { Driver } from '@/types';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Loader2, ChevronsUpDown, Check } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList
} from '@/components/ui/command';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { NewCalendar } from '@/components/ui/calendar';

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

const toMidday = (d: Date) => {
  const n = new Date(d);
  n.setHours(12, 0, 0, 0);
  return n;
};

export function GlobalTransactionDialog({
  open, onOpenChange, onSave, transactionType, drivers
}: GlobalTransactionDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDriverPopoverOpen, setIsDriverPopoverOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const form = useForm<GlobalTransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      driverId: undefined as unknown as string,
      date: toMidday(new Date()),
      paymentMethod: 'Efectivo',
      amount: undefined as unknown as number,
      note: '',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        driverId: undefined as unknown as string,
        date: toMidday(new Date()),
        amount: undefined as unknown as number,
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

  const title =
    transactionType === 'payment' ? 'Registrar Pago Global' : 'Registrar Cargo Global';
  const description =
    transactionType === 'payment'
      ? 'Registra un abono para cualquier conductor.'
      : 'Registra un cargo para cualquier conductor.';

  const sortedDrivers = useMemo(() => {
    const collator = new Intl.Collator('es', { sensitivity: 'base', ignorePunctuation: true });
    return [...drivers].sort((a, b) => collator.compare(a?.name ?? '', b?.name ?? ''));
  }, [drivers]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 p-6">
            <FormField
              control={form.control}
              name="driverId"
              render={({ field }) => {
                const selectedName =
                  sortedDrivers.find(d => String(d.id) === String(field.value))?.name;

                return (
                  <FormItem className="flex flex-col">
                    <FormLabel>Conductor</FormLabel>
                    <Popover open={isDriverPopoverOpen} onOpenChange={setIsDriverPopoverOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            className={cn("justify-between bg-white", !field.value && "text-muted-foreground")}
                          >
                            {field.value ? selectedName : "Seleccionar conductor"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>

                      <PopoverContent
                        align="start"
                        className="z-50 w-[var(--radix-popover-trigger-width)] p-0"
                        onOpenAutoFocus={(e) => e.preventDefault()}
                      >
                        <Command filter={(value, search) => 1}>
                          <CommandInput placeholder="Buscar conductor..." autoFocus />
                          <CommandList className="max-h-64 overflow-y-auto">
                            <CommandEmpty>No se encontraron conductores.</CommandEmpty>
                            <CommandGroup>
                              {sortedDrivers.map((driver) => {
                                const label = driver.name || driver.phone || String(driver.id);
                                const searchValue = `${'\'\'\''}${label}${driver.phone ?? ""}${ '\'\'\'' }`;
                                return (
                                  <CommandItem
                                    key={driver.id}
                                    value={searchValue}
                                    className="data-[disabled]:opacity-100 data-[disabled]:pointer-events-auto"
                                    onSelect={() => {
                                      form.setValue("driverId", String(driver.id), {
                                        shouldValidate: true,
                                        shouldDirty: true,
                                      });
                                      setIsDriverPopoverOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        String(driver.id) === String(field.value) ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    <span className="truncate">{label}</span>
                                    {driver.phone && (
                                      <span className="ml-2 text-xs text-muted-foreground">
                                        {driver.phone}
                                      </span>
                                    )}
                                  </CommandItem>
                                );
                              })}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Fecha</FormLabel>
                  <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn("pl-3 text-left font-normal bg-white", !field.value && "text-muted-foreground")}
                        >
                          {field.value ? format(field.value, "PPP", { locale: es }) : <span>Seleccionar fecha</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="p-0 w-auto" align="start">
                        <NewCalendar
                            value={field.value}
                            onChange={(d) => {
                                if (d) {
                                    field.onChange(d);
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

            {transactionType === 'payment' && (
              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Método de Pago</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-white">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Efectivo">Efectivo</SelectItem>
                        <SelectItem value="Transferencia">Transferencia</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monto ($)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} className="bg-white" />
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
                    <Textarea {...field} className="bg-white" />
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
                Guardar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
