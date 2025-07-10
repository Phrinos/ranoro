
"use client";

import { useState, useMemo, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { hydrateReady } from "@/lib/placeholder-data";
import type { Vehicle, VehiclePriceList } from "@/types";
import type { VehicleFormValues } from "./components/vehicle-form";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PriceListDialog } from '../precios/components/price-list-dialog';
import type { PriceListFormValues } from '../precios/components/price-list-form';
import { ResumenVehiculosPageComponent } from './components/resumen-vehiculos-content';
import { ListaVehiculosPageContent } from './components/lista-vehiculos-content';
import { PrecotizacionesPageContent } from './components/precotizaciones-content';
import { VehicleDialog } from './components/vehicle-dialog';

import { inventoryService } from '@/lib/services/inventory.service';
import { operationsService } from '@/lib/services/operations.service';


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
