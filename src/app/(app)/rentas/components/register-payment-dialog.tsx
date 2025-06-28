"use client";

import React, { useState, useEffect } from 'react';
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Driver, Vehicle } from "@/types";
import { DollarSign } from 'lucide-react';
import { subDays, isBefore, parseISO, isValid } from 'date-fns';

const paymentSchema = z.object({
  driverId: z.string().min(1, "Debe seleccionar un conductor."),
  amount: z.coerce.number().min(0.01, "El monto debe ser mayor a cero."),
  mileage: z.coerce.number().int("El kilometraje debe ser un número entero.").min(0, "El kilometraje no puede ser negativo.").optional(),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

interface RegisterPaymentDialogProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  drivers: Driver[];
  vehicles: Vehicle[];
  onSave: (driverId: string, amount: number, mileage?: number) => void;
}

export function RegisterPaymentDialog({
  open,
  onOpenChange,
  drivers,
  vehicles,
  onSave,
}: RegisterPaymentDialogProps) {
  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      driverId: '',
      amount: undefined,
      mileage: undefined
    }
  });

  const [needsMileageUpdate, setNeedsMileageUpdate] = useState(false);
  
  const selectedDriverId = form.watch('driverId');
  
  useEffect(() => {
    if (selectedDriverId) {
      const driver = drivers.find(d => d.id === selectedDriverId);
      const vehicle = vehicles.find(v => v.id === driver?.assignedVehicleId);
      
      if (vehicle) {
        if (vehicle.dailyRentalCost) {
          form.setValue('amount', vehicle.dailyRentalCost);
        }
        
        const sevenDaysAgo = subDays(new Date(), 7);
        const lastUpdate = vehicle.lastMileageUpdate ? parseISO(vehicle.lastMileageUpdate) : null;
        
        const showMileageField = !lastUpdate || (isValid(lastUpdate) && isBefore(lastUpdate, sevenDaysAgo));
        
        setNeedsMileageUpdate(showMileageField);
        
        if (showMileageField) {
          form.setValue('mileage', vehicle.currentMileage || undefined);
        } else {
          form.resetField('mileage');
        }
      } else {
        setNeedsMileageUpdate(false);
        form.resetField('mileage');
      }
    } else {
      form.reset({ driverId: '', amount: undefined, mileage: undefined });
      setNeedsMileageUpdate(false);
    }
  }, [selectedDriverId, drivers, vehicles, form]);

  const handleSubmit = (values: PaymentFormValues) => {
    if (needsMileageUpdate && (values.mileage === undefined || values.mileage === null || values.mileage < 0)) {
      form.setError("mileage", { type: "manual", message: "El kilometraje es obligatorio y debe ser un número positivo." });
      return;
    }
    onSave(values.driverId, values.amount, values.mileage);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Pago de Renta</DialogTitle>
          <DialogDescription>
            Seleccione el conductor y confirme el monto del pago.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 py-4">
            <FormField
              control={form.control}
              name="driverId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Conductor</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Seleccione un conductor" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {drivers.map(d => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
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
                  <FormLabel>Monto del Pago</FormLabel>
                  <div className="relative">
                    <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <FormControl>
                      <Input type="number" step="0.01" {...field} value={field.value ?? ''} className="pl-8" />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            {needsMileageUpdate && (
              <FormField
                control={form.control}
                name="mileage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kilometraje Actual (Obligatorio)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} value={field.value ?? ''} placeholder="Ej: 125000" />
                    </FormControl>
                    <FormDescription>Se requiere actualizar el kilometraje (última vez hace > 7 días).</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Registrando..." : "Registrar Pago"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
