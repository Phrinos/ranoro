
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Trash2, Loader2, Edit } from 'lucide-react';
import { inventoryService, serviceService } from '@/lib/services';
import type { Vehicle, ServiceRecord } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { VehicleInfoCard } from '../components/VehicleInfoCard';
import { VehicleDialog } from '../components/vehicle-dialog';
import type { VehicleFormValues } from '@/schemas/vehicle-form-schema';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';
import { parseDate } from '@/lib/forms';
import { formatNumber, formatCurrency, getStatusInfo } from '@/lib/utils';
import { UnifiedPreviewDialog } from '@/components/shared/unified-preview-dialog';
import { SortableTableHeader } from '@/components/shared/SortableTableHeader';
import { useTableManager } from '@/hooks/useTableManager';
import { MaintenanceCard } from '../../vehiculos/components/MaintenanceCard';
import { VehiclePricingCard } from '../components/VehiclePricingCard';
import type { EngineData } from '@/lib/data/vehicle-database-types';
import { EditEngineDataDialog } from '@/app/(app)/precios/components/EditEngineDataDialog';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';
import { VEHICLE_COLLECTION } from '@/lib/vehicle-constants';


const getServiceDescriptionText = (service: ServiceRecord) => {
    if (service.serviceItems && service.serviceItems.length > 0) {
      return service.serviceItems.map((item) => item.name).join(", ");
    }
    return service.description;
};

