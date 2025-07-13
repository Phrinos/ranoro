

"use client";

import { useState, useMemo, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { PlusCircle, Car, AlertTriangle, Activity, CalendarX, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { useTableManager } from '@/hooks/useTableManager';
import { inventoryService } from '@/lib/services';
import { differenceInMonths, parseISO, isValid } from 'date-fns';

const vehicleSortOptions = [
    { value: 'lastServiceDate_desc', label: 'Último Servicio (Más Reciente)' },
    { value: 'lastServiceDate_asc', label: 'Último Servicio (Más Antiguo)' },
    { value: 'licensePlate_asc', label: 'Placa (A-Z)' },
    { value: 'licensePlate_desc', label: 'Placa (Z-A)' },
    { value: 'make_asc', label: 'Marca (A-Z)' },
    { value: 'make_desc', label: 'Marca (Z-A)' },
    { value: 'ownerName_asc', label: 'Propietario (A-Z)' },
    { value: 'ownerName_desc', label: 'Propietario (Z-A)' },
];

function VehiculosPageComponent() {
    const searchParams = useSearchParams();
    const defaultTab = searchParams.get('tab') || 'resumen';
    const { toast } = useToast();
    
    const [activeTab, setActiveTab] = useState(defaultTab);
    const [isLoading, setIsLoading] = useState(true);

    const [isVehicleDialogOpen, setIsVehicleDialogOpen] = useState(false);
    const [isPriceListDialogOpen, setIsPriceListDialogOpen] = useState(false);
    const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
    const [editingPriceRecord, setEditingPriceRecord] = useState<VehiclePriceList | null>(null);
    
    const [allVehicles, setAllVehicles] = useState<Vehicle[]>([]);
    const [priceLists, setPriceLists] = useState<VehiclePriceList[]>([]);
  
    useEffect(() => {
        setIsLoading(true);
        const unsubscribeVehicles = inventoryService.onVehiclesUpdate((data) => {
            setAllVehicles(data);
            setIsLoading(false);
        });

        const unsubscribePriceLists = inventoryService.onPriceListsUpdate(setPriceLists);

        return () => {
            unsubscribeVehicles();
            unsubscribePriceLists();
        };
    }, []);

    const {
      filteredData: filteredVehicles,
      ...tableManager
    } = useTableManager<Vehicle>({
      initialData: allVehicles,
      searchKeys: ['licensePlate', 'make', 'model', 'ownerName'],
      dateFilterKey: 'lastServiceDate',
      initialSortOption: 'lastServiceDate_desc', // Default sort
    });

    const vehicleSummary = useMemo(() => {
        const now = new Date();
        const total = allVehicles.length;
        let recent = 0;
        let inactive6Months = 0;
        let inactive12Months = 0;

        allVehicles.forEach(v => {
            if (v.lastServiceDate) {
                const lastService = parseISO(v.lastServiceDate);
                if (isValid(lastService)) {
                    const monthsSinceService = differenceInMonths(now, lastService);
                    if (monthsSinceService <= 1) recent++;
                    if (monthsSinceService >= 6) inactive6Months++;
                    if (monthsSinceService >= 12) inactive12Months++;
                }
            } else {
                // Si no tiene fecha de último servicio, cuenta como inactivo
                inactive6Months++;
                inactive12Months++;
            }
        });

        return { total, recent, inactive6Months, inactive12Months };
    }, [allVehicles]);
    
    const handleOpenVehicleDialog = (vehicle: Vehicle | null = null) => {
        setEditingVehicle(vehicle);
        setIsVehicleDialogOpen(true);
    };

    const handleSaveVehicle = async (data: VehicleFormValues) => {
        try {
            await inventoryService.saveVehicle(data, editingVehicle?.id);
            toast({ title: `Vehículo ${editingVehicle ? 'Actualizado' : 'Creado'}` });
            setIsVehicleDialogOpen(false);
            setEditingVehicle(null);
        } catch (error) {
            console.error("Error saving vehicle: ", error);
            toast({ title: "Error", description: `No se pudo guardar el vehículo. ${error instanceof Error ? error.message : ''}`, variant: "destructive" });
        }
    };

    const handleOpenPriceListDialog = useCallback((record: VehiclePriceList | null = null) => {
        setEditingPriceRecord(record);
        setIsPriceListDialogOpen(true);
    }, []);

    const handleSavePriceListRecord = async (formData: PriceListFormValues) => {
        try {
            await inventoryService.savePriceList(formData, editingPriceRecord?.id);
            toast({ title: `Precotización ${editingPriceRecord ? 'Actualizada' : 'Creada'}` });
            setIsPriceListDialogOpen(false);
        } catch (error) {
            console.error("Error saving price list record: ", error);
            toast({ title: "Error", description: "No se pudo guardar la lista de precios.", variant: "destructive" });
        }
    };
    
    const handleDeletePriceListRecord = async (recordId: string) => {
        try {
            await inventoryService.deletePriceList(recordId);
            toast({ title: "Registro Eliminado", variant: 'destructive' });
        } catch (error) {
            console.error("Error deleting price list record: ", error);
            toast({ title: "Error", description: "No se pudo eliminar el registro.", variant: "destructive" });
        }
    };
    
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
                <TabsList className="grid w-full grid-cols-3 mb-6">
                    <TabsTrigger value="resumen" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Resumen</TabsTrigger>
                    <TabsTrigger value="vehiculos" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Lista de Vehículos</TabsTrigger>
                    <TabsTrigger value="precotizaciones" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Precotizaciones</TabsTrigger>
                </TabsList>

                <TabsContent value="resumen" className="mt-0">
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total de Vehículos</CardTitle><Car className="h-4 w-4 text-muted-foreground"/></CardHeader><CardContent><div className="text-2xl font-bold">{vehicleSummary.total}</div><p className="text-xs text-muted-foreground">Vehículos en la base de datos.</p></CardContent></Card>
                        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Actividad Reciente</CardTitle><Activity className="h-4 w-4 text-muted-foreground"/></CardHeader><CardContent><div className="text-2xl font-bold">{vehicleSummary.recent}</div><p className="text-xs text-muted-foreground">Visitaron el taller en los últimos 30 días.</p></CardContent></Card>
                        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Vehículos Inactivos</CardTitle><CalendarX className="h-4 w-4 text-orange-500"/></CardHeader><CardContent><div className="text-2xl font-bold text-orange-600">{vehicleSummary.inactive6Months}</div><p className="text-xs text-muted-foreground">Sin servicio por más de 6 meses.</p></CardContent></Card>
                        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Vehículos en Riesgo</CardTitle><AlertTriangle className="h-4 w-4 text-red-500"/></CardHeader><CardContent><div className="text-2xl font-bold text-red-600">{vehicleSummary.inactive12Months}</div><p className="text-xs text-muted-foreground">Sin servicio por más de 12 meses.</p></CardContent></Card>
                    </div>
                </TabsContent>

                <TabsContent value="vehiculos" className="mt-0">
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <TableToolbar 
                                searchTerm={tableManager.searchTerm}
                                onSearchTermChange={tableManager.setSearchTerm}
                                searchPlaceholder="Buscar por placa, marca, modelo, propietario..."
                                dateRange={tableManager.dateRange}
                                onDateRangeChange={tableManager.setDateRange}
                                sortOption={tableManager.sortOption}
                                onSortOptionChange={tableManager.setSortOption}
                                sortOptions={vehicleSortOptions}
                            />
                            <Button onClick={() => handleOpenVehicleDialog()} className="ml-4">
                                <PlusCircle className="mr-2 h-4 w-4" /> Registrar Nuevo Vehículo
                            </Button>
                        </div>
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
                vehicle={editingVehicle} 
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
        <Suspense fallback={<div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <VehiculosPageComponent />
        </Suspense>
    );
}

