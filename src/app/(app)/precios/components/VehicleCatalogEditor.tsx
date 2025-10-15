// src/app/(app)/precios/components/VehicleCatalogEditor.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useForm, FormProvider, useFieldArray, useFormContext } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { nanoid } from "nanoid";

import { db } from "@/lib/firebaseClient";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { VEHICLE_COLLECTION } from "@/lib/vehicle-constants";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, Save, Trash2, Settings } from "lucide-react";

import type { EngineData } from "@/lib/data/vehicle-database-types";
import { EditEngineDataDialog } from "./EditEngineDataDialog";

/* ============================
   Schemas
   ============================ */
const engineMiniSchema = z.object({ name: z.string().min(1, "Requerido") }).passthrough();

const generationSchema = z.object({
  id: z.string(),
  startYear: z.preprocess((v) => (v === "" || v == null ? undefined : Number(v)), z.number().int().nonnegative().optional()),
  endYear: z.preprocess((v) => (v === "" || v == null ? undefined : Number(v)), z.number().int().nonnegative().optional()),
  engines: z.array(engineMiniSchema),
});

const modelSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Requerido"),
  generations: z.array(generationSchema),
});

const makeDocFormSchema = z.object({
  make: z.string().min(1),
  models: z.array(modelSchema),
});

type MakeDocForm = z.infer<typeof makeDocFormSchema>;
type ModelForm = MakeDocForm["models"][number];
type GenerationForm = ModelForm["generations"][number];

export interface VehicleCatalogEditorProps {
  make: string; // id del doc en vehicleData
}

/* ============================
   Utils
   ============================ */
const stripUndefinedDeep = (v: any): any => {
  if (Array.isArray(v)) return v.map(stripUndefinedDeep).filter((x) => x !== undefined);
  if (v && typeof v === "object") {
    const out: any = {};
    for (const [k, val] of Object.entries(v)) {
      const cleaned = stripUndefinedDeep(val);
      if (cleaned !== undefined) out[k] = cleaned;
    }
    return out;
  }
  return v === undefined ? undefined : v;
};

function toFormDoc(make: string, data: any | null): MakeDocForm {
  const rawModels = Array.isArray(data?.models) ? data!.models : [];
  const models: ModelForm[] = rawModels.map((m: any) => {
    const gensRaw = Array.isArray(m?.generations) ? m.generations : [];
    const gens: GenerationForm[] = (
      gensRaw.length ? gensRaw : (Array.isArray(m?.engines) ? [{ engines: m.engines }] : [])
    ).map((g: any) => ({
      id: g?.id ?? nanoid(),
      startYear: Number.isFinite(+g?.startYear) ? +g.startYear : undefined,
      endYear: Number.isFinite(+g?.endYear) ? +g.endYear : undefined,
      engines: Array.isArray(g?.engines) ? g.engines.map((e: any) => ({ name: e?.name ?? "", ...e })) : [],
    }));
    return { id: m?.id ?? nanoid(), name: m?.name ?? m?.model ?? "Modelo", generations: gens };
  });
  return { make, models };
}

function toFirestoreDoc(form: MakeDocForm) {
  return {
    models: form.models.map((m) => ({
      name: m.name,
      generations: m.generations.map((g) => ({
        startYear: g.startYear,
        endYear: g.endYear,
        engines: g.engines.map((e) => stripUndefinedDeep(e)),
      })),
    })),
  };
}

/* ============================
   Subcomponentes
   ============================ */

