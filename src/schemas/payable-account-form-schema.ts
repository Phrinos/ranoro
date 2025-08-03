
// src/schemas/payable-account-form-schema.ts
import * as z from "zod";

const paymentMethods: ['Efectivo', 'Transferencia'] = ['Efectivo', 'Transferencia'];

export const payableAccountFormSchema = (maxAmount: number) => z.object({
  amount: z.coerce.number().min(0.01, "El monto debe ser mayor a 0.").max(maxAmount, `El pago no puede exceder el saldo pendiente de ${maxAmount.toFixed(2)}.`),
  note: z.string().optional(),
  paymentMethod: z.enum(paymentMethods, { required_error: "Debe seleccionar un método de pago." }),
});

export type PayableAccountFormValues = z.infer<ReturnType<typeof payableAccountFormSchema>>;
