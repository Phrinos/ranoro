// src/schemas/user-form-schema.ts
import * as z from "zod";

export const userFormSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres."),
  email: z.string().email("Ingrese un correo electrónico válido."),
  phone: z.string().optional(),
  role: z.string().min(1, "Debe seleccionar un rol."),
  functions: z.array(z.string()).default([]), // Aseguramos que sea un array
  monthlySalary: z.coerce.number().optional(),
  commissionRate: z.coerce.number().optional(),
  hireDate: z.date().optional(),
  isArchived: z.boolean().optional(),
});

export type UserFormValues = z.infer<typeof userFormSchema>;
