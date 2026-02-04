// src/app/(app)/precios/components/EditEngineDataDialog.tsx
"use client";

import React, { useEffect } from "react";
import { useForm, FormProvider, useFieldArray, type Resolver, type SubmitHandler } from "react-hook-form";
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
import { Loader2, Save, PlusCircle, Trash2, Droplets, Disc, Zap, Settings2 } from "lucide-react";
import type { EngineData } from "@/lib/data/vehicle-database-types";
import { capitalizeWords, formatCurrency } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

const resolver = zodResolver(engineDataSchema) as unknown as Resolver<EngineDataFormValues>;

export function EditEngineDataDialog({ open, onOpenChange, engineData, onSave }: EditEngineDataDialogProps) {
  
  const methods = useForm<EngineDataFormValues>({
    resolver,
    defaultValues: buildDefaults(engineData),
    mode: "onBlur",
  });

  const { handleSubmit, formState: { isSubmitting }, control, reset, watch } = methods;

  useEffect(() => {
    if (open) reset(buildDefaults(engineData));
  }, [open, engineData, reset]);

  const { fields: fieldsDel, append: appendDel, remove: removeDel } = useFieldArray({ control: control as any, name: "insumos.balatas.delanteras" });
  const { fields: fieldsTra, append: appendTra, remove: removeTra } = useFieldArray({ control: control as any, name: "insumos.balatas.traseras" });

  const processSubmit: SubmitHandler<EngineDataFormValues> = (data) => {
    const clean = stripUndefinedDeep(data);
    onSave(clean as EngineData);
  };

  const last = (p: any) => (p ? <span className="text-[10px] text-muted-foreground opacity-70">Act: {new Date(p).toLocaleDateString("es-MX")}</span> : null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden flex flex-col h-[90vh]">
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-white">
          <DialogTitle className="text-xl">
            Configuración Técnica: <span className="font-bold text-primary">{engineData?.name}</span>
          </DialogTitle>
          <DialogDescription>
            Define los insumos y precios sugeridos para este motor.
          </DialogDescription>
        </DialogHeader>

        <FormProvider {...methods}>
          <Form {...methods}>
            <form id="edit-engine-form" onSubmit={handleSubmit(processSubmit)} className="flex flex-col flex-1 overflow-hidden">
              <Tabs defaultValue="oil" className="flex-1 flex flex-col overflow-hidden">
                <div className="px-6 border-b bg-muted/20">
                  <TabsList className="h-12 w-full justify-start gap-4 bg-transparent p-0">
                    <TabsTrigger value="oil" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full bg-transparent px-2 gap-2">
                      <Droplets className="h-4 w-4" /> Aceite y Filtros
                    </TabsTrigger>
                    <TabsTrigger value="brakes" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full bg-transparent px-2 gap-2">
                      <Disc className="h-4 w-4" /> Frenos
                    </TabsTrigger>
                    <TabsTrigger value="tuneup" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full bg-transparent px-2 gap-2">
                      <Zap className="h-4 w-4" /> Bujías e Inyectores
                    </TabsTrigger>
                    <TabsTrigger value="services" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full bg-transparent px-2 gap-2">
                      <Settings2 className="h-4 w-4" /> Servicios
                    </TabsTrigger>
                  </TabsList>
                </div>

                <ScrollArea className="flex-1">
                  <div className="p-6 space-y-8">
                    {/* Tab: Aceite y Filtros */}
                    <TabsContent value="oil" className="m-0 space-y-6">
                      <div className="space-y-4">
                        <div className="flex justify-between items-center"><h3 className="font-bold">Especificaciones de Lubricación</h3>{last(watch("insumos.aceite.lastUpdated"))}</div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <FormField control={control} name="insumos.aceite.grado" render={({ field }) => (
                            <FormItem><FormLabel>Grado de Aceite</FormLabel><FormControl><Input {...field} value={field.value ?? ""} placeholder="Ej: 5W30" className="bg-white"/></FormControl></FormItem>
                          )}/>
                          <FormField control={control} name="insumos.aceite.litros" render={({ field }) => (
                            <FormItem><FormLabel>Capacidad (Litros)</FormLabel><FormControl><Input type="number" step="0.1" value={field.value ?? ""} onChange={(e) => field.onChange(numOrUndef(e.target.value))} placeholder="4.5" className="bg-white"/></FormControl></FormItem>
                          )}/>
                          <FormField control={control} name="insumos.aceite.costoUnitario" render={({ field }) => (
                            <FormItem><FormLabel>Costo por Litro</FormLabel><FormControl><Input type="number" value={field.value ?? ""} onChange={(e) => field.onChange(numOrUndef(e.target.value))} placeholder="$0.00" className="bg-white"/></FormControl></FormItem>
                          )}/>
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-4">
                        <h3 className="font-bold">Filtración</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          <div className="p-4 rounded-lg border bg-muted/10 space-y-3">
                            <Label className="text-xs uppercase tracking-widest text-muted-foreground">Filtro de Aceite</Label>
                            <FormField control={control} name="insumos.filtroAceite.sku" render={({ field }) => (
                              <FormItem><FormLabel className="text-xs">SKU / Modelo</FormLabel><FormControl><Input {...field} value={field.value ?? ""} placeholder="W-123" className="bg-white"/></FormControl></FormItem>
                            )}/>
                            <FormField control={control} name="insumos.filtroAceite.costoUnitario" render={({ field }) => (
                              <FormItem><FormLabel className="text-xs">Costo Taller</FormLabel><FormControl><Input type="number" value={field.value ?? ""} onChange={(e)=>field.onChange(numOrUndef(e.target.value))} placeholder="$0.00" className="bg-white"/></FormControl></FormItem>
                            )}/>
                          </div>
                          <div className="p-4 rounded-lg border bg-muted/10 space-y-3">
                            <Label className="text-xs uppercase tracking-widest text-muted-foreground">Filtro de Aire</Label>
                            <FormField control={control} name="insumos.filtroAire.sku" render={({ field }) => (
                              <FormItem><FormLabel className="text-xs">SKU / Modelo</FormLabel><FormControl><Input {...field} value={field.value ?? ""} placeholder="A-456" className="bg-white"/></FormControl></FormItem>
                            )}/>
                            <FormField control={control} name="insumos.filtroAire.costoUnitario" render={({ field }) => (
                              <FormItem><FormLabel className="text-xs">Costo Taller</FormLabel><FormControl><Input type="number" value={field.value ?? ""} onChange={(e)=>field.onChange(numOrUndef(e.target.value))} placeholder="$0.00" className="bg-white"/></FormControl></FormItem>
                            )}/>
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    {/* Tab: Frenos */}
                    <TabsContent value="brakes" className="m-0 space-y-8">
                      <div className="space-y-4">
                        <div className="flex justify-between items-center"><h3 className="font-bold">Balatas Delanteras</h3>{last(watch("insumos.balatas.lastUpdated"))}</div>
                        <div className="space-y-3">
                          {fieldsDel.map((item, index) => (
                            <div key={item.id} className="flex gap-3 items-end p-3 rounded-md border bg-white shadow-sm">
                              <FormField control={control as any} name={`insumos.balatas.delanteras.${index}.modelo`} render={({ field }) => (
                                <FormItem className="flex-1"><FormLabel className="text-[10px]">Modelo/SKU</FormLabel><FormControl><Input {...field} value={field.value ?? ""} placeholder="D1234" /></FormControl></FormItem>
                              )}/>
                              <FormField control={control as any} name={`insumos.balatas.delanteras.${index}.tipo`} render={({ field }) => (
                                <FormItem className="w-40"><FormLabel className="text-[10px]">Material</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Tipo..." /></SelectTrigger></FormControl>
                                    <SelectContent>
                                      {["metalicas","semimetalicas","ceramica","organica"].map((t)=><SelectItem key={t} value={t}>{capitalizeWords(t)}</SelectItem>)}
                                    </SelectContent>
                                  </Select>
                                </FormItem>
                              )}/>
                              <FormField control={control as any} name={`insumos.balatas.delanteras.${index}.costoJuego`} render={({ field }) => (
                                <FormItem className="w-32"><FormLabel className="text-[10px]">Costo Juego</FormLabel><FormControl><Input type="number" value={field.value ?? ""} onChange={(e)=>field.onChange(numOrUndef(e.target.value))} placeholder="$0.00" /></FormControl></FormItem>
                              )}/>
                              <Button type="button" variant="ghost" size="icon" className="text-destructive h-10 w-10" onClick={() => removeDel(index)}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          ))}
                          <Button type="button" size="sm" variant="outline" onClick={() => appendDel({ id: nanoid(), modelo: "", tipo: null, costoJuego: undefined })} className="w-full border-dashed">
                            <PlusCircle className="mr-2 h-4 w-4" />Añadir Opción Delantera
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h3 className="font-bold">Balatas Traseras</h3>
                        <div className="space-y-3">
                          {fieldsTra.map((item, index) => (
                            <div key={item.id} className="flex gap-3 items-end p-3 rounded-md border bg-white shadow-sm">
                              <FormField control={control as any} name={`insumos.balatas.traseras.${index}.modelo`} render={({ field }) => (
                                <FormItem className="flex-1"><FormLabel className="text-[10px]">Modelo/SKU</FormLabel><FormControl><Input {...field} value={field.value ?? ""} placeholder="D5678" /></FormControl></FormItem>
                              )}/>
                              <FormField control={control as any} name={`insumos.balatas.traseras.${index}.tipo`} render={({ field }) => (
                                <FormItem className="w-40"><FormLabel className="text-[10px]">Material</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Tipo..." /></SelectTrigger></FormControl>
                                    <SelectContent>
                                      {["metalicas","semimetalicas","ceramica","organica"].map((t)=><SelectItem key={t} value={t}>{capitalizeWords(t)}</SelectItem>)}
                                    </SelectContent>
                                  </Select>
                                </FormItem>
                              )}/>
                              <FormField control={control as any} name={`insumos.balatas.traseras.${index}.costoJuego`} render={({ field }) => (
                                <FormItem className="w-32"><FormLabel className="text-[10px]">Costo Juego</FormLabel><FormControl><Input type="number" value={field.value ?? ""} onChange={(e)=>field.onChange(numOrUndef(e.target.value))} placeholder="$0.00" /></FormControl></FormItem>
                              )}/>
                              <Button type="button" variant="ghost" size="icon" className="text-destructive h-10 w-10" onClick={() => removeTra(index)}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          ))}
                          <Button type="button" size="sm" variant="outline" onClick={() => appendTra({ id: nanoid(), modelo: "", tipo: null, costoJuego: undefined })} className="w-full border-dashed">
                            <PlusCircle className="mr-2 h-4 w-4" />Añadir Opción Trasera
                          </Button>
                        </div>
                      </div>
                    </TabsContent>

                    {/* Tab: Bujías e Inyectores */}
                    <TabsContent value="tuneup" className="m-0 space-y-6">
                      <div className="space-y-4">
                        <div className="flex justify-between items-center"><h3 className="font-bold">Bujías</h3>{last(watch("insumos.bujias.lastUpdated"))}</div>
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-4 rounded-xl border bg-muted/5">
                          <FormField control={control} name="insumos.bujias.cantidad" render={({ field }) => (
                            <FormItem className="sm:col-span-4"><FormLabel>Cantidad de Bujías</FormLabel><FormControl><Input type="number" className="w-24 bg-white" value={field.value ?? ""} onChange={(e)=>field.onChange(numOrUndef(e.target.value))} placeholder="4" /></FormControl></FormItem>
                          )}/>
                          <div className="space-y-3">
                            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Cobre</Label>
                            <FormField control={control} name="insumos.bujias.modelos.cobre" render={({ field }) => (
                              <FormControl><Input {...field} value={field.value ?? ""} placeholder="SKU..." className="bg-white"/></FormControl>
                            )}/>
                            <FormField control={control} name="insumos.bujias.costoUnitario.cobre" render={({ field }) => (
                              <FormControl><Input type="number" value={field.value ?? ""} onChange={(e)=>field.onChange(numOrUndef(e.target.value))} placeholder="Costo unit." className="bg-white"/></FormControl>
                            )}/>
                          </div>
                          <div className="space-y-3">
                            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Platino</Label>
                            <FormField control={control} name="insumos.bujias.modelos.platino" render={({ field }) => (
                              <FormControl><Input {...field} value={field.value ?? ""} placeholder="SKU..." className="bg-white"/></FormControl>
                            )}/>
                            <FormField control={control} name="insumos.bujias.costoUnitario.platino" render={({ field }) => (
                              <FormControl><Input type="number" value={field.value ?? ""} onChange={(e)=>field.onChange(numOrUndef(e.target.value))} placeholder="Costo unit." className="bg-white"/></FormControl>
                            )}/>
                          </div>
                          <div className="space-y-3">
                            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Iridio</Label>
                            <FormField control={control} name="insumos.bujias.modelos.iridio" render={({ field }) => (
                              <FormControl><Input {...field} value={field.value ?? ""} placeholder="SKU..." className="bg-white"/></FormControl>
                            )}/>
                            <FormField control={control} name="insumos.bujias.costoUnitario.iridio" render={({ field }) => (
                              <FormControl><Input type="number" value={field.value ?? ""} onChange={(e)=>field.onChange(numOrUndef(e.target.value))} placeholder="Costo unit." className="bg-white"/></FormControl>
                            )}/>
                          </div>
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-4">
                        <h3 className="font-bold">Inyectores</h3>
                        <FormField control={control} name="insumos.inyector.tipo" render={({ field }) => (
                          <FormItem className="max-w-xs">
                            <FormLabel>Tecnología de Inyección</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                              <FormControl><SelectTrigger className="bg-white"><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl>
                              <SelectContent>{["Normal", "Piezoelectrico", "GDI"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                            </Select>
                          </FormItem>
                        )}/>
                      </div>
                    </TabsContent>

                    {/* Tab: Servicios */}
                    <TabsContent value="services" className="m-0 space-y-6">
                      <div className="p-5 rounded-xl border bg-primary/5 space-y-4">
                        <h3 className="font-bold text-primary flex items-center gap-2">Afinación Integral</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <FormField control={control as any} name="servicios.afinacionIntegral.costoInsumos" render={({ field }) => (
                            <FormItem><FormLabel className="text-xs">Costo Base Insumos</FormLabel><FormControl><Input type="number" value={field.value ?? ""} onChange={(e)=>field.onChange(numOrUndef(e.target.value))} className="bg-white"/></FormControl></FormItem>
                          )}/>
                          <FormField control={control as any} name="servicios.afinacionIntegral.precioPublico" render={({ field }) => (
                            <FormItem><FormLabel className="text-xs">Precio Venta (Público)</FormLabel><FormControl><Input type="number" value={field.value ?? ""} onChange={(e)=>field.onChange(numOrUndef(e.target.value))} className="bg-white font-bold text-primary"/></FormControl></FormItem>
                          )}/>
                        </div>
                        <div className="pt-4 border-t space-y-3">
                          <Label className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Precios Adicionales (Upgrades)</Label>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {[
                              { n: "conAceiteSintetico", l: "Sintético" },
                              { n: "conAceiteMobil", l: "Mobil" },
                              { n: "conBujiasPlatino", l: "Platino" },
                              { n: "conBujiasIridio", l: "Iridio" }
                            ].map(u => (
                              <FormField key={u.n} control={control as any} name={`servicios.afinacionIntegral.upgrades.${u.n}`} render={({ field }) => (
                                <FormItem><FormLabel className="text-[10px]">{u.l}</FormLabel><FormControl><Input type="number" value={field.value ?? ""} onChange={(e)=>field.onChange(numOrUndef(e.target.value))} placeholder="+$0" className="bg-white h-8 text-xs"/></FormControl></FormItem>
                              )}/>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {[
                          { n: "cambioAceite", l: "Cambio de Aceite" },
                          { n: "balatasDelanteras", l: "Balatas Delanteras" },
                          { n: "balatasTraseras", l: "Balatas Traseras" },
                        ].map((s) => (
                          <div key={s.n} className="p-4 rounded-lg border bg-white space-y-3">
                            <h4 className="font-semibold text-sm">{s.l}</h4>
                            <FormField control={control as any} name={`servicios.${s.n}.precioPublico` as any} render={({ field }) => (
                              <FormItem><FormLabel className="text-[10px]">Precio Venta</FormLabel><FormControl><Input type="number" value={field.value as any} onChange={(e)=>field.onChange(numOrUndef(e.target.value))} placeholder="$0.00" className="h-8"/></FormControl></FormItem>
                            )}/>
                          </div>
                        ))}
                      </div>
                    </TabsContent>
                  </div>
                </ScrollArea>
              </Tabs>

              <DialogFooter className="px-6 py-4 border-t bg-muted/10 backdrop-blur shrink-0">
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
