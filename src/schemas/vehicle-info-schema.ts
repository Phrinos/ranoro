import { z } from "zod";

export const vehicleInfoSchema = z.object({
  ownerName: z.string().optional(),
  ownerLicence: z.string().optional(),
  ownerAddress: z.string().optional(),
});

export type VehicleInfoFormValues = z.infer<typeof vehicleInfoSchema>;
