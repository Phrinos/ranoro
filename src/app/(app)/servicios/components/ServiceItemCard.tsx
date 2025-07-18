

"use client";

import { useFieldArray, useFormContext, type Control } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card } from '@/components/ui/card';
import { Plus, PlusCircle, Trash2, Wrench, Tags } from "lucide-react";
import type { InventoryItem, ServiceSupply, InventoryCategory, Supplier, PricedService, VehiclePriceList, Vehicle } from "@/types";
import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { AddSupplyDialog } from './add-supply-dialog';
import { capitalizeWords, formatCurrency, cn } from '@/lib/utils';
import type { ServiceFormValues } from "@/schemas/service-form";
import { InventoryItemDialog } from '../../inventario/components/inventory-item-dialog';
import type { InventoryItemFormValues } from '../../inventario/components/inventory-item-form';
import { AddToPriceListDialog } from "../../precios/components/add-to-price-list-dialog";
import { inventoryService } from "@/lib/services";


// Sub-component for a single Service Item card
interface ServiceItemCardProps {
  serviceIndex: number;
  removeServiceItem: (index: number) => void;
  isReadOnly?: boolean;
  inventoryItems: InventoryItem[];
  mode: 'service' | 'quote';
  onNewInventoryItemCreated: (formData: InventoryItemFormValues) => Promise<InventoryItem>;
  categories: InventoryCategory[];
  suppliers: Supplier[];
}

export function ServiceItemCard({ 
    serviceIndex, 
    removeServiceItem, 
    isReadOnly, 
    inventoryItems, 
    mode,
    onNewInventoryItemCreated,
    categories,
    suppliers
}: ServiceItemCardProps) {
    const { control, getValues, setValue, formState: { errors }, watch } = useFormContext<ServiceFormValues>();
    const { fields, append, remove } = useFieldArray({
        control,
        name: `serviceItems.${serviceIndex}.suppliesUsed`
    });
    const { toast } = useToast();

    const [isAddSupplyDialogOpen, setIsAddSupplyDialogOpen] = useState(false);
    const [isNewItemDialogOpen, setIsNewItemDialogOpen] = useState(false);
    const [newItemSearchTerm, setNewItemSearchTerm] = useState('');
    const [isAddToPriceListDialogOpen, setIsAddToPriceListDialogOpen] = useState(false);

    
    const serviceItemErrors = errors.serviceItems?.[serviceIndex];
    
    // Watch for the vehicleId at the top-level form
    const currentVehicleId = watch('vehicleId');
    const allVehicles = watch('allVehiclesForDialog') as Vehicle[] | undefined || []; // Assuming you pass this down or have it in context
    const currentVehicle = allVehicles.find(v => v.id === currentVehicleId);

    
    const handleAddSupply = (supply: ServiceSupply) => {
        append({
            supplyId: supply.supplyId || `manual_${Date.now()}`,
            supplyName: supply.supplyName || 'Insumo Manual',
            quantity: supply.quantity || 1,
            unitPrice: supply.unitPrice || 0,
            sellingPrice: supply.sellingPrice,
            isService: supply.isService,
            unitType: supply.unitType,
        });
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
                sellingPrice: newItem.sellingPrice,
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

    const handleSaveToPriceList = async (list: VehiclePriceList, service: Omit<PricedService, 'id'>) => {
      try {
        const serviceWithId = { ...service, id: `SVC_${Date.now()}` };
        const updatedServices = [...list.services, serviceWithId];
        await inventoryService.savePriceList({ ...list, services: updatedServices }, list.id);
        toast({ title: "Servicio Guardado", description: `Se ha añadido "${service.serviceName}" a la lista de precios de ${list.make} ${list.model}.` });
        setIsAddToPriceListDialogOpen(false);
      } catch (e) {
        toast({ title: "Error", description: "No se pudo guardar en la lista de precios.", variant: "destructive" });
      }
    };


    return (
        <Card className="p-4 bg-muted/30">
            <div className="flex justify-between items-start mb-4">
                <h4 className="text-base font-semibold flex items-center gap-2">
                    <Wrench className="h-5 w-5 text-muted-foreground"/>
                    Trabajo a Realizar #{serviceIndex + 1}
                </h4>
                 {!isReadOnly && (
                    <div className="flex items-center">
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-primary" onClick={() => setIsAddToPriceListDialogOpen(true)} title="Guardar en Precotizaciones">
                            <Tags className="h-4 w-4"/>
                        </Button>
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeServiceItem(serviceIndex)} title="Eliminar Trabajo">
                            <Trash2 className="h-4 w-4"/>
                        </Button>
                    </div>
                )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                    control={control}
                    name={`serviceItems.${serviceIndex}.name`}
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className={cn(serviceItemErrors?.name && "text-destructive")}>Nombre del Servicio</FormLabel>
                            <FormControl>
                                <Input
                                    placeholder="Afinación Mayor"
                                    {...field}
                                    disabled={isReadOnly}
                                    onChange={(e) => field.onChange(capitalizeWords(e.target.value))}
                                    className={cn(serviceItemErrors?.name && "border-destructive focus-visible:ring-destructive")}
                                />
                            </FormControl>
                        </FormItem>
                    )}
                />
                <FormField
                    control={control}
                    name={`serviceItems.${serviceIndex}.price`}
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Precio Cliente (IVA Inc.)</FormLabel>
                            <FormControl>
                                <Input
                                    type="number"
                                    placeholder="0.00"
                                    {...field}
                                    value={field.value === 0 ? '' : field.value}
                                    onChange={(e) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                                    disabled={isReadOnly}
                                />
                            </FormControl>
                        </FormItem>
                    )}
                />
            </div>

            <div className="mt-4">
                <h5 className="text-sm font-medium mb-2">Insumos para este Servicio</h5>
                <div className="space-y-2">
                    {fields.map((supplyField, supplyIndex) => {
                        const inventoryItem = inventoryItems.find(i => i.id === supplyField.supplyId);
                        const currentName = inventoryItem?.name || supplyField.supplyName;
                        return (
                            <div key={supplyField.id} className="flex items-center gap-2 p-2 border rounded-md bg-background">
                                <div className="flex-1">
                                    <p className="text-xs font-medium">{currentName}</p>
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
                        )
                    })}
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
             <AddToPriceListDialog
                open={isAddToPriceListDialogOpen}
                onOpenChange={setIsAddToPriceListDialogOpen}
                serviceToSave={getValues(`serviceItems.${serviceIndex}`)}
                currentVehicle={currentVehicle}
                onSave={handleSaveToPriceList}
            />
        </Card>
    );
}
