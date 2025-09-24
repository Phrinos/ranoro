
// src/schemas/service-form.ts
import * as z from "zod";

// ... (otros esquemas como optionalUrl, supplySchema, etc., se mantienen igual)
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


export const serviceFormSchema = z
  .object({
    // ... (la mayoría de los campos se mantienen igual)
    id: z.string().optional(),
    publicId: z.string().optional(),
    
    vehicleId: z.string().min(1, "Debe seleccionar un vehículo."),
    
    serviceDate: z.coerce.date({ required_error: "La fecha de creación es obligatoria." }),
    
    serviceItems: z.array(serviceItemSchema).default([]), // Inicia como un array vacío

    status: z.enum(["Cotizacion", "Agendado", "En Taller", "Proveedor Externo", "Entregado", "Cancelado"]),

    // ... (resto de los campos se mantienen igual)
  })
  .refine((data) => {
    // La validación de items solo se aplica si el estado NO es "Cotizacion"
    if (data.status !== 'Cotizacion') {
      return data.serviceItems.length > 0;
    }
    return true; // Para cotizaciones, no se requiere ningún item
  }, {
    message: "Debe agregar al menos un ítem de servicio para este estado.",
    path: ["serviceItems"],
  })
  .refine((d) => !(d.status === "Agendado" && !d.appointmentDateTime), {
    message: "La fecha de la cita es obligatoria para el estado 'Agendado'.",
    path: ["appointmentDateTime"],
  });
  // ... (el superRefine para el estado 'Entregado' se mantiene igual)


export type ServiceFormValues = z.infer<typeof serviceFormSchema>;
