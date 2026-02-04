
"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { inventoryService, personnelService, serviceService } from '@/lib/services';
import type { Vehicle, Driver, ServiceRecord } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

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

  if (isLoading || !vehicle) return <div className="p-8"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${vehicle.make} ${vehicle.model} (${vehicle.licensePlate})`}
        description="Gestión técnica y administrativa de la unidad."
        actions={
          <Button variant="outline" size="sm" onClick={() => router.push('/flotillav2?tab=vehiculos')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Volver
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-6">
          <VehicleInfoCard vehicle={vehicle} onEdit={() => setIsInfoOpen(true)} />
          <MaintenanceCard vehicle={vehicle} serviceHistory={serviceHistory} />
          <PaperworkCard 
            vehicle={vehicle} 
            onAdd={() => setIsPaperOpen(true)}
            onEdit={() => setIsPaperOpen(true)}
            onDelete={() => {}}
          />
        </div>
        <div className="space-y-6">
          <AssignDriverCard vehicle={vehicle} allDrivers={allDrivers} onAssignmentChange={() => {}} />
          <RentalSystemCard vehicle={vehicle} onEdit={() => setIsRentalOpen(true)} />
          <FineCheckCard vehicle={vehicle} onAdd={() => setIsFineOpen(true)} onView={() => setIsFineOpen(true)} />
        </div>
      </div>

      <EditVehicleInfoDialog open={isInfoOpen} onOpenChange={setIsInfoOpen} vehicle={vehicle} onSave={async d => { await inventoryService.saveVehicle(d, vehicle.id); setIsInfoOpen(false); }} />
      <EditRentalSystemDialog open={isRentalOpen} onOpenChange={setIsRentalOpen} vehicle={vehicle} onSave={async d => { await inventoryService.saveVehicle(d, vehicle.id); setIsRentalOpen(false); }} />
      <PaperworkDialog open={isPaperOpen} onOpenChange={setIsPaperOpen} onSave={async d => { await inventoryService.savePaperwork(vehicle.id, d as any); setIsPaperOpen(false); }} />
      <FineCheckDialog open={isFineOpen} onOpenChange={setIsFineOpen} fines={[]} onSave={() => setIsFineOpen(false)} />
    </div>
  );
}
