// src/app/(app)/precios/components/EditEngineDataDialog.tsx
"use client";

import React from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { engineDataSchema, type EngineDataFormValues } from '@/schemas/engine-data-form-schema';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Loader2, Save } from 'lucide-react';
import type { EngineData } from '@/lib/data/vehicle-database-types';
import { capitalizeWords, formatCurrency } from '@/lib/utils';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';

interface EditEngineDataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  engineData: EngineData;
  onSave: (data: EngineData) => void;
}

const toNumber = (value: any) => {
    const num = Number(String(value).replace(/[^0-9.-]/g, ''));
    return isNaN(num) ? 0 : num;
};

export function EditEngineDataDialog({ open, onOpenChange, engineData, onSave }: EditEngineDataDialogProps) {
  const methods = useForm<EngineDataFormValues>({
    resolver: zodResolver(engineDataSchema),
    defaultValues: engineData,
  });

  const { handleSubmit, formState: { isSubmitting } } = methods;

  const processSubmit = (data: EngineDataFormValues) => {
    onSave(data as EngineData);
  };
  
  const balataTipos = ['metalicas', 'semimetalicas', 'ceramica', 'organica'];
  const inyectorTipos = ['Normal', 'Piezoelectrico', 'GDI'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle>Editar Datos del Motor: {engineData.name}</DialogTitle>
          <DialogDescription>Modifica los costos y detalles de insumos y servicios.</DialogDescription>
        </DialogHeader>
        <FormProvider {...methods}>
          <Form {...methods}>
            <form id="edit-engine-form" onSubmit={handleSubmit(processSubmit)}>
              <ScrollArea className="max-h-[70vh] p-6">
                <Accordion type="multiple" defaultValue={["insumos", "servicios"]} className="w-full space-y-4">
                  
                  {/* INSUMOS */}
                  <AccordionItem value="insumos" className="border rounded-md px-4 bg-card">
                    <AccordionTrigger className="hover:no-underline font-semibold text-lg">Insumos</AccordionTrigger>
                    <AccordionContent className="space-y-6 pt-4">
                        {/* Aceite */}
                        <Separator />
                        <h4 className="font-semibold">Aceite</h4>
                        <div className="grid grid-cols-3 gap-4">
                           <FormField control={methods.control} name="insumos.aceite.grado" render={({ field }) => ( <FormItem><FormLabel>Grado</FormLabel><FormControl><Input {...field} placeholder="10W30" /></FormControl></FormItem> )}/>
                           <FormField control={methods.control} name="insumos.aceite.litros" render={({ field }) => ( <FormItem><FormLabel>Litros</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(toNumber(e.target.value))} /></FormControl></FormItem> )}/>
                           <FormField control={methods.control} name="insumos.aceite.costoUnitario" render={({ field }) => ( <FormItem><FormLabel>Costo/Litro</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(toNumber(e.target.value))} /></FormControl></FormItem> )}/>
                        </div>
                        {/* Filtros */}
                         <Separator />
                        <h4 className="font-semibold">Filtros</h4>
                        <div className="grid grid-cols-2 gap-4">
                           <FormField control={methods.control} name="insumos.filtroAceite.sku" render={({ field }) => ( <FormItem><FormLabel>SKU Filtro Aceite</FormLabel><FormControl><Input {...field} /></FormControl></FormItem> )}/>
                           <FormField control={methods.control} name="insumos.filtroAire.sku" render={({ field }) => ( <FormItem><FormLabel>SKU Filtro Aire</FormLabel><FormControl><Input {...field} /></FormControl></FormItem> )}/>
                        </div>
                        {/* Balatas */}
                        <Separator />
                        <h4 className="font-semibold">Balatas</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <FormField control={methods.control} name="insumos.balatas.delanteras.modelo" render={({ field }) => ( <FormItem><FormLabel>Modelo Delanteras</FormLabel><FormControl><Input {...field} /></FormControl></FormItem> )}/>
                          <FormField control={methods.control} name="insumos.balatas.delanteras.tipo" render={({ field }) => ( <FormItem><FormLabel>Tipo Delanteras</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>{balataTipos.map(t => <SelectItem key={t} value={t}>{capitalizeWords(t)}</SelectItem>)}</SelectContent></Select></FormItem> )}/>
                          <FormField control={methods.control} name="insumos.balatas.traseras.modelo" render={({ field }) => ( <FormItem><FormLabel>Modelo Traseras</FormLabel><FormControl><Input {...field} /></FormControl></FormItem> )}/>
                          <FormField control={methods.control} name="insumos.balatas.traseras.tipo" render={({ field }) => ( <FormItem><FormLabel>Tipo Traseras</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>{balataTipos.map(t => <SelectItem key={t} value={t}>{capitalizeWords(t)}</SelectItem>)}</SelectContent></Select></FormItem> )}/>
                        </div>
                         {/* Bujías */}
                        <Separator />
                        <h4 className="font-semibold">Bujías</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <FormField control={methods.control} name="insumos.bujias.cantidad" render={({ field }) => ( <FormItem><FormLabel>Cantidad</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(toNumber(e.target.value))} /></FormControl></FormItem> )}/>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <FormField control={methods.control} name="insumos.bujias.modelos.cobre" render={({ field }) => ( <FormItem><FormLabel>SKU Cobre</FormLabel><FormControl><Input {...field} /></FormControl></FormItem> )}/>
                          <FormField control={methods.control} name="insumos.bujias.modelos.platino" render={({ field }) => ( <FormItem><FormLabel>SKU Platino</FormLabel><FormControl><Input {...field} /></FormControl></FormItem> )}/>
                          <FormField control={methods.control} name="insumos.bujias.modelos.iridio" render={({ field }) => ( <FormItem><FormLabel>SKU Iridio</FormLabel><FormControl><Input {...field} /></FormControl></FormItem> )}/>
                        </div>
                        {/* Inyector */}
                        <Separator />
                        <FormField control={methods.control} name="insumos.inyector.tipo" render={({ field }) => ( <FormItem><FormLabel>Tipo de Inyector</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>{inyectorTipos.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></FormItem> )}/>
                    </AccordionContent>
                  </AccordionItem>
                  
                  {/* SERVICIOS */}
                  <AccordionItem value="servicios" className="border rounded-md px-4 bg-card">
                    <AccordionTrigger className="hover:no-underline font-semibold text-lg">Servicios</AccordionTrigger>
                    <AccordionContent className="space-y-6 pt-4">
                       {[
                         { name: 'afinacionIntegral', label: 'Afinación Integral' },
                         { name: 'cambioAceite', label: 'Cambio de Aceite' },
                         { name: 'balatasDelanteras', label: 'Balatas Delanteras' },
                         { name: 'balatasTraseras', label: 'Balatas Traseras' },
                       ].map(service => (
                           <div key={service.name} className="space-y-4 border-b pb-4 last:border-b-0 last:pb-0">
                                <h4 className="font-semibold">{service.label}</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField control={methods.control} name={`servicios.${service.name}.costoInsumos`} render={({ field }) => ( <FormItem><FormLabel>Costo Insumos</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(toNumber(e.target.value))}/></FormControl></FormItem> )}/>
                                    <FormField control={methods.control} name={`servicios.${service.name}.precioPublico`} render={({ field }) => ( <FormItem><FormLabel>Precio Público</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(toNumber(e.target.value))}/></FormControl></FormItem> )}/>
                                </div>
                           </div>
                       ))}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </ScrollArea>
            </form>
          </Form>
        </FormProvider>
        <DialogFooter className="p-6 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" form="edit-engine-form" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
                Guardar Cambios
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
