// src/schemas/payment-details-form-schema.ts
import * as z from "zod";
import type { Payment } from "@/types";

const paymentMethods: Payment['method'][] = [
  "Efectivo",
  "Tarjeta",
  "Tarjeta MSI",
  "Transferencia",
];

const singlePaymentSchema = z.object({
  method: z.enum(paymentMethods),
  amount: z.coerce.number().min(0.01, "El monto debe ser mayor a cero.").optional(),
  folio: z.string().optional(),
}).superRefine((data, ctx) => {
    if ((data.method === 'Tarjeta' || data.method === 'Tarjeta MSI') && (!data.folio || data.folio.trim() === '')) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'El folio es obligatorio para pagos con tarjeta.',
            path: ['folio'],
        });
    }
});

export const paymentDetailsSchema = z.object({
  payments: z.array(singlePaymentSchema).min(1, "Debe agregar al menos un método de pago."),
  nextServiceInfo: z.object({
    nextServiceDate: z.date().nullable().optional(),
    nextServiceMileage: z.number().nullable().optional(),
  }).optional(),
}).superRefine((data, ctx) => {
    const totalPayments = data.payments.reduce((acc, p) => acc + (p.amount || 0), 0);
    // La validación contra el total del servicio se hará en el componente
    // porque el schema no tiene acceso a esa información.
});

export type PaymentDetailsFormValues = z.infer<typeof paymentDetailsSchema>;
