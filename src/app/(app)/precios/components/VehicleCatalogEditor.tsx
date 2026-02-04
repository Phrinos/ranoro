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

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, Save, Trash2, Settings, ArrowRight, Layers } from "lucide-react";

import type { EngineData } from "@/lib/data/vehicle-database-types";
import { EditEngineDataDialog } from "./EditEngineDataDialog";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const engineMiniSchema = z.object({ name: z.string().min(1, "Requerido") }).passthrough();

const generationSchema = z.object({
  id: z.string(),
  startYear: z.preprocess((v) => (v === "" || v == null ? undefined : Number(v)), z.number().int().nonnegative().optional()),
  endYear: z.preprocess((v) => (v === "" || v == null ? undefined : Number(v)), z.number().int().nonnegative().optional()),
  engines: z.array(engineMiniSchema),
});

const subModelSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Requerido"),
  startYear: z.preprocess((v) => (v === "" || v == null ? undefined : Number(v)), z.number().int().nonnegative().optional()),
  endYear: z.preprocess((v) => (v === "" || v == null ? undefined : Number(v)), z.number().int().nonnegative().optional()),
});

const modelGroupSchema = z.object({
  id: z.string(),
  models: z.array(subModelSchema),
  generations: z.array(generationSchema),
});

const makeDocFormSchema = z.object({
  make: z.string().min(1),
  groups: z.array(modelGroupSchema),
});

type MakeDocForm = z.infer<typeof makeDocFormSchema>;
type ModelGroupForm = MakeDocForm["groups"][number];

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
  
  // Group by a groupId if exists, otherwise treat each as its own group
  const groupMap = new Map<string, ModelGroupForm>();

  rawModels.forEach((m: any) => {
    const gid = m.groupId || nanoid();
    const existing = groupMap.get(gid);

    const subModel = {
      id: nanoid(),
      name: m.name || m.model || "Modelo",
      startYear: m.generations?.[0]?.startYear,
      endYear: m.generations?.[0]?.endYear,
    };

    if (existing) {
      existing.models.push(subModel);
    } else {
      const gensRaw = Array.isArray(m?.generations) ? m.generations : [];
      const gens = gensRaw.map((g: any) => ({
        id: g?.id || nanoid(),
        startYear: g.startYear,
        endYear: g.endYear,
        engines: Array.isArray(g?.engines) ? g.engines.map((e: any) => ({ ...e, name: e.name || "" })) : [],
      }));

      groupMap.set(gid, {
        id: gid,
        models: [subModel],
        generations: gens.length ? gens : [{ id: nanoid(), engines: [] }],
      });
    }
  });

  return { make, groups: Array.from(groupMap.values()) };
}

function toFirestoreDoc(form: MakeDocForm) {
  const flattenedModels: any[] = [];

  form.groups.forEach((group) => {
    group.models.forEach((m) => {
      flattenedModels.push({
        groupId: group.id,
        name: m.name,
        generations: group.generations.map((g) => ({
          startYear: m.startYear || g.startYear,
          endYear: m.endYear || g.endYear,
          engines: g.engines.map((e) => stripUndefinedDeep(e)),
        })),
      });
    });
  });

  return { models: flattenedModels };
}

