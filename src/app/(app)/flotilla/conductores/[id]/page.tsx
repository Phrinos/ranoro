// src/app/(app)/flotilla/conductores/[id]/page.tsx
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { personnelService, inventoryService } from '@/lib/services';
import type { Driver, Vehicle } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { ContactInfoCard } from '../../components/ContactInfoCard';
import { FinancialInfoCard } from '../../components/FinancialInfoCard';
import { AssignedVehicleCard } from '../../components/AssignedVehicleCard';
import { DocumentsCard } from '../../components/DocumentsCard';
import { HistoryTabContent } from '../components/HistoryTabContent';
import { EditContactInfoDialog, type ContactInfoFormValues } from '../../components/EditContactInfoDialog';
import { EditFinancialInfoDialog, type FinancialInfoFormValues } from '../../components/EditFinancialInfoDialog';
import { ContractGeneratorCard } from '../../components/ContractGeneratorCard';

export default function FlotillaConductorProfilePage() {
  const params = useParams();
  const driverId = params.id as string;
  const router = useRouter();
  const { toast } = useToast();
  
  const [driver, setDriver] = useState<Driver | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isContactInfoDialogOpen, setIsContactInfoDialogOpen] = useState(false);
  const [isFinancialInfoDialogOpen, setIsFinancialInfoDialogOpen] = useState(false);

  useEffect(() => {
    if (!driverId) return;
    
    const unsubDriver = personnelService.onDriversUpdate((drivers) => {
      const currentDriver = drivers.find(d => d.id === driverId);
      setDriver(currentDriver || null);
      setIsLoading(false);
    });

    const unsubVehicles = inventoryService.onVehiclesUpdate(setVehicles);

    return () => {
      unsubDriver();
      unsubVehicles();
    };
  }, [driverId, router, toast]);

  const assignedVehicle = useMemo(() => {
    if (!driver?.assignedVehicleId) return null;
    return vehicles.find(v => v.id === driver.assignedVehicleId) || null;
  }, [driver, vehicles]);

  const handleSaveContactInfo = async (data: ContactInfoFormValues) => {
    if (!driver) return;
    await personnelService.saveDriver({ ...driver, ...data }, driver.id);
    toast({ title: "Información de Contacto Actualizada" });
    setIsContactInfoDialogOpen(false);
  };
  
  const handleSaveFinancialInfo = async (data: FinancialInfoFormValues) => {
    if (!driver) return;
    const dataToSave = {
        ...driver,
        ...data,
        contractDate: data.contractDate ? data.contractDate.toISOString() : undefined,
    };
    await personnelService.saveDriver(dataToSave, driver.id);
    toast({ title: "Información Financiera Actualizada" });
    setIsFinancialInfoDialogOpen(false);
  };

  if (isLoading || !driver) {
    return (
      <div className="p-1 space-y-6">
        <PageHeader title={<Skeleton className="h-8 w-1/2" />} description={<Skeleton className="h-4 w-1/3" />} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64 rounded-lg" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
        <Skeleton className="h-48 rounded-lg" />
        <Skeleton className="h-96 rounded-lg" />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title={`Perfil de ${driver.name}`}
        description="Información detallada, contrato y documentos del conductor."
        actions={
          <Button variant="outline" onClick={() => router.push('/flotilla?tab=conductores')} className="bg-white">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
        }
      />
      <Tabs defaultValue="info" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="info">Información</TabsTrigger>
          <TabsTrigger value="history">Historial</TabsTrigger>
        </TabsList>
        <TabsContent value="info" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-6">
              <ContactInfoCard driver={driver} onEdit={() => setIsContactInfoDialogOpen(true)} />
              <ContractGeneratorCard driver={driver} onEdit={() => setIsFinancialInfoDialogOpen(true)} />
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
      
      <EditContactInfoDialog open={isContactInfoDialogOpen} onOpenChange={setIsContactInfoDialogOpen} driver={driver} onSave={handleSaveContactInfo} />
      <EditFinancialInfoDialog open={isFinancialInfoDialogOpen} onOpenChange={setIsFinancialInfoDialogOpen} driver={driver} onSave={handleSaveFinancialInfo} />
    </>
  );
}
