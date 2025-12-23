import { z } from "zod";

export const registerPurchaseSchema = z.object({
  supplierId: z.string().min(1),
  invoiceId: z.string().optional(),
  purchaseDate: z.string().min(1),
  items: z.array(
    z.object({
      itemId: z.string().min(1),
      quantity: z.number().min(0),
      purchasePrice: z.number().min(0),
    })
  ),
});

export type RegisterPurchaseFormValues = z.infer<typeof registerPurchaseSchema>;
