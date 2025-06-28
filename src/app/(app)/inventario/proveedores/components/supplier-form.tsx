
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

const taxRegimeOptions = [
  "601 REGIMEN GENERAL DE LEY PERSONAS MORALES",
  "602 RÉGIMEN SIMPLIFICADO DE LEY PERSONAS MORALES",
  "603 PERSONAS MORALES CON FINES NO LUCRATIVOS",
  "604 RÉGIMEN DE PEQUEÑOS CONTRIBUYENTES",
  "605 RÉGIMEN DE SUELDOS Y SALARIOS E INGRESOS ASIMILADOS A SALARIOS",
  "606 RÉGIMEN DE ARRENDAMIENTO",
  "607 RÉGIMEN DE ENAJENACIÓN O ADQUISICIÓN DE BIENES",
  "608 RÉGIMEN DE LOS DEMÁS INGRESOS",
  "609 RÉGIMEN DE CONSOLIDACIÓN",
  "610 RÉGIMEN RESIDENTES EN EL EXTRANJERO SIN ESTABLECIMIENTO PERMANENTE EN MÉXICO",
  "611 RÉGIMEN DE INGRESOS POR DIVIDENDOS (SOCIOS Y ACCIONISTAS)",
  "612 RÉGIMEN DE LAS PERSONAS FÍSICAS CON ACTIVIDADES EMPRESARIALES Y PROFESIONALES",
  "613 RÉGIMEN INTERMEDIO DE LAS PERSONAS FÍSICAS CON ACTIVIDADES EMPRESARIALES",
  "614 RÉGIMEN DE LOS INGRESOS POR INTERESES",
  "615 RÉGIMEN DE LOS INGRESOS POR OBTENCIÓN DE PREMIOS",
  "616 SIN OBLIGACIONES FISCALES",
  "617 PEMEX",
  "618 RÉGIMEN SIMPLIFICADO DE LEY PERSONAS FÍSICAS",
  "619 INGRESOS POR LA OBTENCIÓN DE PRÉSTAMOS",
  "620 SOCIEDADES COOPERATIVAS DE PRODUCCIÓN QUE OPTAN POR DIFERIR SUS INGRESOS.",
  "621 RÉGIMEN DE INCORPORACIÓN FISCAL",
  "622 RÉGIMEN DE ACTIVIDADES AGRÍCOLAS, GANADERAS, SILVÍCOLAS Y PESQUERAS PM",
  "623 RÉGIMEN DE OPCIONAL PARA GRUPOS DE SOCIEDADES",
  "624 RÉGIMEN DE LOS COORDINADOS",
  "625 RÉGIMEN DE LAS ACTIVIDADES EMPRESARIALES CON INGRESOS A TRAVÉS DE PLATAFORMAS TECNOLÓGICAS.",
  "626 RÉGIMEN SIMPLIFICADO DE CONFIANZA",
];

const supplierFormSchema = z.object({
  name: z.string().min(2, "El nombre del proveedor es obligatorio."),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Ingrese un correo electrónico válido.").optional().or(z.literal('')),
  address: z.string().optional(),
  rfc: z.string().optional(),
  taxRegime: z.string().optional(),
  debtAmount: z.coerce.number().optional(),
  debtNote: z.string().optional(),
});

export type SupplierFormValues = z.infer<typeof supplierFormSchema>;

interface SupplierFormProps {
  initialData?: Supplier | null;
  onSubmit: (values: SupplierFormValues) => Promise<void>;
  onClose: () => void;
}

export function SupplierForm({ initialData, onSubmit, onClose }: SupplierFormProps) {
  const form = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: initialData || {
      name: "",
      contactPerson: "",
      phone: "",
      email: "",
      address: "",
      rfc: "",
      taxRegime: "",
      debtAmount: undefined,
      debtNote: "",
    },
  });

  const handleFormSubmit = async (values: SupplierFormValues) => {
    await onSubmit(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre del Proveedor</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Repuestos Acme S.A." {...field} onChange={(e) => field.onChange(capitalizeWords(e.target.value))} />
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
                  <Input placeholder="Ej: Juan Pérez" {...field} onChange={(e) => field.onChange(capitalizeWords(e.target.value))} />
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
                  <Input placeholder="Ej: 555-123456" {...field} />
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
                <Input type="email" placeholder="Ej: contacto@proveedor.com" {...field} />
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
                <Textarea placeholder="Ej: Calle Falsa 123, Ciudad, Provincia" {...field} onChange={(e) => field.onChange(capitalizeWords(e.target.value))}/>
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
                    onChange={(e) => field.onChange(e.target.value.toUpperCase())}
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
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="debtAmount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Monto de Deuda (Opcional)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" placeholder="Ej: 1500.50" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="debtNote"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nota de Deuda (Opcional)</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: Factura #123 pendiente" {...field} onChange={(e) => field.onChange(capitalizeSentences(e.target.value))}/>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Guardando..." : (initialData ? "Actualizar Proveedor" : "Crear Proveedor")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
