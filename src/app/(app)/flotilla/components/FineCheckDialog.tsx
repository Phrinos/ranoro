// src/app/(app)/flotilla/components/FineCheckDialog.tsx
"use client";

import React, { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { Fine, FineCheck } from '@/types';
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
import { CalendarIcon, PlusCircle, Trash2 } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';

const fineSchema = z.object({
  date: z.date(),
  type: z.string().min(3, "El tipo es obligatorio."),
  amount: z.coerce.number().min(0.01, "El monto debe ser positivo."),
});

const fineCheckSchema = z.object({
  checkDate: z.date(),
  hasFines: z.boolean(),
  fines: z.array(fineSchema).optional(),
});

export type FineCheckFormValues = z.infer<typeof fineCheckSchema>;

interface FineCheckDialogProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  fineCheck?: FineCheck | null;
  onSave: (values: FineCheckFormValues) => void;
}

export function FineCheckDialog({ open, onOpenChange, fineCheck, onSave }: FineCheckDialogProps) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const form = useForm<FineCheckFormValues>({
    resolver: zodResolver(fineCheckSchema),
  });
  
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "fines",
  });

  const hasFines = form.watch('hasFines');

  useEffect(() => {
    if (fineCheck) {
      form.reset({
        checkDate: new Date(fineCheck.checkDate),
        hasFines: fineCheck.hasFines,
        fines: fineCheck.fines?.map(f => ({ ...f, date: new Date(f.date) })) || [],
      });
    } else {
      form.reset({ checkDate: new Date(), hasFines: false, fines: [] });
    }
  }, [fineCheck, form, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{fineCheck ? 'Ver Revisión de Multas' : 'Nueva Revisión de Multas'}</DialogTitle>
          <DialogDescription>
            Registra una nueva revisión y las multas encontradas, si las hay.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSave)} className="space-y-4 pt-4">
            <FormField control={form.control} name="checkDate" render={({ field }) => (
              <FormItem><FormLabel>Fecha de Revisión</FormLabel>
                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                  <PopoverTrigger asChild>
                    <FormControl><Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal bg-white", !field.value && "text-muted-foreground")}>
                        {field.value ? format(field.value, "PPP", { locale: es }) : <span>Seleccionar fecha</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button></FormControl>
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
            
            <FormField control={form.control} name="hasFines" render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                <FormLabel>¿Se encontraron multas?</FormLabel>
                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
              </FormItem>
            )}/>

            {hasFines && (
              <div className="space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="grid grid-cols-3 gap-2 items-end border p-2 rounded-md">
                    <FormField control={form.control} name={`fines.${index}.type`} render={({ field }) => (
                      <FormItem><FormLabel>Tipo</FormLabel><FormControl><Input {...field} className="bg-white" /></FormControl></FormItem>
                    )}/>
                    <FormField control={form.control} name={`fines.${index}.amount`} render={({ field }) => (
                      <FormItem><FormLabel>Monto</FormLabel><FormControl><Input type="number" {...field} className="bg-white" /></FormControl></FormItem>
                    )}/>
                    <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => remove(index)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => append({ date: new Date(), type: '', amount: 0 })}>
                  <PlusCircle className="mr-2 h-4 w-4" />Añadir Multa
                </Button>
              </div>
            )}

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit">Guardar Revisión</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
