
"use client";

import { useParams, useRouter } from 'next/navigation';
import { 
  placeholderVehicles, 
  placeholderServiceRecords, 
  placeholderInventory, 
  placeholderTechnicians, 
  persistToFirestore 
} from '@/lib/placeholder-data';
import type { Vehicle, ServiceRecord, QuoteRecord } from '@/types';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { ShieldAlert, Edit, ArrowLeft, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { VehicleDialog } from '../../vehiculos/components/vehicle-dialog';
import type { VehicleFormValues } from '../../vehiculos/components/vehicle-form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Import refactored tab components
import { DetailsTabContent } from './components/details-tab-content';
import { MaintenancesTabContent } from './components/maintenances-tab-content';
import { FinesTabContent } from './components/fines-tab-content';
import { PaperworkTabContent } from './components/paperwork-tab-content';
import { ServiceDialog } from '../../servicios/components/service-dialog';


export default function FleetVehicleDetailPage() {
  const params = useParams();
  const vehicleId = params.id as string;
  const { toast } = useToast();
  const router = useRouter();

  const [vehicle, setVehicle] = useState<Vehicle | null | undefined>(undefined);
  const [isVehicleEditDialogOpen, setIsVehicleEditDialogOpen] = useState(false);

  useEffect(() => {
    const foundVehicle = placeholderVehicles.find(v => v.id === vehicleId && v.isFleetVehicle);
    setVehicle(foundVehicle || null);
  }, [vehicleId]);

  const handleSaveVehicle = async (formData: VehicleFormValues) => {
    if (!vehicle) return;

    const updatedVehicleData: Partial<Vehicle> = {
        ...formData,
        year: Number(formData.year),
        dailyRentalCost: formData.dailyRentalCost ? Number(formData.dailyRentalCost) : undefined,
        gpsMonthlyCost: formData.gpsMonthlyCost ? Number(formData.gpsMonthlyCost) : undefined,
        adminMonthlyCost: formData.adminMonthlyCost ? Number(formData.adminMonthlyCost) : undefined,
        insuranceMonthlyCost: formData.insuranceMonthlyCost ? Number(formData.insuranceMonthlyCost) : undefined,
    };
    
    const updatedVehicle = { ...vehicle, ...updatedVehicleData } as Vehicle;
    setVehicle(updatedVehicle);

    const pIndex = placeholderVehicles.findIndex(v => v.id === updatedVehicle.id);
    if (pIndex !== -1) {
      placeholderVehicles[pIndex] = updatedVehicle;
    }
    
    await persistToFirestore(['vehicles']);

    setIsVehicleEditDialogOpen(false);
    toast({
      title: "Vehículo Actualizado",
      description: `Los datos de ${updatedVehicle.make} ${updatedVehicle.model} han sido actualizados.`,
    });
  };

  const handleRemoveFromFleet = async () => {
    if (!vehicle) return;

    const vehicleIndex = placeholderVehicles.findIndex(v => v.id === vehicle.id);
    if (vehicleIndex > -1) {
      placeholderVehicles[vehicleIndex].isFleetVehicle = false;
      delete placeholderVehicles[vehicleIndex].dailyRentalCost;
    }

    await persistToFirestore(['vehicles']);
    
    toast({
      title: "Vehículo Removido",
      description: `${vehicle.licensePlate} ha sido removido de la flotilla.`,
    });

    router.push('/flotilla');
  };

  if (vehicle === undefined) {
    return <div className="container mx-auto py-8 text-center">Cargando datos del vehículo...</div>;
  }

  if (!vehicle) {
    return (
      <div className="container mx-auto py-8 text-center">
        <ShieldAlert className="mx-auto h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold">Vehículo de Flotilla no encontrado</h1>
        <Button asChild className="mt-6"><Link href="/flotilla">Volver a Flotilla</Link></Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <PageHeader
        title={`${vehicle.licensePlate} - ${vehicle.make} ${vehicle.model}`}
        description="Detalles del vehículo de flotilla y su historial de mantenimiento."
        actions={
          <div className="flex flex-col sm:flex-row gap-2">
             <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Quitar de Flotilla
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Quitar de la flotilla?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción quitará el vehículo de la flotilla, pero no lo eliminará del registro general de vehículos. ¿Estás seguro?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleRemoveFromFleet} className="bg-destructive hover:bg-destructive/90">
                    Sí, Quitar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="mr-2 h-4 w-4"/> Volver
            </Button>
          </div>
        }
      />

      <Tabs defaultValue="details" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="details">Detalles</TabsTrigger>
          <TabsTrigger value="maintenances">Mantenimientos</TabsTrigger>
          <TabsTrigger value="fines">Multas</TabsTrigger>
          <TabsTrigger value="paperwork">Trámites</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-6">
          <DetailsTabContent vehicle={vehicle} onEdit={() => setIsVehicleEditDialogOpen(true)} />
        </TabsContent>
        
        <TabsContent value="maintenances">
          <MaintenancesTabContent vehicleId={vehicle.id} />
        </TabsContent>

        <TabsContent value="fines">
          <FinesTabContent vehicle={vehicle} />
        </TabsContent>

        <TabsContent value="paperwork">
          <PaperworkTabContent vehicle={vehicle} setVehicle={setVehicle} />
        </TabsContent>
      </Tabs>
      
      <VehicleDialog
        open={isVehicleEditDialogOpen}
        onOpenChange={setIsVehicleEditDialogOpen}
        vehicle={vehicle}
        onSave={handleSaveVehicle}
      />
    </div>
  );
}