// Componente para un solo modelo en el acordeón
function ModelAccordionItem({
  model,
  modelIdx,
  removeModel,
  openEngineDialog,
}: {
  model: ModelForm;
  modelIdx: number;
  removeModel: (index: number) => void;
  openEngineDialog: (modelIdx: number, genIdx: number, engIdx: number) => void;
}) {
    const { control, watch, setValue } = useFormContext<MakeDocForm>();
    const { fields, append, remove } = useFieldArray({ control, name: `models.${modelIdx}.generations` });
    const modelName = watch(`models.${modelIdx}.name`);

    return (
        <AccordionItem key={model.id} value={model.id} className="border-b-0 rounded-lg bg-card overflow-hidden">
        <AccordionTrigger className="text-lg font-semibold px-4 py-3 hover:no-underline">
            <div className="flex items-center gap-3 w-full">
            <Input
                value={modelName ?? ""}
                onChange={(e) => setValue(`models.${modelIdx}.name`, e.target.value, { shouldDirty: true })}
                className="h-8 w-full max-w-xs bg-white"
                onClick={(e) => e.stopPropagation()}
            />
            <Badge variant="outline">{fields.length} gen.</Badge>
            </div>
        </AccordionTrigger>
        <AccordionContent className="p-4 pt-2">
            <div className="space-y-4">
            {fields.map((generation, genIdx) => (
                <GenerationBlock
                key={generation.id}
                modelIdx={modelIdx}
                genIdx={genIdx}
                removeGeneration={remove}
                openEngineDialog={openEngineDialog}
                />
            ))}
            <div className="flex items-center gap-2 pt-4 mt-4 border-t">
                <Button type="button" variant="outline" onClick={() => append({ id: nanoid(), engines: [] })}>
                <PlusCircle className="mr-2 h-4 w-4" /> Añadir Rango de Años
                </Button>
                <Button type="button" variant="ghost" onClick={() => removeModel(modelIdx)}>
                <Trash2 className="mr-2 h-4 w-4 text-destructive" /> Eliminar Modelo
                </Button>
            </div>
            </div>
        </AccordionContent>
        </AccordionItem>
    );
}

