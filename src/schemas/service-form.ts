
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
  id: z.string(),
  name: z.string().min(3, 'El nombre del servicio es requerido.'),
  price: z.coerce.number({ invalid_type_error: 'El precio debe ser un número.' }).min(0, 'El precio debe ser un número positivo.').optional(),
  suppliesUsed: z.array(supplySchema),
});

export const photoReportSchema = z.object({
  id: z.string(),
  date: z.string(),
  description: z.string().optional(),
  photos: z.array(z.string().url('URL de foto inválida.')),
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
    inspectionNotes: z.string().optional(),
    technicianSignature: z.string().optional(),
}).optional();

const paymentSchema = z.object({
    method: z.enum(['Efectivo', 'Tarjeta', 'Tarjeta MSI', 'Transferencia']),
    amount: z.coerce.number().min(0.01, "El monto debe ser mayor a cero."),
    folio: z.string().optional(),
});

export const serviceFormSchema = z.object({
    id: z.string().optional(),
    publicId: z.string().optional(),
    initialStatus: z.enum(['Cotizacion', 'Agendado', 'En Taller', 'Entregado', 'Cancelado']).optional(),
    vehicleId: z.string().min(1, 'Debe seleccionar un vehículo.'),
    vehicleIdentifier: z.string().optional(),
    vehicleLicensePlateSearch: z.string().optional(),
    serviceDate: z.date().optional(),
    quoteDate: z.date().optional(),
    receptionDateTime: z.date().optional(),
    deliveryDateTime: z.date().optional(),
    mileage: z.coerce.number({ invalid_type_error: 'El kilometraje debe ser numérico.' }).int('El kilometraje debe ser un número entero.').min(0, 'El kilometraje no puede ser negativo.').optional(),
    notes: z.string().optional(),
    technicianId: z.string().optional(),
    technicianName: z.string().nullable().optional(),
    serviceItems: z.array(serviceItemSchema).min(1, 'Debe agregar al menos un ítem de servicio.'),
    status: z.enum(['Cotizacion', 'Agendado', 'En Taller', 'Entregado', 'Cancelado']),
    subStatus: z.enum(['En Espera de Refacciones', 'Reparando', 'Completado', 'Proveedor Externo']).optional(),
    serviceType: z.string().optional(),
    vehicleConditions: z.string().optional(),
    fuelLevel: z.string().optional(),
    customerItems: z.string().optional(),
    customerSignatureReception: z.string().nullable().optional(),
    customerSignatureDelivery: z.string().nullable().optional(),
    receptionSignatureViewed: z.boolean().optional(),
    deliverySignatureViewed: z.boolean().optional(),
    safetyInspection: safetyInspectionSchema.optional(),
    serviceAdvisorId: z.string().optional(),
    serviceAdvisorName: z.string().optional(),
    serviceAdvisorSignatureDataUrl: z.string().optional(),
    payments: z.array(paymentSchema).optional(),
    nextServiceInfo: z.object({
        date: z.string().optional(),
        mileage: z.number().optional(), 
    }).optional().nullable(),
    photoReports: z.array(photoReportSchema).optional(),
    customerName: z.string().optional(),
    totalCost: z.number().optional(),
    allVehiclesForDialog: z.array(z.any()).optional(), 
}).refine(
    (d) => !(d.status === 'Agendado' && !d.serviceDate),
    {
      message: "La fecha de la cita es obligatoria para el estado 'Agendado'.",
      path: ['serviceDate'],
    }
);

export type ServiceFormValues = z.infer<typeof serviceFormSchema>;

    