function ServiceHistoryTable({ services, onRowClick }: { services: ServiceRecord[], onRowClick: (service: ServiceRecord) => void }) {
    const { filteredData: sortedServices, sortOption, onSortOptionChange } = useTableManager<ServiceRecord>({
        initialData: services,
        searchKeys: [],
        dateFilterKey: 'serviceDate',
        initialSortOption: 'serviceDate_desc',
    });

    const handleSort = (key: string) => {
        const isAsc = sortOption.endsWith('_asc');
        onSortOptionChange(`${key}_${isAsc ? 'desc' : 'asc'}`);
    };
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>Historial de Servicios</CardTitle>
                <CardDescription>Servicios realizados a este vehículo. Haz clic para ver detalles.</CardDescription>
            </CardHeader>
            <CardContent>
                {sortedServices.length > 0 ? (
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader className="bg-black">
                                <TableRow>
                                    <SortableTableHeader sortKey="serviceDate" label="Fecha" onSort={handleSort} currentSort={sortOption} textClassName="text-white"/>
                                    <SortableTableHeader sortKey="mileage" label="Kilometraje" onSort={handleSort} currentSort={sortOption} textClassName="text-white"/>
                                    <SortableTableHeader sortKey="description" label="Descripción" onSort={handleSort} currentSort={sortOption} textClassName="text-white"/>
                                    <SortableTableHeader sortKey="totalCost" label="Costo" onSort={handleSort} currentSort={sortOption} textClassName="text-white" className="text-right"/>
                                    <SortableTableHeader sortKey="status" label="Estado" onSort={handleSort} currentSort={sortOption} textClassName="text-white"/>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sortedServices.map((service) => {
                                    const relevantDate = parseDate(service.deliveryDateTime || service.receptionDateTime || service.serviceDate);
                                    return (
                                        <TableRow key={service.id} onClick={() => onRowClick(service)} className="cursor-pointer">
                                            <TableCell>{relevantDate && isValid(relevantDate) ? format(relevantDate, "dd MMM yyyy, HH:mm", { locale: es }) : "N/A"}</TableCell>
                                            <TableCell>{(service as any).mileage ? `${formatNumber((service as any).mileage)} km` : "N/A"}</TableCell>
                                            <TableCell>{getServiceDescriptionText(service)}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(service.totalCost || 0)}</TableCell>
                                            <TableCell><Badge variant={getStatusInfo(service.status as any).color as any}>{service.status}</Badge></TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                ) : <p className="text-muted-foreground">No hay historial de servicios para este vehículo.</p>}
            </CardContent>
        </Card>
    );
}

export default function VehicleDetailPage() {
  const params = useParams();
  const vehicleId = params.id as string;
  const { toast } = useToast();
  const router = useRouter();

  const [vehicle, setVehicle] = useState<Vehicle | null | undefined>(undefined);
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [priceLists, setPriceLists] = useState<any[]>([]);

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewServiceDialogOpen, setIsViewServiceDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<ServiceRecord | null>(null);
  const [isEngineEditDialogOpen, setIsEngineEditDialogOpen] = useState(false);


  useEffect(() => {
    if (!vehicleId) return;

    const fetchVehicle = async () => {
        try {
            const fetchedVehicle = await inventoryService.getVehicleById(vehicleId);
            setVehicle(fetchedVehicle || null);
        } catch (error) {
            console.error("Error fetching vehicle:", error);
            setVehicle(null);
            toast({ title: "Error", description: "No se pudo cargar el vehículo.", variant: "destructive"});
        }
    };
    
    fetchVehicle();

    const unsubscribeServices = serviceService.onServicesForVehicleUpdate(vehicleId, setServices);
    const unsubscribePriceLists = inventoryService.onVehicleDataUpdate((data) => setPriceLists(data as any[]));
    
    return () => {
        unsubscribeServices();
        unsubscribePriceLists();
    };
  }, [vehicleId, toast]);
  
  const vehicleEngineData = useMemo(() => {
    if (!vehicle || !vehicle.engine || priceLists.length === 0) return null;
    
    const makeData = priceLists.find(pl => pl.make === vehicle.make);
    if (!makeData) return null;
    
    const modelData = makeData.models.find((m: any) => m.name === vehicle.model);
    if (!modelData) return null;
    
    const generationData = modelData.generations.find((g: any) => vehicle.year >= g.startYear && vehicle.year <= g.endYear);
    if (!generationData) return null;
    
    return generationData.engines.find((e: any) => e.name === vehicle.engine) || null;
  }, [vehicle, priceLists]);

  const handleSaveEditedVehicle = async (formData: VehicleFormValues) => {
    if (!vehicle) return;
    try {
      await inventoryService.saveVehicle(formData, vehicle.id);
      setVehicle(prev => prev ? { ...prev, ...formData, id: prev.id } as Vehicle : null);
      setIsEditDialogOpen(false);
      toast({ title: "Vehículo actualizado" });
    } catch (e) {
      toast({ title: "Error", description: "No se pudieron guardar los cambios.", variant: "destructive" });
    }
  };
  
  const handleDeleteVehicle = async () => {
    if (!vehicle) return;
    try {
        await inventoryService.deleteVehicle(vehicle.id);
        toast({ title: "Vehículo eliminado", variant: "destructive" });
        router.push("/vehiculos");
    } catch (e) {
        toast({ title: "Error", description: "No se pudo eliminar el vehículo.", variant: "destructive"});
    }
  };
  
  const handleEngineDataSave = async (updatedEngineData: EngineData) => {
    if (!vehicle || !db) return;
    const { make, model, year } = vehicle;

    if (!make) {
        toast({
            title: "Error de Datos",
            description: "La marca del vehículo (make) no está definida. No se puede guardar.",
            variant: "destructive",
        });
        return;
    }

    try {
        const makeData = priceLists.find(pl => pl.make === make);
        if (!makeData) throw new Error("Make data not found in price list.");

        const modelIndex = makeData.models.findIndex((m: any) => m.name === model);
        if (modelIndex === -1) throw new Error("Model data not found.");

        const genIndex = makeData.models[modelIndex].generations.findIndex((g: any) => year >= g.startYear && year <= g.endYear);
        if (genIndex === -1) throw new Error("Generation data not found.");
        
        const engineIndex = makeData.models[modelIndex].generations[genIndex].engines.findIndex((e: any) => e.name === vehicleEngineData?.name);
        if (engineIndex === -1) throw new Error("Engine data not found.");

        const updatedModels = [...makeData.models];
        const updatedGenerations = [...updatedModels[modelIndex].generations];
        const updatedEngines = [...updatedGenerations[genIndex].engines];
        
        updatedEngines[engineIndex] = updatedEngineData;
        updatedGenerations[genIndex] = { ...updatedGenerations[genIndex], engines: updatedEngines };
        updatedModels[modelIndex] = { ...updatedModels[modelIndex], generations: updatedGenerations };
        
        await setDoc(doc(db, VEHICLE_COLLECTION, make), { models: updatedModels }, { merge: true });

        toast({ title: 'Guardado', description: `Se actualizaron los datos para ${updatedEngineData.name}.` });
        setIsEngineEditDialogOpen(false);
    } catch (error) {
        console.error("Error saving engine data:", error);
        toast({ title: "Error", description: "No se pudieron guardar los cambios en la base de datos de precios.", variant: "destructive" });
    }
  };

  const openServicePreview = (service: ServiceRecord) => {
    setSelectedService(service);
    setIsViewServiceDialogOpen(true);
  };
  
  if (vehicle === undefined) return <div className="container mx-auto py-8 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div>;
  if (vehicle === null) return <div className="container mx-auto py-8 text-center"><h1>Vehículo no encontrado</h1><Button onClick={() => router.push('/vehiculos')}>Volver</Button></div>;

  return (
    <div className="container mx-auto py-8">
      <PageHeader
        title={`${vehicle.make} ${vehicle.model} (${vehicle.licensePlate})`}
        description={`ID Vehículo: ${vehicle.id}`}
        actions={
            <div className="flex items-center gap-2">
                 <ConfirmDialog
                    triggerButton={<Button variant="destructive" size="sm"><Trash2 className="mr-2 h-4 w-4"/>Eliminar</Button>}
                    title="¿Eliminar este vehículo?"
                    description="Esta acción es permanente. Se eliminará el vehículo y todo su historial de servicios."
                    onConfirm={handleDeleteVehicle}
                />
                <Button variant="outline" onClick={() => router.back()}><ArrowLeft className="mr-2 h-4 w-4" />Volver</Button>
            </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <div className="lg:col-span-2 space-y-6">
            <VehicleInfoCard vehicle={vehicle} onEdit={() => setIsEditDialogOpen(true)} />
            <ServiceHistoryTable services={services} onRowClick={openServicePreview} />
        </div>
        <div className="lg:col-span-1 space-y-6">
            <MaintenanceCard vehicle={vehicle} serviceHistory={services} />
            <VehiclePricingCard 
                engineData={vehicleEngineData as EngineData | null} 
                make={vehicle.make}
                onEdit={() => setIsEngineEditDialogOpen(true)} 
            />
        </div>
      </div>

      <VehicleDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        vehicle={vehicle}
        onSave={handleSaveEditedVehicle}
      />
      
      {vehicleEngineData && (
        <EditEngineDataDialog 
            open={isEngineEditDialogOpen}
            onOpenChange={setIsEngineEditDialogOpen}
            engineData={vehicleEngineData}
            onSave={handleEngineDataSave}
        />
      )}

      {selectedService && (
        <UnifiedPreviewDialog 
          open={isViewServiceDialogOpen}
          onOpenChange={setIsViewServiceDialogOpen}
          title="Vista Previa del Servicio"
          service={selectedService}
        >
          <div className="hidden" />
        </UnifiedPreviewDialog>
      )}
    </div>
  );
}
