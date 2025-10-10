
import * as z from "zod";

export const inventoryItemFormSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres."),
  brand: z.string().optional(),
  sku: z.string().optional(),
  description: z.string().optional(),
  isService: z.boolean().default(false).optional(),
  quantity: z.coerce.number().int().min(0, "La cantidad no puede ser negativa.").optional(),
  unitPrice: z.coerce.number().min(0, "El costo no puede ser negativo.").optional(),
  sellingPrice: z.coerce.number().min(0, "El precio no puede ser negativo.").optional(),
  lowStockThreshold: z.coerce.number().int().min(0, "El umbral no puede ser negativo.").optional(),
  unitType: z.enum(['units', 'ml', 'liters']).default('units'),
  category: z.string().min(1, "La categoría es obligatoria."),
  supplier: z.string().min(1, "El proveedor es obligatorio."),
  rendimiento: z.coerce.number().int().min(0, "El rendimiento debe ser un número positivo.").optional(),
})
.superRefine((data, ctx) => {
  // Reglas SOLO para productos
  if (!data.isService) {
    if (data.quantity === undefined || data.quantity === null || Number.isNaN(data.quantity)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La cantidad es obligatoria para productos.",
        path: ["quantity"],
      });
    }

    if (data.lowStockThreshold === undefined || data.lowStockThreshold === null || Number.isNaN(data.lowStockThreshold)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El umbral de stock bajo es obligatorio para productos.",
        path: ["lowStockThreshold"],
      });
    }

    const brandLen = (data.brand ?? "").trim().length;
    if (brandLen < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La marca es obligatoria para productos (mínimo 2 caracteres).",
        path: ["brand"],
      });
    }
  }
});

export type InventoryItemFormValues = z.infer<typeof inventoryItemFormSchema>;
