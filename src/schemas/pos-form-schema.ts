
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

const paymentSchema = z.object({
    method: z.enum(['Efectivo', 'Tarjeta', 'Tarjeta MSI', 'Transferencia']),
    amount: z.coerce.number().min(0.01, "El monto debe ser mayor a cero."),
    folio: z.string().optional(),
});

export const posFormSchema = z.object({
  items: z.array(saleItemSchema).min(1, 'Debe agregar al menos un artículo a la venta.'),
  customerName: z.string().optional(),
  whatsappNumber: z.string().optional(),
  payments: z.array(paymentSchema).min(1, 'Debe agregar al menos un método de pago.'),
}).superRefine((data, ctx) => {
    const totalItems = data.items.reduce((acc, item) => acc + item.totalPrice, 0);
    const totalPayments = data.payments.reduce((acc, payment) => acc + payment.amount, 0);

    if (Math.abs(totalItems - totalPayments) > 0.01) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `El total de los pagos (${totalPayments.toFixed(2)}) no coincide con el total de la venta (${totalItems.toFixed(2)}).`,
            path: ['payments'],
        });
    }

    data.payments.forEach((payment, index) => {
        if ((payment.method === 'Tarjeta' || payment.method === 'Tarjeta MSI') && !payment.folio) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'El folio es obligatorio para pagos con tarjeta.',
                path: [`payments`, index, 'folio'],
            });
        }
    });
});

export type POSFormValues = z.infer<typeof posFormSchema>;

    