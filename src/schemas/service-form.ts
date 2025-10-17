import { z } from 'zod';

const serviceItemSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'El nombre del trabajo es obligatorio.'),
  sellingPrice: z.coerce.number().min(0, 'El precio debe ser un número positivo.'),
  isNew: z.boolean().optional(),
  suppliesUsed: z.array(z.object({
    supplyId: z.string(),
    supplyName: z.string(),
    quantity: z.number(),
    unitCost: z.number(),
    unitType: z.string().optional(),
  })).optional(),
});

const photoReportSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  photos: z.array(z.string()),
});

export const serviceFormSchema = z.object({
  id: z.string().optional(),
  publicId: z.string().optional(),
  status: z.enum(["Cotizacion", "Agendado", "En Taller", "Entregado", "Cancelado", "Proveedor Externo"]).default("Cotizacion"),
  serviceDate: z.date(),
  customerName: z.string().min(1, "El nombre del cliente es obligatorio."),
  serviceAdvisorId: z.string().optional().default(""),
  serviceAdvisorName: z.string().optional().default(""),
  serviceAdvisorSignatureDataUrl: z.string().nullable().optional(),
  technicianId: z.string().optional().default(""),
  technicianName: z.string().optional().default(""),
  technicianSignatureDataUrl: z.string().nullable().optional(),
  vehicleId: z.string().min(1, "Debe seleccionar un vehículo."),
  mileage: z.coerce.number().optional(),
  customerComplaints: z.string().optional(),
  recommendations: z.string().optional(),
  serviceItems: z.array(serviceItemSchema).default([]),
  notes: z.string().optional(),
  totalCost: z.coerce.number().optional(),
  customerSignatureReception: z.string().optional(),
  photoReports: z.array(photoReportSchema).optional(),
}).passthrough().superRefine((data, ctx) => {
    if (data.status === 'Entregado') {
      const totalPaid = (data.payments ?? []).reduce((sum, p) => sum + (p.amount ?? 0), 0);
      const totalCost = data.totalCost || (data.serviceItems ?? []).reduce((sum, item) => sum + (item.sellingPrice ?? 0), 0);
      if (Math.abs(totalPaid - totalCost) > 0.01) {
          ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "El monto pagado no coincide con el total. Registre los pagos antes de completar.",
              path: ["payments"],
          });
      }
    }
});


type _ServiceFormValuesRaw = z.infer<typeof serviceFormSchema>;

type WithoutIndexSignature<T> = {
  [K in keyof T as string extends K
    ? never
    : number extends K
      ? never
      : symbol extends K
        ? never
        : K]: T[K]
};

export type ServiceFormValues = WithoutIndexSignature<_ServiceFormValuesRaw>;
export type ServiceItem = z.infer<typeof serviceItemSchema>;
export type PhotoReport = z.infer<typeof photoReportSchema>;
