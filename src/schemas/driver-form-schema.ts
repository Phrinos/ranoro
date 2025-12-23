// src/schemas/driver-form-schema.ts
import { z } from 'zod';

export const driverFormSchema = z.object({
  name: z.string().min(3, "El nombre es obligatorio."),
  phone: z.string().min(10, "El teléfono es obligatorio.").optional().or(z.literal('')),
  emergencyPhone: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  contractDate: z.date().optional(),
  requiredDepositAmount: z.coerce.number().optional(),
  depositAmount: z.coerce.number().optional(),
});

export type DriverFormValues = z.infer<typeof driverFormSchema>;
