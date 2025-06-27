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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DollarSign } from 'lucide-react';

const withdrawalSchema = z.object({
  ownerName: z.string().min(1, "Debe seleccionar un propietario."),
  amount: z.coerce.number().min(0.01, "El monto debe ser mayor a cero."),
  reason: z.string().optional(),
});

export type OwnerWithdrawalFormValues = z.infer<typeof withdrawalSchema>;

interface OwnerWithdrawalDialogProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  owners: string[];
  onSave: (values: OwnerWithdrawalFormValues) => void;
}

export function OwnerWithdrawalDialog({
  open,
  onOpenChange,
  owners,
  onSave,
}: OwnerWithdrawalDialogProps) {
  const form = useForm<OwnerWithdrawalFormValues>({
    resolver: zodResolver(withdrawalSchema),
  });

  const handleSubmit = (values: OwnerWithdrawalFormValues) => {
    onSave(values);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Retiro de Dinero</DialogTitle>
          <DialogDescription>
            Seleccione el propietario y el monto a retirar de las ganancias de la flotilla.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 py-4">
            <FormField
              control={form.control}
              name="ownerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Propietario de la Flotilla</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Seleccione un propietario" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {owners.map(owner => (
                        <SelectItem key={owner} value={owner}>{owner}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monto del Retiro</FormLabel>
                  <div className="relative">
                    <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <FormControl>
                      <Input type="number" step="0.01" {...field} value={field.value ?? ''} className="pl-8" placeholder="Ej: 5000.00"/>
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motivo (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Ej: Adelanto de ganancias" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Registrando..." : "Registrar Retiro"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
