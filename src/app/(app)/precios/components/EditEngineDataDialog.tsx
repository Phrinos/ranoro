// src/app/(app)/precios/components/EditEngineDataDialog.tsx
"use client";

import React from "react";
import { useForm, FormProvider } from "react-hook-form";
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
import { Loader2, Save } from "lucide-react";
import type { EngineData } from "@/lib/data/vehicle-database-types";
import { capitalizeWords } from "@/lib/utils";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

interface EditEngineDataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  engineData: EngineData;
  onSave: (data: EngineData) => void;
}

const toNumber = (value: any): number | undefined => {
    if (value === "" || value === null || value === undefined) return undefined;
    const n = Number(String(value).replace(/[^0-9.-]/g, ""));
    return isNaN(n) ? undefined : n;
};

const buildDefaults = (e: EngineData): EngineDataFormValues => ({
  name: e?.name ?? "",
  insumos: {
    aceite: {
      grado: e?.insumos?.aceite?.grado ?? "",
      litros: e?.insumos?.aceite?.litros ?? undefined,
      costoUnitario: e?.insumos?.aceite?.costoUnitario ?? undefined,
    },
    filtroAceite: {
      sku: e?.insumos?.filtroAceite?.sku ?? "",
      costoUnitario: e?.insumos?.filtroAceite?.costoUnitario ?? undefined,
    },
    filtroAire: {
      sku: e?.insumos?.filtroAire?.sku ?? "",
      costoUnitario: e?.insumos?.filtroAire?.costoUnitario ?? undefined,
    },
    balatas: {
      delanteras: {
        modelo: e?.insumos?.balatas?.delanteras?.modelo ?? "",
        tipo: (e?.insumos?.balatas?.delanteras?.tipo as any) ?? null,
        costoJuego: e?.insumos?.balatas?.delanteras?.costoJuego ?? undefined,
      },
      traseras: {
        modelo: e?.insumos?.balatas?.traseras?.modelo ?? "",
        tipo: (e?.insumos?.balatas?.traseras?.tipo as any) ?? null,
        costoJuego: e?.insumos?.balatas?.traseras?.costoJuego ?? undefined,
      },
    },
    bujias: {
      cantidad: e?.insumos?.bujias?.cantidad ?? undefined,
      modelos: {
        cobre: e?.insumos?.bujias?.modelos?.cobre ?? "",
        platino: e?.insumos?.bujias?.modelos?.platino ?? "",
        iridio: e?.insumos?.bujias?.modelos?.iridio ?? "",
      },
      costoUnitario: {
        cobre: e?.insumos?.bujias?.costoUnitario?.cobre ?? undefined,
        platino: e?.insumos?.bujias?.costoUnitario?.platino ?? undefined,
        iridio: e?.insumos?.bujias?.costoUnitario?.iridio ?? undefined,
      },
    },
    inyector: {
      tipo: (e?.insumos?.inyector?.tipo as any) ?? null,
    },
  },
  servicios: {
    afinacionIntegral: {
      costoInsumos: e?.servicios?.afinacionIntegral?.costoInsumos ?? undefined,
      precioPublico: e?.servicios?.afinacionIntegral?.precioPublico ?? undefined,
      upgrades: {
        conAceiteSintetico: e?.servicios?.afinacionIntegral?.upgrades?.conAceiteSintetico ?? undefined,
        conAceiteMobil: e?.servicios?.afinacionIntegral?.upgrades?.conAceiteMobil ?? undefined,
        conBujiasPlatino: e?.servicios?.afinacionIntegral?.upgrades?.conBujiasPlatino ?? undefined,
        conBujiasIridio: e?.servicios?.afinacionIntegral?.upgrades?.conBujiasIridio ?? undefined,
      }
    },
    cambioAceite: {
      costoInsumos: e?.servicios?.cambioAceite?.costoInsumos ?? undefined,
      precioPublico: e?.servicios?.cambioAceite?.precioPublico ?? undefined,
    },
    balatasDelanteras: {
      costoInsumos: e?.servicios?.balatasDelanteras?.costoInsumos ?? undefined,
      precioPublico:
        e?.servicios?.balatasDelanteras?.precioPublico ?? undefined,
    },
    balatasTraseras: {
      costoInsumos: e?.servicios?.balatasTraseras?.costoInsumos ?? undefined,
      precioPublico: e?.servicios?.balatasTraseras?.precioPublico ?? undefined,
    },
  },
});

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

  const processSubmit = (data: EngineDataFormValues) => {
    onSave(data as EngineData);
  };

  const balataTipos = ["metalicas", "semimetalicas", "ceramica", "organica"];
  const inyectorTipos = ["Normal", "Piezoelectrico", "GDI"];

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
                  {/* INSUMOS */}
                  <AccordionItem
                    value="insumos"
                    className="border rounded-md px-4 bg-card"
                  >
                    <AccordionTrigger className="hover:no-underline font-semibold text-sm md:text-base">
                      Insumos
                    </AccordionTrigger>
                    <AccordionContent className="space-y-5 pt-3">
                      {/* ... (Contenido de Insumos sin cambios) ... */}
                       <div className="space-y-3">
                        <h4 className="font-semibold text-sm">Aceite</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <FormField control={control} name="insumos.aceite.grado" render={({ field }) => ( <FormItem className="space-y-1"><FormLabel className="text-xs">Grado</FormLabel><FormControl><Input {...field} placeholder="10W30" /></FormControl><FormMessage /></FormItem> )}/>
                          <FormField control={control} name="insumos.aceite.litros" render={({ field }) => ( <FormItem className="space-y-1"><FormLabel className="text-xs">Litros</FormLabel><FormControl><Input type="number" {...field} placeholder="4.5" onChange={(e) => field.onChange(toNumber(e.target.value))} /></FormControl><FormMessage /></FormItem> )}/>
                          <FormField control={control} name="insumos.aceite.costoUnitario" render={({ field }) => ( <FormItem className="space-y-1"><FormLabel className="text-xs">Costo/Litro</FormLabel><FormControl><Input type="number" {...field} placeholder="150" onChange={(e) => field.onChange(toNumber(e.target.value))} /></FormControl><FormMessage /></FormItem> )}/>
                        </div>
                      </div>
                      <Separator />
                      <div className="space-y-3">
                        <h4 className="font-semibold text-sm">Filtros</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                          <FormField control={control} name="insumos.filtroAceite.sku" render={({ field }) => ( <FormItem className="space-y-1"><FormLabel className="text-xs">SKU Filtro Aceite</FormLabel><FormControl><Input {...field} placeholder="W-123" /></FormControl><FormMessage /></FormItem> )}/>
                          <FormField control={control} name="insumos.filtroAceite.costoUnitario" render={({ field }) => ( <FormItem className="space-y-1"><FormLabel className="text-xs">Costo Filtro Aceite</FormLabel><FormControl><Input type="number" {...field} placeholder="120" onChange={(e) => field.onChange(toNumber(e.target.value))} /></FormControl><FormMessage /></FormItem> )}/>
                          <FormField control={control} name="insumos.filtroAire.sku" render={({ field }) => ( <FormItem className="space-y-1"><FormLabel className="text-xs">SKU Filtro Aire</FormLabel><FormControl><Input {...field} placeholder="A-456" /></FormControl><FormMessage /></FormItem> )}/>
                          <FormField control={control} name="insumos.filtroAire.costoUnitario" render={({ field }) => ( <FormItem className="space-y-1"><FormLabel className="text-xs">Costo Filtro Aire</FormLabel><FormControl><Input type="number" {...field} placeholder="180" onChange={(e) => field.onChange(toNumber(e.target.value))} /></FormControl><FormMessage /></FormItem> )}/>
                        </div>
                      </div>
                      <Separator />
                      <div className="space-y-3">
                        <h4 className="font-semibold text-sm">Balatas</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <FormField control={control} name="insumos.balatas.delanteras.modelo" render={({ field }) => ( <FormItem className="space-y-1"><FormLabel className="text-xs">Modelo Delanteras</FormLabel><FormControl><Input {...field} placeholder="D1234" /></FormControl><FormMessage /></FormItem> )}/>
                          <FormField control={control} name="insumos.balatas.delanteras.tipo" render={({ field }) => ( <FormItem className="space-y-1"><FormLabel className="text-xs">Tipo Delanteras</FormLabel><Select onValueChange={field.onChange} value={field.value || undefined}><FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl><SelectContent>{balataTipos.map((t) => ( <SelectItem key={t} value={t}>{capitalizeWords(t)}</SelectItem> ))}</SelectContent></Select><FormMessage /></FormItem> )}/>
                          <FormField control={control} name="insumos.balatas.delanteras.costoJuego" render={({ field }) => ( <FormItem className="space-y-1"><FormLabel className="text-xs">Costo Juego Delanteras</FormLabel><FormControl><Input type="number" {...field} placeholder="650" onChange={(e) => field.onChange(toNumber(e.target.value))} /></FormControl><FormMessage /></FormItem> )}/>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <FormField control={control} name="insumos.balatas.traseras.modelo" render={({ field }) => ( <FormItem className="space-y-1"><FormLabel className="text-xs">Modelo Traseras</FormLabel><FormControl><Input {...field} placeholder="D5678" /></FormControl><FormMessage /></FormItem> )}/>
                          <FormField control={control} name="insumos.balatas.traseras.tipo" render={({ field }) => ( <FormItem className="space-y-1"><FormLabel className="text-xs">Tipo Traseras</FormLabel><Select onValueChange={field.onChange} value={field.value || undefined}><FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl><SelectContent>{balataTipos.map((t) => ( <SelectItem key={t} value={t}>{capitalizeWords(t)}</SelectItem> ))}</SelectContent></Select><FormMessage /></FormItem> )}/>
                          <FormField control={control} name="insumos.balatas.traseras.costoJuego" render={({ field }) => ( <FormItem className="space-y-1"><FormLabel className="text-xs">Costo Juego Traseras</FormLabel><FormControl><Input type="number" {...field} placeholder="620" onChange={(e) => field.onChange(toNumber(e.target.value))} /></FormControl><FormMessage /></FormItem> )}/>
                        </div>
                      </div>
                      <Separator />
                      <div className="space-y-3">
                        <h4 className="font-semibold text-sm">Bujías</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                          <FormField control={control} name="insumos.bujias.cantidad" render={({ field }) => ( <FormItem className="space-y-1"><FormLabel className="text-xs">Cantidad</FormLabel><FormControl><Input type="number" {...field} placeholder="4" onChange={(e) => field.onChange(toNumber(e.target.value))} /></FormControl><FormMessage /></FormItem> )}/>
                          <FormField control={control} name="insumos.bujias.modelos.cobre" render={({ field }) => ( <FormItem className="space-y-1"><FormLabel className="text-xs">SKU Cobre</FormLabel><FormControl><Input {...field} placeholder="BKR5E-11" /></FormControl><FormMessage /></FormItem> )}/>
                          <FormField control={control} name="insumos.bujias.modelos.platino" render={({ field }) => ( <FormItem className="space-y-1"><FormLabel className="text-xs">SKU Platino</FormLabel><FormControl><Input {...field} placeholder="PFR5G-11" /></FormControl><FormMessage /></FormItem> )}/>
                          <FormField control={control} name="insumos.bujias.modelos.iridio" render={({ field }) => ( <FormItem className="space-y-1"><FormLabel className="text-xs">SKU Iridio</FormLabel><FormControl><Input {...field} placeholder="IK16" /></FormControl><FormMessage /></FormItem> )}/>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <FormField control={control} name="insumos.bujias.costoUnitario.cobre" render={({ field }) => ( <FormItem className="space-y-1"><FormLabel className="text-xs">Costo Unit. Cobre</FormLabel><FormControl><Input type="number" {...field} placeholder="80" onChange={(e) => field.onChange(toNumber(e.target.value))} /></FormControl><FormMessage /></FormItem> )}/>
                          <FormField control={control} name="insumos.bujias.costoUnitario.platino" render={({ field }) => ( <FormItem className="space-y-1"><FormLabel className="text-xs">Costo Unit. Platino</FormLabel><FormControl><Input type="number" {...field} placeholder="180" onChange={(e) => field.onChange(toNumber(e.target.value))} /></FormControl><FormMessage /></FormItem> )}/>
                          <FormField control={control} name="insumos.bujias.costoUnitario.iridio" render={({ field }) => ( <FormItem className="space-y-1"><FormLabel className="text-xs">Costo Unit. Iridio</FormLabel><FormControl><Input type="number" {...field} placeholder="250" onChange={(e) => field.onChange(toNumber(e.target.value))} /></FormControl><FormMessage /></FormItem> )}/>
                        </div>
                      </div>
                      <Separator />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <FormField control={control} name="insumos.inyector.tipo" render={({ field }) => ( <FormItem className="space-y-1"><FormLabel className="text-xs">Tipo de Inyector</FormLabel><Select onValueChange={field.onChange} value={field.value || undefined}><FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl><SelectContent>{inyectorTipos.map((t) => ( <SelectItem key={t} value={t}>{t}</SelectItem> ))}</SelectContent></Select><FormMessage /></FormItem> )}/>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* SERVICIOS */}
                  <AccordionItem
                    value="servicios"
                    className="border rounded-md px-4 bg-card"
                  >
                    <AccordionTrigger className="hover:no-underline font-semibold text-sm md:text-base">
                      Servicios
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-3">
                        {/* AFINACION INTEGRAL - CON NUEVA SECCION */}
                        <div className="space-y-3 border-b pb-4">
                            <h4 className="font-semibold text-sm">Afinación Integral</h4>
                            <div className="grid grid-cols-2 gap-3">
                                <FormField control={control} name="servicios.afinacionIntegral.costoInsumos" render={({ field }) => ( <FormItem className="space-y-1"><FormLabel className="text-xs">Costo Insumos</FormLabel><FormControl><Input type="number" {...field} placeholder="850.00" onChange={(e) => field.onChange(toNumber(e.target.value))} /></FormControl><FormMessage /></FormItem> )}/>
                                <FormField control={control} name="servicios.afinacionIntegral.precioPublico" render={({ field }) => ( <FormItem className="space-y-1"><FormLabel className="text-xs">Precio Público</FormLabel><FormControl><Input type="number" {...field} placeholder="1200.00" onChange={(e) => field.onChange(toNumber(e.target.value))} /></FormControl><FormMessage /></FormItem> )}/>
                            </div>
                            <Separator className="my-3"/>
                            <h5 className="font-semibold text-xs text-muted-foreground">Actualizaciones (Costo Adicional)</h5>
                            <div className="grid grid-cols-2 gap-3">
                                <FormField control={control} name="servicios.afinacionIntegral.upgrades.conAceiteSintetico" render={({ field }) => ( <FormItem className="space-y-1"><FormLabel className="text-xs">Aceite Sintético</FormLabel><FormControl><Input type="number" {...field} placeholder="350" onChange={(e) => field.onChange(toNumber(e.target.value))} /></FormControl><FormMessage /></FormItem> )}/>
                                <FormField control={control} name="servicios.afinacionIntegral.upgrades.conAceiteMobil" render={({ field }) => ( <FormItem className="space-y-1"><FormLabel className="text-xs">Aceite Mobil</FormLabel><FormControl><Input type="number" {...field} placeholder="550" onChange={(e) => field.onChange(toNumber(e.target.value))} /></FormControl><FormMessage /></FormItem> )}/>
                                <FormField control={control} name="servicios.afinacionIntegral.upgrades.conBujiasPlatino" render={({ field }) => ( <FormItem className="space-y-1"><FormLabel className="text-xs">Bujías de Platino</FormLabel><FormControl><Input type="number" {...field} placeholder="400" onChange={(e) => field.onChange(toNumber(e.target.value))} /></FormControl><FormMessage /></FormItem> )}/>
                                <FormField control={control} name="servicios.afinacionIntegral.upgrades.conBujiasIridio" render={({ field }) => ( <FormItem className="space-y-1"><FormLabel className="text-xs">Bujías de Iridio</FormLabel><FormControl><Input type="number" {...field} placeholder="700" onChange={(e) => field.onChange(toNumber(e.target.value))} /></FormControl><FormMessage /></FormItem> )}/>
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
                            name={`servicios.${service.name}.costoInsumos`}
                            render={({ field }) => (
                              <FormItem className="space-y-1">
                                <FormLabel className="text-xs">
                                  Costo Insumos
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    {...field}
                                    placeholder="0.00"
                                    onChange={(e) =>
                                      field.onChange(toNumber(e.target.value))
                                    }
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={control}
                            name={`servicios.${service.name}.precioPublico`}
                            render={({ field }) => (
                              <FormItem className="space-y-1">
                                <FormLabel className="text-xs">
                                  Precio Público
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    {...field}
                                    placeholder="0.00"
                                    onChange={(e) =>
                                      field.onChange(toNumber(e.target.value))
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
