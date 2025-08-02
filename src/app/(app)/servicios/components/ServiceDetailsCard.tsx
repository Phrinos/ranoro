

"use client";

import { useFormContext, type Control } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import type { ServiceFormValues } from "@/schemas/service-form";
import type { Technician, InventoryItem, ServiceTypeRecord, InventoryCategory, Supplier, Personnel, User } from "@/types";
import { cn } from "@/lib/utils";
import { format, setHours, setMinutes, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { useState, useEffect, useMemo } from 'react';
import { formatCurrency } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import type { InventoryItemFormValues } from "../../inventario/components/inventory-item-form";

interface ServiceDetailsCardProps {
  isReadOnly?: boolean;
  technicians: User[];
  inventoryItems: InventoryItem[];
  serviceTypes: ServiceTypeRecord[];
  mode: 'service' | 'quote';
  onGenerateQuoteWithAI: () => void;
  isGeneratingQuote: boolean;
  isEnhancingText?: string | null;
  handleEnhanceText?: (fieldName: keyof ServiceFormValues | `serviceItems.${number}.suppliesUsed.${number}.description`) => void;
  onNewInventoryItemCreated: (formData: InventoryItemFormValues) => Promise<InventoryItem>;
  categories: InventoryCategory[];
  suppliers: Supplier[];
}

export function ServiceDetailsCard({
  isReadOnly,
  technicians,
  inventoryItems,
  serviceTypes,
  mode,
  onGenerateQuoteWithAI,
  isGeneratingQuote,
  isEnhancingText,
  handleEnhanceText,
  onNewInventoryItemCreated,
  categories,
  suppliers
}: ServiceDetailsCardProps) {
  const { control, watch, setValue, getValues, formState: { errors } } = useFormContext<ServiceFormValues>();
  const { fields: serviceItemsFields, append: appendServiceItem, remove: removeServiceItem } = useFieldArray({ control, name: "serviceItems" });
  
  const watchedStatus = watch('status');
  const serviceId = watch('id');

  const [isServiceDatePickerOpen, setIsServiceDatePickerOpen] = useState(false);
  
  const handleServiceTypeChange = (value: string) => {
    setValue('serviceType', value);
    if (serviceItemsFields.length > 0) {
      setValue(`serviceItems.0.name`, value, { shouldDirty: true });
    }
  };
  
  const showAppointmentFields = useMemo(() => {
    return watchedStatus === 'Agendado';
  }, [watchedStatus]);

  const showTechnicianField = useMemo(() => {
    return watchedStatus === 'En Taller' || watchedStatus === 'Entregado';
  }, [watchedStatus]);

  const showTimePicker = useMemo(() => {
    return watchedStatus === 'Agendado';
  }, [watchedStatus]);


  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Detalles del Servicio</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          <div className="space-y-4">
             <FormField control={control} name="status" render={({ field }) => ( <FormItem><FormLabel className={cn(errors.status && "text-destructive")}>Estado</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly || watchedStatus === 'Entregado'}><FormControl><SelectTrigger className={cn("font-bold", errors.status && "border-destructive focus-visible:ring-destructive")}><SelectValue placeholder="Seleccione un estado" /></SelectTrigger></FormControl><SelectContent>{["Cotizacion", "Agendado", "En Taller", "Entregado"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></FormItem> )}/>
            {watchedStatus === 'En Taller' && (
                <FormField control={control} name="subStatus" render={({ field }) => ( <FormItem><FormLabel>Sub-Estado Taller</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly}><FormControl><SelectTrigger><SelectValue placeholder="Seleccione sub-estado..." /></SelectTrigger></FormControl><SelectContent>{["Proveedor Externo", "En Espera de Refacciones", "Reparando", "Completado"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></FormItem> )}/>
            )}
          </div>
          <div className="space-y-4">
            <FormField control={control} name="serviceType" render={({ field }) => (
              <FormItem><FormLabel className={cn(errors.serviceType && "text-destructive")}>Tipo de Servicio</FormLabel>
                <Select onValueChange={handleServiceTypeChange} value={field.value} disabled={isReadOnly}>
                  <FormControl><SelectTrigger className={cn(errors.serviceType && "border-destructive focus-visible:ring-destructive")}><SelectValue placeholder="Seleccione un tipo" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {serviceTypes
                      .slice() 
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((type) => (
                        <SelectItem key={type.id} value={type.name}>{type.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem> 
            )}/>
            {showTechnicianField && (
              <FormField control={control} name="technicianId" render={({ field }) => ( <FormItem><FormLabel>Técnico Asignado</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly}><FormControl><SelectTrigger><SelectValue placeholder="Seleccione un técnico..." /></SelectTrigger></FormControl><SelectContent>{technicians.filter((t) => !t.isArchived).map((technician) => ( <SelectItem key={technician.id} value={technician.id}>{technician.name}</SelectItem> ))}</SelectContent></Select></FormItem> )}/>
            )}
          </div>
        </div>
        
        {showAppointmentFields && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t items-end">
                <Controller name="serviceDate" control={control} render={({ field }) => ( <FormItem className="flex flex-col"><FormLabel className={cn(errors.serviceDate && "text-destructive")}>Fecha {watchedStatus === 'Cotizacion' ? 'de Cotización' : 'de Cita'}</FormLabel><Popover open={isServiceDatePickerOpen} onOpenChange={setIsServiceDatePickerOpen}><PopoverTrigger asChild disabled={isReadOnly}><Button variant="outline" className={cn("justify-start text-left font-normal", !field.value && "text-muted-foreground", errors.serviceDate && "border-destructive focus-visible:ring-destructive")} disabled={isReadOnly}>{field.value ? format(field.value, "PPP", { locale: es }) : <span>Seleccione fecha</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={(date) => { field.onChange(date ? setMinutes(setHours(date, (field.value || new Date()).getHours()), (field.value || new Date()).getMinutes()) : undefined); setIsServiceDatePickerOpen(false); }} disabled={isReadOnly} initialFocus locale={es}/></PopoverContent></Popover></FormItem> )}/>
                {showTimePicker && <Controller name="serviceDate" control={control} render={({ field }) => ( <FormItem><FormControl><Input type="time" value={field.value && isValid(field.value) ? format(field.value, 'HH:mm') : ""} onChange={(e) => { if (!e.target.value) return; const [h, m] = e.target.value.split(':').map(Number); field.onChange(setMinutes(setHours(field.value || new Date(), h), m)); }} disabled={isReadOnly}/></FormControl></FormItem> )}/>}
            </div>
        )}

        <Separator className="my-6"/>

        <div className="space-y-4">
          {serviceItemsFields.map((field, index) => (
              <ServiceItemCard 
                key={field.id} 
                serviceIndex={index} 
                removeServiceItem={removeServiceItem} 
                isReadOnly={isReadOnly} 
                inventoryItems={inventoryItems} 
                mode={mode}
                onNewInventoryItemCreated={onNewInventoryItemCreated}
                categories={categories}
                suppliers={suppliers}
              />
          ))}
          {!isReadOnly && (<Button type="button" variant="outline" onClick={() => appendServiceItem({ id: `item_${Date.now()}`, name: '', price: 0, suppliesUsed: [] })}><PlusCircle className="mr-2 h-4 w-4"/> Añadir Trabajo</Button>)}
          {mode === 'quote' && !isReadOnly && (<Button type="button" variant="secondary" onClick={onGenerateQuoteWithAI} disabled={isGeneratingQuote}>{isGeneratingQuote ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BrainCircuit className="mr-2 h-4 w-4" />}Sugerir Cotización con IA</Button>)}
        </div>
        
        <Separator className="my-6"/>

        <FormField
            control={control}
            name="notes"
            render={({ field }) => (
                <FormItem>
                    <FormLabel className="flex justify-between items-center w-full">
                        <span>Notas del Servicio</span>
                        {!isReadOnly && handleEnhanceText && (
                            <Button type="button" size="sm" variant="ghost" onClick={() => handleEnhanceText("notes")} disabled={isEnhancingText === "notes" || !field.value}>
                                {isEnhancingText === "notes" ? <Loader2 className="animate-spin h-4 w-4" /> : <BrainCircuit className="h-4 w-4" />}
                                <span className="ml-2 hidden sm:inline">Mejorar</span>
                            </Button>
                        )}
                    </FormLabel>
                    <FormControl>
                        <Textarea
                            placeholder="Notas internas, para el cliente, o detalles adicionales..."
                            disabled={isReadOnly}
                            {...field}
                        />
                    </FormControl>
                </FormItem>
            )}
        />
      </CardContent>
    </Card>
  );
}
