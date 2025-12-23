import { z } from "zod";

export const financialInfoSchema = z.object({
  hasNotaryPower: z.boolean().optional(),
  notaryPowerRegistrationDate: z.date().optional(),
  notaryPowerExpirationDate: z.date().optional(),
});

export type FinancialInfoFormValues = z.infer<typeof financialInfoSchema>;
