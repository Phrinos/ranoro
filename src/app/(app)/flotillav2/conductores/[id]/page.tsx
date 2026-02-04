
"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Archive, ArchiveRestore } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { personnelService, inventoryService } from '@/lib/services';
import type { Driver, Vehicle } from '@/types';
import { ContactInfoCard } from '../../components/ContactInfoCard';
import { AssignedVehicleCard } from '../../components/AssignedVehicleCard';
import { FinancialInfoCard } from '../../components/FinancialInfoCard';
import { DocumentsCard } from '../../components/DocumentsCard';
import { HistoryTabContent } from '../../conductores/components/HistoryTabContent';
import { DriverDialog } from '../../components/DriverDialog';

export default function DriverProfilePageV2() {
  const params = useParams();
  const driverId = params.id as string;
  const router = useRouter();
  const { toast } = useToast();
  
  const [driver, setDriver] = useState<Driver | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [assignedVehicle, setAssignedVehicle] = useState<Vehicle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    if (!driverId) return;
    setIsLoading(true);
    
    const unsubDriver = personnelService.onDriversUpdate((list) => {
      const d = list.find(x => x.id === driverId);
      if (d) {
        setDriver(d);
        if (d.assignedVehicleId) {
          inventoryService.getVehicleById(d.assignedVehicleId).then(setAssignedVehicle);
        }
      }
      setIsLoading(false);
    });

    inventoryService.onVehiclesUpdate(setVehicles);

    return () => unsubDriver();
  }, [driverId]);

  const handleSaveDriver = async (data: any) => {
    try {
      await personnelService.saveDriver(data, driverId);
      toast({ title: 'Actualizado' });
      setIsDialogOpen(false);
    } catch (e) {
      toast({ title: 'Error', variant: 'destructive' });
    }
  };

  if (isLoading || !driver) {
    return <div className="p-8 space-y-4"><Skeleton className="h-12 w-1/3"/><Skeleton className="h-64 w-full"/></div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={driver.name}
        description={`Perfil de Conductor • ${driver.isArchived ? 'Inactivo' : 'Activo'}`}
        actions={
          <Button variant="outline" size="sm" onClick={() => router.push('/flotillav2?tab=conductores')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Volver
          </Button>
        }
      />

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="history">Estado de Cuenta</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-6">
              <ContactInfoCard driver={driver} onEdit={() => setIsDialogOpen(true)} />
              <FinancialInfoCard driver={driver} onEdit={() => setIsDialogOpen(true)} />
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

      <DriverDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} driver={driver} onSave={handleSaveDriver} />
    </div>
  );
}
