
"use client";

import { useState, useMemo, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { PlusCircle, ListFilter, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuLabel } from "@/components/ui/dropdown-menu";

import { hydrateReady } from "@/lib/placeholder-data";
import type { Vehicle, VehiclePriceList } from "@/types";
import type { VehicleFormValues } from "./components/vehicle-form";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PriceListDialog } from '../precios/components/price-list-dialog';
import type { PriceListFormValues } from '../precios/components/price-list-form';
import { VehicleDialog } from './components/vehicle-dialog';
import { VehiclesTable } from './components/vehicles-table'; 
import { PriceListTable } from '../precios/components/price-list-table';

import { inventoryService } from '@/lib/services/inventory.service';
import { operationsService } from '@/lib/services/operations.service';
import { subMonths, isBefore, parseISO, isValid } from 'date-fns';

// --- ResumenVehiculosPageComponent ---
const ResumenVehiculosPageComponent = ({ summaryData, onNewVehicleClick }: { summaryData: any, onNewVehicleClick: () => void }) => {
    return (
        <div className="space-y-6">
             <div className="space-y-2">
                <h2 className="text-2xl font-semibold tracking-tight">Resumen de Flotilla</h2>
                <p className="text-muted-foreground">Una vista rápida del estado de tus vehículos registrados.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card><CardHeader><CardTitle>Vehículos Totales</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{summaryData.totalVehiclesCount}</div></CardContent></Card>
                <Card><CardHeader><CardTitle>Propietarios Únicos</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{summaryData.uniqueOwnersCount}</div></CardContent></Card>
                <Card><CardHeader><CardTitle>Vehículos Inactivos (6+ meses)</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{summaryData.inactive6MonthsCount}</div></CardContent></Card>
                <Card><CardHeader><CardTitle>Vehículo Más Común</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{summaryData.mostCommonVehicle}</div></CardContent></Card>
            </div>
            <Button onClick={onNewVehicleClick}><PlusCircle className="mr-2 h-4 w-4" /> Registrar Nuevo Vehículo</Button>
        </div>
    );
};

// --- ListaVehiculosPageContent ---
const ListaVehiculosPageContent = ({ vehicles }: { vehicles: Vehicle[] }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [sortOption, setSortOption] = useState('licensePlate_asc');
    
    const filteredVehicles = useMemo(() => {
        let filtered = [...vehicles];
        if (searchTerm) {
            const lowercasedFilter = searchTerm.toLowerCase();
            filtered = filtered.filter(v => 
                v.licensePlate.toLowerCase().includes(lowercasedFilter) ||
                v.make.toLowerCase().includes(lowercasedFilter) ||
                v.model.toLowerCase().includes(lowercasedFilter) ||
                v.ownerName.toLowerCase().includes(lowercasedFilter)
            );
        }
        filtered.sort((a,b) => a.licensePlate.localeCompare(b.licensePlate));
        return filtered;
    }, [vehicles, searchTerm]);

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input type="search" placeholder="Buscar por placa, marca, modelo, propietario..." className="w-full rounded-lg bg-card pl-8" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
            </div>
            <Card>
                <CardContent className="pt-6">
                    <VehiclesTable vehicles={filteredVehicles} />
                </CardContent>
            </Card>
        </div>
    );
};

// --- PrecotizacionesPageContent ---
const PrecotizacionesPageContent = ({ priceLists, onDelete, onOpenDialog }: { priceLists: VehiclePriceList[], onDelete: (id: string) => void, onOpenDialog: (record?: VehiclePriceList) => void }) => {
    return (
        <div className="space-y-4">
             <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-semibold tracking-tight">Lista de Precios de Vehículos</h2>
                    <p className="text-muted-foreground">Precios estandarizados por modelo para agilizar cotizaciones.</p>
                </div>
                <Button onClick={() => onOpenDialog()}><PlusCircle className="mr-2 h-4 w-4" />Nueva Lista de Precios</Button>
            </div>
             <Card>
                <CardContent className="pt-6">
                    <PriceListTable
                        records={priceLists}
                        onEdit={onOpenDialog}
                        onDelete={onDelete}
                    />
                </CardContent>
            </Card>
        </div>
    );
};

