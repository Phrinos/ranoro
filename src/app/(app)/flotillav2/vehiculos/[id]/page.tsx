"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Trash2 } from 'lucide-react';
import { inventoryService, personnelService, serviceService } from '@/lib/services';
import type { Vehicle, Driver, ServiceRecord, Paperwork, FineCheck } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';

import { AssignDriverCard } from '../../components/AssignDriverCard';
import { VehicleInfoCard } from '../../components/VehicleInfoCard';
import { RentalSystemCard } from '../../components/RentalSystemCard';
import { MaintenanceCard } from '../../components/MaintenanceCard';
import { PaperworkCard } from '../../components/PaperworkCard';
import { FineCheckCard } from '../../components/FineCheckCard';

import { EditVehicleInfoDialog } from '../../components/EditVehicleInfoDialog';
import { EditRentalSystemDialog } from '../../components/EditRentalSystemDialog';
import { PaperworkDialog } from '../../components/PaperworkDialog';
import { FineCheckDialog } from '../../components/FineCheckDialog';

export default function VehicleProfilePageV2() {
  const params = useParams();
  const vehicleId = params.id as string;
  const router = useRouter();
  const { toast } = useToast();
  
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [allDrivers, setAllDrivers] = useState<Driver[]>([]);
  const [serviceHistory, setServiceHistory] = useState<ServiceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isRentalOpen, setIsRentalOpen] = useState(false);
  const [isPaperOpen, setIsPaperOpen] = useState(false);
  const [isFineOpen, setIsFineOpen] = useState(false);
  
  const [editingPaperwork, setEditingPaperwork] = useState<Paperwork | null>(null);
  const [viewingFineCheck, setViewingFineCheck] = useState<FineCheck | null>(null);

  useEffect(() => {
    if (!vehicleId) return;
    setIsLoading(true);

    const unsubVeh = inventoryService.onVehiclesUpdate(list => {
      const v = list.find(x => x.id === vehicleId);
      if (v) setVehicle(v);
      setIsLoading(false);
    });

    personnelService.onDriversUpdate(setAllDrivers);
    serviceService.onServicesForVehicleUpdate(vehicleId, setServiceHistory);

    return () => unsubVeh();
  }, [vehicleId]);

  const handleSaveVehicleInfo = async (data: any) => {
    if (!vehicle) return;
    await inventoryService.saveVehicle(data, vehicle.id);
    toast({ title: "Información Actualizada" });
    setIsInfoOpen(false);
  };

  const handleSaveRentalSystem = async (data: any) => {
    if (!vehicle) return;
    await inventoryService.saveVehicle(data, vehicle.id);
    toast({ title: "Sistema de Renta Actualizado" });
    setIsRentalOpen(false);
  };

  const handleSavePaperwork = async (data: any) => {
    if (!vehicle) return;
    const paperworkData = { ...data, dueDate: data.dueDate.toISOString() };
    await inventoryService.savePaperwork(vehicle.id, paperworkData, editingPaperwork?.id);
    toast({ title: `Trámite ${editingPaperwork ? 'actualizado' : 'añadido'}` });
    setIsPaperOpen(false);
    setEditingPaperwork(null);
  };

  const handleDeletePaperwork = async (paperworkId: string) => {
    if (!vehicle) return;
    await inventoryService.deletePaperwork(vehicle.id, paperworkId);
    toast({ title: "Trámite Eliminado", variant: "destructive" });
  };
  
  const handleSaveFineCheck = async (fines: any[]) => {
    if (!vehicle) return;
    const fineCheckData = { 
        checkDate: new Date().toISOString(),
        status: fines.length > 0 ? "Con Multas" : "Sin Multas",
        fines: fines.map((f:any) => ({...f, date: typeof f.date === 'string' ? f.date : f.date.toISOString()}))
    };
    await inventoryService.saveFineCheck(vehicle.id, fineCheckData as any, viewingFineCheck?.id);
    toast({ title: "Revisión Guardada" });
    setIsFineOpen(false);
    setViewingFineCheck(null);
  };

  const handleRemoveFromFleet = async () => {
    if (!vehicle) return;
    await inventoryService.saveVehicle({ isFleetVehicle: false }, vehicle.id);
    toast({ title: 'Vehículo Removido de la Flotilla' });
    router.push('/flotillav2?tab=vehiculos');
  };

  if (isLoading || !vehicle) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin h-8 w-8" /></div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${vehicle.make} ${vehicle.model} (${vehicle.licensePlate})`}
        description="Gestión técnica y administrativa de la unidad."
        actions={
          <div className="flex gap-2">
            <ConfirmDialog
              triggerButton={<Button variant="destructive" size="sm"><Trash2 className="mr-2 h-4 w-4"/>Quitar de Flotilla</Button>}
              title="¿Quitar de la Flotilla?"
              description="El vehículo ya no aparecerá en la sección de flotilla."
              onConfirm={handleRemoveFromFleet}
            />
            <Button variant="outline" size="sm" onClick={() => router.push('/flotillav2?tab=vehiculos')}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Volver
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-6">
          <VehicleInfoCard vehicle={vehicle} onEdit={() => setIsInfoOpen(true)} />
          <MaintenanceCard vehicle={vehicle} serviceHistory={serviceHistory} />
          <PaperworkCard 
            vehicle={vehicle} 
            onAdd={() => { setEditingPaperwork(null); setIsPaperOpen(true); }}
            onEdit={(p) => { setEditingPaperwork(p); setIsPaperOpen(true); }}
            onDelete={handleDeletePaperwork}
          />
        </div>
        <div className="space-y-6">
          <AssignDriverCard vehicle={vehicle} allDrivers={allDrivers} onAssignmentChange={() => {}} />
          <RentalSystemCard vehicle={vehicle} onEdit={() => setIsRentalOpen(true)} />
          <FineCheckCard 
            vehicle={vehicle} 
            onAdd={() => { setViewingFineCheck(null); setIsFineOpen(true); }}
            onView={(fc) => { setViewingFineCheck(fc); setIsFineOpen(true); }}
          />
        </div>
      </div>

      <EditVehicleInfoDialog open={isInfoOpen} onOpenChange={setIsInfoOpen} vehicle={vehicle} onSave={handleSaveVehicleInfo} />
      <EditRentalSystemDialog open={isRentalOpen} onOpenChange={setIsRentalOpen} vehicle={vehicle} onSave={handleSaveRentalSystem} />
      <PaperworkDialog open={isPaperOpen} onOpenChange={setIsPaperOpen} paperwork={editingPaperwork} onSave={handleSavePaperwork} />
      <FineCheckDialog 
        open={isFineOpen} 
        onOpenChange={setIsFineOpen} 
        fines={viewingFineCheck?.fines || []} 
        onSave={handleSaveFineCheck} 
      />
    </div>
  );
}
