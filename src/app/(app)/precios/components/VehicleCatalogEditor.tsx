// src/app/(app)/precios/components/VehicleCatalogEditor.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useForm, FormProvider, useFieldArray, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { nanoid } from "nanoid";

import { db } from "@/lib/firebaseClient";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { VEHICLE_COLLECTION } from "@/lib/vehicle-constants";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, Save, Trash2, Settings } from "lucide-react";

import type { EngineData } from "@/lib/data/vehicle-database-types";
import { EditEngineDataDialog } from "./EditEngineDataDialog";

// Schemas...
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
const makeDocFormSchema = z.object({ make: z.string().min(1), models: z.array(modelSchema) });

type MakeDocForm = z.infer<typeof makeDocFormSchema>;

// Data Transformation...
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
  const models = rawModels.map((m: any) => {
    const gensRaw = Array.isArray(m?.generations) ? m.generations : [];
    const gens = (gensRaw.length ? gensRaw : (Array.isArray(m?.engines) ? [{ engines: m.engines }] : [])).map((g: any) => ({
      id: g?.id ?? nanoid(),
      startYear: Number.isFinite(+g.startYear) ? +g.startYear : undefined,
      endYear: Number.isFinite(+g.endYear) ? +g.endYear : undefined,
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

// Sub-component for managing generations
function GenerationBlock({ modelIdx, genIdx, removeGeneration }: { modelIdx: number; genIdx: number; removeGeneration: (index: number) => void; }) {
  const { control, watch, setValue } = useFormContext<MakeDocForm>();
  const { fields: enginesFA, append, remove } = useFieldArray({ control, name: `models.${modelIdx}.generations.${genIdx}.engines` });

  return (
    <div className="pt-4 border-t border-dashed first:border-t-0 first:pt-0">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">Rango de Años:</span>
          <Controller name={`models.${modelIdx}.generations.${genIdx}.startYear`} control={control} render={({ field }) => ( <Input placeholder="Desde" inputMode="numeric" className="h-8 w-24 bg-white" value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))} /> )} />
          <span>-</span>
          <Controller name={`models.${modelIdx}.generations.${genIdx}.endYear`} control={control} render={({ field }) => ( <Input placeholder="Hasta" inputMode="numeric" className="h-8 w-24 bg-white" value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))} /> )} />
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => append({ name: "Nuevo Motor" } as EngineData)}> <PlusCircle className="mr-2 h-4 w-4" />Motor </Button>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeGeneration(genIdx)}> <Trash2 className="h-4 w-4 text-destructive" /> </Button>
        </div>
      </div>
      <div className="pl-4 space-y-2">
        {enginesFA.map((e, ei) => (
          <div key={e.id} className="flex items-center gap-2 bg-muted/50 p-2 rounded-md">
            <Controller name={`models.${modelIdx}.generations.${genIdx}.engines.${ei}.name`} control={control} render={({ field }) => ( <Input className="h-8 flex-1 bg-white" {...field} /> )}/>
            <Button type="button" variant="secondary" size="sm" onClick={() => (control as any)._formValues.openEngineDialog(modelIdx, genIdx, ei) }> <Settings className="mr-2 h-4 w-4" /> Detalles </Button>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => remove(ei)}> <Trash2 className="h-4 w-4 text-destructive" /> </Button>
          </div>
        ))}
        {enginesFA.length === 0 && <p className="text-sm text-muted-foreground text-center py-2">No hay motores. Agrega uno.</p>}
      </div>
    </div>
  );
}


