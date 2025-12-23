// src/app/(app)/precios/components/EditEngineDataDialog.tsx
"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useForm, FormProvider, useFieldArray, Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { engineDataSchema, type EngineDataFormValues } from "@/schemas/engine-data-form-schema";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Loader2, Save, PlusCircle, Trash2 } from "lucide-react";
import type { EngineData } from "@/lib/data/vehicle-database-types";
import { capitalizeWords } from "@/lib/utils";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { nanoid } from "nanoid";

interface EditEngineDataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  engineData: EngineData;
  onSave: (data: EngineData) => void;
}

const numOrUndef = (value: any): number | undefined => {
  const s = String(value ?? "").trim();
  if (s === "") return undefined;
  const n = Number(s.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : undefined;
};

const stripUndefinedDeep = (v: any): any => {
  if (Array.isArray(v)) {
    return v.map(stripUndefinedDeep).filter((x) => x !== undefined);
  }
  if (v && typeof v === "object") {
    const out: any = {};
    Object.entries(v).forEach(([k, val]) => {
      const cleaned = stripUndefinedDeep(val);
      if (cleaned !== undefined) out[k] = cleaned;
    });
    return out;
  }
  return v === undefined ? undefined : v;
};

const buildDefaults = (e?: EngineData | null): EngineDataFormValues => {
  const d = e ?? ({} as EngineData);
  const arr = (x: any) => (Array.isArray(x) ? x : []);

  return {
    name: d.name ?? "",
    insumos: {
      aceite: {
        grado: d.insumos?.aceite?.grado ?? "",
        litros: d.insumos?.aceite?.litros ?? undefined,
        costoUnitario: d.insumos?.aceite?.costoUnitario ?? undefined,
        lastUpdated: d.insumos?.aceite?.lastUpdated,
      },
      filtroAceite: {
        sku: d.insumos?.filtroAceite?.sku ?? "",
        costoUnitario: d.insumos?.filtroAceite?.costoUnitario ?? undefined,
        lastUpdated: d.insumos?.filtroAceite?.lastUpdated,
      },
      filtroAire: {
        sku: d.insumos?.filtroAire?.sku ?? "",
        costoUnitario: d.insumos?.filtroAire?.costoUnitario ?? undefined,
        lastUpdated: d.insumos?.filtroAire?.lastUpdated,
      },
      balatas: {
        delanteras: arr(d.insumos?.balatas?.delanteras)?.map((b: any) => ({
          id: b?.id ?? nanoid(),
          modelo: b?.modelo ?? "",
          tipo: b?.tipo ?? null,
          costoJuego: b?.costoJuego ?? undefined,
        })),
        traseras: arr(d.insumos?.balatas?.traseras)?.map((b: any) => ({
          id: b?.id ?? nanoid(),
          modelo: b?.modelo ?? "",
          tipo: b?.tipo ?? null,
          costoJuego: b?.costoJuego ?? undefined,
        })),
        lastUpdated: d.insumos?.balatas?.lastUpdated,
      },
      bujias: {
        cantidad: d.insumos?.bujias?.cantidad ?? undefined,
        modelos: {
          cobre: d.insumos?.bujias?.modelos?.cobre ?? "",
          platino: d.insumos?.bujias?.modelos?.platino ?? "",
          iridio: d.insumos?.bujias?.modelos?.iridio ?? "",
        },
        costoUnitario: {
          cobre: d.insumos?.bujias?.costoUnitario?.cobre ?? undefined,
          platino: d.insumos?.bujias?.costoUnitario?.platino ?? undefined,
          iridio: d.insumos?.bujias?.costoUnitario?.iridio ?? undefined,
        },
        lastUpdated: d.insumos?.bujias?.lastUpdated,
      },
      inyector: {
        tipo: (d.insumos?.inyector?.tipo as any) ?? null,
      },
    },
    servicios: {
      afinacionIntegral: {
        costoInsumos: d.servicios?.afinacionIntegral?.costoInsumos ?? undefined,
        precioPublico: d.servicios?.afinacionIntegral?.precioPublico ?? undefined,
        upgrades: d.servicios?.afinacionIntegral?.upgrades
          ? {
              conAceiteSintetico: d.servicios?.afinacionIntegral?.upgrades?.conAceiteSintetico ?? undefined,
              conAceiteMobil: d.servicios?.afinacionIntegral?.upgrades?.conAceiteMobil ?? undefined,
              conBujiasPlatino: d.servicios?.afinacionIntegral?.upgrades?.conBujiasPlatino ?? undefined,
              conBujiasIridio: d.servicios?.afinacionIntegral?.upgrades?.conBujiasIridio ?? undefined,
            }
          : undefined,
      },
      cambioAceite: {
        costoInsumos: d.servicios?.cambioAceite?.costoInsumos ?? undefined,
        precioPublico: d.servicios?.cambioAceite?.precioPublico ?? undefined,
      },
      balatasDelanteras: {
        costoInsumos: d.servicios?.balatasDelanteras?.costoInsumos ?? undefined,
        precioPublico: d.servicios?.balatasDelanteras?.precioPublico ?? undefined,
      },
      balatasTraseras: {
        costoInsumos: d.servicios?.balatasTraseras?.costoInsumos ?? undefined,
        precioPublico: d.servicios?.balatasTraseras?.precioPublico ?? undefined,
      },
    },
  };
};

export function EditEngineDataDialog({ open, onOpenChange, engineData, onSave }: EditEngineDataDialogProps) {
  const methods = useForm<EngineDataFormValues>({
    resolver: zodResolver(engineDataSchema),
    defaultValues: buildDefaults(engineData),
    mode: "onBlur",
  });

  const { handleSubmit, formState: { isSubmitting }, control, reset, watch } = methods;

  useEffect(() => {
    if (open) reset(buildDefaults(engineData));
  }, [open, engineData, reset]);

  const { fields: fieldsDel, append: appendDel, remove: removeDel } = useFieldArray({ control, name: "insumos.balatas.delanteras" });
  const { fields: fieldsTra, append: appendTra, remove: removeTra } = useFieldArray({ control, name: "insumos.balatas.traseras" });

  const setUpdatedIfChanged = (original: EngineDataFormValues, current: EngineDataFormValues) => {
    const now = new Date().toISOString();
    const changed = (a: any, b: any) => JSON.stringify(a) !== JSON.stringify(b);

    if (changed(original.insumos.aceite, current.insumos.aceite)) current.insumos.aceite.lastUpdated = now;
    if (changed(original.insumos.filtroAceite, current.insumos.filtroAceite)) current.insumos.filtroAceite.lastUpdated = now;
    if (changed(original.insumos.filtroAire, current.insumos.filtroAire)) current.insumos.filtroAire.lastUpdated = now;
    if (changed(original.insumos.balatas, current.insumos.balatas)) current.insumos.balatas.lastUpdated = now;
    if (changed(original.insumos.bujias, current.insumos.bujias)) current.insumos.bujias.lastUpdated = now;
  };

  const processSubmit = (data: EngineDataFormValues) => {
    const original = buildDefaults(engineData);
    setUpdatedIfChanged(original, data);

    const clean = stripUndefinedDeep(data);
    onSave(clean as EngineData);
  };

  const balataTipos = ["metalicas", "semimetalicas", "ceramica", "organica"];
  const inyectorTipos = ["Normal", "Piezoelectrico", "GDI"];
  const last = (p: any) => (p ? <span className="text-xs text-muted-foreground">Últ. act: {new Date(p).toLocaleDateString("es-MX")}</span> : null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl md:max-w-4xl p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-2 border-b bg-card/60 backdrop-blur">
          <DialogTitle className="text-base md:text-lg">
            Editar datos del motor: <span className="font-semibold">{engineData?.name}</span>
          </DialogTitle>
          <DialogDescription className="text-xs md:text-sm">
            Ajusta insumos y servicios. Los cambios no se guardan hasta presionar “Guardar cambios”.
          </DialogDescription>
        </DialogHeader>

        <FormProvider {...methods}>
          <Form {...methods}>
            <form id="edit-engine-form" onSubmit={handleSubmit(processSubmit)}>
              <ScrollArea className="h-[70vh] md:h-[72vh] px-6 py-5">
                <Accordion type="multiple" defaultValue={["insumos", "servicios"]} className="w-full space-y-3">
                  <AccordionItem value="insumos" className="border rounded-md px-4 bg-card">
                    <AccordionTrigger className="hover:no-underline font-semibold text-sm md:text-base">Insumos</AccordionTrigger>
                    <AccordionContent className="space-y-5 pt-3">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <h4 className="font-semibold text-sm">Aceite</h4>{last(watch("insumos.aceite.lastUpdated"))}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <FormField control={control as any} name="insumos.aceite.grado" render={({ field }) => (
                            <FormItem className="space-y-1">
                              <FormLabel className="text-xs">Grado</FormLabel>
                              <FormControl><Input {...field} value={field.value ?? ""} placeholder="10W30" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}/>
                          <FormField control={control as any} name="insumos.aceite.litros" render={({ field }) => (
                            <FormItem className="space-y-1">
                              <FormLabel className="text-xs">Litros</FormLabel>
                              <FormControl>
                                <Input type="number" value={field.value ?? ""} onChange={(e) => field.onChange(numOrUndef(e.target.value))} placeholder="4.5" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}/>
                          <FormField control={control as any} name="insumos.aceite.costoUnitario" render={({ field }) => (
                            <FormItem className="space-y-1">
                              <FormLabel className="text-xs">Costo/Litro</FormLabel>
                              <FormControl>
                                <Input type="number" value={field.value ?? ""} onChange={(e) => field.onChange(numOrUndef(e.target.value))} placeholder="150" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}/>
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <h4 className="font-semibold text-sm">Filtros</h4>{last(watch("insumos.filtroAceite.lastUpdated"))}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                          <FormField control={control as any} name="insumos.filtroAceite.sku" render={({ field }) => (
                            <FormItem className="space-y-1">
                              <FormLabel className="text-xs">SKU Filtro Aceite</FormLabel>
                              <FormControl><Input {...field} value={field.value ?? ""} placeholder="W-123" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}/>
                          <FormField control={control as any} name="insumos.filtroAceite.costoUnitario" render={({ field }) => (
                            <FormItem className="space-y-1">
                              <FormLabel className="text-xs">Costo Filtro Aceite</FormLabel>
                              <FormControl><Input type="number" value={field.value ?? ""} onChange={(e)=>field.onChange(numOrUndef(e.target.value))} placeholder="120" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}/>
                          <FormField control={control as any} name="insumos.filtroAire.sku" render={({ field }) => (
                            <FormItem className="space-y-1">
                              <FormLabel className="text-xs">SKU Filtro Aire</FormLabel>
                              <FormControl><Input {...field} value={field.value ?? ""} placeholder="A-456" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}/>
                          <FormField control={control as any} name="insumos.filtroAire.costoUnitario" render={({ field }) => (
                            <FormItem className="space-y-1">
                              <FormLabel className="text-xs">Costo Filtro Aire</FormLabel>
                              <FormControl><Input type="number" value={field.value ?? ""} onChange={(e)=>field.onChange(numOrUndef(e.target.value))} placeholder="180" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}/>
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <h4 className="font-semibold text-sm">Balatas</h4>{last(watch("insumos.balatas.lastUpdated"))}
                        </div>
                        <div className="space-y-2">
                          <h5 className="text-xs font-bold text-muted-foreground">DELANTERAS</h5>
                          {fieldsDel.map((item, index) => (
                            <div key={item.id} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-center">
                              <FormField control={control as any} name={`insumos.balatas.delanteras.${index}.modelo`} render={({ field }) => (
                                <FormItem><FormControl><Input {...field} value={field.value ?? ""} placeholder="D1234" /></FormControl></FormItem>
                              )}/>
                              <FormField control={control as any} name={`insumos.balatas.delanteras.${index}.tipo`} render={({ field }) => (
                                <FormItem>
                                  <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Tipo..." /></SelectTrigger></FormControl>
                                    <SelectContent>
                                      {["metalicas","semimetalicas","ceramica","organica"].map((t)=>(
                                        <SelectItem key={t} value={t}>{capitalizeWords(t)}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </FormItem>
                              )}/>
                              <FormField control={control as any} name={`insumos.balatas.delanteras.${index}.costoJuego`} render={({ field }) => (
                                <FormItem><FormControl><Input type="number" value={field.value ?? ""} onChange={(e)=>field.onChange(numOrUndef(e.target.value))} placeholder="Costo" /></FormControl></FormItem>
                              )}/>
                              <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeDel(index)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          ))}
                          <Button type="button" size="sm" variant="outline" onClick={() => appendDel({ id: nanoid(), modelo: "", tipo: null, costoJuego: undefined })}>
                            <PlusCircle className="mr-2 h-4 w-4" />Añadir Balata Delantera
                          </Button>
                        </div>

                        <div className="space-y-2 pt-2">
                          <h5 className="text-xs font-bold text-muted-foreground">TRASERAS</h5>
                          {fieldsTra.map((item, index) => (
                            <div key={item.id} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-center">
                              <FormField control={control as any} name={`insumos.balatas.traseras.${index}.modelo`} render={({ field }) => (
                                <FormItem><FormControl><Input {...field} value={field.value ?? ""} placeholder="D5678" /></FormControl></FormItem>
                              )}/>
                              <FormField control={control as any} name={`insumos.balatas.traseras.${index}.tipo`} render={({ field }) => (
                                <FormItem>
                                  <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Tipo..." /></SelectTrigger></FormControl>
                                    <SelectContent>
                                      {["metalicas","semimetalicas","ceramica","organica"].map((t)=>(
                                        <SelectItem key={t} value={t}>{capitalizeWords(t)}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </FormItem>
                              )}/>
                              <FormField control={control as any} name={`insumos.balatas.traseras.${index}.costoJuego`} render={({ field }) => (
                                <FormItem><FormControl><Input type="number" value={field.value ?? ""} onChange={(e)=>field.onChange(numOrUndef(e.target.value))} placeholder="Costo" /></FormControl></FormItem>
                              )}/>
                              <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeTra(index)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          ))}
                          <Button type="button" size="sm" variant="outline" onClick={() => appendTra({ id: nanoid(), modelo: "", tipo: null, costoJuego: undefined })}>
                            <PlusCircle className="mr-2 h-4 w-4" />Añadir Balata Trasera
                          </Button>
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <h4 className="font-semibold text-sm">Bujías</h4>{last(watch("insumos.bujias.lastUpdated"))}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                          <FormField control={control as any} name="insumos.bujias.cantidad" render={({ field }) => (
                            <FormItem className="space-y-1">
                              <FormLabel className="text-xs">Cantidad</FormLabel>
                              <FormControl><Input type="number" value={field.value ?? ""} onChange={(e)=>field.onChange(numOrUndef(e.target.value))} placeholder="4" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}/>
                          <FormField control={control as any} name="insumos.bujias.modelos.cobre" render={({ field }) => (
                            <FormItem className="space-y-1">
                              <FormLabel className="text-xs">SKU Cobre</FormLabel>
                              <FormControl><Input {...field} value={field.value ?? ""} placeholder="BKR5E-11" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}/>
                          <FormField control={control as any} name="insumos.bujias.modelos.platino" render={({ field }) => (
                            <FormItem className="space-y-1">
                              <FormLabel className="text-xs">SKU Platino</FormLabel>
                              <FormControl><Input {...field} value={field.value ?? ""} placeholder="PFR5G-11" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}/>
                          <FormField control={control as any} name="insumos.bujias.modelos.iridio" render={({ field }) => (
                            <FormItem className="space-y-1">
                              <FormLabel className="text-xs">SKU Iridio</FormLabel>
                              <FormControl><Input {...field} value={field.value ?? ""} placeholder="IK16" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}/>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <FormField control={control as any} name="insumos.bujias.costoUnitario.cobre" render={({ field }) => (
                            <FormItem className="space-y-1">
                              <FormLabel className="text-xs">Costo Unit. Cobre</FormLabel>
                              <FormControl><Input type="number" value={field.value ?? ""} onChange={(e)=>field.onChange(numOrUndef(e.target.value))} placeholder="80" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}/>
                          <FormField control={control as any} name="insumos.bujias.costoUnitario.platino" render={({ field }) => (
                            <FormItem className="space-y-1">
                              <FormLabel className="text-xs">Costo Unit. Platino</FormLabel>
                              <FormControl><Input type="number" value={field.value ?? ""} onChange={(e)=>field.onChange(numOrUndef(e.target.value))} placeholder="180" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}/>
                          <FormField control={control as any} name="insumos.bujias.costoUnitario.iridio" render={({ field }) => (
                            <FormItem className="space-y-1">
                              <FormLabel className="text-xs">Costo Unit. Iridio</FormLabel>
                              <FormControl><Input type="number" value={field.value ?? ""} onChange={(e)=>field.onChange(numOrUndef(e.target.value))} placeholder="250" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}/>
                        </div>
                      </div>

                      <Separator />

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <FormField control={control as any} name="insumos.inyector.tipo" render={({ field }) => (
                          <FormItem className="space-y-1">
                            <FormLabel className="text-xs">Tipo de Inyector</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                              <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl>
                              <SelectContent>
                                {inyectorTipos.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}/>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="servicios" className="border rounded-md px-4 bg-card">
                    <AccordionTrigger className="hover:no-underline font-semibold text-sm md:text-base">Servicios</AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-3">
                      <div className="space-y-3 border-b pb-4">
                        <h4 className="font-semibold text-sm">Afinación Integral</h4>
                        <div className="grid grid-cols-2 gap-3">
                          <FormField control={control as any} name="servicios.afinacionIntegral.costoInsumos" render={({ field }) => (
                            <FormItem className="space-y-1">
                              <FormLabel className="text-xs">Costo Insumos</FormLabel>
                              <FormControl><Input type="number" value={field.value ?? ""} onChange={(e)=>field.onChange(numOrUndef(e.target.value))} placeholder="850.00" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}/>
                          <FormField control={control as any} name="servicios.afinacionIntegral.precioPublico" render={({ field }) => (
                            <FormItem className="space-y-1">
                              <FormLabel className="text-xs">Precio Público</FormLabel>
                              <FormControl><Input type="number" value={field.value ?? ""} onChange={(e)=>field.onChange(numOrUndef(e.target.value))} placeholder="1200.00" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}/>
                        </div>
                        <Separator className="my-3" />
                        <h5 className="font-semibold text-xs text-muted-foreground">Actualizaciones (Costo Adicional)</h5>
                        <div className="grid grid-cols-2 gap-3">
                          <FormField control={control as any} name="servicios.afinacionIntegral.upgrades.conAceiteSintetico" render={({ field }) => (
                            <FormItem className="space-y-1">
                              <FormLabel className="text-xs">Aceite Sintético</FormLabel>
                              <FormControl><Input type="number" value={field.value ?? ""} onChange={(e)=>field.onChange(numOrUndef(e.target.value))} placeholder="350" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}/>
                          <FormField control={control as any} name="servicios.afinacionIntegral.upgrades.conAceiteMobil" render={({ field }) => (
                            <FormItem className="space-y-1">
                              <FormLabel className="text-xs">Aceite Mobil</FormLabel>
                              <FormControl><Input type="number" value={field.value ?? ""} onChange={(e)=>field.onChange(numOrUndef(e.target.value))} placeholder="550" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}/>
                          <FormField control={control as any} name="servicios.afinacionIntegral.upgrades.conBujiasPlatino" render={({ field }) => (
                            <FormItem className="space-y-1">
                              <FormLabel className="text-xs">Bujías de Platino</FormLabel>
                              <FormControl><Input type="number" value={field.value ?? ""} onChange={(e)=>field.onChange(numOrUndef(e.target.value))} placeholder="400" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}/>
                          <FormField control={control as any} name="servicios.afinacionIntegral.upgrades.conBujiasIridio" render={({ field }) => (
                            <FormItem className="space-y-1">
                              <FormLabel className="text-xs">Bujías de Iridio</FormLabel>
                              <FormControl><Input type="number" value={field.value ?? ""} onChange={(e)=>field.onChange(numOrUndef(e.target.value))} placeholder="700" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}/>
                        </div>
                      </div>

                      {[
                        { name: "cambioAceite", label: "Cambio de Aceite" },
                        { name: "balatasDelanteras", label: "Balatas Delanteras" },
                        { name: "balatasTraseras", label: "Balatas Traseras" },
                      ].map((service) => (
                        <div key={service.name} className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-b pb-3 last:border-b-0 last:pb-0">
                          <div className="sm:col-span-2"><h4 className="font-semibold text-sm">{service.label}</h4></div>
                          <FormField control={control} name={`servicios.${service.name}.costoInsumos` as any} render={({ field }) => (
                            <FormItem className="space-y-1">
                              <FormLabel className="text-xs">Costo Insumos</FormLabel>
                              <FormControl><Input type="number" value={field.value as any} onChange={(e)=>field.onChange(numOrUndef(e.target.value))} placeholder="0.00" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}/>
                          <FormField control={control} name={`servicios.${service.name}.precioPublico` as any} render={({ field }) => (
                            <FormItem className="space-y-1">
                              <FormLabel className="text-xs">Precio Público</FormLabel>
                              <FormControl><Input type="number" value={field.value as any} onChange={(e)=>field.onChange(numOrUndef(e.target.value))} placeholder="0.00" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}/>
                        </div>
                      ))}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </ScrollArea>

              <DialogFooter className="px-6 py-4 border-t bg-card/60 backdrop-blur">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                <Button type="submit" form="edit-engine-form" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Guardar cambios
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
