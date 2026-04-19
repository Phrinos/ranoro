// src/app/(app)/flotilla/components/dialogs/edit-driver-dialog.tsx
"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Driver } from "@/types";
import { format, parseISO, isValid } from "date-fns";

const schema = z.object({
  name: z.string().min(1, "Requerido"),
  phone: z.string().optional(),
  emergencyPhone: z.string().optional(),
  address: z.string().optional(),
  contractDate: z.string().optional(),
  requiredDepositAmount: z.coerce.number().optional(),
  depositAmount: z.coerce.number().optional(),
});

export type EditDriverFormValues = z.infer<typeof schema>;

interface EditDriverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driver: Driver | null;
  onSave: (values: EditDriverFormValues) => Promise<void>;
}

export function EditDriverDialog({ open, onOpenChange, driver, onSave }: EditDriverDialogProps) {
  const form = useForm<EditDriverFormValues, any, EditDriverFormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (open && driver) {
      let contractDate = "";
      try {
        if (driver.contractDate) {
          const d = parseISO(driver.contractDate);
          if (isValid(d)) contractDate = format(d, "yyyy-MM-dd");
        }
      } catch {}
      form.reset({
        name: driver.name ?? "",
        phone: driver.phone ?? "",
        emergencyPhone: driver.emergencyPhone ?? "",
        address: driver.address ?? "",
        contractDate,
        requiredDepositAmount: driver.requiredDepositAmount ?? undefined,
        depositAmount: driver.depositAmount ?? undefined,
      });
    }
  }, [open, driver]);

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSave(values);
    onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar Conductor</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit}>
            <Tabs defaultValue="contact" className="w-full">
              <TabsList className="grid grid-cols-2 mb-4">
                <TabsTrigger value="contact">Contacto</TabsTrigger>
                <TabsTrigger value="financial">Financiero</TabsTrigger>
              </TabsList>

              <TabsContent value="contact" className="space-y-3">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>Nombre completo</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                )} />
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem><FormLabel>Teléfono</FormLabel><FormControl><Input type="tel" {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="emergencyPhone" render={({ field }) => (
                    <FormItem><FormLabel>Emergencias</FormLabel><FormControl><Input type="tel" {...field} /></FormControl></FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="address" render={({ field }) => (
                  <FormItem><FormLabel>Dirección</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                )} />
              </TabsContent>

              <TabsContent value="financial" className="space-y-3">
                <FormField control={form.control} name="contractDate" render={({ field }) => (
                  <FormItem><FormLabel>Fecha de Contrato</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>
                )} />
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="requiredDepositAmount" render={({ field }) => (
                    <FormItem><FormLabel>Depósito Requerido</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="depositAmount" render={({ field }) => (
                    <FormItem><FormLabel>Depósito Entregado</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl></FormItem>
                  )} />
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
