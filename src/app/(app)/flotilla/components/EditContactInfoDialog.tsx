// src/app/(app)/flotilla/components/EditContactInfoDialog.tsx
"use client";

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { Driver } from '@/types';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from 'lucide-react';

const contactInfoSchema = z.object({
  name: z.string().min(3, "El nombre es obligatorio."),
  phone: z.string().min(10, "El teléfono debe tener al menos 10 dígitos."),
  emergencyPhone: z.string().optional(),
  address: z.string().min(5, "La dirección es obligatoria."),
});

export type ContactInfoFormValues = z.infer<typeof contactInfoSchema>;

interface EditContactInfoDialogProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  driver: Driver;
  onSave: (values: ContactInfoFormValues) => Promise<void>;
}

export function EditContactInfoDialog({ open, onOpenChange, driver, onSave }: EditContactInfoDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<ContactInfoFormValues>({
    resolver: zodResolver(contactInfoSchema),
    defaultValues: {
      name: '',
      phone: '',
      emergencyPhone: '',
      address: '',
    },
  });

  useEffect(() => {
    if (driver) {
      form.reset({
        name: driver.name || '',
        phone: driver.phone || '',
        emergencyPhone: driver.emergencyPhone || '',
        address: driver.address || '',
      });
    }
  }, [driver, form, open]);

  const handleFormSubmit = async (values: ContactInfoFormValues) => {
    setIsSubmitting(true);
    await onSave(values);
    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Información de Contacto</DialogTitle>
          <DialogDescription>Actualiza los datos personales del conductor.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
            <div className="p-4 space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Nombre Completo</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem><FormLabel>Teléfono</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
              <FormField control={form.control} name="emergencyPhone" render={({ field }) => (
                <FormItem><FormLabel>Teléfono de Emergencia</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
              <FormField control={form.control} name="address" render={({ field }) => (
                <FormItem><FormLabel>Dirección</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
            </div>
            <DialogFooter className="p-4 pt-0">
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
