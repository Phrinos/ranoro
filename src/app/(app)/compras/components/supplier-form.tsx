
// src/app/(app)/proveedores/components/supplier-form.tsx

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Supplier } from "@/types";
import { capitalizeWords, capitalizeSentences } from "@/lib/utils";
import { supplierFormSchema, type SupplierFormValues } from '@/schemas/supplier-form-schema';

const taxRegimeOptions = [
  "601 - General de Ley Personas Morales", "603 - Personas Morales con Fines no Lucrativos",
  "605 - Sueldos y Salarios e Ingresos Asimilados a Salarios", "606 - Arrendamiento",
  "608 - Demás Ingresos", "610 - Residentes en el Extranjero sin Establecimiento Permanente en México",
  "611 - Ingresos por Dividendos (socios y accionistas)", "612 - Personas Físicas con Actividades Empresariales y Profesionales",
  "616 - Sin Obligaciones Fiscales", "621 - Incorporación Fiscal",
  "622 - Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras",
  "624 - Coordinados", "625 - Régimen de las Actividades Empresariales con Ingresos a través de Plataformas Tecnológicas",
  "626 - Régimen Simplificado de Confianza",
];


interface SupplierFormProps {
  id?: string; // Form ID
  initialData?: Supplier | null;
  onSubmit: (values: SupplierFormValues) => Promise<void>;
}

export function SupplierForm({ id, initialData, onSubmit }: SupplierFormProps) {
  const form = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: initialData || {
      name: "",
      description: "",
      contactPerson: "",
      phone: "",
      email: "",
      address: "",
      rfc: "",
      taxRegime: "",
    },
  });

  return (
    <Form {...form}>
      <form id={id} onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre del Proveedor</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Repuestos Acme S.A." {...field} value={field.value ?? ''} onChange={(e) => field.onChange(capitalizeWords(e.target.value))} className="bg-card" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripción (Opcional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Ej: Especialistas en partes de suspensión, entrega a domicilio..." {...field} value={field.value ?? ''} className="bg-card" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="contactPerson"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Persona de Contacto (Opcional)</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: Juan Pérez" {...field} value={field.value ?? ''} onChange={(e) => field.onChange(capitalizeWords(e.target.value))} className="bg-card" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Teléfono (Opcional)</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: 555-123456" {...field} value={field.value ?? ''} className="bg-card" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email (Opcional)</FormLabel>
              <FormControl>
                <Input type="email" placeholder="Ej: contacto@proveedor.com" {...field} value={field.value ?? ''} className="bg-card" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Dirección (Opcional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Ej: Calle Falsa 123, Ciudad, Provincia" {...field} value={field.value ?? ''} className="bg-card" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="rfc"
            render={({ field }) => (
              <FormItem>
                <FormLabel>RFC (Opcional)</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Ej: XAXX010101000"
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                    className="bg-card"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="taxRegime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Régimen Fiscal (Opcional)</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? ''}>
                  <FormControl>
                    <SelectTrigger className="bg-card">
                      <SelectValue placeholder="Seleccione un régimen fiscal" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {taxRegimeOptions.map((regime) => (
                      <SelectItem key={regime} value={regime}>
                        {regime}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </form>
    </Form>
  );
}
