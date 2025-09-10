

"use client";

import React, { useState, useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { FormDialog } from '@/components/shared/form-dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Driver, Vehicle } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';

const assignVehicleSchema = z.object({
  assignedVehicleId: z.string().nullable().optional(),
});

type AssignVehicleFormValues = z.infer<typeof assignVehicleSchema>;

interface AssignVehicleDialogProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  driver: Driver;
  allVehicles: Vehicle[];
  onSave: (vehicleId: string | null) => Promise<void>;
}

export function AssignVehicleDialog({
  open,
  onOpenChange,
  driver,
  allVehicles,
  onSave,
}: AssignVehicleDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<AssignVehicleFormValues>({
    resolver: zodResolver(assignVehicleSchema),
    defaultValues: {
      assignedVehicleId: driver.assignedVehicleId,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({ assignedVehicleId: driver.assignedVehicleId });
    }
  }, [open, driver, form]);

  const handleSubmit = async (values: AssignVehicleFormValues) => {
    setIsSubmitting(true);
    await onSave(values.assignedVehicleId || null);
    setIsSubmitting(false);
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Asignar Vehículo a ${driver.name}`}
      description="Seleccione un vehículo de la flotilla para asignarlo a este conductor."
      formId="assign-vehicle-form"
      isSubmitting={isSubmitting}
      submitButtonText="Guardar Asignación"
      dialogContentClassName="sm:max-w-md"
    >
      <FormProvider {...form}>
        <Form {...form}>
          <form id="assign-vehicle-form" onSubmit={form.handleSubmit(handleSubmit)} className="pt-4 space-y-4">
             <FormField
                control={form.control}
                name="assignedVehicleId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vehículo a Asignar</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="-- Seleccionar vehículo --" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                         <ScrollArea className="h-60">
                            <SelectItem value="null">-- Ninguno --</SelectItem>
                            {allVehicles.filter(v => v.isFleetVehicle).map(v => (
                              <SelectItem key={v.id} value={v.id} disabled={!!v.assignedDriverId && v.assignedDriverId !== driver.id}>
                                  {v.licensePlate} - {v.make} {v.model} {v.assignedDriverId && v.assignedDriverId !== driver.id ? '(Asignado a otro)' : ''}
                              </SelectItem>
                            ))}
                         </ScrollArea>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
          </form>
        </Form>
      </FormProvider>
    </FormDialog>
  );
}
