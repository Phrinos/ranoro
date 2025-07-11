
"use client";

import { useState, useMemo, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';
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
import { useTableManager } from '@/hooks/useTableManager';
import { addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';

function VehiculosPageComponent() {
    const searchParams = useSearchParams();
    const defaultTab = searchParams.get('tab') || 'vehiculos';
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
        const unsubscribeVehicles = onSnapshot(collection(db, "vehicles"), (snapshot) => {
            const vehiclesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vehicle));
            setAllVehicles(vehiclesData);
            setIsLoading(false);
        });

        const unsubscribePriceLists = onSnapshot(collection(db, "vehiclePriceLists"), (snapshot) => {
            const priceListsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VehiclePriceList));
            setPriceLists(priceListsData);
        });

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
      initialSortOption: 'plate_asc',
    });
    
    const handleOpenVehicleDialog = (vehicle: Vehicle | null = null) => {
        setEditingVehicle(vehicle);
        setIsVehicleDialogOpen(true);
    };

    const handleSaveVehicle = async (data: VehicleFormValues) => {
        try {
            if (editingVehicle) {
                const vehicleRef = doc(db, "vehicles", editingVehicle.id);
                await updateDoc(vehicleRef, data);
                toast({ title: "Vehículo Actualizado", description: `Se ha actualizado ${data.make} ${data.model}.` });
            } else {
                await addDoc(collection(db, "vehicles"), {
                    ...data,
                    year: Number(data.year),
                });
                toast({ title: "Vehículo Creado", description: `Se ha agregado ${data.make} ${data.model}.` });
            }
            setIsVehicleDialogOpen(false);
            setEditingVehicle(null);
        } catch (error) {
            console.error("Error saving vehicle: ", error);
            toast({ title: "Error", description: "No se pudo guardar el vehículo.", variant: "destructive" });
        }
    };

    const handleOpenPriceListDialog = useCallback((record: VehiclePriceList | null = null) => {
        setEditingPriceRecord(record);
        setIsPriceListDialogOpen(true);
    }, []);

    const handleSavePriceListRecord = async (formData: PriceListFormValues) => {
        try {
            if(editingPriceRecord) {
                const priceListRef = doc(db, "vehiclePriceLists", editingPriceRecord.id);
                await updateDoc(priceListRef, { ...formData, years: formData.years.sort((a,b) => a-b) });
            } else {
                await addDoc(collection(db, "vehiclePriceLists"), { ...formData, years: formData.years.sort((a,b) => a-b) });
            }
            toast({ title: `Precotización ${editingPriceRecord ? 'Actualizada' : 'Creada'}` });
            setIsPriceListDialogOpen(false);
        } catch (error) {
            console.error("Error saving price list record: ", error);
            toast({ title: "Error", description: "No se pudo guardar la lista de precios.", variant: "destructive" });
        }
    };
    
    const handleDeletePriceListRecord = async (recordId: string) => {
        try {
            await deleteDoc(doc(db, "vehiclePriceLists", recordId));
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
                <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="vehiculos" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Lista de Vehículos</TabsTrigger>
                    <TabsTrigger value="precotizaciones" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Precotizaciones</TabsTrigger>
                </TabsList>

                <TabsContent value="vehiculos" className="mt-0">
                    <div className="space-y-4">
                        <Button onClick={() => handleOpenVehicleDialog()}>
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
                                <VehiclesTable vehicles={filteredVehicles} onEdit={handleOpenVehicleDialog} />
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
