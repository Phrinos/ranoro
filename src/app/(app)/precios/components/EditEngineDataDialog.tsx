// src/app/(app)/precios/components/EditEngineDataDialog.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useForm, FormProvider, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  engineDataSchema,
  type EngineDataFormValues,
} from "@/schemas/engine-data-form-schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Loader2, Save, PlusCircle, Trash2 } from "lucide-react";
import type { EngineData, BalataInfo } from "@/lib/data/vehicle-database-types";
import { capitalizeWords, formatCurrency } from "@/lib/utils";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { nanoid } from 'nanoid';

interface EditEngineDataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  engineData: EngineData;
  onSave: (data: EngineData) => void;
}

// Permite string vacío o convierte a número
const toNumberOrEmpty = (value: any) => {
  if (value === "" || value === null || value === undefined) {
    return "";
  }
  return Number(String(value).replace(/[^0-9.]/g, ""));
};

const buildDefaults = (e?: EngineData | null): EngineDataFormValues => {
    const data = e || {};
    return {
        name: data.name ?? "",
        insumos: {
            aceite: {
                grado: data.insumos?.aceite?.grado ?? "",
                litros: data.insumos?.aceite?.litros ?? undefined,
                costoUnitario: data.insumos?.aceite?.costoUnitario ?? undefined,
                lastUpdated: data.insumos?.aceite?.lastUpdated,
            },
            filtroAceite: {
                sku: data.insumos?.filtroAceite?.sku ?? "",
                costoUnitario: data.insumos?.filtroAceite?.costoUnitario ?? undefined,
                lastUpdated: data.insumos?.filtroAceite?.lastUpdated,
            },
            filtroAire: {
                sku: data.insumos?.filtroAire?.sku ?? "",
                costoUnitario: data.insumos?.filtroAire?.costoUnitario ?? undefined,
                lastUpdated: data.insumos?.filtroAire?.lastUpdated,
            },
            balatas: {
                delanteras: (data.insumos?.balatas?.delanteras ?? []).map(b => ({ ...b, id: b.id || nanoid() })),
                traseras: (data.insumos?.balatas?.traseras ?? []).map(b => ({ ...b, id: b.id || nanoid() })),
                lastUpdated: data.insumos?.balatas?.lastUpdated,
            },
            bujias: {
                cantidad: data.insumos?.bujias?.cantidad ?? undefined,
                modelos: {
                    cobre: data.insumos?.bujias?.modelos?.cobre ?? "",
                    platino: data.insumos?.bujias?.modelos?.platino ?? "",
                    iridio: data.insumos?.bujias?.modelos?.iridio ?? "",
                },
                costoUnitario: {
                    cobre: data.insumos?.bujias?.costoUnitario?.cobre ?? undefined,
                    platino: data.insumos?.bujias?.costoUnitario?.platino ?? undefined,
                    iridio: data.insumos?.bujias?.costoUnitario?.iridio ?? undefined,
                },
                lastUpdated: data.insumos?.bujias?.lastUpdated,
            },
            inyector: {
                tipo: data.insumos?.inyector?.tipo ?? null,
            },
        },
        servicios: {
            afinacionIntegral: {
                costoInsumos: data.servicios?.afinacionIntegral?.costoInsumos ?? undefined,
                precioPublico: data.servicios?.afinacionIntegral?.precioPublico ?? undefined,
                upgrades: {
                    conAceiteSintetico: data.servicios?.afinacionIntegral?.upgrades?.conAceiteSintetico ?? undefined,
                    conAceiteMobil: data.servicios?.afinacionIntegral?.upgrades?.conAceiteMobil ?? undefined,
                    conBujiasPlatino: data.servicios?.afinacionIntegral?.upgrades?.conBujiasPlatino ?? undefined,
                    conBujiasIridio: data.servicios?.afinacionIntegral?.upgrades?.conBujiasIridio ?? undefined,
                }
            },
            cambioAceite: {
                costoInsumos: data.servicios?.cambioAceite?.costoInsumos ?? undefined,
                precioPublico: data.servicios?.cambioAceite?.precioPublico ?? undefined,
            },
            balatasDelanteras: {
                costoInsumos: data.servicios?.balatasDelanteras?.costoInsumos ?? undefined,
                precioPublico: data.servicios?.balatasDelanteras?.precioPublico ?? undefined,
            },
            balatasTraseras: {
                costoInsumos: data.servicios?.balatasTraseras?.costoInsumos ?? undefined,
                precioPublico: data.servicios?.balatasTraseras?.precioPublico ?? undefined,
            },
        },
    };
};


