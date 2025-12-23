import { z } from "zod";

export const registerPurchaseSchema = z.object({
  supplierId: z.string().min(1),
  invoiceId: z.string().optional(),
  purchaseDate: z.date(),
  items: z.array(
    z.object({
      inventoryItemId: z.string().min(1),
      itemName: z.string(),
      quantity: z.number().min(0),
      purchasePrice: z.number().min(0),
      totalPrice: z.number().optional(),
    })
  ),
  paymentMethod: z.string(),
  dueDate: z.date().optional(),
  invoiceTotal: z.number().optional(),
  subtotal: z.number().optional(),
  taxes: z.number().optional(),
  discounts: z.number().optional(),
});

export type RegisterPurchaseFormValues = z.infer<typeof registerPurchaseSchema>;
