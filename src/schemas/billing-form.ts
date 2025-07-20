// src/schemas/billing-form.ts
import * as z from 'zod';

export const billingFormSchema = z.object({
  rfc: z.string().min(12, 'El RFC debe tener 12 o 13 caracteres').max(13, 'El RFC debe tener 12 o 13 caracteres'),
  name: z.string().min(3, 'La Razón Social es obligatoria'),
  email: z.string().email('Ingrese un correo electrónico válido'),
  address: z.object({
    zip: z.string().min(5, 'El código postal es obligatorio').max(5, 'El código postal debe tener 5 dígitos'),
  }),
  taxSystem: z.string().min(1, "El régimen fiscal es obligatorio."),
  cfdiUse: z.string().min(1, "El uso de CFDI es obligatorio."),
});

export type BillingFormValues = z.infer<typeof billingFormSchema>;