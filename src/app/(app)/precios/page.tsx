
// src/app/(app)/precios/page.tsx
"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { inventoryService } from '@/lib/services';
import type { VehiclePriceList, InventoryItem, InventoryCategory, Supplier } from '@/types';
import { Loader2, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useTableManager } from '@/hooks/useTableManager';
import { PriceListTable } from './components/price-list-table';
import { PriceListDialog } from './components/price-list-dialog';
import type { PriceListFormValues } from './components/price-list-form';
import { TableToolbar } from '@/components/shared/table-toolbar';

const sortOptions = [
    { value: "make_asc", label: "Marca (A-Z)" },
    { value: "make_desc", label: "Marca (Z-A)" },
    { value: "model_asc", label: "Modelo (A-Z)" },
    { value: "model_desc", label: "Modelo (Z-A)" },
];

export default function PreciosPage() {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [priceLists, setPriceLists] = useState<VehiclePriceList[]>([]);
    const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
    const [categories, setCategories] = useState<InventoryCategory[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState<VehiclePriceList | null>(null);

    useEffect(() => {
        setIsLoading(true);
        const unsubs = [
            inventoryService.onPriceListsUpdate(setPriceLists),
            inventoryService.onItemsUpdate(setInventoryItems),
            inventoryService.onCategoriesUpdate(setCategories),
            inventoryService.onSuppliersUpdate((data) => {
                setSuppliers(data);
                setIsLoading(false);
            }),
        ];
        return () => unsubs.forEach(unsub => unsub());
    }, []);

    const { paginatedData, ...tableManager } = useTableManager<VehiclePriceList>({
        initialData: priceLists,
        searchKeys: ['make', 'model', 'years'],
        initialSortOption: 'make_asc',
    });

    const handleOpenDialog = useCallback((record: VehiclePriceList | null = null) => {
        setEditingRecord(record);
        setIsDialogOpen(true);
    }, []);
    
    const handleSave = async (data: PriceListFormValues) => {
        try {
            await inventoryService.savePriceList(data, editingRecord?.id);
            toast({ title: `Lista de precios ${editingRecord ? 'actualizada' : 'creada'}` });
            setIsDialogOpen(false);
        } catch (e) {
            console.error(e);
            toast({ title: 'Error al guardar', variant: 'destructive' });
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await inventoryService.deletePriceList(id);
            toast({ title: "Lista de precios eliminada" });
        } catch (e) {
            console.error(e);
            toast({ title: "Error al eliminar", variant: "destructive" });
        }
    };

    if (isLoading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <>
            <div className="bg-primary text-primary-foreground rounded-lg p-6 mb-6">
                <h1 className="text-3xl font-bold tracking-tight">Precotizaciones</h1>
                <p className="text-primary-foreground/80 mt-1">
                    Define y gestiona listas de precios estandarizadas para agilizar tus cotizaciones.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Listas de Precios por Vehículo</CardTitle>
                    <CardDescription>
                        Cada lista contiene precios fijos de servicios para un modelo y rango de años específico.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <TableToolbar
                        {...tableManager}
                        searchPlaceholder="Buscar por marca o modelo..."
                        sortOptions={sortOptions}
                        actions={
                            <Button onClick={() => handleOpenDialog()} className="w-full sm:w-auto">
                                <PlusCircle className="mr-2 h-4 w-4"/> Nueva Lista
                            </Button>
                        }
                    />
                    <PriceListTable
                        records={paginatedData}
                        onEdit={handleOpenDialog}
                        onDelete={handleDelete}
                        sortOption={tableManager.sortOption}
                        onSortOptionChange={tableManager.onSortOptionChange}
                    />
                </CardContent>
            </Card>

            <PriceListDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                onSave={handleSave}
                record={editingRecord}
                inventoryItems={inventoryItems}
                categories={categories}
                suppliers={suppliers}
            />
        </>
    );
}
