import * as z from 'zod';

export const billingFormSchema = z.object({
  rfc: z.string().min(12, "El RFC debe tener entre 12 y 13 caracteres.").max(13),
  name: z.string().min(3, "El nombre o razón social es requerido."),
  email: z.string().email("Por favor, ingrese un correo electrónico válido."),
  address: z.object({
    zip: z.string().length(5, "El código postal debe tener 5 dígitos."),
  }),
  taxSystem: z.string().min(1, "Debe seleccionar un régimen fiscal."),
  cfdiUse: z.string().min(1, "Debe seleccionar un uso de CFDI."),
});

export type BillingFormValues = z.infer<typeof billingFormSchema>;
