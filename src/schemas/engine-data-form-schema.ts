// src/schemas/engine-data-form-schema.ts
import { z } from 'zod';

const numberCoercion = z.preprocess(v => {
    if (v === "" || v === null || v === undefined) return undefined;
    const n = Number(String(v).replace(/[^0-9.-]/g, ''));
    return isNaN(n) ? undefined : n;
}, z.coerce.number().positive({ message: "Debe ser un número positivo" }).optional());

const aceiteSchema = z.object({
  grado: z.string().nullable(),
  litros: numberCoercion,
  costoUnitario: numberCoercion,
});

const filtroSchema = z.object({
  sku: z.string().nullable(),
  costoUnitario: numberCoercion,
});

const balataInfoSchema = z.object({
  modelo: z.string().nullable(),
  tipo: z.enum(['metalicas', 'semimetalicas', 'ceramica', 'organica']).nullable(),
  costoJuego: numberCoercion,
});

const bujiasSchema = z.object({
  cantidad: z.preprocess(v => (v === "" || v === null ? undefined : v), z.coerce.number().int().positive().optional()),
  modelos: z.object({
    cobre: z.string().nullable(),
    platino: z.string().nullable(),
    iridio: z.string().nullable(),
  }),
  costoUnitario: z.object({
    cobre: numberCoercion,
    platino: numberCoercion,
    iridio: numberCoercion,
  }),
});

const inyectorSchema = z.object({
  tipo: z.enum(['Normal', 'Piezoelectrico', 'GDI']).nullable(),
});

const servicioCostoSchema = z.object({
  costoInsumos: numberCoercion,
  precioPublico: numberCoercion,
});

export const engineDataSchema = z.object({
  name: z.string(),
  insumos: z.object({
    aceite: aceiteSchema,
    filtroAceite: filtroSchema,
    filtroAire: filtroSchema,
    balatas: z.object({
      delanteras: balataInfoSchema,
      traseras: balataInfoSchema,
    }),
    bujias: bujiasSchema,
    inyector: inyectorSchema,
  }),
  servicios: z.object({
    afinacionIntegral: servicioCostoSchema,
    cambioAceite: servicioCostoSchema,
    balatasDelanteras: servicioCostoSchema,
    balatasTraseras: servicioCostoSchema,
  }),
});

export type EngineDataFormValues = z.infer<typeof engineDataSchema>;