function GroupEntry({
  groupIdx,
  removeGroup,
  openEngineDialog,
}: {
  groupIdx: number;
  removeGroup: (index: number) => void;
  openEngineDialog: (groupIdx: number, genIdx: number, engIdx: number) => void;
}) {
  const { control, watch, setValue } = useFormContext<MakeDocForm>();
  const genIdx = 0; // Standardizing on first generation for common edits

  const { fields: modelsFA, append: appendModel, remove: removeModel } = useFieldArray({
    control,
    name: `groups.${groupIdx}.models` as any,
  });

  const { fields: enginesFA, append: appendEngine, remove: removeEngine } = useFieldArray({
    control,
    name: `groups.${groupIdx}.generations.${genIdx}.engines` as any,
  });

  return (
    <Card className="border bg-white shadow-sm overflow-hidden mb-6">
      <CardContent className="p-6 space-y-6">
        {/* Header: Label for Group */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-primary font-bold">
            <Layers className="h-5 w-5" />
            <span>Grupo Técnico #{groupIdx + 1}</span>
          </div>
          <Button 
            type="button" 
            variant="ghost" 
            size="icon" 
            className="text-destructive h-8 w-8"
            onClick={() => removeGroup(groupIdx)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Section 1: Models in this technical group */}
        <div className="space-y-4">
          <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
            Vehículos que comparten piezas
          </Label>
          
          <div className="space-y-3">
            {modelsFA.map((m, mi) => (
              <div key={m.id} className="flex flex-col md:flex-row items-end gap-3 group/row">
                <div className="flex-1 space-y-1 w-full">
                  <Label className="text-[10px] text-muted-foreground uppercase">Nombre del Modelo</Label>
                  <Input
                    placeholder="Ej: VERSA"
                    value={watch(`groups.${groupIdx}.models.${mi}.name`) ?? ""}
                    onChange={(e) => setValue(`groups.${groupIdx}.models.${mi}.name`, e.target.value.toUpperCase(), { shouldDirty: true })}
                    className="h-9 font-bold bg-muted/10"
                  />
                </div>
                <div className="w-full md:w-24 space-y-1">
                  <Label className="text-[10px] text-muted-foreground uppercase">Desde</Label>
                  <Input
                    placeholder="2012"
                    inputMode="numeric"
                    value={watch(`groups.${groupIdx}.models.${mi}.startYear`) ?? ""}
                    onChange={(e) => setValue(`groups.${groupIdx}.models.${mi}.startYear`, e.target.value === "" ? undefined : Number(e.target.value), { shouldDirty: true })}
                    className="h-9 text-center"
                  />
                </div>
                <div className="w-full md:w-24 space-y-1">
                  <Label className="text-[10px] text-muted-foreground uppercase">Hasta</Label>
                  <Input
                    placeholder="2019"
                    inputMode="numeric"
                    value={watch(`groups.${groupIdx}.models.${mi}.endYear`) ?? ""}
                    onChange={(e) => setValue(`groups.${groupIdx}.models.${mi}.endYear`, e.target.value === "" ? undefined : Number(e.target.value), { shouldDirty: true })}
                    className="h-9 text-center"
                  />
                </div>
                {modelsFA.length > 1 && (
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon" 
                    className="text-destructive h-9 w-9 shrink-0 opacity-0 group-hover/row:opacity-100 transition-opacity"
                    onClick={() => removeModel(mi)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          <Button 
            type="button" 
            variant="outline" 
            size="sm" 
            onClick={() => appendModel({ id: nanoid(), name: "", startYear: undefined, endYear: undefined })}
            className="mt-2 h-8 border-dashed bg-muted/5 hover:bg-primary/5 text-primary text-xs font-bold"
          >
            <PlusCircle className="mr-2 h-3 w-3" /> Añadir otro modelo a este grupo
          </Button>
        </div>

        <Separator />

        {/* Section 2: Engines shared by above models */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-bold flex items-center gap-2">
              <Settings className="h-4 w-4 text-primary" />
              Motores y Configuraciones Compartidas
            </h4>
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              onClick={() => appendEngine({ name: "Nuevo motor" })}
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
                  value={watch(`groups.${groupIdx}.generations.${genIdx}.engines.${ei}.name`) ?? ""}
                  onChange={(ev) => setValue(`groups.${groupIdx}.generations.${genIdx}.engines.${ei}.name`, ev.target.value, { shouldDirty: true })}
                />
                <Button 
                  type="button" 
                  variant="secondary" 
                  size="sm" 
                  className="h-9 px-3 gap-2"
                  onClick={() => openEngineDialog(groupIdx, genIdx, ei)}
                >
                  <Settings className="h-3 w-3" /> <span className="hidden sm:inline">Configurar</span>
                </Button>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon" 
                  className="h-9 w-9 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" 
                  onClick={() => removeEngine(ei)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {enginesFA.length === 0 && (
              <div className="col-span-full py-4 text-center border-2 border-dashed rounded-lg bg-muted/10">
                <p className="text-xs text-muted-foreground">Configura al menos un motor para asociar insumos y precios.</p>
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
    defaultValues: { make, groups: [] },
    mode: "onBlur",
  });

  const { control, reset, handleSubmit, getValues, setValue } = methods;
  const { fields, append, remove } = useFieldArray({ control, name: "groups" as any });

  const [engineEditor, setEngineEditor] = useState<{
    open: boolean;
    groupIdx?: number;
    genIdx?: number;
    engIdx?: number;
    data?: EngineData;
  }>({ open: false });

  useEffect(() => {
    const ref = doc(db, collectionName, make);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          reset(toFormDoc(make, snap.data()));
        } else {
          reset({ make, groups: [] });
        }
      },
      (err) => console.error(`onSnapshot ${collectionName}/${make}:`, err)
    );
    return () => unsub();
  }, [make, reset, collectionName]);

  const onSaveAll = async (form: MakeDocForm) => {
    try {
      const payload = stripUndefinedDeep(toFirestoreDoc(form));
      await setDoc(doc(db, collectionName, make), payload, { merge: true });
      toast({ title: "Guardado", description: "Catálogo maestro actualizado con éxito." });
    } catch (e) {
      console.error("Error saving catalog:", e);
      toast({ variant: "destructive", description: "Ocurrió un error al guardar el catálogo." });
    }
  };

  const openEngineDialog = (groupIdx: number, genIdx: number, engIdx: number) => {
    const data = (getValues(`groups.${groupIdx}.generations.${genIdx}.engines.${engIdx}`) as any) || {};
    setEngineEditor({ open: true, groupIdx, genIdx, engIdx, data });
  };

  const handleEngineDialogSave = (updated: EngineData) => {
    const { groupIdx, genIdx, engIdx } = engineEditor;
    if (groupIdx != null && genIdx != null && engIdx != null) {
      setValue(`groups.${groupIdx}.generations.${genIdx}.engines.${engIdx}`, updated as any, { shouldDirty: true });
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
          <div className="space-y-2 pb-20">
            {fields.map((group, index) => (
              <GroupEntry
                key={group.id}
                groupIdx={index}
                removeGroup={remove}
                openEngineDialog={openEngineDialog}
              />
            ))}

            <div className="flex justify-center pt-4">
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => append({ 
                  id: nanoid(), 
                  models: [{ id: nanoid(), name: "", startYear: undefined, endYear: undefined }], 
                  generations: [{ id: nanoid(), engines: [] }] 
                })}
                className="w-full max-w-md border-2 border-dashed bg-white hover:bg-primary/5 hover:border-primary/50 text-primary font-bold transition-all"
              >
                <PlusCircle className="mr-2 h-5 w-5" />
                Nueva Tarjeta de Grupo / Modelo
              </Button>
            </div>

            {fields.length === 0 && (
              <div className="text-center py-20 bg-muted/5 rounded-3xl border-2 border-dashed">
                <p className="text-muted-foreground">Comienza añadiendo un grupo técnico o modelo para {make}.</p>
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
