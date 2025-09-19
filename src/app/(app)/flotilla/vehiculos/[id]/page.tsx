// src/app/(app)/flotilla/vehiculos/[id]/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { inventoryService, personnelService, serviceService } from '@/lib/services';
import type { Vehicle, Driver, ServiceRecord, Paperwork, FineCheck } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

import { AssignDriverCard } from '../../components/AssignDriverCard';
import { VehicleInfoCard } from '../../components/VehicleInfoCard';
import { RentalSystemCard } from '../../components/RentalSystemCard';
import { MaintenanceCard } from '../../components/MaintenanceCard';
import { PaperworkCard } from '../../components/PaperworkCard';
import { FineCheckCard } from '../../components/FineCheckCard';

import { EditVehicleInfoDialog, type VehicleInfoFormValues } from '../../components/EditVehicleInfoDialog';
import { EditRentalSystemDialog, type RentalSystemFormValues } from '../../components/EditRentalSystemDialog';
import { PaperworkDialog, type PaperworkFormValues } from '../../components/PaperworkDialog';
import { FineCheckDialog, type FineCheckFormValues } from '../../components/FineCheckDialog';

export default function FlotillaVehiculoProfilePage() {
  const params = useParams();
  const vehicleId = params.id as string;
  const router = useRouter();
  const { toast } = useToast();
  
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [allDrivers, setAllDrivers] = useState<Driver[]>([]);
  const [serviceHistory, setServiceHistory] = useState<ServiceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Dialog states
  const [isVehicleInfoDialogOpen, setIsVehicleInfoDialogOpen] = useState(false);
  const [isRentalSystemDialogOpen, setIsRentalSystemDialogOpen] = useState(false);
  const [isPaperworkDialogOpen, setIsPaperworkDialogOpen] = useState(false);
  const [isFineCheckDialogOpen, setIsFineCheckDialogOpen] = useState(false);
  
  const [editingPaperwork, setEditingPaperwork] = useState<Paperwork | null>(null);
  const [viewingFineCheck, setViewingFineCheck] = useState<FineCheck | null>(null);

  useEffect(() => {
    if (!vehicleId) return;
    setIsLoading(true);

    let didNotifyNotFound = false;
    let isMounted = true;

    const unsubVehicle = inventoryService.onVehiclesUpdate((vehicles) => {
      if (!isMounted) return;
      const currentVehicle = vehicles.find(v => v.id === vehicleId);

      if (currentVehicle) {
        setVehicle(currentVehicle);
      } else if (!didNotifyNotFound) {
        didNotifyNotFound = true;
        toast({ title: "Error", description: "Vehículo no encontrado.", variant: "destructive" });
        router.push('/flotilla');
      }
      setIsLoading(false);
    });
    
    const unsubDrivers  = personnelService.onDriversUpdate((d) => { if (isMounted) setAllDrivers(d); });
    const unsubServices = serviceService.onServicesForVehicleUpdate(vehicleId, (s) => { if (isMounted) setServiceHistory(s); });

    return () => {
      isMounted = false;
      unsubVehicle();
      unsubDrivers();
      unsubServices();
    };
  }, [vehicleId, router, toast]);

  const handleSaveVehicleInfo = async (data: VehicleInfoFormValues) => {
    if (!vehicle) return;
    await inventoryService.saveVehicle(vehicle.id, data);
    toast({ title: "Información Actualizada" });
    setIsVehicleInfoDialogOpen(false);
  };

  const handleSaveRentalSystem = async (data: RentalSystemFormValues) => {
    if (!vehicle) return;
    await inventoryService.saveVehicle(vehicle.id, data);
    toast({ title: "Sistema de Renta Actualizado" });
    setIsRentalSystemDialogOpen(false);
  };

  const handleSavePaperwork = async (data: PaperworkFormValues) => {
    if (!vehicle) return;
    const paperworkData = { ...data, dueDate: data.dueDate.toISOString() };
    await inventoryService.savePaperwork(vehicle.id, paperworkData, editingPaperwork?.id);
    toast({ title: `Trámite ${editingPaperwork ? 'actualizado' : 'añadido'}` });
    setIsPaperworkDialogOpen(false);
    setEditingPaperwork(null);
  };

  const handleDeletePaperwork = async (paperworkId: string) => {
    if (!vehicle) return;
    await inventoryService.deletePaperwork(vehicle.id, paperworkId);
    toast({ title: "Trámite Eliminado", variant: "destructive" });
  };
  
  const handleSaveFineCheck = async (data: FineCheckFormValues) => {
    if (!vehicle) return;
    const fineCheckData = { 
        ...data, 
        checkDate: data.checkDate.toISOString(),
        fines: data.fines?.map(f => ({...f, date: f.date.toISOString()})) || []
    };
    await inventoryService.saveFineCheck(vehicle.id, fineCheckData, viewingFineCheck?.id);
    toast({ title: "Revisión Guardada" });
    setIsFineCheckDialogOpen(false);
    setViewingFineCheck(null);
  };

  const handleAssignmentChange = useCallback(() => {
    // This function is now stable and won't cause re-renders.
    // If you need to refresh data after assignment, you can add logic here.
  }, []);


  if (isLoading || !vehicle) {
    return (
        <div className="p-1 space-y-6">
            <PageHeader title={<Skeleton className="h-8 w-1/2" />} description={<Skeleton className="h-4 w-1/3" />} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="flex flex-col gap-6">
                    <Skeleton className="h-80 rounded-lg" />
                    <Skeleton className="h-96 rounded-lg" />
                    <Skeleton className="h-64 rounded-lg" />
                </div>
                 <div className="flex flex-col gap-6">
                    <Skeleton className="h-80 rounded-lg" />
                    <Skeleton className="h-64 rounded-lg" />
                    <Skeleton className="h-64 rounded-lg" />
                </div>
            </div>
        </div>
    );
  }

  return (
    <>
      <PageHeader
        title={`${vehicle.make} ${vehicle.model} (${vehicle.licensePlate})`}
        description="Gestiona la asignación, información y mantenimiento del vehículo."
        actions={
          <Button variant="outline" onClick={() => router.push('/flotilla?tab=vehiculos')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Volver
          </Button>
        }
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          <VehicleInfoCard vehicle={vehicle} onEdit={() => setIsVehicleInfoDialogOpen(true)} />
          <MaintenanceCard vehicle={vehicle} serviceHistory={serviceHistory} />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <AssignDriverCard vehicle={vehicle} allDrivers={allDrivers} onAssignmentChange={handleAssignmentChange} />
          <RentalSystemCard vehicle={vehicle} onEdit={() => setIsRentalSystemDialogOpen(true)} />
          <PaperworkCard 
            vehicle={vehicle} 
            onAdd={() => { setEditingPaperwork(null); setIsPaperworkDialogOpen(true); }}
            onEdit={(p) => { setEditingPaperwork(p); setIsPaperworkDialogOpen(true); }}
            onDelete={handleDeletePaperwork}
          />
          <FineCheckCard 
            vehicle={vehicle}
            onAdd={() => { setViewingFineCheck(null); setIsFineCheckDialogOpen(true); }}
            onView={(fc) => { setViewingFineCheck(fc); setIsFineCheckDialogOpen(true); }}
          />
        </div>
      </div>

      {/* Dialogs */}
      <EditVehicleInfoDialog open={isVehicleInfoDialogOpen} onOpenChange={setIsVehicleInfoDialogOpen} vehicle={vehicle} onSave={handleSaveVehicleInfo} />
      <EditRentalSystemDialog open={isRentalSystemDialogOpen} onOpenChange={setIsRentalSystemDialogOpen} vehicle={vehicle} onSave={handleSaveRentalSystem} />
      <PaperworkDialog open={isPaperworkDialogOpen} onOpenChange={setIsPaperworkDialogOpen} paperwork={editingPaperwork} onSave={handleSavePaperwork} />
      <FineCheckDialog open={isFineCheckDialogOpen} onOpenChange={setIsFineCheckDialogOpen} fineCheck={viewingFineCheck} onSave={handleSaveFineCheck} />
    </>
  );
}