export function VehicleCatalogEditor({ make }: { make: string }) {
  const { toast } = useToast();
  const methods = useForm<MakeDocForm>({ resolver: zodResolver(makeDocFormSchema), defaultValues: { make, models: [] }, mode: "onBlur" });
  const { control, reset, handleSubmit, setValue } = methods;

  const { fields: modelsFA, append: appendModel, remove: removeModel } = useFieldArray({ control, name: "models", keyName: "k" });
  const [engineEditor, setEngineEditor] = useState<{ open: boolean; modelIdx?: number; genIdx?: number; engIdx?: number; data?: EngineData; }>({ open: false });

  useEffect(() => {
    const ref = doc(db, VEHICLE_COLLECTION, make);
    const unsub = onSnapshot(ref, (snap) => reset(toFormDoc(make, snap.data() ?? null)), (err) => console.error(`onSnapshot ${VEHICLE_COLLECTION}/${make}:`, err));
    return () => unsub();
  }, [make, reset]);

  const onSaveAll = async (form: MakeDocForm) => {
    try {
      await setDoc(doc(db, VEHICLE_COLLECTION, make), toFirestoreDoc(form), { merge: true });
      toast({ description: "Catálogo actualizado correctamente." });
    } catch (e) {
      toast({ variant: "destructive", description: "Error al guardar el catálogo." });
    }
  };

  const openEngineDialog = (modelIdx: number, genIdx: number, engIdx: number) => {
    const data = methods.getValues(`models.${modelIdx}.generations.${genIdx}.engines.${engIdx}`) || {} as EngineData;
    setEngineEditor({ open: true, modelIdx, genIdx, engIdx, data });
  };
  (methods.control as any)._formValues.openEngineDialog = openEngineDialog;

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
            <Button type="button" variant="secondary" onClick={() => appendModel({ id: nanoid(), name: "Nuevo Modelo", generations: [{ id: nanoid(), engines: [] }] })}> <PlusCircle className="mr-2 h-4 w-4" /> Añadir Modelo </Button>
            <Button type="submit"> <Save className="mr-2 h-4 w-4" /> Guardar cambios </Button>
          </div>
        </div>
        <ScrollArea className="h-[70vh] rounded-md border">
          <div className="p-4 space-y-4">
            <Accordion type="multiple" className="w-full space-y-3">
              {modelsFA.map((m, mi) => {
                const { fields: generationsFA, append: appendGeneration, remove: removeGeneration } = useFieldArray({ control, name: `models.${mi}.generations` });
                return (
                  <AccordionItem key={m.id} value={m.id} className="border-b-0 rounded-lg bg-card overflow-hidden">
                    <AccordionTrigger className="text-lg font-semibold px-4 py-3 hover:no-underline">
                      <div className="flex items-center gap-3 w-full">
                        <Controller name={`models.${mi}.name`} control={control} render={({ field }) => ( <Input {...field} className="h-8 w-full max-w-xs bg-white" onClick={(e) => e.stopPropagation()} /> )}/>
                        <Badge variant="outline">{generationsFA.length} rango(s)</Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="p-4 pt-2">
                      <div className="pl-4 border-l-2 border-slate-200 space-y-4">
                        {generationsFA.map((g, gi) => (
                          <GenerationBlock key={g.id} modelIdx={mi} genIdx={gi} removeGeneration={removeGeneration} />
                        ))}
                        <div className="flex items-center gap-2 pt-4 mt-4 border-t">
                          <Button type="button" variant="outline" onClick={() => appendGeneration({ id: nanoid(), engines: [] })}> <PlusCircle className="mr-2 h-4 w-4" /> Añadir Rango de Años </Button>
                          <Button type="button" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => removeModel(mi)}> <Trash2 className="mr-2 h-4 w-4" /> Eliminar Modelo </Button>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
            {modelsFA.length === 0 && <div className="text-center py-8 text-muted-foreground"> <p>No hay modelos para {make}.</p> <Button type="button" variant="link" onClick={() => appendModel({ id: nanoid(), name: "Nuevo Modelo", generations: [{ id: nanoid(), engines: [] }] })}>Añade el primero.</Button> </div>}
          </div>
        </ScrollArea>
      </form>
      <EditEngineDataDialog open={engineEditor.open} onOpenChange={(open) => setEngineEditor((s) => ({ ...s, open }))} engineData={engineEditor.data as EngineData} onSave={handleEngineDialogSave} />
    </FormProvider>
  );
}
