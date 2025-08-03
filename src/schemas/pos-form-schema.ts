

// src/schemas/pos-form-schema.ts
import * as z from 'zod';

const saleItemSchema = z.object({
  inventoryItemId: z.string().min(1, 'Seleccione un artículo.'),
  itemName: z.string(),
  quantity: z.coerce.number().min(0.001, 'La cantidad debe ser mayor a 0.'),
  unitPrice: z.coerce.number(),
  totalPrice: z.coerce.number(),
  isService: z.boolean().optional(),
  unitType: z.enum(['units', 'ml', 'liters']).optional(),
});

const paymentMethods: [string, ...string[]] = [
  'Efectivo', 'Tarjeta', 'Transferencia', 'Efectivo+Transferencia', 'Tarjeta+Transferencia', 'Efectivo/Tarjeta'
];

export const posFormSchema = z.object({
  items: z.array(saleItemSchema).min(1, 'Debe agregar al menos un artículo a la venta.'),
  customerName: z.string().optional(),
  whatsappNumber: z.string().optional(),
  paymentMethod: z.string().default('Efectivo'),
  cardFolio: z.string().optional(),
  transferFolio: z.string().optional(),
  amountInCash: z.coerce.number().optional(),
  amountInCard: z.coerce.number().optional(),
  amountInTransfer: z.coerce.number().optional(),
}).superRefine((data, ctx) => {
    if (data.paymentMethod?.includes('Tarjeta') && !data.cardFolio) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'El folio de la tarjeta es obligatorio.',
            path: ['cardFolio'],
        });
    }
    if (data.paymentMethod?.includes('Transferencia') && !data.transferFolio) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'El folio de la transferencia es obligatorio.',
            path: ['transferFolio'],
        });
    }
});

export type POSFormValues = z.infer<typeof posFormSchema>;