function VehiculosPageComponent() {
    const searchParams = useSearchParams();
    const defaultTab = searchParams.get('tab') || 'resumen';
    const { toast } = useToast();
    const [version, setVersion] = useState(0);
    const [hydrated, setHydrated] = useState(false);
    const [activeTab, setActiveTab] = useState(defaultTab);
    
    // State for dialogs
    const [isVehicleDialogOpen, setIsVehicleDialogOpen] = useState(false);
    const [isPriceListDialogOpen, setIsPriceListDialogOpen] = useState(false);
    const [editingPriceRecord, setEditingPriceRecord] = useState<VehiclePriceList | null>(null);
    
    // State for data
    const [allVehicles, setAllVehicles] = useState<Vehicle[]>([]);
    const [priceLists, setPriceLists] = useState<VehiclePriceList[]>([]);
  
    useEffect(() => {
      const loadData = async () => {
          await hydrateReady;
          setAllVehicles(await inventoryService.getVehicles());
          setPriceLists(await inventoryService.getPriceLists());
          setHydrated(true);
      };

      const handleDbUpdate = async () => {
          setVersion(v => v + 1);
          setAllVehicles(await inventoryService.getVehicles());
          setPriceLists(await inventoryService.getPriceLists());
      };

      loadData();
      window.addEventListener('databaseUpdated', handleDbUpdate);
      return () => window.removeEventListener('databaseUpdated', handleDbUpdate);
    }, []);

    const vehiclesWithLastService = useMemo(() => {
        return allVehicles.map(v => ({...v, serviceHistory: []})); // Placeholder until service logic is integrated
    }, [allVehicles]);

    const summaryData = useMemo(() => {
        return inventoryService.getVehiclesSummary(vehiclesWithLastService);
    }, [vehiclesWithLastService]);

    const handleSaveVehicle = useCallback(async (data: VehicleFormValues) => {
        const newVehicle = await inventoryService.addVehicle(data);
        toast({ title: "Vehículo Creado", description: `Se ha agregado ${newVehicle.make} ${newVehicle.model}.` });
        setIsVehicleDialogOpen(false);
    }, [toast]);

    const handleOpenPriceListDialog = useCallback((record: VehiclePriceList | null = null) => {
        setEditingPriceRecord(record);
        setIsPriceListDialogOpen(true);
    }, []);

    const handleSavePriceListRecord = useCallback(async (formData: PriceListFormValues) => {
        await inventoryService.savePriceList(formData, editingPriceRecord?.id);
        toast({ title: `Precotización ${editingPriceRecord ? 'Actualizada' : 'Creada'}` });
        setIsPriceListDialogOpen(false);
    }, [editingPriceRecord, toast]);
    
    const handleDeletePriceListRecord = useCallback(async (recordId: string) => {
        await inventoryService.deletePriceList(recordId);
        toast({ title: "Registro Eliminado", variant: 'destructive' });
    }, [toast]);

    if (!hydrated) {
        return <div className="text-center py-10">Cargando vehículos...</div>;
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
                    <TabsTrigger value="vehiculos" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Vehículos</TabsTrigger>
                    <TabsTrigger value="precotizaciones" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Precotizaciones</TabsTrigger>
                </TabsList>

                <TabsContent value="resumen" className="mt-6">
                    <ResumenVehiculosPageComponent summaryData={summaryData} onNewVehicleClick={() => setIsVehicleDialogOpen(true)} />
                </TabsContent>

                <TabsContent value="vehiculos" className="mt-0">
                    <ListaVehiculosPageContent vehicles={vehiclesWithLastService} />
                </TabsContent>

                <TabsContent value="precotizaciones" className="mt-6">
                    <PrecotizacionesPageContent
                        priceLists={priceLists}
                        onDelete={handleDeletePriceListRecord}
                        onOpenDialog={handleOpenPriceListDialog}
                    />
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
