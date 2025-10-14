
// src/schemas/vehicle-form-schema.ts
import * as z from 'zod';

export const vehicleFormSchema = z.object({
  make: z.string().min(2, { message: "La marca debe tener al menos 2 caracteres." }),
  model: z.string().min(1, { message: "El modelo es obligatorio." }),
  year: z.coerce.number().min(1900, "Año inválido.").max(new Date().getFullYear() + 2, "Año inválido."),
  engine: z.string().optional(),
  licensePlate: z.string().min(3, "La placa debe tener al menos 3 caracteres."),
  vin: z.string().optional(),
  color: z.string().optional(),
  ownerName: z.string().min(2, { message: "El nombre del propietario debe tener al menos 2 caracteres." }),
  ownerPhone: z.string().optional(),
  chatMetaLink: z.string().url({ message: "Por favor, introduce una URL válida." }).optional().or(z.literal('')),
  isFleetVehicle: z.boolean().default(false),
  purchasePrice: z.coerce.number().optional(),
  dailyRentalCost: z.coerce.number().optional(),
  gpsCost: z.coerce.number().optional(),
  insuranceCost: z.coerce.number().optional(),
  adminCost: z.coerce.number().optional(),
  currentMileage: z.coerce.number().optional(),
  notes: z.string().optional(),
  assignedDriverId: z.string().nullable().optional(),
});

export type VehicleFormValues = z.infer<typeof vehicleFormSchema>;
