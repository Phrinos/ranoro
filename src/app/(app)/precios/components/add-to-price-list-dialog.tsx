

"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Vehicle, VehiclePriceList, PricedService } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { inventoryService } from '@/lib/services';
import { Loader2, Tags } from 'lucide-react';
import { capitalizeWords } from '@/lib/utils';

interface AddToPriceListDialogProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  serviceToSave: Omit<PricedService, 'id' | 'estimatedTimeHours' | 'description'> & {
    estimatedTimeHours?: number | undefined;
    description?: string | undefined;
  };
  currentVehicle?: Vehicle | null; // Pass the current vehicle
  onSave: (list: VehiclePriceList, service: Omit<PricedService, 'id'>) => Promise<void>;
}

const newPriceListSchema = z.object({
  make: z.string().min(2, "La marca es obligatoria."),
  model: z.string().min(1, "El modelo es obligatorio."),
  years: z.array(z.number()).min(1, "Seleccione al menos un año."),
});

type NewPriceListFormValues = z.infer<typeof newPriceListSchema>;

export function AddToPriceListDialog({ open, onOpenChange, serviceToSave, currentVehicle, onSave }: AddToPriceListDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [priceLists, setPriceLists] = useState<VehiclePriceList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string | 'new'>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setIsLoading(true);
      const unsubscribe = inventoryService.onPriceListsUpdate((data) => {
        setPriceLists(data);
        setIsLoading(false);
      });
      return () => unsubscribe();
    } else {
        setSelectedListId('');
    }
  }, [open]);

  const form = useForm<NewPriceListFormValues>({
    resolver: zodResolver(newPriceListSchema),
    defaultValues: { make: '', model: '', years: [] },
  });

  useEffect(() => {
    // Pre-fill the form when 'new' is selected and a vehicle is available
    if (selectedListId === 'new' && currentVehicle) {
      form.reset({
        make: currentVehicle.make,
        model: currentVehicle.model,
        years: [currentVehicle.year],
      });
    } else {
        form.reset({ make: '', model: '', years: [] });
    }
  }, [selectedListId, currentVehicle, form]);

  const currentYear = new Date().getFullYear();
  const yearsToShow = Array.from({ length: currentYear - 1980 + 2 }, (_, i) => currentYear + 1 - i);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    const serviceData = {
      serviceName: serviceToSave.name,
      customerPrice: serviceToSave.price || 0,
      supplies: serviceToSave.suppliesUsed,
      description: serviceToSave.description,
      estimatedTimeHours: serviceToSave.estimatedTimeHours,
    };

    if (selectedListId === 'new') {
      form.handleSubmit(async (newVehicleData) => {
        try {
          const newListData: Omit<VehiclePriceList, 'id'> = {
            ...newVehicleData,
            services: [],
          };
          const savedList = await inventoryService.savePriceList(newListData);
          await onSave(savedList, serviceData);
        } catch (e) {
          toast({ title: "Error", description: "No se pudo crear la nueva lista.", variant: "destructive" });
        }
      })();
    } else {
      const selectedList = priceLists.find(l => l.id === selectedListId);
      if (selectedList) {
        await onSave(selectedList, serviceData);
      }
    }
    setIsSubmitting(false);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tags className="h-5 w-5"/> Guardar Servicio en Precotizaciones
          </DialogTitle>
          <DialogDescription>
            Guarde "{serviceToSave.name}" en una lista de precios existente o cree una nueva.
          </DialogDescription>
        </DialogHeader>
        {isLoading ? <Loader2 className="mx-auto my-8 h-8 w-8 animate-spin"/> : (
            <div className="space-y-4">
                <Select value={selectedListId} onValueChange={setSelectedListId}>
                    <SelectTrigger><SelectValue placeholder="Seleccione una lista o cree una nueva..." /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="new">-- Crear Nueva Lista de Precios --</SelectItem>
                        {priceLists.map(list => (
                            <SelectItem key={list.id} value={list.id}>{list.make} {list.model} ({list.years.join(', ')})</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {selectedListId === 'new' && (
                    <Form {...form}>
                        <Card className="p-4 mt-4 border-dashed">
                            <form className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField control={form.control} name="make" render={({ field }) => ( <FormItem><FormLabel>Marca</FormLabel><FormControl><Input placeholder="Ej: Nissan" {...field} onChange={(e) => field.onChange(capitalizeWords(e.target.value))} /></FormControl><FormMessage/></FormItem> )}/>
                                    <FormField control={form.control} name="model" render={({ field }) => ( <FormItem><FormLabel>Modelo</FormLabel><FormControl><Input placeholder="Ej: Versa" {...field} onChange={(e) => field.onChange(capitalizeWords(e.target.value))} /></FormControl><FormMessage/></FormItem> )}/>
                                </div>
                                <FormField control={form.control} name="years" render={() => ( <FormItem><FormLabel>Años Aplicables</FormLabel><Card><CardContent className="p-1"><ScrollArea className="h-28"><div className="grid grid-cols-4 gap-2 p-2">{yearsToShow.map((year) => ( <FormField key={year} control={form.control} name="years" render={({ field }) => ( <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><Checkbox checked={field.value?.includes(year)} onCheckedChange={(checked) => { const newYears = checked ? [...(field.value || []), year] : (field.value || []).filter((y) => y !== year); field.onChange(newYears.sort((a,b)=>b-a)); }} /></FormControl><FormLabel className="text-xs font-normal">{year}</FormLabel></FormItem> )}/> ))}</div></ScrollArea></CardContent></Card><FormMessage/></FormItem> )}/>
                            </form>
                        </Card>
                    </Form>
                )}
            </div>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button type="button" onClick={handleConfirm} disabled={!selectedListId || isLoading || isSubmitting}>
            {isSubmitting ? <Loader2 className="animate-spin mr-2"/> : null}
            Guardar en Lista
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
