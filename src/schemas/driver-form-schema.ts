// src/schemas/driver-form-schema.ts
import { z } from 'zod';

export const driverFormSchema = z.object({
  name: z.string().min(3, "El nombre es obligatorio."),
  phone: z.string().min(10, "El teléfono es obligatorio."),
  address: z.string().optional(),
  // Add other fields as needed, e.g., emergency contact
});

export type DriverFormValues = z.infer<typeof driverFormSchema>;
