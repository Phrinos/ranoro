import { z } from "zod";

export const ownerWithdrawalSchema = z.object({
  vehicleId: z.string(),
  date: z.date(),
  amount: z.number(),
  note: z.string().optional(),
});

export type OwnerWithdrawalFormValues = z.infer<typeof ownerWithdrawalSchema>;
