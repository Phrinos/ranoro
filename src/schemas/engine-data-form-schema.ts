// src/schemas/engine-data-form-schema.ts
import { z } from "zod";

// Permite 0 (no negativo) y valores opcionales
const numberCoercion = z.preprocess((v) => {
  if (v === "" || v === null || v === undefined) return undefined;
  const n = Number(String(v).replace(/[^0-9.-]/g, ""));
  return isNaN(n) ? undefined : n;
}, z.coerce.number().nonnegative({ message: "Debe ser un número >= 0" }).optional());

const aceiteSchema = z.object({
  grado: z.string().nullable().optional(),
  litros: numberCoercion,
  costoUnitario: numberCoercion,
});

const filtroSchema = z.object({
  sku: z.string().nullable().optional(),
  costoUnitario: numberCoercion,
});

const balataInfoSchema = z.object({
  modelo: z.string().nullable().optional(),
  tipo: z
    .enum(["metalicas", "semimetalicas", "ceramica", "organica"])
    .nullable()
    .optional(),
  costoJuego: numberCoercion,
});

const bujiasSchema = z.object({
  cantidad: z.preprocess(
    (v) => (v === "" || v === null ? undefined : v),
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
});

const inyectorSchema = z.object({
  tipo: z.enum(["Normal", "Piezoelectrico", "GDI"]).nullable().optional(),
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
