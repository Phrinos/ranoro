// src/schemas/engine-data-form-schema.ts
import { z } from "zod";
import { nanoid } from 'nanoid';

// Permite string vacío o convierte a número, con fallback a 0 si es inválido.
const numberCoercion = z.preprocess((v) => {
  if (v === "" || v === null || v === undefined) return 0; // Default a 0
  const n = Number(String(v).replace(/[^0-9.]/g, ""));
  return isNaN(n) ? 0 : n;
}, z.coerce.number().nonnegative({ message: "Debe ser un número >= 0" }));


const aceiteSchema = z.object({
  grado: z.string().nullable().optional(),
  litros: numberCoercion,
  costoUnitario: numberCoercion,
  lastUpdated: z.string().optional(),
});

const filtroSchema = z.object({
  sku: z.string().nullable().optional(),
  costoUnitario: numberCoercion,
  lastUpdated: z.string().optional(),
});

const balataInfoSchema = z.object({
  id: z.string().default(() => nanoid()),
  modelo: z.string().nullable().optional(),
  tipo: z
    .enum(["metalicas", "semimetalicas", "ceramica", "organica"])
    .nullable()
    .optional(),
  costoJuego: numberCoercion,
});

const bujiasSchema = z.object({
  cantidad: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? 0 : v),
    z.coerce.number().int().nonnegative().optional()
  ),
  modelos: z.object({
    cobre: z.string().nullable().optional(),
    platino: z.string().nullable().optional(),
    iridio: z.string().nullable().optional(),
  }),
  costoUnitario: z.object({
    cobre: numberCoercion,
    platino: numberCoercion,
    iridio: numberCoercion,
  }),
  lastUpdated: z.string().optional(),
});

const inyectorSchema = z.object({
  tipo: z.enum(["Normal", "Piezoelectrico", "GDI"]).nullable().optional(),
});

const servicioCostoSchema = z.object({
  costoInsumos: numberCoercion,
  precioPublico: numberCoercion,
});

const afinacionIntegralSchema = servicioCostoSchema.extend({
  upgrades: z.object({
    conAceiteSintetico: numberCoercion,
    conAceiteMobil: numberCoercion,
    conBujiasPlatino: numberCoercion,
    conBujiasIridio: numberCoercion,
  }).optional(),
});


export const engineDataSchema = z.object({
  name: z.string(),
  insumos: z.object({
    aceite: aceiteSchema,
    filtroAceite: filtroSchema,
    filtroAire: filtroSchema,
    balatas: z.object({
      delanteras: z.array(balataInfoSchema).optional(),
      traseras: z.array(balataInfoSchema).optional(),
      lastUpdated: z.string().optional(),
    }),
    bujias: bujiasSchema,
    inyector: inyectorSchema,
  }),
  servicios: z.object({
    afinacionIntegral: afinacionIntegralSchema,
    cambioAceite: servicioCostoSchema,
    balatasDelanteras: servicioCostoSchema,
    balatasTraseras: servicioCostoSchema,
  }),
});

export type EngineDataFormValues = z.infer<typeof engineDataSchema>;
