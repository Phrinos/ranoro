// src/app/(app)/flotilla/conductores/[id]/page.tsx
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Trash2, Archive, ArchiveRestore } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { useFlotillaData } from '../../useFlotillaData';

import type { Driver, Vehicle } from '@/types';
import type { DriverFormValues } from '@/schemas/driver-form-schema';

import { personnelService } from '@/lib/services';
import { DriverDialog } from '../components/DriverDialog';

import { ContactInfoCard } from '../../components/ContactInfoCard';
import { AssignedVehicleCard } from '../../components/AssignedVehicleCard';
import { FinancialInfoCard } from '../../components/FinancialInfoCard';
import { DocumentsCard } from '../../components/DocumentsCard';
import { HistoryTabContent } from '../components/HistoryTabContent';
import { usePermissions } from '@/hooks/usePermissions';

function DriverProfilePage() {
  const params = useParams();
  const driverId = params.id as string;
  const router = useRouter();
  const { toast } = useToast();
  
  const { vehicles, drivers, isLoading: isFlotillaLoading } = useFlotillaData();
  const permissions = usePermissions();
  const canCreate = permissions.has('drivers:create') || permissions.has('fleet:manage');
  const canArchive = permissions.has('drivers:archive') || permissions.has('fleet:manage');
  
  const [driver, setDriver] = useState<Driver | null>(null);
  const [assignedVehicle, setAssignedVehicle] = useState<Vehicle | null>(null);
  
  const [isDriverDialogOpen, setIsDriverDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (!isFlotillaLoading && drivers.length > 0) {
      const currentDriver = drivers.find(d => d.id === driverId);
      if (currentDriver) {
        setDriver(currentDriver);
        if (currentDriver.assignedVehicleId) {
          setAssignedVehicle(vehicles.find(v => v.id === currentDriver.assignedVehicleId) || null);
        } else {
          setAssignedVehicle(null);
        }
      } else {
        toast({ title: "Conductor no encontrado", variant: "destructive" });
        router.push('/flotilla?tab=conductores');
      }
    }
  }, [driverId, drivers, vehicles, isFlotillaLoading, router, toast]);

  const handleSaveDriver = async (data: DriverFormValues) => {
    if (!driver) return;
    try {
        await personnelService.saveDriver(data, driver.id);
        toast({ title: 'Información actualizada' });
        setIsDriverDialogOpen(false);
    } catch (e) {
        toast({ title: 'Error al guardar', variant: 'destructive' });
    }
  };

  const handleArchiveDriver = async () => {
    if (!driver) return;
    try {
        await personnelService.saveDriver({ isArchived: !driver.isArchived }, driver.id);
        toast({ title: `Conductor ${driver.isArchived ? 'restaurado' : 'archivado'}` });
    } catch (e) {
        toast({ title: 'Error', description: 'No se pudo actualizar el estado del conductor.', variant: 'destructive' });
    }
  };

  if (isFlotillaLoading || !driver) {
    return (
        <div className="p-1 space-y-6">
            <PageHeader title={<Skeleton className="h-8 w-1/2" />} description={<Skeleton className="h-4 w-1/3" />} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-6">
                    <Skeleton className="h-48 rounded-lg" />
                    <Skeleton className="h-56 rounded-lg" />
                </div>
                <div className="space-y-6">
                    <Skeleton className="h-56 rounded-lg" />
                    <Skeleton className="h-64 rounded-lg" />
                </div>
            </div>
        </div>
    );
  }

  return (
    <>
      <PageHeader
        title={driver.name}
        description={`Perfil del conductor de la flotilla. ID: ${driver.id}`}
        actions={
          <div className="flex gap-2">
            {canArchive && (
              <ConfirmDialog
                triggerButton={
                  <Button variant={driver.isArchived ? "secondary" : "outline"} size="sm">
                    {driver.isArchived ? <ArchiveRestore className="mr-2 h-4 w-4" /> : <Archive className="mr-2 h-4 w-4" />}
                    {driver.isArchived ? "Restaurar" : "Archivar"}
                  </Button>
                }
                title={`¿${driver.isArchived ? 'Restaurar' : 'Archivar'} a ${driver.name}?`}
                description={driver.isArchived ? "El conductor volverá a estar activo." : "El conductor se marcará como inactivo y se ocultará de las listas principales."}
                onConfirm={handleArchiveDriver}
              />
            )}
            <Button variant="outline" onClick={() => router.push('/flotilla?tab=conductores')}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Volver
            </Button>
          </div>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="history">Historial de Cuenta</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-6">
              <ContactInfoCard driver={driver} onEdit={canCreate ? () => setIsDriverDialogOpen(true) : undefined} />
              <FinancialInfoCard driver={driver} onEdit={canCreate ? () => setIsDriverDialogOpen(true) : undefined} />
            </div>
            <div className="space-y-6">
              <AssignedVehicleCard assignedVehicle={assignedVehicle} />
              <DocumentsCard driver={driver} />
            </div>
          </div>
        </TabsContent>
        <TabsContent value="history" className="mt-6">
          <HistoryTabContent driver={driver} vehicle={assignedVehicle} />
        </TabsContent>
      </Tabs>

      <DriverDialog
        open={isDriverDialogOpen}
        onOpenChange={setIsDriverDialogOpen}
        driver={driver}
        onSave={handleSaveDriver}
      />
    </>
  );
}

export default DriverProfilePage;
