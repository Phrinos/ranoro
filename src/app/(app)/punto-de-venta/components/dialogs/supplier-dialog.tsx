// src/app/(app)/punto-de-venta/components/dialogs/supplier-dialog.tsx
"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Supplier } from "@/types";

const schema = z.object({
  name: z.string().min(1, "Nombre requerido"),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  address: z.string().optional(),
  rfc: z.string().optional(),
  description: z.string().optional(),
});

export type SupplierFormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  supplier?: Partial<Supplier> | null;
  onSave: (values: SupplierFormValues, id?: string) => Promise<void>;
}

export function SupplierDialog({ open, onOpenChange, supplier, onSave }: Props) {
  const isEditing = !!supplier?.id;

  const form = useForm<SupplierFormValues, any, SupplierFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", contactPerson: "", phone: "", email: "", address: "", rfc: "", description: "" },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: supplier?.name ?? "",
        contactPerson: supplier?.contactPerson ?? "",
        phone: supplier?.phone ?? "",
        email: supplier?.email ?? "",
        address: supplier?.address ?? "",
        rfc: supplier?.rfc ?? "",
        description: supplier?.description ?? "",
      });
    }
  }, [open, supplier, form]);

  const onSubmit = async (values: SupplierFormValues) => {
    await onSave(values, supplier?.id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>{isEditing ? "Editar" : "Nuevo"} Proveedor</DialogTitle>
          <DialogDescription className="text-xs">Datos del proveedor para compras e inventario.</DialogDescription>
        </DialogHeader>

        <div className="p-6 overflow-y-auto max-h-[70vh]">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Razón Social / Nombre *</FormLabel>
                  <FormControl><Input className="bg-white border-slate-200" placeholder="Distribuidora XYZ S.A." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="contactPerson" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contacto</FormLabel>
                    <FormControl><Input className="bg-white border-slate-200" placeholder="Nombre del contacto" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono</FormLabel>
                    <FormControl><Input className="bg-white border-slate-200" type="tel" placeholder="55 1234 5678" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl><Input className="bg-white border-slate-200" type="email" placeholder="proveedor@email.com" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="rfc" render={({ field }) => (
                  <FormItem>
                    <FormLabel>RFC</FormLabel>
                    <FormControl><Input className="bg-white border-slate-200" placeholder="XAXX010101000" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="address" render={({ field }) => (
                <FormItem>
                  <FormLabel>Dirección</FormLabel>
                  <FormControl><Input className="bg-white border-slate-200" placeholder="Calle, colonia, ciudad" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas</FormLabel>
                  <FormControl><Textarea rows={2} className="bg-white border-slate-200 resize-none" placeholder="Notas adicionales..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                <Button type="submit" className="bg-primary hover:bg-primary/90 text-white" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? "Guardando…" : isEditing ? "Actualizar" : "Crear Proveedor"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
