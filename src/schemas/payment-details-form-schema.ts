// src/schemas/payment-details-form-schema.ts
import { z } from "zod";
import { PAYMENT_METHODS } from "@/types";

const singlePaymentSchema = z.object({
  method: z.enum(PAYMENT_METHODS), // <- usa tupla literal as const
  amount: z.coerce.number().min(0.01, "El monto debe ser mayor a cero.").optional(),
  folio: z.string().optional(),
}).superRefine((data, ctx) => {
  if ((data.method === 'Tarjeta' || data.method === 'Tarjeta MSI') && (!data.folio || data.folio.trim() === '')) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'El folio es obligatorio para pagos con tarjeta.', path: ['folio'] });
  }
});

export const paymentDetailsSchema = z.object({
  payments: z.array(singlePaymentSchema).min(1, "Debe agregar al menos un método de pago."),
  nextServiceInfo: z.object({
    date: z.date().nullable().optional(),
    mileage: z.number().nullable().optional(),
  }).optional(),
});

export type PaymentDetailsFormValues = z.infer<typeof paymentDetailsSchema>;
