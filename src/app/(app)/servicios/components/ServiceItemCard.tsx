
"use client";

import { useFieldArray, useFormContext, type Control } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card } from '@/components/ui/card';
import { Plus, PlusCircle, Trash2, Wrench } from "lucide-react";
import type { InventoryItem, ServiceSupply } from "@/types";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { AddSupplyDialog } from './add-supply-dialog';
import { capitalizeWords, formatCurrency } from '@/lib/utils';
import type { ServiceFormValues } from "@/schemas/service-form";

// Sub-component for a single Service Item card
interface ServiceItemCardProps {
  serviceIndex: number;
  control: Control<ServiceFormValues>;
  removeServiceItem: (index: number) => void;
  isReadOnly?: boolean;
  inventoryItems: InventoryItem[];
  mode: 'service' | 'quote';
}

export function ServiceItemCard({ serviceIndex, control, removeServiceItem, isReadOnly, inventoryItems, mode }: ServiceItemCardProps) {
    const { getValues, setValue } = useFormContext<ServiceFormValues>();
    const { fields, append, remove } = useFieldArray({
        control,
        name: `serviceItems.${serviceIndex}.suppliesUsed`
    });
    const { toast } = useToast();

    const [isAddSupplyDialogOpen, setIsAddSupplyDialogOpen] = useState(false);
    
    const handleAddSupply = (supply: ServiceSupply) => {
        append(supply);
        setIsAddSupplyDialogOpen(false);
    };

    const handleSupplyQuantityChange = (supplyIndex: number, delta: number) => {
        const supplyPath = `serviceItems.${serviceIndex}.suppliesUsed.${supplyIndex}`;
        const currentSupply = getValues(supplyPath);
        if (!currentSupply) return;

        const newQuantity = currentSupply.quantity + delta;
        if (newQuantity <= 0) return;

        const inventoryItem = inventoryItems.find(item => item.id === currentSupply.supplyId);

        if (inventoryItem && !inventoryItem.isService && newQuantity > inventoryItem.quantity) {
            toast({
                title: 'Stock Insuficiente',
                description: `Solo hay ${inventoryItem.quantity} de ${inventoryItem.name} en inventario.`,
                variant: 'destructive'
            });
            return;
        }

        setValue(`${supplyPath}.quantity`, newQuantity, { shouldDirty: true });
    };

    return (
        <Card className="p-4 bg-muted/30">
            <div className="flex justify-between items-start mb-4">
                <h4 className="text-base font-semibold flex items-center gap-2">
                    <Wrench className="h-5 w-5 text-muted-foreground"/>
                    Trabajo a Realizar #{serviceIndex + 1}
                </h4>
                {!isReadOnly && <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeServiceItem(serviceIndex)}><Trash2 className="h-4 w-4"/></Button>}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                    control={control}
                    name={`serviceItems.${serviceIndex}.name`}
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Nombre del Servicio</FormLabel>
                            <FormControl>
                                <Input
                                    placeholder="Afinación Mayor"
                                    {...field}
                                    disabled={isReadOnly}
                                    onChange={(e) => field.onChange(capitalizeWords(e.target.value))}
                                />
                            </FormControl>
                        </FormItem>
                    )}
                />
                <FormField control={control} name={`serviceItems.${serviceIndex}.price`} render={({ field }) => ( <FormItem><FormLabel>Precio Cliente (IVA Inc.)</FormLabel><FormControl><Input type="number" placeholder="0.00" {...field} value={field.value ?? ''} disabled={isReadOnly} /></FormControl></FormItem> )}/>
            </div>

            <div className="mt-4">
                <h5 className="text-sm font-medium mb-2">Insumos para este Servicio</h5>
                <div className="space-y-2">
                    {fields.map((supplyField, supplyIndex) => (
                        <div key={supplyField.id} className="flex items-center gap-2 p-2 border rounded-md bg-background">
                            <div className="flex-1">
                                <p className="text-xs font-medium">{supplyField.supplyName}</p>
                                <p className="text-xs text-muted-foreground">
                                    {`Costo: ${formatCurrency(supplyField.unitPrice)}`}
                                </p>
                            </div>
                            <div className="flex items-center gap-1">
                                <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => handleSupplyQuantityChange(supplyIndex, -1)} disabled={isReadOnly}>
                                    -
                                </Button>
                                <FormField
                                    control={control}
                                    name={`serviceItems.${serviceIndex}.suppliesUsed.${supplyIndex}.quantity`}
                                    render={({ field }) => (
                                        <Input
                                            type="number"
                                            step="any"
                                            min="0.001"
                                            {...field}
                                            className="w-16 text-center h-7 text-sm"
                                            disabled={isReadOnly}
                                        />
                                    )}
                                />
                                <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => handleSupplyQuantityChange(supplyIndex, 1)} disabled={isReadOnly}>
                                    <Plus className="h-3 w-3" />
                                </Button>
                            </div>
                            <span className="text-sm w-12 text-center">{supplyField.unitType === 'ml' ? 'ml' : supplyField.unitType === 'liters' ? 'L' : 'uds.'}</span>
                            {!isReadOnly && <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(supplyIndex)}><Trash2 className="h-4 w-4"/></Button>}
                        </div>
                    ))}
                    {!isReadOnly && (
                        <Button type="button" variant="outline" size="sm" onClick={() => setIsAddSupplyDialogOpen(true) }>
                            <PlusCircle className="mr-2 h-4 w-4"/> Añadir Insumo
                        </Button>
                    )}
                </div>
            </div>
             <AddSupplyDialog
                open={isAddSupplyDialogOpen}
                onOpenChange={setIsAddSupplyDialogOpen}
                inventoryItems={inventoryItems}
                onAddSupply={handleAddSupply}
            />
        </Card>
    );
}
