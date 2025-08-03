// src/schemas/inventory-item-form-schema.ts
import * as z from "zod";

export const inventoryItemFormSchema = z.object({
  name: z.string().min(3, "El nombre del producto debe tener al menos 3 caracteres."),
  brand: z.string().min(2, "La marca es obligatoria."),
  sku: z.string().optional(),
  description: z.string().optional(),
  isService: z.boolean().default(false).optional(),
  quantity: z.coerce.number().int().min(0, "La cantidad no puede ser negativa.").optional(),
  unitPrice: z.coerce.number().min(0, "El precio de compra no puede ser negativo.").optional(),
  sellingPrice: z.coerce.number().min(0, "El precio de venta no puede ser negativo.").optional(),
  lowStockThreshold: z.coerce.number().int().min(0, "El umbral de stock bajo no puede ser negativo."),
  unitType: z.enum(['units', 'ml', 'liters']).default('units'),
  category: z.string().min(1, "La categoría es obligatoria."),
  supplier: z.string().min(1, "El proveedor es obligatorio."),
  rendimiento: z.coerce.number().int().min(0, "El rendimiento debe ser un número positivo.").optional(),
}).superRefine((data, ctx) => {
  if (!data.isService && data.quantity === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "La cantidad es obligatoria para productos.",
      path: ["quantity"],
    });
  }
  if (!data.isService && data.lowStockThreshold === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "El umbral de stock bajo es obligatorio para productos.",
      path: ["lowStockThreshold"],
    });
  }
});

export type InventoryItemFormValues = z.infer<typeof inventoryItemFormSchema>;
