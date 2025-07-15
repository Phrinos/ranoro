

"use client";

import { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { InventoryItem, Supply } from '@/types';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { PlusCircle, Trash2 } from 'lucide-react';
import { formatCurrency, cn } from "@/lib/utils";
import { useToast } from '@/hooks/use-toast';

const supplyItemSchema = z.object({
  inventoryItemId: z.string().min(1, "Debe seleccionar un insumo."),
  supplyName: z.string(),
  quantity: z.coerce.number().min(0.1, "La cantidad debe ser mayor a 0."),
  unitPrice: z.coerce.number().min(0, "El precio no puede ser negativo."),
  stock: z.number()
});

const addSupplySchema = z.object({
  supplies: z.array(supplyItemSchema),
});

type AddSupplyFormValues = z.infer<typeof addSupplySchema>;
type SupplyItemFormValues = z.infer<typeof supplyItemSchema>;

export function AddSupplyDialog({
  open,
  onOpenChange,
  inventoryItems,
  onAddSupplies,
  serviceDescription
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inventoryItems: InventoryItem[];
  onAddSupplies: (supplies: Supply[]) => void;
  serviceDescription: string;
}) {
  const { toast } = useToast();
  const [isSuggestingPrice, setIsSuggestingPrice] = useState<number | null>(null);

  const form = useForm<AddSupplyFormValues>({
    resolver: zodResolver(addSupplySchema),
    defaultValues: { supplies: [] },
  });
  const { fields, append, remove, control, watch, setValue } = useFieldArray({
    control: form.control,
    name: "supplies",
  });

  const availableInventory = useMemo(() => {
    const selectedIds = new Set(watch('supplies').map(s => s.inventoryItemId));
    return inventoryItems.filter(item => !selectedIds.has(item.id));
  }, [inventoryItems, watch]);

  const onSubmit = (data: AddSupplyFormValues) => {
    const supplies: Supply[] = data.supplies.map(s => ({
      inventoryItemId: s.inventoryItemId,
      supplyName: s.supplyName,
      quantity: s.quantity,
      price: s.unitPrice,
    }));
    onAddSupplies(supplies);
    onOpenChange(false);
    form.reset({ supplies: [] });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Añadir Insumos al Servicio</DialogTitle>
          <DialogDescription>
            Busca y selecciona los productos y la mano de obra necesarios. El stock se descontará al completar el servicio.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              {fields.map((field, index) => (
                <div key={field.id} className="flex flex-col md:flex-row gap-4 items-start p-4 border rounded-lg relative">
                   <Controller
                      control={control}
                      name={`supplies.${index}`}
                      render={({ field: controllerField, fieldState }) => {
                        const selectedItem = inventoryItems.find(i => i.id === controllerField.value.inventoryItemId);
                        return (
                          <>
                            <FormItem className="flex-1">
                                <FormLabel>Insumo</FormLabel>
                                <p className="font-semibold text-lg">{selectedItem?.name}</p>
                                {selectedItem && <p className="text-sm text-muted-foreground">Stock: {selectedItem.quantity} - Costo: {formatCurrency(selectedItem.unitPrice)}</p>}
                                {fieldState.error && <FormMessage>{fieldState.error.message}</FormMessage>}
                            </FormItem>
                             <FormField control={control} name={`supplies.${index}.quantity`} render={({ field }) => (
                                <FormItem className="w-full md:w-24"><FormLabel>Cantidad</FormLabel><FormControl><Input type="number" {...field} max={selectedItem?.quantity || undefined} /></FormControl><FormMessage /></FormItem>
                             )}/>
                            <FormField control={control} name={`supplies.${index}.unitPrice`} render={({ field }) => (
                                <FormItem className="w-full md:w-32">
                                <FormLabel>Precio</FormLabel>
                                <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                                <FormMessage />
                                </FormItem>
                            )}/>
                          </>
                        )
                      }}
                    />
                  <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="absolute top-2 right-2"><Trash2 className="h-4 w-4 text-destructive"/></Button>
                </div>
              ))}
            </div>
            
             <Command className="rounded-lg border shadow-sm">
                <CommandInput placeholder="Buscar insumo o mano de obra para añadir..." />
                <CommandList>
                    <CommandEmpty>No se encontraron insumos.</CommandEmpty>
                    <CommandGroup>
                        {availableInventory.map((item) => (
                        <CommandItem
                            key={item.id}
                            value={item.name}
                            onSelect={() => {
                                append({
                                    inventoryItemId: item.id,
                                    supplyName: item.name,
                                    quantity: 1,
                                    unitPrice: item.sellingPrice,
                                    stock: item.quantity
                                });
                            }}
                            className={cn(item.quantity <= item.lowStockThreshold && !item.isService && "text-destructive")}
                        >
                            <div className="flex justify-between w-full">
                            <span>{item.name} {item.isService && "(Servicio)"}</span>
                            <span>{formatCurrency(item.sellingPrice)} {!item.isService && `(Stock: ${item.quantity})`}</span>
                            </div>
                        </CommandItem>
                        ))}
                    </CommandGroup>
                </CommandList>
            </Command>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit">Añadir Insumos Seleccionados</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