// Generación (rango de años)
function GenerationBlock({
  modelIdx,
  genIdx,
  removeGeneration,
  openEngineDialog,
}: {
  modelIdx: number;
  genIdx: number;
  removeGeneration: (index: number) => void;
  openEngineDialog: (modelIdx: number, genIdx: number, engIdx: number) => void;
}) {
  const { control, setValue, watch } = useFormContext<MakeDocForm>();
  const { fields: enginesFA, append, remove } = useFieldArray({ control, name: `models.${modelIdx}.generations.${genIdx}.engines` });

  const startYear = watch(`models.${modelIdx}.generations.${genIdx}.startYear`);
  const endYear = watch(`models.${modelIdx}.generations.${genIdx}.endYear`);

  return (
    <div className="space-y-3 border-l-2 pl-4 ml-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-sm">
            Rango: {startYear || endYear ? `${startYear ?? "?"} - ${endYear ?? "?"}` : "Generación"}
          </span>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Desde (año)"
              inputMode="numeric"
              className="h-8 w-[120px] bg-white"
              value={startYear ?? ""}
              onChange={(e) =>
                setValue(
                  `models.${modelIdx}.generations.${genIdx}.startYear`,
                  e.target.value === "" ? undefined : Number(e.target.value),
                  { shouldDirty: true }
                )
              }
            />
            <Input
              placeholder="Hasta (año)"
              inputMode="numeric"
              className="h-8 w-[120px] bg-white"
              value={endYear ?? ""}
              onChange={(e) =>
                setValue(
                  `models.${modelIdx}.generations.${genIdx}.endYear`,
                  e.target.value === "" ? undefined : Number(e.target.value),
                  { shouldDirty: true }
                )
              }
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => append({ name: "Nuevo motor" })}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Añadir motor
          </Button>
          <Button type="button" variant="ghost" size="icon" onClick={() => removeGeneration(genIdx)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>

      <ul className="list-disc pl-6 space-y-2">
        {enginesFA.map((e, ei) => (
          <li key={e.id} className="flex items-center gap-3">
            <Input
              className="h-8 w-[260px] bg-white"
              value={watch(`models.${modelIdx}.generations.${genIdx}.engines.${ei}.name`) ?? ""}
              onChange={(ev) =>
                setValue(`models.${modelIdx}.generations.${genIdx}.engines.${ei}.name`, ev.target.value, { shouldDirty: true })
              }
            />
            <Button type="button" variant="secondary" size="sm" onClick={() => openEngineDialog(modelIdx, genIdx, ei)}>
              <Settings className="mr-2 h-4 w-4" /> Detalles
            </Button>
            <Button type="button" variant="ghost" size="icon" onClick={() => remove(ei)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </li>
        ))}
        {enginesFA.length === 0 && <li className="text-sm text-muted-foreground">No hay motores. Agrega uno.</li>}
      </ul>
      <Separator />
    </div>
  );
}

/* ============================
   Editor principal
   ============================ */
export function VehicleCatalogEditor({ make }: VehicleCatalogEditorProps) {
  const { toast } = useToast();
  const methods = useForm<MakeDocForm>({
    defaultValues: { make, models: [] },
    mode: "onBlur",
  });

  const { control, reset, handleSubmit, getValues, setValue } = methods;
  const { fields, append, remove } = useFieldArray({ control, name: "models", keyName: "k" });

  const [engineEditor, setEngineEditor] = useState<{
    open: boolean;
    modelIdx?: number;
    genIdx?: number;
    engIdx?: number;
    data?: EngineData;
  }>({ open: false });

  // Live data
  useEffect(() => {
    const ref = doc(db, VEHICLE_COLLECTION, make);
    const unsub = onSnapshot(
      ref,
      (snap) => reset(toFormDoc(make, snap.data() ?? null)),
      (err) => console.error(`onSnapshot ${VEHICLE_COLLECTION}/${make}:`, err)
    );
    return () => unsub();
  }, [make, reset]);

  const onSaveAll = async (form: MakeDocForm) => {
    try {
      const payload = stripUndefinedDeep(toFirestoreDoc(form));
      await setDoc(doc(db, VEHICLE_COLLECTION, make), payload, { merge: true });
      toast({ description: "Catálogo actualizado correctamente." });
    } catch (e) {
      console.error("Error saving catalog:", e);
      toast({ variant: "destructive", description: "Error al guardar el catálogo." });
    }
  };

  const openEngineDialog = (modelIdx: number, genIdx: number, engIdx: number) => {
    const data = (getValues(`models.${modelIdx}.generations.${genIdx}.engines.${engIdx}`) || {}) as EngineData;
    setEngineEditor({ open: true, modelIdx, genIdx, engIdx, data });
  };

  const handleEngineDialogSave = (updated: EngineData) => {
    const { modelIdx, genIdx, engIdx } = engineEditor;
    if (modelIdx != null && genIdx != null && engIdx != null) {
      setValue(`models.${modelIdx}.generations.${genIdx}.engines.${engIdx}`, updated, { shouldDirty: true });
    }
    setEngineEditor({ open: false });
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSaveAll)} className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Modelos de {make}</h2>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => append({ id: nanoid(), name: "Nuevo modelo", generations: [{ id: nanoid(), engines: [] }] })}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Añadir Modelo
            </Button>
            <Button type="submit">
              <Save className="mr-2 h-4 w-4" />
              Guardar cambios
            </Button>
          </div>
        </div>

        <ScrollArea className="h-[70vh] rounded-md border">
          <div className="p-4 space-y-4">
            <Accordion type="multiple" className="w-full space-y-3">
              {fields.map((model, index) => (
                <ModelAccordionItem
                  key={model.k}
                  model={model}
                  modelIdx={index}
                  removeModel={remove}
                  openEngineDialog={openEngineDialog}
                />
              ))}
            </Accordion>

            {fields.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p>No hay modelos para {make}.</p>
                <Button
                  type="button"
                  variant="link"
                  onClick={() => append({ id: nanoid(), name: "Nuevo modelo", generations: [{ id: nanoid(), engines: [] }] })}
                >
                  Añade el primero.
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>
      </form>

      {/* Modal de edición de motor */}
      <EditEngineDataDialog
        open={engineEditor.open}
        onOpenChange={(open) => setEngineEditor((s) => ({ ...s, open }))}
        engineData={(engineEditor.data as EngineData) || ({ name: "" } as EngineData)}
        onSave={handleEngineDialogSave}
      />
    </FormProvider>
  );
}
