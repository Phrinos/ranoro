// src/schemas/vehicle-form-schema.ts
import * as z from "zod";

export const vehicleFormSchema = z.object({
  make: z.string().min(2, "La marca es obligatoria."),
  model: z.string().min(1, "El modelo es obligatorio."),
  year: z.coerce.number().min(1900, "El año debe ser posterior a 1900.").max(new Date().getFullYear() + 1, `El año no puede ser mayor a ${new Date().getFullYear() + 1}.`),
  vin: z.string().length(17, "El VIN debe tener 17 caracteres.").optional().or(z.literal('')),
  licensePlate: z.string().min(1, "La placa no puede estar vacía. Ingrese 'SINPLACA' si es necesario.").toUpperCase(),
  color: z.string().optional().or(z.literal('')),
  ownerName: z.string().min(2, "El nombre del propietario es obligatorio."),
  ownerPhone: z.string().min(7, "Ingrese un número de teléfono válido."),
  ownerEmail: z.string().email("Ingrese un correo electrónico válido.").optional().or(z.literal('')),
  notes: z.string().optional(),
  dailyRentalCost: z.coerce.number().optional().nullable(),
  gpsMonthlyCost: z.coerce.number().optional().nullable(),
  adminMonthlyCost: z.coerce.number().optional().nullable(),
  insuranceMonthlyCost: z.coerce.number().optional().nullable(),
});

export type VehicleFormValues = z.infer<typeof vehicleFormSchema>;
