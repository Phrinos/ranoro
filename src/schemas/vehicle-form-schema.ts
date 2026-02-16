
// src/schemas/vehicle-form-schema.ts
import * as z from 'zod';

// Helper para coaccionar números de forma segura evitando NaN
const numericField = (requiredMsg?: string) => z.preprocess((v) => {
  if (v === "" || v === null || v === undefined) return undefined;
  const n = Number(v);
  return isNaN(n) ? undefined : n;
}, requiredMsg ? z.number({ required_error: requiredMsg, invalid_type_error: requiredMsg }) : z.number().optional());

export const vehicleFormSchema = z.object({
  make: z.string().min(2, { message: "La marca debe tener al menos 2 caracteres." }),
  model: z.string().min(1, { message: "El modelo es obligatorio." }),
  year: numericField("El año es obligatorio")
    .pipe(z.number().min(1900, "Año inválido.").max(new Date().getFullYear() + 2, "Año inválido.")),
  engine: z.string().optional(),
  licensePlate: z.string().min(3, "La placa debe tener al menos 3 caracteres."),
  vin: z.string().optional(),
  engineSerialNumber: z.string().optional(),
  color: z.string().optional(),
  ownerName: z.string().min(2, { message: "El nombre del propietario debe tener al menos 2 caracteres." }),
  ownerPhone: z.string().optional(),
  chatMetaLink: z.string().url({ message: "Por favor, introduce una URL válida." }).optional().or(z.literal('')),
  isFleetVehicle: z.boolean().default(false),
  purchasePrice: numericField(),
  dailyRentalCost: numericField(),
  gpsCost: numericField(),
  insuranceCost: numericField(),
  adminCost: numericField(),
  currentMileage: numericField(),
  notes: z.string().optional(),
  assignedDriverId: z.string().nullable().optional(),
});

export type VehicleFormValues = z.infer<typeof vehicleFormSchema>;
