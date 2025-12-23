import { z } from "zod";

export const registerPaymentSchema = z.object({
  id: z.string().optional(),
  paymentDate: z.coerce.date({
    required_error: "Selecciona una fecha",
    invalid_type_error: "Fecha inválida",
  }),
  amount: z.coerce.number().min(1, "Ingresa un monto válido"),
  paymentMethod: z.enum(["Efectivo", "Tarjeta", "Transferencia", "Crédito"]).optional(),
  note: z.string().optional().default(""),

  // opcionales (según contexto)
  infractionId: z.string().optional(),
  daysCovered: z.coerce.number().optional(),
  vehicleLicensePlate: z.string().optional(),
});

export type RegisterPaymentFormValues = z.infer<typeof registerPaymentSchema>;
