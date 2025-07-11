

"use client";

import { useState, useMemo, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { Vehicle, VehiclePriceList } from "@/types";
import type { VehicleFormValues } from "./components/vehicle-form";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PriceListDialog } from '../precios/components/price-list-dialog';
import type { PriceListFormValues } from '../precios/components/price-list-form';
import { VehicleDialog } from './components/vehicle-dialog';
import { VehiclesTable } from './components/vehicles-table'; 
import { PriceListTable } from '../precios/components/price-list-table';
import { TableToolbar } from '@/components/shared/table-toolbar';
import { Loader2 } from 'lucide-react';
import { 
    placeholderVehicles, 
    placeholderVehiclePriceLists, 
    persistToFirestore, 
    hydrateReady 
} from '@/lib/placeholder-data';
import { useTableManager } from '@/hooks/useTableManager';

function VehiculosPageComponent() {
    const searchParams = useSearchParams();
    const defaultTab = searchParams.get('tab') || 'vehiculos';
    const { toast } = useToast();
    
    const [activeTab, setActiveTab] = useState(defaultTab);
    const [isLoading, setIsLoading] = useState(true);

    const [isVehicleDialogOpen, setIsVehicleDialogOpen] = useState(false);
    const [isPriceListDialogOpen, setIsPriceListDialogOpen] = useState(false);
    const [editingPriceRecord, setEditingPriceRecord] = useState<VehiclePriceList | null>(null);
    
    const [allVehicles, setAllVehicles] = useState<Vehicle[]>([]);
    const [priceLists, setPriceLists] = useState<VehiclePriceList[]>([]);
  
    useEffect(() => {
        const loadData = () => {
            setIsLoading(true);
            setAllVehicles([...placeholderVehicles]);
            setPriceLists([...placeholderVehiclePriceLists]);
            setIsLoading(false);
        };
        hydrateReady.then(() => {
            loadData();
            window.addEventListener('databaseUpdated', loadData);
        });

        return () => window.removeEventListener('databaseUpdated', loadData);
    }, []);

    const {
      filteredData: filteredVehicles,
      ...tableManager
    } = useTableManager<Vehicle>({
      initialData: allVehicles,
      searchKeys: ['licensePlate', 'make', 'model', 'ownerName'],
      dateFilterKey: 'lastServiceDate',
      initialSortOption: 'plate_asc',
    });

    const handleSaveVehicle = useCallback(async (data: VehicleFormValues) => {
        const newVehicle: Vehicle = {
          id: `V${String(placeholderVehicles.length + 1).padStart(3, '0')}${Date.now().toString().slice(-4)}`,
          ...data,
          year: Number(data.year),
        };
        placeholderVehicles.push(newVehicle);
        await persistToFirestore(['vehicles']);
        toast({ title: "Vehículo Creado", description: `Se ha agregado ${newVehicle.make} ${newVehicle.model}.` });
        setIsVehicleDialogOpen(false);
    }, [toast]);

    const handleOpenPriceListDialog = useCallback((record: VehiclePriceList | null = null) => {
        setEditingPriceRecord(record);
        setIsPriceListDialogOpen(true);
    }, []);

    const handleSavePriceListRecord = useCallback(async (formData: PriceListFormValues) => {
        if(editingPriceRecord) {
            const index = placeholderVehiclePriceLists.findIndex(p => p.id === editingPriceRecord.id);
            if(index > -1) placeholderVehiclePriceLists[index] = { ...editingPriceRecord, ...formData, years: formData.years.sort((a,b) => a-b) };
        } else {
            placeholderVehiclePriceLists.push({ id: `PL_${Date.now()}`, ...formData, years: formData.years.sort((a,b) => a-b) });
        }
        await persistToFirestore(['vehiclePriceLists']);
        toast({ title: `Precotización ${editingPriceRecord ? 'Actualizada' : 'Creada'}` });
        setIsPriceListDialogOpen(false);
    }, [editingPriceRecord, toast]);
    
    const handleDeletePriceListRecord = useCallback(async (recordId: string) => {
        const index = placeholderVehiclePriceLists.findIndex(p => p.id === recordId);
        if(index > -1) {
            placeholderVehiclePriceLists.splice(index, 1);
            await persistToFirestore(['vehiclePriceLists']);
            toast({ title: "Registro Eliminado", variant: 'destructive' });
        }
    }, [toast]);
    
    if (isLoading) {
      return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <>
            <div className="bg-primary text-primary-foreground rounded-lg p-6 mb-6">
                <h1 className="text-3xl font-bold tracking-tight">Gestión de Vehículos</h1>
                <p className="text-primary-foreground/80 mt-1">Administra la información, historial y precios de tus vehículos.</p>
            </div>
            
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="vehiculos" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Lista de Vehículos</TabsTrigger>
                    <TabsTrigger value="precotizaciones" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Precotizaciones</TabsTrigger>
                </TabsList>

                <TabsContent value="vehiculos" className="mt-0">
                    <div className="space-y-4">
                        <Button onClick={() => setIsVehicleDialogOpen(true)}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Registrar Nuevo Vehículo
                        </Button>
                        <TableToolbar 
                            searchTerm={tableManager.searchTerm}
                            onSearchTermChange={tableManager.setSearchTerm}
                            searchPlaceholder="Buscar por placa, marca, modelo, propietario..."
                            dateRange={undefined}
                            onDateRangeChange={() => {}} // No date filter on this tab
                            sortOption={''}
                            onSortOptionChange={() => {}} // No sort on this tab
                        />
                        <Card>
                            <CardContent className="pt-6">
                                <VehiclesTable vehicles={filteredVehicles} />
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="precotizaciones" className="mt-6">
                    <div className="space-y-4">
                         <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                            <div>
                                <h2 className="text-2xl font-semibold tracking-tight">Lista de Precios de Vehículos</h2>
                                <p className="text-muted-foreground">Precios estandarizados por modelo para agilizar cotizaciones.</p>
                            </div>
                            <Button onClick={() => handleOpenPriceListDialog()}><PlusCircle className="mr-2 h-4 w-4" />Nueva Lista de Precios</Button>
                        </div>
                         <Card>
                            <CardContent className="pt-6">
                                <PriceListTable
                                    records={priceLists}
                                    onEdit={handleOpenPriceListDialog}
                                    onDelete={handleDeletePriceListRecord}
                                />
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
            
            <VehicleDialog
                open={isVehicleDialogOpen}
                onOpenChange={setIsVehicleDialogOpen}
                onSave={handleSaveVehicle}
                vehicle={null} 
            />
            
            <PriceListDialog
                open={isPriceListDialogOpen}
                onOpenChange={setIsPriceListDialogOpen}
                onSave={handleSavePriceListRecord}
                record={editingPriceRecord}
            />
        </>
    );
}

export default function VehiculosPageWrapper() {
    return (
        <Suspense fallback={<div>Cargando...</div>}>
            <VehiculosPageComponent />
        </Suspense>
    );
}
