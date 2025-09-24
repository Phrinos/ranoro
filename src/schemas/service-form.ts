// src/schemas/service-form.ts
import * as z from 'zod';

export const supplySchema = z.object({
  supplyId: z.string().min(1, 'Seleccione un insumo'),
  quantity: z.coerce.number().min(0.001, 'La cantidad debe ser mayor a 0'),
  unitPrice: z.coerce.number().optional(),
  sellingPrice: z.coerce.number().optional(),
  supplyName: z.string().optional(),
  isService: z.boolean().optional(),
  unitType: z.enum(['units', 'ml', 'liters']).optional(),
});

export const serviceItemSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(3, 'El nombre del servicio es requerido.'),
  sellingPrice: z.coerce.number({ invalid_type_error: 'El precio debe ser un número.' }).optional(),
  suppliesUsed: z.array(supplySchema),
  serviceType: z.string().optional(),
  technicianId: z.string().optional(),
  technicianCommission: z.coerce.number().optional(),
});

export const photoReportSchema = z.object({
  id: z.string(),
  date: z.string(),
  description: z.string().optional(),
  photos: z.array(z.string().url('URL de foto inválida.')),
  type: z.enum(['Recepción', 'Entrega', 'General']).optional(),
});

export const safetyCheckValueSchema = z.object({
  status: z.enum(['ok', 'atencion', 'inmediata', 'na']).default('na'),
  photos: z.array(z.string().url()).default([]),
  notes: z.string().optional(),
});

export const safetyInspectionSchema = z.object({
    luces_altas_bajas_niebla: safetyCheckValueSchema.optional(),
    luces_cuartos: safetyCheckValueSchema.optional(),
    luces_direccionales: safetyCheckValueSchema.optional(),
    luces_frenos_reversa: safetyCheckValueSchema.optional(),
    luces_interiores: safetyCheckValueSchema.optional(),
    fugas_refrigerante: safetyCheckValueSchema.optional(),
    fugas_limpiaparabrisas: safetyCheckValueSchema.optional(),
    fugas_frenos_embrague: safetyCheckValueSchema.optional(),
    fugas_transmision: safetyCheckValueSchema.optional(),
    fugas_direccion_hidraulica: safetyCheckValueSchema.optional(),
    carroceria_cristales_espejos: safetyCheckValueSchema.optional(),
    carroceria_puertas_cofre: safetyCheckValueSchema.optional(),
    carroceria_asientos_tablero: safetyCheckValueSchema.optional(),
    carroceria_plumas: safetyCheckValueSchema.optional(),
    suspension_rotulas: safetyCheckValueSchema.optional(),
    suspension_amortiguadores: safetyCheckValueSchema.optional(),
    suspension_caja_direccion: safetyCheckValueSchema.optional(),
    suspension_terminales: safetyCheckValueSchema.optional(),
    llantas_delanteras_traseras: safetyCheckValueSchema.optional(),
    llantas_refaccion: safetyCheckValueSchema.optional(),
    frenos_discos_delanteros: safetyCheckValueSchema.optional(),
    frenos_discos_traseros: safetyCheckValueSchema.optional(),
    otros_tuberia_escape: safetyCheckValueSchema.optional(),
    otros_soportes_motor: safetyCheckValueSchema.optional(),
    otros_claxon: safetyCheckValueSchema.optional(),
    otros_inspeccion_sdb: safetyCheckValueSchema.optional(),
    inspectionNotes: z.string().optional().nullable(),
    technicianSignature: z.string().optional(),
}).optional();

const paymentSchema = z.object({
    method: z.enum(['Efectivo', 'Tarjeta', 'Tarjeta MSI', 'Transferencia']),
    amount: z.coerce.number().min(0.01, "El monto debe ser mayor a cero.").optional(),
    folio: z.string().optional(),
});

