import { z } from "zod";

export const registerPurchaseSchema = z.object({
  supplierId: z.string().min(1, "El proveedor es obligatorio"),
  invoiceId: z.string().optional(),
  purchaseDate: z.coerce.date(),
  items: z.array(
    z.object({
      inventoryItemId: z.string().min(1),
      itemName: z.string(),
      quantity: z.number().min(0.001, "La cantidad debe ser mayor a 0"),
      purchasePrice: z.number().min(0, "El costo no puede ser negativo"),
      sellingPrice: z.number().min(0, "El precio de venta no puede ser negativo").optional(),
      totalPrice: z.number().optional(),
    })
  ),
  paymentMethod: z.string().min(1, "Seleccione un método de pago"),
  dueDate: z.date().optional(),
  invoiceTotal: z.number().optional(),
  subtotal: z.number().optional(),
  taxes: z.number().optional(),
  discounts: z.number().optional(),
  note: z.string().optional(),
  total: z.number().optional(),
});

export type RegisterPurchaseFormValues = z.infer<typeof registerPurchaseSchema>;
