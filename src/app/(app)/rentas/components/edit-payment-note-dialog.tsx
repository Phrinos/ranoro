

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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { RentalPayment } from '@/types';

const editNoteSchema = z.object({
  note: z.string().optional(),
});

type EditNoteFormValues = z.infer<typeof editNoteSchema>;

interface EditPaymentNoteDialogProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  payment: RentalPayment | null;
  onSave: (paymentId: string, note: string) => void;
}

export function EditPaymentNoteDialog({
  open,
  onOpenChange,
  payment,
  onSave,
}: EditPaymentNoteDialogProps) {
  const form = useForm<EditNoteFormValues>({
    resolver: zodResolver(editNoteSchema),
  });

  useEffect(() => {
    if (payment) {
      form.reset({ note: payment.note || '' });
    }
  }, [payment, form]);

  const handleSubmit = (values: EditNoteFormValues) => {
    if (payment) {
      onSave(payment.id, values.note || '');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle>Editar Concepto del Pago</DialogTitle>
          <DialogDescription>
            Modifique la nota o concepto para el pago con folio {payment?.id.slice(-6)}.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} id="edit-note-form" className="px-6 pb-6 space-y-4">
            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Concepto / Nota</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Ej: Pago de renta semana 25" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
        <DialogFooter className="p-6 pt-0 border-t bg-background flex-shrink-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button type="submit" form="edit-note-form" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
