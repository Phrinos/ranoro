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
import { PlusCircle, Save, Trash2, Settings, ArrowRight } from "lucide-react";

import type { EngineData } from "@/lib/data/vehicle-database-types";
import { EditEngineDataDialog } from "./EditEngineDataDialog";
import { Label } from "@/components/ui/label";

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
  make: string;
  collectionName?: string;
}

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

function ModelEntry({
  modelIdx,
  removeModel,
  openEngineDialog,
}: {
  modelIdx: number;
  removeModel: (index: number) => void;
  openEngineDialog: (modelIdx: number, genIdx: number, engIdx: number) => void;
}) {
  const { control, watch, setValue } = useFormContext<MakeDocForm>();
  // Para simplificar según solicitud, asumimos que cada "entrada" de modelo maneja su primera generación de años directamente
  const genIdx = 0;
  const modelName = watch(`models.${modelIdx}.name`);
  const startYear = watch(`models.${modelIdx}.generations.${genIdx}.startYear`);
  const endYear = watch(`models.${modelIdx}.generations.${genIdx}.endYear`);

  const { fields: enginesFA, append, remove } = useFieldArray({ 
    control, 
    name: `models.${modelIdx}.generations.${genIdx}.engines` as any
  });

  return (
    <Card className="border bg-white shadow-sm overflow-hidden">
      <CardContent className="p-6 space-y-6">
        {/* Linea 1: Nombre, Año Desde, Año Hasta */}
        <div className="flex flex-col md:flex-row items-end gap-4">
          <div className="flex-1 space-y-2 w-full">
            <Label className="text-xs font-bold text-muted-foreground uppercase">Nombre del Modelo / Grupo</Label>
            <Input
              placeholder="Ej: VERSA / MARCH"
              value={modelName ?? ""}
              onChange={(e) => setValue(`models.${modelIdx}.name`, e.target.value.toUpperCase(), { shouldDirty: true })}
              className="h-10 font-bold bg-muted/20"
            />
          </div>
          <div className="w-full md:w-32 space-y-2">
            <Label className="text-xs font-bold text-muted-foreground uppercase">Año Desde</Label>
            <Input
              placeholder="2012"
              inputMode="numeric"
              value={startYear ?? ""}
              onChange={(e) => setValue(`models.${modelIdx}.generations.${genIdx}.startYear`, e.target.value === "" ? undefined : Number(e.target.value), { shouldDirty: true })}
              className="h-10 text-center"
            />
          </div>
          <div className="flex items-center pb-2 hidden md:flex">
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="w-full md:w-32 space-y-2">
            <Label className="text-xs font-bold text-muted-foreground uppercase">Año Hasta</Label>
            <Input
              placeholder="2019"
              inputMode="numeric"
              value={endYear ?? ""}
              onChange={(e) => setValue(`models.${modelIdx}.generations.${genIdx}.endYear`, e.target.value === "" ? undefined : Number(e.target.value), { shouldDirty: true })}
              className="h-10 text-center"
            />
          </div>
          <Button 
            type="button" 
            variant="ghost" 
            size="icon" 
            className="text-destructive h-10 w-10 shrink-0"
            onClick={() => removeModel(modelIdx)}
          >
            <Trash2 className="h-5 w-5" />
          </Button>
        </div>

        <Separator />

        {/* Motores y Configuraciones */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-bold flex items-center gap-2">
              <Settings className="h-4 w-4 text-primary" />
              Configuraciones de Motor
            </h4>
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              onClick={() => append({ name: "Nuevo motor" })}
              className="h-8 bg-white"
            >
              <PlusCircle className="mr-2 h-3 w-3" /> Añadir Motor
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {enginesFA.map((e, ei) => (
              <div key={e.id} className="flex items-center gap-2 p-2 rounded-lg border bg-muted/5 group">
                <Input
                  className="h-9 flex-1 bg-white text-sm"
                  placeholder="Ej: 1.6L 4Cil"
                  value={watch(`models.${modelIdx}.generations.${genIdx}.engines.${ei}.name`) ?? ""}
                  onChange={(ev) => setValue(`models.${modelIdx}.generations.${genIdx}.engines.${ei}.name`, ev.target.value, { shouldDirty: true })}
                />
                <Button 
                  type="button" 
                  variant="secondary" 
                  size="sm" 
                  className="h-9 px-3 gap-2"
                  onClick={() => openEngineDialog(modelIdx, genIdx, ei)}
                >
                  <Settings className="h-3 w-3" /> <span className="hidden sm:inline">Configurar</span>
                </Button>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon" 
                  className="h-9 w-9 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" 
                  onClick={() => remove(ei)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {enginesFA.length === 0 && (
              <div className="col-span-full py-4 text-center border-2 border-dashed rounded-lg bg-muted/10">
                <p className="text-xs text-muted-foreground">No hay motores configurados. Los motores agrupan los insumos compartidos.</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function VehicleCatalogEditor({ make, collectionName = VEHICLE_COLLECTION }: VehicleCatalogEditorProps) {
  const { toast } = useToast();
  const methods = useForm<MakeDocForm>({
    defaultValues: { make, models: [] },
    mode: "onBlur",
  });

  const { control, reset, handleSubmit, getValues, setValue } = methods;
  const { fields, append, remove } = useFieldArray({ control, name: "models" as any });

  const [engineEditor, setEngineEditor] = useState<{
    open: boolean;
    modelIdx?: number;
    genIdx?: number;
    engIdx?: number;
    data?: EngineData;
  }>({ open: false });

  useEffect(() => {
    const ref = doc(db, collectionName, make);
    const unsub = onSnapshot(
      ref,
      (snap) => reset(toFormDoc(make, snap.data() ?? null)),
      (err) => console.error(`onSnapshot ${collectionName}/${make}:`, err)
    );
    return () => unsub();
  }, [make, reset, collectionName]);

  const onSaveAll = async (form: MakeDocForm) => {
    try {
      const payload = stripUndefinedDeep(toFirestoreDoc(form));
      await setDoc(doc(db, collectionName, make), payload, { merge: true });
      toast({ title: "Guardado", description: "Catálogo maestro actualizado." });
    } catch (e) {
      console.error("Error saving catalog:", e);
      toast({ variant: "destructive", description: "Error al guardar el catálogo." });
    }
  };

  const openEngineDialog = (modelIdx: number, genIdx: number, engIdx: number) => {
    const data = (getValues(`models.${modelIdx}.generations.${genIdx}.engines.${engIdx}`) as any) || {};
    setEngineEditor({ open: true, modelIdx, genIdx, engIdx, data });
  };

  const handleEngineDialogSave = (updated: EngineData) => {
    const { modelIdx, genIdx, engIdx } = engineEditor;
    if (modelIdx != null && genIdx != null && engIdx != null) {
      setValue(`models.${modelIdx}.generations.${genIdx}.engines.${engIdx}`, updated as any, { shouldDirty: true });
    }
    setEngineEditor({ open: false });
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSaveAll)} className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">Modelos de {make}</h2>
          <Button type="submit" size="lg" className="bg-primary hover:bg-primary/90 shadow-lg">
            <Save className="mr-2 h-5 w-5" />
            Guardar Todo
          </Button>
        </div>

        <ScrollArea className="h-[75vh] pr-4">
          <div className="space-y-6 pb-20">
            {fields.map((model, index) => (
              <ModelEntry
                key={model.id}
                modelIdx={index}
                removeModel={remove}
                openEngineDialog={openEngineDialog}
              />
            ))}

            {/* Linea 2: Botón para añadir otro modelo */}
            <div className="flex justify-center pt-4">
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => append({ id: nanoid(), name: "", generations: [{ id: nanoid(), engines: [] }] })}
                className="w-full max-w-md border-2 border-dashed bg-white hover:bg-primary/5 hover:border-primary/50 text-primary font-bold transition-all"
              >
                <PlusCircle className="mr-2 h-5 w-5" />
                Añadir Otro Modelo o Grupo
              </Button>
            </div>

            {fields.length === 0 && (
              <div className="text-center py-20 bg-muted/5 rounded-3xl border-2 border-dashed">
                <p className="text-muted-foreground">No hay modelos registrados para {make}.</p>
                <p className="text-xs text-muted-foreground mt-1">Comienza añadiendo el primero arriba.</p>
              </div>
            )}
          </div>
        </ScrollArea>
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
