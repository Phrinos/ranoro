
import { z } from "zod";

export const ownerWithdrawalSchema = z.object({
  ownerName: z.string().min(1, "Debe seleccionar un socio."),
  date: z.date(),
  amount: z.coerce.number().min(0.01, "El monto debe ser mayor a cero."),
  note: z.string().optional(),
});

export type OwnerWithdrawalFormValues = z.infer<typeof ownerWithdrawalSchema>;
