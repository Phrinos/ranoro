import { z } from "zod";

export const globalTransactionSchema = z.object({
  driverId: z.string(),
  date: z.date(),
  amount: z.number().min(1, "El monto debe ser mayor a $0"),
  note: z.string().optional(),
  paymentMethod: z.enum(["Efectivo", "Tarjeta", "Transferencia", "Crédito"]).optional(),
});

export type GlobalTransactionFormValues = z.infer<typeof globalTransactionSchema>;
