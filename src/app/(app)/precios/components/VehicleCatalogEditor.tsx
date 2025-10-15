// src/app/(app)/precios/components/VehicleCatalogEditor.tsx
"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useForm, FormProvider, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { nanoid } from "nanoid";

import { db } from "@/lib/firebaseClient";
import { doc, onSnapshot, setDoc, getDoc } from "firebase/firestore";
import { VEHICLE_COLLECTION } from "@/lib/vehicle-constants";

import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
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
   Tipos y Schema del formulario
   ============================ */

const engineMiniSchema = z.object({
  name: z.string().min(1, "Requerido"),
}).passthrough();

const generationSchema = z.object({
  id: z.string(),
  years: z.object({
    from: z.preprocess((v) => (v === "" || v == null ? undefined : Number(v)), z.number().int().nonnegative().optional()),
    to: z.preprocess((v) => (v === "" || v == null ? undefined : Number(v)), z.number().int().nonnegative().optional()),
  }).partial().optional(),
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

/* ============================
   Normalización de datos
   ============================ */

function toFormDoc(make: string, data: any | null): MakeDocForm {
  const rawModels = Array.isArray(data?.models) ? data!.models : [];

  const models: ModelForm[] = rawModels.map((m: any) => {
    const gensRaw = Array.isArray(m?.generations) ? m.generations : [];

    const gens: GenerationForm[] = (
      gensRaw.length
        ? gensRaw
        : (Array.isArray(m?.engines) ? [{ engines: m.engines }] : [])
    ).map((g: any) => ({
      id: g?.id ?? nanoid(),
      years: g?.years
        ? {
            from: Number.isFinite(+g.years.from) ? +g.years.from : undefined,
            to: Number.isFinite(+g.years.to) ? +g.years.to : undefined,
          }
        : undefined,
      engines: Array.isArray(g?.engines)
        ? g.engines.map((e: any) => ({ name: e?.name ?? "", ...e }))
        : [],
    }));

    return {
      id: m?.id ?? nanoid(),
      name: m?.name ?? m?.model ?? "Modelo",
      generations: gens,
    };
  });

  return { make, models };
}


function toFirestoreDoc(form: MakeDocForm) {
  return {
    models: form.models.map((m) => ({
      name: m.name,
      generations: m.generations.map((g) => ({
        years: g.years && (g.years.from || g.years.to) ? g.years : undefined,
        engines: g.engines.map((e) => stripUndefinedDeep(e)),
      })),
    })),
  };
}

/* ============================
   Componente principal
   ============================ */

interface VehicleCatalogEditorProps {
  make: string;
}

export function VehicleCatalogEditor({ make }: VehicleCatalogEditorProps) {
  const { toast } = useToast();
  const methods = useForm<MakeDocForm>({
    resolver: zodResolver(makeDocFormSchema),
    defaultValues: { make, models: [] },
    mode: "onBlur",
  });

  const { control, reset, handleSubmit, getValues, setValue, watch } = methods;

  const modelsFA = useFieldArray({ control, name: "models", keyName: "k" });

  const [engineEditor, setEngineEditor] = useState<{
    open: boolean;
    modelIdx?: number;
    genIdx?: number;
    engIdx?: number;
    data?: EngineData;
  }>({ open: false });

  useEffect(() => {
    const ref = doc(db, VEHICLE_COLLECTION, make);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        const data = snap.exists() ? snap.data() : null;
        reset(toFormDoc(make, data));
      },
      (err) => {
        console.error(`onSnapshot ${VEHICLE_COLLECTION}/${make}:`, err);
      }
    );
    return () => unsub();
  }, [make, reset]);

  const onSaveAll = async (form: MakeDocForm) => {
    try {
      const payload = toFirestoreDoc(form);
      await setDoc(doc(db, VEHICLE_COLLECTION, make), stripUndefinedDeep(payload), {
        merge: true,
      });
      toast({ description: "Catálogo actualizado correctamente." });
    } catch (e) {
      console.error("Error saving catalog:", e);
      toast({ variant: "destructive", description: "Error al guardar el catálogo." });
    }
  };

  const addModel = () => {
    modelsFA.append({
      id: nanoid(),
      name: "Nuevo modelo",
      generations: [{ id: nanoid(), years: undefined, engines: [] }],
    });
  };
  const removeModel = (i: number) => modelsFA.remove(i);

  const appendGeneration = (modelIdx: number) => {
    const gens = [...(getValues(`models.${modelIdx}.generations`) || [])];
    gens.push({ id: nanoid(), years: undefined, engines: [] });
    setValue(`models.${modelIdx}.generations`, gens, { shouldDirty: true });
  };
  const removeGeneration = (modelIdx: number, genIdx: number) => {
    const gens = [...(getValues(`models.${modelIdx}.generations`) || [])];
    gens.splice(genIdx, 1);
    setValue(`models.${modelIdx}.generations`, gens, { shouldDirty: true });
  };

  const appendEngine = (modelIdx: number, genIdx: number) => {
    const engines = [
      ...(getValues(`models.${modelIdx}.generations.${genIdx}.engines`) || []),
    ];
    engines.push({ name: "Nuevo motor" } as EngineData);
    setValue(
      `models.${modelIdx}.generations.${genIdx}.engines`,
      engines,
      { shouldDirty: true }
    );
  };

  const removeEngine = (modelIdx: number, genIdx: number, engIdx: number) => {
    const engines = [
      ...(getValues(`models.${modelIdx}.generations.${genIdx}.engines`) || []),
    ];
    engines.splice(engIdx, 1);
    setValue(
      `models.${modelIdx}.generations.${genIdx}.engines`,
      engines,
      { shouldDirty: true }
    );
  };

  const openEngineDialog = (
    modelIdx: number,
    genIdx: number,
    engIdx: number
  ) => {
    const data =
      getValues(
        `models.${modelIdx}.generations.${genIdx}.engines.${engIdx}`
      ) || ({} as EngineData);
    setEngineEditor({ open: true, modelIdx, genIdx, engIdx, data });
  };

  const handleEngineDialogSave = (updated: EngineData) => {
    if (
      engineEditor.modelIdx == null ||
      engineEditor.genIdx == null ||
      engineEditor.engIdx == null
    )
      return;
    setValue(
      `models.${engineEditor.modelIdx}.generations.${engineEditor.genIdx}.engines.${engineEditor.engIdx}`,
      updated,
      { shouldDirty: true }
    );
    setEngineEditor({ open: false });
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSaveAll)} className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Modelos de {make}</h2>
          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" onClick={addModel}>
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
              {modelsFA.fields.map((m, mi) => {
                const gens = watch(`models.${mi}.generations`) || [];
                return (
                  <AccordionItem key={m.k} value={m.id}>
                    <AccordionTrigger className="text-lg font-semibold">
                      <div className="flex items-center gap-3">
                        <Input
                          value={watch(`models.${mi}.name`) ?? ""}
                          onChange={(e) =>
                            setValue(`models.${mi}.name`, e.target.value, { shouldDirty: true })
                          }
                          className="h-8 w-[280px]"
                        />
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="pl-4 border-l space-y-4">
                        {gens.map((g: GenerationForm, gi: number) => {
                          const engines =
                            watch(`models.${mi}.generations.${gi}.engines`) || [];
                          const from = watch(
                            `models.${mi}.generations.${gi}.years.from`
                          );
                          const to = watch(
                            `models.${mi}.generations.${gi}.years.to`
                          );
                          return (
                            <Card key={g.id}>
                              <CardContent className="pt-4 space-y-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <span className="font-semibold">
                                      Años:
                                    </span>
                                    <div className="flex items-center gap-2">
                                      <Input
                                        placeholder="Desde"
                                        inputMode="numeric"
                                        className="h-8 w-[120px]"
                                        value={from ?? ""}
                                        onChange={(e) =>
                                          setValue(
                                            `models.${mi}.generations.${gi}.years.from`,
                                            e.target.value === "" ? undefined : Number(e.target.value),
                                            { shouldDirty: true }
                                          )
                                        }
                                      />
                                      <span className="text-muted-foreground">-</span>
                                      <Input
                                        placeholder="Hasta"
                                        inputMode="numeric"
                                        className="h-8 w-[120px]"
                                        value={to ?? ""}
                                        onChange={(e) =>
                                          setValue(
                                            `models.${mi}.generations.${gi}.years.to`,
                                            e.target.value === "" ? undefined : Number(e.target.value),
                                            { shouldDirty: true }
                                          )
                                        }
                                      />
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => appendEngine(mi, gi)}
                                    >
                                      <PlusCircle className="mr-2 h-4 w-4" />
                                      Añadir motor
                                    </Button>
                                    {gens.length > 1 && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => removeGeneration(mi, gi)}
                                    >
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                    )}
                                  </div>
                                </div>

                                {/* Lista de motores */}
                                <ul className="list-disc pl-6 space-y-2">
                                  {engines.map((e: EngineData, ei: number) => (
                                    <li key={`${g.id}-${ei}`} className="flex items-center gap-3">
                                      <Input
                                        className="h-8 w-[260px]"
                                        value={e?.name ?? ""}
                                        onChange={(ev) =>
                                          setValue(
                                            `models.${mi}.generations.${gi}.engines.${ei}.name`,
                                            ev.target.value,
                                            { shouldDirty: true }
                                          )
                                        }
                                      />
                                      <Button
                                        type="button"
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => openEngineDialog(mi, gi, ei)}
                                      >
                                        <Settings className="mr-2 h-4 w-4" />
                                        Detalles
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeEngine(mi, gi, ei)}
                                      >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                      </Button>
                                    </li>
                                  ))}
                                  {engines.length === 0 && (
                                    <li className="text-sm text-muted-foreground">
                                      No hay motores. Agrega uno.
                                    </li>
                                  )}
                                </ul>
                              </CardContent>
                            </Card>
                          );
                        })}

                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => appendGeneration(mi)}
                          >
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Añadir Rango de Años
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => removeModel(mi)}
                          >
                            <Trash2 className="mr-2 h-4 w-4 text-destructive" />
                            Eliminar modelo
                          </Button>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </div>
        </ScrollArea>

        <div className="flex items-center justify-end gap-2">
          <Button type="submit">
            <Save className="mr-2 h-4 w-4" />
            Guardar cambios
          </Button>
        </div>
      </form>

      <EditEngineDataDialog
        open={engineEditor.open}
        onOpenChange={(open) => setEngineEditor((s) => ({ ...s, open }))}
        engineData={(engineEditor.data as EngineData) || ({ name: "" } as EngineData)}
        onSave={handleEngineDialogSave}
      />
    </FormProvider>
  );
}
