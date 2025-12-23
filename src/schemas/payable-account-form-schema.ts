// src/schemas/payable-account-form-schema.ts
import * as z from "zod";

const paymentMethods = ['Efectivo', 'Transferencia'] as const;

export const payableAccountFormSchema = (maxAmount: number) => z.object({
  amount: z.coerce.number().min(0.01, "El monto debe ser mayor a 0.").max(maxAmount, `El pago no puede exceder el saldo pendiente de ${maxAmount.toFixed(2)}.`),
  note: z.string().optional(),
  paymentMethod: z.enum(paymentMethods),
});

export type PayableAccountFormInput = z.input<ReturnType<typeof payableAccountFormSchema>>;
export type PayableAccountFormValues = z.infer<ReturnType<typeof payableAccountFormSchema>>;
