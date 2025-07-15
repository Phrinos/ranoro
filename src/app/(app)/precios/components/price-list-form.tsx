

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray, type Control } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Trash2, Wrench, X, Tags } from "lucide-react";
import type { VehiclePriceList, InventoryItem, ServiceSupply, InventoryCategory, Supplier } from "@/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { capitalizeWords, formatCurrency } from "@/lib/utils";
import React, { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { AddSupplyDialog } from "../../servicios/components/add-supply-dialog";
import { InventoryItemDialog } from "../../inventario/components/inventory-item-dialog";
import { inventoryService } from "@/lib/services";
import type { InventoryItemFormValues } from "../../inventario/components/inventory-item-form";
import { AddToPriceListDialog } from "./add-to-price-list-dialog";

const supplySchema = z.object({
  supplyId: z.string(),
  supplyName: z.string().min(2, "Mínimo 2 caracteres"),
  unitPrice: z.coerce.number().min(0, "Debe ser >= 0"),
  quantity: z.coerce.number().min(0.001, "Debe ser > 0"),
  isService: z.boolean().optional(),
  unitType: z.enum(['units', 'ml', 'liters']).optional(),
});

const pricedServiceSchema = z.object({
    id: z.string(),
    serviceName: z.string().min(2, "Mínimo 2 caracteres."),
    description: z.string().optional(),
    customerPrice: z.coerce.number().min(0, "El precio es obligatorio."),
    estimatedTimeHours: z.coerce.number().min(0, "Debe ser >= 0").optional(),
    supplies: z.array(supplySchema),
});

const vehiclePriceListFormSchema = z.object({
  make: z.string().min(2, "La marca es obligatoria."),
  model: z.string().min(1, "El modelo es obligatorio."),
  years: z.array(z.number()).min(1, "Seleccione al menos un año."),
  services: z.array(pricedServiceSchema),
});

export type PriceListFormValues = z.infer<typeof vehiclePriceListFormSchema>;

interface PriceListFormProps {
  initialData?: VehiclePriceList | null;
  onSubmit: (values: PriceListFormValues) => Promise<void>;
  onClose: () => void;
  inventoryItems: InventoryItem[];
  categories: InventoryCategory[];
  suppliers: Supplier[];
}

export function PriceListForm({ initialData, onSubmit, onClose, inventoryItems, categories, suppliers }: PriceListFormProps) {
  const form = useForm<PriceListFormValues>({
    resolver: zodResolver(vehiclePriceListFormSchema),
    defaultValues: initialData || {
      make: "",
      model: "",
      years: [],
      services: [],
    },
  });

  const { fields: serviceFields, append: appendService, remove: removeService } = useFieldArray({
    control: form.control,
    name: "services",
  });

  const currentYear = new Date().getFullYear();
  const yearsToShow = Array.from({ length: currentYear - 1980 + 2 }, (_, i) => currentYear + 1 - i);
  
  const handleNewInventoryItemCreated = useCallback(async (formData: InventoryItemFormValues): Promise<InventoryItem> => {
    const newItem = await inventoryService.addItem(formData);
    // You might want to update a global state here if inventoryItems is not automatically updated by a listener
    return newItem;
  }, []);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Vehículo</CardTitle>
            <CardDescription>Define el vehículo al que se aplicará esta lista de precios.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="make" render={({ field }) => ( <FormItem><FormLabel>Marca</FormLabel><FormControl><Input placeholder="Ej: Nissan" {...field} onChange={(e) => field.onChange(capitalizeWords(e.target.value))} /></FormControl><FormMessage /></FormItem> )}/>
            <FormField control={form.control} name="model" render={({ field }) => ( <FormItem><FormLabel>Modelo</FormLabel><FormControl><Input placeholder="Ej: Versa" {...field} onChange={(e) => field.onChange(capitalizeWords(e.target.value))} /></FormControl><FormMessage /></FormItem> )}/>
             <FormField control={form.control} name="years" render={() => ( <FormItem className="md:col-span-2"><FormLabel>Años Aplicables</FormLabel><Card><CardContent className="p-2"><ScrollArea className="h-40"><div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4 p-4">{yearsToShow.map((year) => ( <FormField key={year} control={form.control} name="years" render={({ field }) => ( <FormItem className="flex flex-row items-start space-x-2 space-y-0"><FormControl><Checkbox checked={field.value?.includes(year)} onCheckedChange={(checked) => { const currentYears = field.value || []; const newYears = checked ? [...currentYears, year] : currentYears.filter((y) => y !== year); field.onChange(newYears.sort((a, b) => b - a)); }} /></FormControl><FormLabel className="text-sm font-normal">{year}</FormLabel></FormItem> )}/> ))}</div></ScrollArea></CardContent></Card><FormMessage /></FormItem> )}/>
          </CardContent>
        </Card>
        
        <Card>
            <CardHeader>
                <CardTitle>Servicios para este Vehículo</CardTitle>
                <CardDescription>Añade todos los servicios con precio fijo para este modelo y rango de años.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {serviceFields.map((serviceField, serviceIndex) => (
                    <Card key={serviceField.id} className="p-4 bg-muted/30">
                         <div className="flex justify-between items-start mb-4"><h4 className="text-base font-semibold flex items-center gap-2"><Wrench className="h-5 w-5 text-muted-foreground"/>Servicio #{serviceIndex + 1}</h4><Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeService(serviceIndex)}><Trash2 className="h-4 w-4"/></Button></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"><FormField control={form.control} name={`services.${serviceIndex}.serviceName`} render={({ field }) => ( <FormItem><FormLabel>Nombre Servicio</FormLabel><FormControl><Input placeholder="Afinación Mayor" {...field} onChange={(e) => field.onChange(capitalizeWords(e.target.value))} /></FormControl><FormMessage/></FormItem> )}/>
                            <FormField control={form.control} name={`services.${serviceIndex}.customerPrice`} render={({ field }) => ( <FormItem><FormLabel>Precio Cliente</FormLabel><FormControl><Input type="number" placeholder="1999.00" {...field} value={field.value ?? ''} /></FormControl><FormMessage/></FormItem> )}/>
                            <FormField control={form.control} name={`services.${serviceIndex}.estimatedTimeHours`} render={({ field }) => ( <FormItem><FormLabel>Horas Est.</FormLabel><FormControl><Input type="number" step="0.1" placeholder="2.5" {...field} value={field.value ?? ''} /></FormControl><FormMessage/></FormItem> )}/>
                            <FormField control={form.control} name={`services.${serviceIndex}.description`} render={({ field }) => ( <FormItem className="md:col-span-3"><FormLabel>Descripción</FormLabel><FormControl><Textarea rows={2} placeholder="Incluye cambio de aceite, filtros y bujías." {...field} /></FormControl><FormMessage/></FormItem> )}/>
                        </div>
                        <Separator className="my-4"/>
                        <p className="text-sm font-medium mb-2">Insumos del Servicio</p>
                        <ServiceSuppliesArray 
                          serviceIndex={serviceIndex} 
                          control={form.control} 
                          inventoryItems={inventoryItems}
                          onNewInventoryItemCreated={handleNewInventoryItemCreated}
                          categories={categories}
                          suppliers={suppliers}
                        />
                    </Card>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => appendService({ id: `SVC_${Date.now()}`, serviceName: '', customerPrice: undefined, supplies: [], description: '', estimatedTimeHours: undefined })}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Añadir Servicio
                </Button>
            </CardContent>
        </Card>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Guardando..." : (initialData ? "Actualizar Lista" : "Crear Lista")}
          </Button>
        </div>
      </form>
    </Form>
  );
}

// Sub-component for nested supplies array
interface ServiceSuppliesArrayProps {
    serviceIndex: number;
    control: Control<PriceListFormValues>;
    inventoryItems: InventoryItem[];
    onNewInventoryItemCreated: (formData: InventoryItemFormValues) => Promise<InventoryItem>;
    categories: InventoryCategory[];
    suppliers: Supplier[];
}

function ServiceSuppliesArray({ serviceIndex, control, inventoryItems, onNewInventoryItemCreated, categories, suppliers }: ServiceSuppliesArrayProps) {
    const { fields, append, remove } = useFieldArray({ control, name: `services.${serviceIndex}.supplies` });
    const { toast } = useToast();
    const [isAddSupplyDialogOpen, setIsAddSupplyDialogOpen] = useState(false);
    const [isNewItemDialogOpen, setIsNewItemDialogOpen] = useState(false);
    const [newItemSearchTerm, setNewItemSearchTerm] = useState('');

    const handleAddSupply = useCallback((supply: Partial<ServiceSupply>) => {
        append({
            supplyId: supply.supplyId || `manual_${Date.now()}`,
            supplyName: supply.supplyName || 'Insumo Manual',
            quantity: supply.quantity || 1,
            unitPrice: supply.unitPrice || 0,
            isService: supply.isService,
            unitType: supply.unitType,
        });
        setIsAddSupplyDialogOpen(false);
    }, [append]);
    
    const handleNewItemRequest = (searchTerm: string) => {
        setNewItemSearchTerm(searchTerm);
        setIsAddSupplyDialogOpen(false);
        setIsNewItemDialogOpen(true);
    };

    const handleNewItemSaved = async (formData: InventoryItemFormValues) => {
        try {
            const newItem = await onNewInventoryItemCreated(formData);
            append({
                supplyId: newItem.id,
                supplyName: newItem.name,
                quantity: 1, // Default quantity for new items
                unitPrice: newItem.unitPrice,
                isService: newItem.isService,
                unitType: newItem.unitType,
            });
            setIsNewItemDialogOpen(false);
            toast({ title: 'Insumo Creado y Añadido' });
        } catch (e) {
            console.error(e);
            toast({ title: 'Error', description: 'No se pudo crear el nuevo insumo.', variant: 'destructive' });
        }
    };

    return (
        <div className="space-y-3">
             {fields.map((supplyField, supplyIndex) => (
                <div key={supplyField.id} className="grid grid-cols-10 gap-x-2 gap-y-1 items-center p-2 rounded-md border bg-card">
                    <div className="col-span-9 md:col-span-5">
                       <p className="text-sm font-medium">{supplyField.supplyName}</p>
                    </div>
                    <div className="col-span-4 md:col-span-1">
                        <FormField control={control} name={`services.${serviceIndex}.supplies.${supplyIndex}.quantity`} render={({ field }) => ( <FormControl><Input type="number" className="h-8 text-sm" placeholder="Cant." {...field} value={field.value ?? ''} /></FormControl> )}/>
                    </div>
                    <div className="col-span-4 md:col-span-2">
                         <FormField control={control} name={`services.${serviceIndex}.supplies.${supplyIndex}.unitPrice`} render={({ field }) => ( <FormControl><Input type="number" className="h-8 text-sm" placeholder="Costo" {...field} value={field.value ?? ''} /></FormControl> )}/>
                    </div>
                    <div className="col-span-2 md:col-span-1 text-right">
                       <p className="text-sm font-semibold">{formatCurrency((supplyField.quantity || 0) * (supplyField.unitPrice || 0))}</p>
                    </div>
                    <div className="col-span-1 text-right">
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(supplyIndex)}><X className="h-4 w-4"/></Button>
                    </div>
                </div>
             ))}
            <Button type="button" variant="outline" size="sm" onClick={() => setIsAddSupplyDialogOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" /> Añadir Insumo
            </Button>
            
            <AddSupplyDialog
                open={isAddSupplyDialogOpen}
                onOpenChange={setIsAddSupplyDialogOpen}
                inventoryItems={inventoryItems}
                onAddSupply={handleAddSupply}
                onNewItemRequest={handleNewItemRequest}
            />
            
             <InventoryItemDialog
                open={isNewItemDialogOpen}
                onOpenChange={setIsNewItemDialogOpen}
                onSave={handleNewItemSaved}
                item={{ name: newItemSearchTerm }}
                categories={categories}
                suppliers={suppliers}
            />
        </div>
    );
}
