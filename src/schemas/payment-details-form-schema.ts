// src/schemas/payment-details-form-schema.ts
import * as z from "zod";
import type { Payment } from "@/types";

const paymentMethods: Payment['method'][] = [
  "Efectivo",
  "Tarjeta",
  "Tarjeta MSI",
  "Transferencia",
];

export const paymentDetailsSchema = z.object({
  payments: z.array(z.object({
    method: z.enum(paymentMethods),
    amount: z.coerce.number().min(0.01, "El monto debe ser mayor a cero.").optional(),
    folio: z.string().optional(),
  })).min(1, "Debe agregar al menos un método de pago."),
}).superRefine((data, ctx) => {
    // This validation is now handled in the parent component where the total is known.
    // It's kept here as a reference but the parent will perform the final check.
    
    data.payments.forEach((payment, index) => {
        if ((payment.method === 'Tarjeta' || payment.method === 'Tarjeta MSI') && !payment.folio) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'El folio es obligatorio para pagos con tarjeta.',
                path: [`payments`, index, 'folio'],
            });
        }
    });
});

export type PaymentDetailsFormValues = z.infer<typeof paymentDetailsSchema>;