export const serviceFormSchema = z.object({
    id: z.string().optional(),
    publicId: z.string().optional(),
    initialStatus: z.enum(['Cotizacion', 'Agendado', 'En Taller', 'Proveedor Externo', 'Entregado', 'Cancelado']).optional(),
    vehicleId: z.string().min(1, 'Debe seleccionar un vehículo.'),
    vehicleIdentifier: z.string().optional(),
    vehicleLicensePlateSearch: z.string().optional(),
    serviceDate: z.date({ required_error: 'La fecha de creación es obligatoria.' }),
    appointmentDateTime: z.date().optional().nullable(),
    receptionDateTime: z.date().optional().nullable(),
    deliveryDateTime: z.date().optional().nullable(),
    mileage: z.coerce.number({ invalid_type_error: 'El kilometraje debe ser numérico.' }).int('El kilometraje debe ser un número entero.').min(0, 'El kilometraje no puede ser negativo.').optional(),
    technicianId: z.string().optional(),
    technicianName: z.string().nullable().optional(),
    serviceItems: z.array(serviceItemSchema).min(1, 'Debe agregar al menos un ítem de servicio.'),
    status: z.enum(['Cotizacion', 'Agendado', 'En Taller', 'Proveedor Externo', 'Entregado', 'Cancelado']),
    subStatus: z.enum(['Sin Confirmar', 'Confirmada', 'Cancelada', 'Ingresado', 'En Espera de Refacciones', 'Reparando', 'Completado']).nullable().optional(),
    serviceType: z.string().optional(),
    vehicleConditions: z.string().optional().nullable(),
    fuelLevel: z.string().optional().nullable(),
    customerItems: z.string().optional().nullable(),
    notes: z.string().max(2000, 'Máximo 2000 caracteres').optional().nullable(),
    customerSignatureReception: z.string().nullable().optional(),
    customerSignatureDelivery: z.string().nullable().optional(),
    receptionSignatureViewed: z.boolean().optional(),
    deliverySignatureViewed: z.boolean().optional(),
    safetyInspection: safetyInspectionSchema.optional(),
    serviceAdvisorId: z.string().optional(),
    serviceAdvisorName: z.string().optional(),
    serviceAdvisorSignatureDataUrl: z.string().url().optional().nullable().transform(v => (v === '' || v == null ? undefined : v)), 
    payments: z.array(paymentSchema).optional(),
    cardCommission: z.number().optional(),
    paymentMethod: z.string().optional(),
    cardFolio: z.string().optional(),
    transferFolio: z.string().optional(),
    amountInCash: z.number().optional(),
    amountInCard: z.number().optional(),
    amountInTransfer: z.number().optional(),
    
    nextServiceInfo: z.object({
        nextServiceDate: z.date().optional().nullable(),
        nextServiceMileage: z.coerce.number().optional().nullable(),
    }).optional().nullable(),

    photoReports: z.array(photoReportSchema).optional(),
    customerName: z.string().optional(),
    totalCost: z.number().optional(),
    allVehiclesForDialog: z.array(z.any()).optional(), 
}).refine(
    (d) => !(d.status === 'Agendado' && !d.appointmentDateTime),
    {
      message: "La fecha de la cita es obligatoria para el estado 'Agendado'.",
      path: ['appointmentDateTime'],
    }
).superRefine((data, ctx) => {
    const totalCost = data.serviceItems?.reduce((sum, item) => sum + (item.sellingPrice || 0), 0) || 0;
    const totalPaid = data.payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

    if (data.status === 'Entregado') {
        if (!data.payments || data.payments.length === 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Debe registrar al menos un método de pago para un servicio entregado.',
                path: ['payments'],
            });
        }
        
        if (!data.mileage || data.mileage <= 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'El kilometraje es obligatorio para entregar un servicio.',
                path: ['mileage'],
            });
        }

        if (Math.abs(totalCost - totalPaid) > 0.01) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `El monto pagado (${totalPaid.toFixed(2)}) no coincide con el total del servicio (${totalCost.toFixed(2)}).`,
                path: ['payments'],
            });
        }
        
        if (data.payments) { // <-- Check if payments array exists
            data.payments.forEach((payment, index) => {
                if ((payment.method === 'Tarjeta' || payment.method === 'Tarjeta MSI' || payment.method === 'Transferencia') && (!payment.folio || payment.folio.trim() === '')) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: 'El folio es obligatorio para este método de pago al entregar el servicio.',
                        path: [`payments.${index}.folio`],
                    });
                }
            });
        }
    }
});

export type ServiceFormValues = z.infer<typeof serviceFormSchema>;
