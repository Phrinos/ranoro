// src/app/(app)/flotilla/components/CashEntryDialog.tsx
"use client";

import React from 'react';
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
import { Textarea } from "@/components/ui/textarea";
import { DollarSign } from 'lucide-react';

const cashEntrySchema = z.object({
  amount: z.coerce.number().min(0.01, "El monto debe ser mayor a cero."),
  concept: z.string().min(3, "El concepto es obligatorio."),
});

export type CashEntryFormValues = z.infer<typeof cashEntrySchema>;

interface CashEntryDialogProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (values: CashEntryFormValues) => void;
}

export function CashEntryDialog({
  open,
  onOpenChange,
  onSave,
}: CashEntryDialogProps) {
  const form = useForm<CashEntryFormValues>({
    resolver: zodResolver(cashEntrySchema),
    defaultValues: { amount: undefined, concept: '' },
  });

  const handleSubmit = (values: CashEntryFormValues) => {
    onSave(values);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle>Registrar Entrada de Efectivo</DialogTitle>
          <DialogDescription>
            Registre un ingreso de dinero a la caja de la flotilla.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="px-6 space-y-6">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monto del Ingreso</FormLabel>
                  <div className="relative">
                    <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <FormControl>
                      <Input type="number" step="0.01" {...field} value={field.value ?? ''} className="pl-8" placeholder="Ej: 1000.00"/>
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="concept"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Concepto</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Ej: Inversión inicial, fondo de caja..." {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <DialogFooter className="p-6 pt-4 -mx-6 -mb-6">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Registrando..." : "Registrar Ingreso"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
