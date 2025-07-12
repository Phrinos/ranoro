

"use client";

import { useFieldArray, useFormContext } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Controller } from "react-hook-form";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { CalendarIcon, PlusCircle, BrainCircuit, Loader2 } from "lucide-react";
import { ServiceItemCard } from './ServiceItemCard';
import { Separator } from "@/components/ui/separator";
import type { ServiceFormValues } from "./service-form";
import type { Technician, InventoryItem, ServiceTypeRecord } from "@/types";
import { cn } from "@/lib/utils";
import { format, setHours, setMinutes, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { useState, useEffect, useMemo } from 'react';
import { formatCurrency } from "@/lib/utils";

interface ServiceDetailsCardProps {
  isReadOnly?: boolean;
  technicians: Technician[];
  inventoryItems: InventoryItem[];
  serviceTypes: ServiceTypeRecord[];
  mode: 'service' | 'quote';
  totalCost: number;
  totalSuppliesWorkshopCost: number;
  serviceProfit: number;
  onGenerateQuoteWithAI: () => void;
  isGeneratingQuote: boolean;
}

export function ServiceDetailsCard({
  isReadOnly,
  technicians,
  inventoryItems,
  serviceTypes,
  mode,
  totalCost,
  totalSuppliesWorkshopCost,
  serviceProfit,
  onGenerateQuoteWithAI,
  isGeneratingQuote,
}: ServiceDetailsCardProps) {
  const { control, watch, setValue } = useFormContext<ServiceFormValues>();
  const { fields: serviceItemsFields, append: appendServiceItem, remove: removeServiceItem } = useFieldArray({ control, name: "serviceItems" });
  
  const watchedStatus = watch('status');
  const serviceDate = watch('serviceDate');

  const [isServiceDatePickerOpen, setIsServiceDatePickerOpen] = useState(false);
  
  const handleServiceTypeChange = (value: string) => {
    setValue('serviceType', value);
    if (serviceItemsFields.length > 0) {
      setValue(`serviceItems.0.name`, value, { shouldDirty: true });
    }
  };
  
  const showAppointmentFields = useMemo(() => {
    // Show if the status is one that implies an appointment, including quotes.
    return ['Cotizacion', 'Agendado', 'En Taller', 'Entregado', 'Cancelado'].includes(watchedStatus || '');
  }, [watchedStatus]);


  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Detalles del Servicio</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField control={control} name="status" render={({ field }) => ( <FormItem><FormLabel>Estado</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly || watchedStatus === 'Entregado'}><FormControl><SelectTrigger className="font-bold"><SelectValue placeholder="Seleccione un estado" /></SelectTrigger></FormControl><SelectContent>{["Cotizacion", "Agendado", "En Taller", "Entregado"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )}/>
          {watchedStatus === 'En Taller' && (
              <FormField control={control} name="subStatus" render={({ field }) => ( <FormItem><FormLabel>Sub-Estado Taller</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly}><FormControl><SelectTrigger><SelectValue placeholder="Seleccione sub-estado..." /></SelectTrigger></FormControl><SelectContent>{["En Espera de Refacciones", "Reparando", "Completado"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></FormItem> )}/>
          )}
          <FormField control={control} name="serviceType" render={({ field }) => ( <FormItem><FormLabel>Tipo de Servicio</FormLabel><Select onValueChange={handleServiceTypeChange} value={field.value || 'Servicio General'} disabled={isReadOnly}><FormControl><SelectTrigger><SelectValue placeholder="Seleccione un tipo" /></SelectTrigger></FormControl><SelectContent>{serviceTypes.map((type) => <SelectItem key={type.id} value={type.name}>{type.name}</SelectItem>)}</SelectContent></Select></FormItem> )}/>
          <FormField control={control} name="technicianId" render={({ field }) => ( <FormItem><FormLabel>Técnico Asignado</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly}><FormControl><SelectTrigger><SelectValue placeholder="Seleccione un técnico..." /></SelectTrigger></FormControl><SelectContent>{technicians.filter((t) => !t.isArchived).map((technician) => ( <SelectItem key={technician.id} value={technician.id}>{technician.name} - {technician.specialty}</SelectItem> ))}</SelectContent></Select><FormMessage /></FormItem> )}/>
        </div>
        
        {showAppointmentFields && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t items-end">
                <Controller name="serviceDate" control={control} render={({ field }) => ( <FormItem className="flex flex-col"><FormLabel>Fecha y Hora de Cita</FormLabel><Popover open={isServiceDatePickerOpen} onOpenChange={setIsServiceDatePickerOpen}><PopoverTrigger asChild disabled={isReadOnly}><Button variant="outline" className={cn("justify-start text-left font-normal", !field.value && "text-muted-foreground")} disabled={isReadOnly}>{field.value ? format(field.value, "PPP", { locale: es }) : <span>Seleccione fecha</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={(date) => { field.onChange(date ? setMinutes(setHours(date, (field.value || new Date()).getHours()), (field.value || new Date()).getMinutes()) : new Date()); setIsServiceDatePickerOpen(false); }} disabled={isReadOnly} initialFocus locale={es}/></PopoverContent></Popover></FormItem> )}/>
                <Controller name="serviceDate" control={control} render={({ field }) => ( <FormItem><FormControl><Input type="time" value={field.value && isValid(field.value) ? format(field.value, 'HH:mm') : ""} onChange={(e) => { if (!e.target.value) return; const [h, m] = e.target.value.split(':').map(Number); field.onChange(setMinutes(setHours(field.value || new Date(), h), m)); }} disabled={isReadOnly}/></FormControl></FormItem> )}/>
            </div>
        )}

        <Separator className="my-6"/>

        <div className="space-y-4">
          {serviceItemsFields.map((field, index) => <ServiceItemCard key={field.id} serviceIndex={index} control={control} removeServiceItem={removeServiceItem} isReadOnly={isReadOnly} inventoryItems={inventoryItems} mode={mode} />)}
          {!isReadOnly && (<Button type="button" variant="outline" onClick={() => appendServiceItem({ id: `item_${Date.now()}`, name: '', price: undefined, suppliesUsed: [] })}><PlusCircle className="mr-2 h-4 w-4"/> Añadir Trabajo</Button>)}
          {mode === 'quote' && !isReadOnly && (<Button type="button" variant="secondary" onClick={onGenerateQuoteWithAI} disabled={isGeneratingQuote}>{isGeneratingQuote ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BrainCircuit className="mr-2 h-4 w-4" />}Sugerir Cotización con IA</Button>)}
        </div>

        <Separator className="my-6"/>
        
        <div>
          <h4 className="text-base font-semibold mb-2">Costo del Servicio</h4>
          <div className="space-y-1 text-sm"><div className="flex justify-between font-bold text-lg text-primary"><span>Total (IVA Inc.):</span><span>{formatCurrency(totalCost)}</span></div><div className="flex justify-between text-xs"><span>(-) Costo Insumos:</span><span className="font-medium text-red-600 dark:text-red-400">{formatCurrency(totalSuppliesWorkshopCost)}</span></div><hr className="my-1 border-dashed"/><div className="flex justify-between font-bold text-green-700 dark:text-green-400"><span>(=) Ganancia:</span><span>{formatCurrency(serviceProfit)}</span></div></div>
        </div>
      </CardContent>
    </Card>
  );
}
