import { z } from "zod";

export const registerPaymentSchema = z.object({
  id: z.string().optional(),
  paymentDate: z.string().min(1),
  amount: z.number().min(0),
  paymentMethod: z.string().optional(),
  note: z.string().optional(),
  vehicleLicensePlate: z.string().optional(),
  daysCovered: z.number().optional(),
});

export type RegisterPaymentFormValues = z.infer<typeof registerPaymentSchema>;