export function EditEngineDataDialog({
  open,
  onOpenChange,
  engineData,
  onSave,
}: EditEngineDataDialogProps) {
  const methods = useForm<EngineDataFormValues>({
    resolver: zodResolver(engineDataSchema),
    defaultValues: buildDefaults(engineData),
    mode: "onBlur",
  });

  const {
    handleSubmit,
    formState: { isSubmitting },
    control,
  } = methods;
  
  const { fields: fieldsDelanteras, append: appendDelantera, remove: removeDelantera } = useFieldArray({ control, name: "insumos.balatas.delanteras" });
  const { fields: fieldsTraseras, append: appendTrasera, remove: removeTrasera } = useFieldArray({ control, name: "insumos.balatas.traseras" });


  const processSubmit = (data: EngineDataFormValues) => {
    // Before saving, set update dates on modified sections
    const originalData = buildDefaults(engineData);
    const now = new Date().toISOString();
    
    const hasChanged = (original: any, current: any) => JSON.stringify(original) !== JSON.stringify(current);

    if (hasChanged(originalData.insumos.aceite, data.insumos.aceite)) data.insumos.aceite.lastUpdated = now;
    if (hasChanged(originalData.insumos.filtroAceite, data.insumos.filtroAceite)) data.insumos.filtroAceite.lastUpdated = now;
    if (hasChanged(originalData.insumos.filtroAire, data.insumos.filtroAire)) data.insumos.filtroAire.lastUpdated = now;
    if (hasChanged(originalData.insumos.balatas, data.insumos.balatas)) data.insumos.balatas.lastUpdated = now;
    if (hasChanged(originalData.insumos.bujias, data.insumos.bujias)) data.insumos.bujias.lastUpdated = now;

    onSave(data as EngineData);
  };

  const balataTipos = ["metalicas", "semimetalicas", "ceramica", "organica"];
  const inyectorTipos = ["Normal", "Piezoelectrico", "GDI"];
  
  const renderDateField = (date: string | undefined) => (
    date ? <span className="text-xs text-muted-foreground">Últ. act: {new Date(date).toLocaleDateString('es-MX')}</span> : null
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl md:max-w-4xl p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-2 border-b bg-card/60 backdrop-blur">
          <DialogTitle className="text-base md:text-lg">
            Editar datos del motor:{" "}
            <span className="font-semibold">{engineData?.name}</span>
          </DialogTitle>
          <DialogDescription className="text-xs md:text-sm">
            Ajusta insumos y servicios. Los cambios no se guardan hasta
            presionar “Guardar cambios”.
          </DialogDescription>
        </DialogHeader>

        <FormProvider {...methods}>
          <Form {...methods}>
            <form id="edit-engine-form" onSubmit={handleSubmit(processSubmit)}>
              <ScrollArea className="h-[70vh] md:h-[72vh] px-6 py-5">
                <Accordion
                  type="multiple"
                  defaultValue={["insumos", "servicios"]}
                  className="w-full space-y-3"
                >
                  <AccordionItem
                    value="insumos"
                    className="border rounded-md px-4 bg-card"
                  >
                    <AccordionTrigger className="hover:no-underline font-semibold text-sm md:text-base">
                      Insumos
                    </AccordionTrigger>
                    <AccordionContent className="space-y-5 pt-3">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center"><h4 className="font-semibold text-sm">Aceite</h4>{renderDateField(methods.watch('insumos.aceite.lastUpdated'))}</div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <FormField control={control} name="insumos.aceite.grado" render={({ field }) => ( <FormItem className="space-y-1"><FormLabel className="text-xs">Grado</FormLabel><FormControl><Input {...field} value={field.value || ''} placeholder="10W30" /></FormControl><FormMessage /></FormItem> )}/>
                          <FormField control={control} name="insumos.aceite.litros" render={({ field }) => ( <FormItem className="space-y-1"><FormLabel className="text-xs">Litros</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} placeholder="4.5" onChange={(e) => field.onChange(toNumberOrEmpty(e.target.value))} /></FormControl><FormMessage /></FormItem> )}/>
                          <FormField control={control} name="insumos.aceite.costoUnitario" render={({ field }) => ( <FormItem className="space-y-1"><FormLabel className="text-xs">Costo/Litro</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} placeholder="150" onChange={(e) => field.onChange(toNumberOrEmpty(e.target.value))} /></FormControl><FormMessage /></FormItem> )}/>
                        </div>
                      </div>
                      <Separator />
                      <div className="space-y-3">
                         <div className="flex justify-between items-center"><h4 className="font-semibold text-sm">Filtros</h4>{renderDateField(methods.watch('insumos.filtroAceite.lastUpdated'))}</div>
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                          <FormField control={control} name="insumos.filtroAceite.sku" render={({ field }) => ( <FormItem className="space-y-1"><FormLabel className="text-xs">SKU Filtro Aceite</FormLabel><FormControl><Input {...field} value={field.value || ''} placeholder="W-123" /></FormControl><FormMessage /></FormItem> )}/>
                          <FormField control={control} name="insumos.filtroAceite.costoUnitario" render={({ field }) => ( <FormItem className="space-y-1"><FormLabel className="text-xs">Costo Filtro Aceite</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} placeholder="120" onChange={(e) => field.onChange(toNumberOrEmpty(e.target.value))} /></FormControl><FormMessage /></FormItem> )}/>
                          <FormField control={control} name="insumos.filtroAire.sku" render={({ field }) => ( <FormItem className="space-y-1"><FormLabel className="text-xs">SKU Filtro Aire</FormLabel><FormControl><Input {...field} value={field.value || ''} placeholder="A-456" /></FormControl><FormMessage /></FormItem> )}/>
                          <FormField control={control} name="insumos.filtroAire.costoUnitario" render={({ field }) => ( <FormItem className="space-y-1"><FormLabel className="text-xs">Costo Filtro Aire</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} placeholder="180" onChange={(e) => field.onChange(toNumberOrEmpty(e.target.value))} /></FormControl><FormMessage /></FormItem> )}/>
                        </div>
                      </div>
                      <Separator />
                      <div className="space-y-3">
                        <div className="flex justify-between items-center"><h4 className="font-semibold text-sm">Balatas</h4>{renderDateField(methods.watch('insumos.balatas.lastUpdated'))}</div>
                        <div className="space-y-2">
                            <h5 className="text-xs font-bold text-muted-foreground">DELANTERAS</h5>
                            {fieldsDelanteras.map((item, index) => (
                                <div key={item.id} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-center">
                                    <FormField control={control} name={`insumos.balatas.delanteras.${index}.modelo`} render={({ field }) => (<FormItem><FormControl><Input {...field} value={field.value || ''} placeholder="D1234"/></FormControl></FormItem>)}/>
                                    <FormField control={control} name={`insumos.balatas.delanteras.${index}.tipo`} render={({ field }) => (<FormItem><Select onValueChange={field.onChange} value={field.value || undefined}><FormControl><SelectTrigger><SelectValue placeholder="Tipo..."/></SelectTrigger></FormControl><SelectContent>{balataTipos.map(t => <SelectItem key={t} value={t}>{capitalizeWords(t)}</SelectItem>)}</SelectContent></Select></FormItem>)}/>
                                    <FormField control={control} name={`insumos.balatas.delanteras.${index}.costoJuego`} render={({ field }) => (<FormItem><FormControl><Input type="number" {...field} value={field.value ?? ''} placeholder="Costo" onChange={(e) => field.onChange(toNumberOrEmpty(e.target.value))}/></FormControl></FormItem>)}/>
                                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeDelantera(index)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                </div>
                            ))}
                             <Button type="button" size="sm" variant="outline" onClick={() => appendDelantera({ id: nanoid(), modelo: '', tipo: null, costoJuego: 0 })}><PlusCircle className="mr-2 h-4 w-4"/>Añadir Balata Delantera</Button>
                        </div>
                         <div className="space-y-2 pt-2">
                            <h5 className="text-xs font-bold text-muted-foreground">TRASERAS</h5>
                            {fieldsTraseras.map((item, index) => (
                                <div key={item.id} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-center">
                                    <FormField control={control} name={`insumos.balatas.traseras.${index}.modelo`} render={({ field }) => (<FormItem><FormControl><Input {...field} value={field.value || ''} placeholder="D5678"/></FormControl></FormItem>)}/>
                                    <FormField control={control} name={`insumos.balatas.traseras.${index}.tipo`} render={({ field }) => (<FormItem><Select onValueChange={field.onChange} value={field.value || undefined}><FormControl><SelectTrigger><SelectValue placeholder="Tipo..."/></SelectTrigger></FormControl><SelectContent>{balataTipos.map(t => <SelectItem key={t} value={t}>{capitalizeWords(t)}</SelectItem>)}</SelectContent></Select></FormItem>)}/>
                                    <FormField control={control} name={`insumos.balatas.traseras.${index}.costoJuego`} render={({ field }) => (<FormItem><FormControl><Input type="number" {...field} value={field.value ?? ''} placeholder="Costo" onChange={(e) => field.onChange(toNumberOrEmpty(e.target.value))}/></FormControl></FormItem>)}/>
                                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeTrasera(index)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                </div>
                            ))}
                             <Button type="button" size="sm" variant="outline" onClick={() => appendTrasera({ id: nanoid(), modelo: '', tipo: null, costoJuego: 0 })}><PlusCircle className="mr-2 h-4 w-4"/>Añadir Balata Trasera</Button>
                        </div>
                      </div>
                      <Separator />
                      <div className="space-y-3">
                        <div className="flex justify-between items-center"><h4 className="font-semibold text-sm">Bujías</h4>{renderDateField(methods.watch('insumos.bujias.lastUpdated'))}</div>
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                          <FormField control={control} name="insumos.bujias.cantidad" render={({ field }) => ( <FormItem className="space-y-1"><FormLabel className="text-xs">Cantidad</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} placeholder="4" onChange={(e) => field.onChange(toNumberOrEmpty(e.target.value))} /></FormControl><FormMessage /></FormItem> )}/>
                          <FormField control={control} name="insumos.bujias.modelos.cobre" render={({ field }) => ( <FormItem className="space-y-1"><FormLabel className="text-xs">SKU Cobre</FormLabel><FormControl><Input {...field} value={field.value || ''} placeholder="BKR5E-11" /></FormControl><FormMessage /></FormItem> )}/>
                          <FormField control={control} name="insumos.bujias.modelos.platino" render={({ field }) => ( <FormItem className="space-y-1"><FormLabel className="text-xs">SKU Platino</FormLabel><FormControl><Input {...field} value={field.value || ''} placeholder="PFR5G-11" /></FormControl><FormMessage /></FormItem> )}/>
                          <FormField control={control} name="insumos.bujias.modelos.iridio" render={({ field }) => ( <FormItem className="space-y-1"><FormLabel className="text-xs">SKU Iridio</FormLabel><FormControl><Input {...field} value={field.value || ''} placeholder="IK16" /></FormControl><FormMessage /></FormItem> )}/>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <FormField control={control} name="insumos.bujias.costoUnitario.cobre" render={({ field }) => ( <FormItem className="space-y-1"><FormLabel className="text-xs">Costo Unit. Cobre</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} placeholder="80" onChange={(e) => field.onChange(toNumberOrEmpty(e.target.value))} /></FormControl><FormMessage /></FormItem> )}/>
                          <FormField control={control} name="insumos.bujias.costoUnitario.platino" render={({ field }) => ( <FormItem className="space-y-1"><FormLabel className="text-xs">Costo Unit. Platino</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} placeholder="180" onChange={(e) => field.onChange(toNumberOrEmpty(e.target.value))} /></FormControl><FormMessage /></FormItem> )}/>
                          <FormField control={control} name="insumos.bujias.costoUnitario.iridio" render={({ field }) => ( <FormItem className="space-y-1"><FormLabel className="text-xs">Costo Unit. Iridio</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} placeholder="250" onChange={(e) => field.onChange(toNumberOrEmpty(e.target.value))} /></FormControl><FormMessage /></FormItem> )}/>
                        </div>
                      </div>
                      <Separator />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <FormField control={control} name="insumos.inyector.tipo" render={({ field }) => ( <FormItem className="space-y-1"><FormLabel className="text-xs">Tipo de Inyector</FormLabel><Select onValueChange={field.onChange} value={field.value || undefined}><FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl><SelectContent>{inyectorTipos.map((t) => ( <SelectItem key={t} value={t}>{t}</SelectItem> ))}</SelectContent></Select><FormMessage /></FormItem> )}/>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem
                    value="servicios"
                    className="border rounded-md px-4 bg-card"
                  >
                    <AccordionTrigger className="hover:no-underline font-semibold text-sm md:text-base">
                      Servicios
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-3">
                         <div className="space-y-3 border-b pb-4">
                            <h4 className="font-semibold text-sm">Afinación Integral</h4>
                            <div className="grid grid-cols-2 gap-3">
                                <FormField control={control} name="servicios.afinacionIntegral.costoInsumos" render={({ field }) => ( <FormItem className="space-y-1"><FormLabel className="text-xs">Costo Insumos</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} placeholder="850.00" onChange={(e) => field.onChange(toNumberOrEmpty(e.target.value))} /></FormControl><FormMessage /></FormItem> )}/>
                                <FormField control={control} name="servicios.afinacionIntegral.precioPublico" render={({ field }) => ( <FormItem className="space-y-1"><FormLabel className="text-xs">Precio Público</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} placeholder="1200.00" onChange={(e) => field.onChange(toNumberOrEmpty(e.target.value))} /></FormControl><FormMessage /></FormItem> )}/>
                            </div>
                            <Separator className="my-3"/>
                            <h5 className="font-semibold text-xs text-muted-foreground">Actualizaciones (Costo Adicional)</h5>
                            <div className="grid grid-cols-2 gap-3">
                                <FormField control={control} name="servicios.afinacionIntegral.upgrades.conAceiteSintetico" render={({ field }) => ( <FormItem className="space-y-1"><FormLabel className="text-xs">Aceite Sintético</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} placeholder="350" onChange={(e) => field.onChange(toNumberOrEmpty(e.target.value))} /></FormControl><FormMessage /></FormItem> )}/>
                                <FormField control={control} name="servicios.afinacionIntegral.upgrades.conAceiteMobil" render={({ field }) => ( <FormItem className="space-y-1"><FormLabel className="text-xs">Aceite Mobil</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} placeholder="550" onChange={(e) => field.onChange(toNumberOrEmpty(e.target.value))} /></FormControl><FormMessage /></FormItem> )}/>
                                <FormField control={control} name="servicios.afinacionIntegral.upgrades.conBujiasPlatino" render={({ field }) => ( <FormItem className="space-y-1"><FormLabel className="text-xs">Bujías de Platino</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} placeholder="400" onChange={(e) => field.onChange(toNumberOrEmpty(e.target.value))} /></FormControl><FormMessage /></FormItem> )}/>
                                <FormField control={control} name="servicios.afinacionIntegral.upgrades.conBujiasIridio" render={({ field }) => ( <FormItem className="space-y-1"><FormLabel className="text-xs">Bujías de Iridio</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} placeholder="700" onChange={(e) => field.onChange(toNumberOrEmpty(e.target.value))} /></FormControl><FormMessage /></FormItem> )}/>
                            </div>
                        </div>

                      {[
                        { name: "cambioAceite", label: "Cambio de Aceite" },
                        { name: "balatasDelanteras", label: "Balatas Delanteras" },
                        { name: "balatasTraseras", label: "Balatas Traseras" },
                      ].map((service) => (
                        <div
                          key={service.name}
                          className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-b pb-3 last:border-b-0 last:pb-0"
                        >
                          <div className="sm:col-span-2">
                            <h4 className="font-semibold text-sm">
                              {service.label}
                            </h4>
                          </div>
                          <FormField
                            control={control}
                            name={`servicios.${service.name}.costoInsumos` as const}
                            render={({ field }) => (
                              <FormItem className="space-y-1">
                                <FormLabel className="text-xs">
                                  Costo Insumos
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    {...field}
                                    value={field.value ?? ''}
                                    placeholder="0.00"
                                    onChange={(e) =>
                                      field.onChange(toNumberOrEmpty(e.target.value))
                                    }
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={control}
                            name={`servicios.${service.name}.precioPublico` as const}
                            render={({ field }) => (
                              <FormItem className="space-y-1">
                                <FormLabel className="text-xs">
                                  Precio Público
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    {...field}
                                    value={field.value ?? ''}
                                    placeholder="0.00"
                                    onChange={(e) =>
                                      field.onChange(toNumberOrEmpty(e.target.value))
                                    }
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      ))}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </ScrollArea>
              <DialogFooter className="px-6 py-4 border-t bg-card/60 backdrop-blur">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" form="edit-engine-form" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
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
