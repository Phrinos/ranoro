// src/schemas/service-form.ts
import * as z from "zod";

export const supplySchema = z.object({
  supplyId: z.string().min(1, "Seleccione un insumo"),
  quantity: z.coerce.number().min(0.001, "La cantidad debe ser mayor a 0"),
  unitPrice: z.coerce.number().optional(),
  sellingPrice: z.coerce.number().optional(),
  supplyName: z.string().optional(),
  isService: z.boolean().optional(),
  unitType: z.enum(["units", "ml", "liters"]).optional(),
});

export const serviceItemSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(3, "El nombre del servicio es requerido."),
  sellingPrice: z.coerce.number({ invalid_type_error: "El precio debe ser un número." }).optional(),
  suppliesUsed: z.array(supplySchema).default([]),
  serviceType: z.string().optional(),
  technicianId: z.string().optional(),
  technicianCommission: z.coerce.number().optional(),
});

export const serviceFormSchema = z.object({
  id: z.string().optional(),
  publicId: z.string().optional(),

  status: z.enum(["Cotizacion","Agendado","En Taller","Entregado","Cancelado", "Proveedor Externo"]).default("Cotizacion"),
  vehicleId: z.string().min(1, "Seleccione un vehículo"),
  serviceDate: z.date(),

  appointmentDateTime: z.date().nullable().optional(),
  receptionDateTime: z.date().nullable().optional(),
  deliveryDateTime: z.date().nullable().optional(),

  serviceItems: z.array(serviceItemSchema).default([]),

  serviceAdvisorId: z.string().min(1, "Seleccione un asesor"),
  serviceAdvisorName: z.string().optional().default(""),
  serviceAdvisorSignatureDataUrl: z.string().nullable().optional(),

  technicianId: z.string().optional().default(""),
  technicianName: z.string().optional().default(""),
  technicianSignatureDataUrl: z.string().nullable().optional(),
}).passthrough();

export type ServiceFormValues = z.infer<typeof serviceFormSchema>;