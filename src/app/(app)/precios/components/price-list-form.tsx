
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Trash2, DollarSign } from "lucide-react";
import type { PriceListRecord } from "@/types";

const supplySchema = z.object({
  name: z.string().min(2, "Mínimo 2 caracteres"),
  cost: z.coerce.number().min(0, "Debe ser >= 0"),
  quantity: z.coerce.number().min(0.1, "Debe ser > 0"),
  supplier: z.string().min(2, "Mínimo 2 caracteres"),
});

const vehicleSchema = z.object({
  make: z.string().min(2, "Mínimo 2 caracteres"),
  model: z.string().min(1, "Mínimo 1 caracter"),
  years: z.string().min(4, "Ej: 2020-2023"),
});

const priceListFormSchema = z.object({
  serviceName: z.string().min(3, "El nombre del servicio es obligatorio."),
  description: z.string().optional(),
  customerPrice: z.coerce.number().min(0, "El precio debe ser un número positivo."),
  estimatedTimeHours: z.coerce.number().min(0, "El tiempo debe ser un número positivo.").optional(),
  supplies: z.array(supplySchema),
  applicableVehicles: z.array(vehicleSchema),
});

export type PriceListFormValues = z.infer<typeof priceListFormSchema>;

interface PriceListFormProps {
  initialData?: PriceListRecord | null;
  onSubmit: (values: PriceListFormValues) => Promise<void>;
  onClose: () => void;
}

export function PriceListForm({ initialData, onSubmit, onClose }: PriceListFormProps) {
  const form = useForm<PriceListFormValues>({
    resolver: zodResolver(priceListFormSchema),
    defaultValues: initialData || {
      serviceName: "",
      description: "",
      customerPrice: undefined,
      estimatedTimeHours: undefined,
      supplies: [],
      applicableVehicles: [],
    },
  });

  const { fields: supplyFields, append: appendSupply, remove: removeSupply } = useFieldArray({
    control: form.control,
    name: "supplies",
  });

  const { fields: vehicleFields, append: appendVehicle, remove: removeVehicle } = useFieldArray({
    control: form.control,
    name: "applicableVehicles",
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Detalles del Servicio</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="serviceName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del Servicio</FormLabel>
                  <FormControl><Input placeholder="Afinación Mayor" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="customerPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Precio al Cliente (IVA Inc.)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input type="number" step="0.01" placeholder="2500.00" {...field} value={field.value ?? ''} className="pl-8" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="estimatedTimeHours"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tiempo Estimado (Horas)</FormLabel>
                  <FormControl>
                      <Input type="number" step="0.1" placeholder="2.5" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="md:col-span-2 lg:col-span-3">
                  <FormLabel>Descripción del Servicio</FormLabel>
                  <FormControl><Textarea placeholder="Incluye cambio de aceite, filtros, bujías..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Insumos</CardTitle>
              <CardDescription>Lista de partes y materiales requeridos.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {supplyFields.map((field, index) => (
                <div key={field.id} className="p-3 border rounded-md space-y-2 relative">
                  <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => removeSupply(index)}>
                    <Trash2 className="h-4 w-4 text-destructive"/>
                  </Button>
                  <FormField control={form.control} name={`supplies.${index}.name`} render={({ field }) => ( <FormItem><FormLabel className="text-xs">Nombre</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem> )}/>
                  <div className="grid grid-cols-3 gap-2">
                    <FormField control={form.control} name={`supplies.${index}.quantity`} render={({ field }) => ( <FormItem><FormLabel className="text-xs">Cant.</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage/></FormItem> )}/>
                    <FormField control={form.control} name={`supplies.${index}.cost`} render={({ field }) => ( <FormItem><FormLabel className="text-xs">Costo</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage/></FormItem> )}/>
                    <FormField control={form.control} name={`supplies.${index}.supplier`} render={({ field }) => ( <FormItem><FormLabel className="text-xs">Proveedor</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem> )}/>
                  </div>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => appendSupply({ name: '', cost: 0, quantity: 1, supplier: '' })}>
                <PlusCircle className="mr-2 h-4 w-4" /> Añadir Insumo
              </Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Vehículos Aplicables</CardTitle>
              <CardDescription>Modelos y años para los que aplica este precio.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {vehicleFields.map((field, index) => (
                <div key={field.id} className="p-3 border rounded-md space-y-2 relative">
                  <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => removeVehicle(index)}>
                    <Trash2 className="h-4 w-4 text-destructive"/>
                  </Button>
                   <div className="grid grid-cols-3 gap-2">
                    <FormField control={form.control} name={`applicableVehicles.${index}.make`} render={({ field }) => ( <FormItem><FormLabel className="text-xs">Marca</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem> )}/>
                    <FormField control={form.control} name={`applicableVehicles.${index}.model`} render={({ field }) => ( <FormItem><FormLabel className="text-xs">Modelo</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem> )}/>
                    <FormField control={form.control} name={`applicableVehicles.${index}.years`} render={({ field }) => ( <FormItem><FormLabel className="text-xs">Años</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem> )}/>
                   </div>
                </div>
              ))}
               <Button type="button" variant="outline" size="sm" onClick={() => appendVehicle({ make: '', model: '', years: '' })}>
                <PlusCircle className="mr-2 h-4 w-4" /> Añadir Vehículo
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Guardando..." : (initialData ? "Actualizar Registro" : "Crear Registro")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
