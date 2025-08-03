
// src/schemas/supplier-form-schema.ts
import * as z from "zod";

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

export const supplierFormSchema = z.object({
  name: z.string().min(2, "El nombre del proveedor es obligatorio."),
  description: z.string().optional(),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Ingrese un correo electrónico válido.").optional().or(z.literal('')),
  address: z.string().optional(),
  rfc: z.string().optional(),
  taxRegime: z.string().optional(),
});

export type SupplierFormValues = z.infer<typeof supplierFormSchema>;
