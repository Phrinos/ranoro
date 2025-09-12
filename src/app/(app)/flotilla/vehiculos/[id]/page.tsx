// src/app/(app)/flotilla/vehiculos/[id]/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit } from 'lucide-react';
import { inventoryService, personnelService, serviceService } from '@/lib/services';
import type { Vehicle, Driver, ServiceRecord } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

import { AssignDriverCard } from '../../components/AssignDriverCard';
import { VehicleInfoCard } from '../../components/VehicleInfoCard';
import { RentalSystemCard } from '../../components/RentalSystemCard';
import { MaintenanceCard } from '../../components/MaintenanceCard';

export default function FlotillaVehiculoProfilePage() {
  const params = useParams();
  const vehicleId = params.id as string;
  const router = useRouter();
  const { toast } = useToast();
  
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [allDrivers, setAllDrivers] = useState<Driver[]>([]);
  const [serviceHistory, setServiceHistory] = useState<ServiceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!vehicleId) return;
    setIsLoading(true);
    try {
      const [vehicleData, driversData, servicesData] = await Promise.all([
        inventoryService.getVehicleById(vehicleId),
        personnelService.onDriversUpdatePromise(),
        serviceService.onServicesUpdatePromise(),
      ]);

      if (vehicleData) {
        setVehicle(vehicleData);
        setAllDrivers(driversData);
        setServiceHistory(servicesData.filter(s => s.vehicleId === vehicleId));
      } else {
        toast({ title: "Error", description: "Vehículo no encontrado.", variant: "destructive" });
        router.push('/flotilla/vehiculos');
      }
    } catch (error) {
      toast({ title: "Error", description: "No se pudieron cargar los datos.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [vehicleId, router, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleEdit = () => {
    toast({ title: "Función en desarrollo", description: "Pronto podrás editar los detalles del vehículo desde aquí." });
  };

  if (isLoading || !vehicle) {
    return (
      <div className="p-1">
        <PageHeader title={<Skeleton className="h-8 w-1/2" />} description={<Skeleton className="h-4 w-1/3" />} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
          <div className="space-y-6">
            <Skeleton className="h-80" />
            <Skeleton className="h-80" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-80" />
            <Skeleton className="h-80" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title={`Perfil de ${vehicle.make} ${vehicle.model} (${vehicle.licensePlate})`}
        description="Gestiona la asignación, información y mantenimiento del vehículo."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => router.push('/flotilla/vehiculos')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Button>
            <Button onClick={handleEdit}>
              <Edit className="mr-2 h-4 w-4" />
              Editar
            </Button>
          </div>
        }
      />
      <div className="p-1 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          <AssignDriverCard vehicle={vehicle} allDrivers={allDrivers} onAssignmentChange={fetchData} />
          <VehicleInfoCard vehicle={vehicle} />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <MaintenanceCard vehicle={vehicle} serviceHistory={serviceHistory} />
          <RentalSystemCard vehicle={vehicle} />
        </div>
      </div>
    </>
  );
}
