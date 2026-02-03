// src/schemas/pos-form-schema.ts
import * as z from 'zod';
import { PAYMENT_METHODS } from '@/types';

const saleItemSchema = z.object({
  inventoryItemId: z.string().min(1, 'Seleccione un artículo.'),
  itemName: z.string(),
  quantity: z.coerce.number().min(0.001, 'La cantidad debe ser mayor a 0.'),
  unitPrice: z.coerce.number(), // This is the COST for the workshop OR the customer price for a service
  totalPrice: z.coerce.number(), // This is the SELLING price to customer
  isService: z.boolean().optional(),
  unitType: z.enum(['units', 'ml', 'liters']).optional(),
});

const paymentSchema = z.object({
    method: z.enum(PAYMENT_METHODS),
    amount: z.coerce.number().min(0.01, "El monto debe ser mayor a cero.").optional(),
    folio: z.string().optional(),
});

export const posFormSchema = z.object({
  items: z.array(saleItemSchema).min(1, 'Debe agregar al menos un artículo a la venta.'),
  customerName: z.string().optional(),
  whatsappNumber: z.string().optional(),
  payments: z.array(paymentSchema).min(1, 'Debe agregar al menos un método de pago.'),
  cardCommission: z.coerce.number().optional(), 
}).superRefine((data, ctx) => {
    const totalItems = data.items
        .filter(item => item.inventoryItemId !== 'COMMISSION_FEE')
        .reduce((acc, item) => acc + item.totalPrice, 0);

    const totalPayments = data.payments.reduce((acc, payment) => acc + (payment.amount || 0), 0);

    if (Math.abs(totalItems - totalPayments) > 0.01) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `El total de los pagos (${totalPayments.toFixed(2)}) no coincide con el total de la venta (${totalItems.toFixed(2)}).`,
            path: ['payments'],
        });
    }

    data.payments.forEach((payment, index) => {
        const needsFolio = ['Tarjeta', 'Tarjeta MSI', 'Transferencia', 'Transferencia/Contadora'].includes(payment.method);
        if (needsFolio && (!payment.folio || payment.folio.trim() === '')) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'El folio/referencia es obligatorio para este método de pago.',
                path: [`payments.${index}.folio`],
            });
        }
    });
});

export type POSFormValues = z.infer<typeof posFormSchema>;
