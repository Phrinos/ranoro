// src/app/(app)/flotilla/conductores/[id]/page.tsx
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit } from 'lucide-react';
import { personnelService, inventoryService } from '@/lib/services';
import type { Driver, Vehicle } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { ContactInfoCard } from '../../components/ContactInfoCard';
import { FinancialInfoCard } from '../../components/FinancialInfoCard';
import { DocumentsCard } from '../../components/DocumentsCard';
import { HistoryTabContent } from './components/HistoryTabContent';

export default function FlotillaConductorProfilePage() {
  const params = useParams();
  const driverId = params.id as string;
  const router = useRouter();
  const { toast } = useToast();
  
  const [driver, setDriver] = useState<Driver | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  const handleEdit = () => {
    toast({ title: "Función en desarrollo", description: "Pronto podrás editar los datos del conductor." });
  };

  if (isLoading || !driver) {
    return (
      <div className="p-1">
        <PageHeader title={<Skeleton className="h-8 w-1/2" />} description={<Skeleton className="h-4 w-1/3" />} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
          <Skeleton className="h-64 rounded-lg" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
        <Skeleton className="h-96 rounded-lg mt-6" />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title={`Perfil de ${driver.name}`}
        description="Información detallada, contrato y documentos del conductor."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => router.push('/flotilla/conductores')}>
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
      <Tabs defaultValue="info" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="info">Información</TabsTrigger>
          <TabsTrigger value="history">Historial</TabsTrigger>
        </TabsList>
        <TabsContent value="info" className="mt-6">
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ContactInfoCard driver={driver} assignedVehicle={assignedVehicle} />
              <FinancialInfoCard driver={driver} />
            </div>
            <DocumentsCard driver={driver} />
          </div>
        </TabsContent>
        <TabsContent value="history" className="mt-6">
          <HistoryTabContent driver={driver} vehicle={assignedVehicle} />
        </TabsContent>
      </Tabs>
    </>
  );
}
