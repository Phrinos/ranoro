
import { z } from "zod";

export const registerPaymentSchema = z.object({
  id: z.string().optional(),
  paymentDate: z.coerce.date({ message: "Selecciona una fecha" }),
  amount: z.coerce.number().min(1, "Ingresa un monto válido"),
  paymentMethod: z.string().optional(),
  note: z.string().optional(),
  infractionId: z.string().optional(),
});

export type RegisterPaymentFormValues = z.infer<typeof registerPaymentSchema>;
