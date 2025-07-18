
"use client";

import { useParams, useRouter } from 'next/navigation';
import type { Vehicle, VehiclePaperwork } from '@/types';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { ShieldAlert, Edit, ArrowLeft, Trash2, Loader2 } from 'lucide-react';
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
import { inventoryService, operationsService } from '@/lib/services';
import { DetailsTabContent } from './components/details-tab-content';
import { MaintenancesTabContent } from './components/maintenances-tab-content';
import { FinesTabContent } from './components/fines-tab-content';
import { PaperworkTabContent } from './components/paperwork-tab-content';


export default function FleetVehicleDetailPage() {
  const params = useParams();
  const vehicleId = params.id as string;
  const { toast } = useToast();
  const router = useRouter();

  const [vehicle, setVehicle] = useState<Vehicle | null | undefined>(undefined);
  const [isVehicleEditDialogOpen, setIsVehicleEditDialogOpen] = useState(false);

  const fetchVehicle = useCallback(async () => {
    const fetchedVehicle = await inventoryService.getVehicleById(vehicleId);
    if(fetchedVehicle && fetchedVehicle.isFleetVehicle) {
        setVehicle(fetchedVehicle);
    } else {
        setVehicle(null);
    }
  }, [vehicleId]);

  useEffect(() => {
    fetchVehicle();
  }, [fetchVehicle]);

  const handleSaveVehicle = useCallback(async (formData: VehicleFormValues) => {
    if (!vehicle) return;
    try {
        await inventoryService.saveVehicle(formData, vehicle.id);
        await fetchVehicle(); // Re-fetch data to reflect changes
        setIsVehicleEditDialogOpen(false);
        toast({ title: "Vehículo Actualizado" });
    } catch(e) {
        toast({ title: "Error", description: "No se pudieron guardar los cambios.", variant: "destructive"});
    }
  }, [vehicle, toast, fetchVehicle]);

  const handleRemoveFromFleet = useCallback(async () => {
    if (!vehicle) return;
    try {
        await inventoryService.updateVehicle(vehicle.id, { isFleetVehicle: false, dailyRentalCost: null });
        toast({ title: "Vehículo Removido", description: `${vehicle.licensePlate} ha sido removido de la flotilla.` });
        router.push('/flotilla');
    } catch(e) {
        toast({ title: "Error", description: "No se pudo remover el vehículo.", variant: "destructive"});
    }
  }, [vehicle, toast, router]);

  if (vehicle === undefined) {
    return <div className="container mx-auto py-8 text-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
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
            <Button variant="outline" className="bg-white text-black hover:bg-gray-100" asChild>
              <Link href="/flotilla?tab=vehiculos">
                <ArrowLeft className="mr-2 h-4 w-4"/> Volver
              </Link>
            </Button>
          </div>
        }
      />

      <Tabs defaultValue="details" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="details" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Detalles</TabsTrigger>
          <TabsTrigger value="maintenances" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Mantenimientos</TabsTrigger>
          <TabsTrigger value="fines" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Multas</TabsTrigger>
          <TabsTrigger value="paperwork" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Trámites</TabsTrigger>
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
