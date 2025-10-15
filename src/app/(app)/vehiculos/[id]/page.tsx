// src/app/(app)/vehiculos/[id]/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Trash2, Loader2 } from 'lucide-react';
import { inventoryService, serviceService } from '@/lib/services';
import type { Vehicle, ServiceRecord } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VehicleInfoCard } from '../components/VehicleInfoCard';
import { VehicleDialog } from '../components/vehicle-dialog';
import type { VehicleFormValues } from '../components/vehicle-form';
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

const getServiceDescriptionText = (service: ServiceRecord) => {
    if (service.serviceItems && service.serviceItems.length > 0) {
      return service.serviceItems.map((item) => item.name).join(", ");
    }
    return service.description;
};

// Componente para la tabla de historial de servicios
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

// Componente principal de la página
export default function VehicleDetailPage() {
  const params = useParams();
  const vehicleId = params.id as string;
  const { toast } = useToast();
  const router = useRouter();

  const [vehicle, setVehicle] = useState<Vehicle | null | undefined>(undefined);
  const [services, setServices] = useState<ServiceRecord[]>([]);

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewServiceDialogOpen, setIsViewServiceDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<ServiceRecord | null>(null);

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

    const unsubscribe = serviceService.onServicesForVehicleUpdate(vehicleId, setServices);
    return () => unsubscribe();
  }, [vehicleId, toast]);

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

      <div className="space-y-6">
        <VehicleInfoCard vehicle={vehicle} onEdit={() => setIsEditDialogOpen(true)} />
        <ServiceHistoryTable services={services} onRowClick={openServicePreview} />
      </div>

      <VehicleDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        vehicle={vehicle}
        onSave={handleSaveEditedVehicle}
      />
      {selectedService && (
        <UnifiedPreviewDialog
          open={isViewServiceDialogOpen}
          onOpenChange={setIsViewServiceDialogOpen}
          title="Vista Previa del Servicio"
          service={selectedService}
          vehicle={vehicle}
        />
      )}
    </div>
  );
}
