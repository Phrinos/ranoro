"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Archive, ArchiveRestore, Loader2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { personnelService, inventoryService } from '@/lib/services';
import type { Driver, Vehicle } from '@/types';

import { ContactInfoCard } from '../../components/ContactInfoCard';
import { AssignedVehicleCard } from '../../components/AssignedVehicleCard';
import { FinancialInfoCard } from '../../components/FinancialInfoCard';
import { DocumentsCard } from '../../components/DocumentsCard';
import { HistoryTabContent } from '../../components/HistoryTabContent';
import { EditContactInfoDialog } from '../../components/EditContactInfoDialog';
import { EditFinancialInfoDialog } from '../../components/EditFinancialInfoDialog';
import { ContractGeneratorCard } from '../../components/ContractGeneratorCard';

export default function DriverProfilePageV2() {
  const params = useParams();
  const driverId = params.id as string;
  const router = useRouter();
  const { toast } = useToast();
  
  const [driver, setDriver] = useState<Driver | null>(null);
  const [assignedVehicle, setAssignedVehicle] = useState<Vehicle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false);
  const [isFinancialDialogOpen, setIsFinancialDialogOpen] = useState(false);

  useEffect(() => {
    if (!driverId) return;
    setIsLoading(true);
    
    const unsubDriver = personnelService.onDriversUpdate((list) => {
      const d = list.find(x => x.id === driverId);
      if (d) {
        setDriver(d);
        if (d.assignedVehicleId) {
          inventoryService.getVehicleById(d.assignedVehicleId).then(v => setAssignedVehicle(v || null));
        } else {
          setAssignedVehicle(null);
        }
      }
      setIsLoading(false);
    });

    return () => unsubDriver();
  }, [driverId]);

  const handleSaveContactInfo = async (values: any) => {
    if (!driver) return;
    await personnelService.saveDriver(values, driver.id);
    toast({ title: 'Información de contacto actualizada' });
  };

  const handleSaveFinancialInfo = async (values: any) => {
    if (!driver) return;
    const payload = {
        ...values,
        contractDate: values.contractDate?.toISOString(),
    };
    await personnelService.saveDriver(payload, driver.id);
    toast({ title: 'Información financiera actualizada' });
  };

  const handleArchiveDriver = async () => {
    if (!driver) return;
    await personnelService.saveDriver({ isArchived: !driver.isArchived }, driver.id);
    toast({ title: `Conductor ${driver.isArchived ? 'restaurado' : 'archivado'}` });
  };

  if (isLoading || !driver) {
    return <div className="p-8 flex justify-center"><Loader2 className="animate-spin h-8 w-8" /></div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={driver.name}
        description={`Perfil de Conductor • ${driver.isArchived ? 'Inactivo' : 'Activo'}`}
        actions={
          <div className="flex gap-2">
            <ConfirmDialog
                triggerButton={
                  <Button variant={driver.isArchived ? "secondary" : "outline"} size="sm">
                    {driver.isArchived ? <ArchiveRestore className="mr-2 h-4 w-4" /> : <Archive className="mr-2 h-4 w-4" />}
                    {driver.isArchived ? "Restaurar" : "Archivar"}
                  </Button>
                }
                title={`¿${driver.isArchived ? 'Restaurar' : 'Archivar'} a ${driver.name}?`}
                description={driver.isArchived ? "El conductor volverá a estar activo." : "Se marcará como inactivo."}
                onConfirm={handleArchiveDriver}
            />
            <Button variant="outline" size="sm" onClick={() => router.push('/flotillav2?tab=conductores')}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Volver
            </Button>
          </div>
        }
      />

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="history">Estado de Cuenta</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <ContactInfoCard driver={driver} onEdit={() => setIsContactDialogOpen(true)} />
                    <FinancialInfoCard driver={driver} onEdit={() => setIsFinancialDialogOpen(true)} />
                </div>
                <HistoryTabContent driver={driver} vehicle={assignedVehicle} />
            </div>
            <div className="space-y-6">
              <AssignedVehicleCard assignedVehicle={assignedVehicle} />
              <ContractGeneratorCard driver={driver} vehicle={assignedVehicle} onEdit={() => setIsFinancialDialogOpen(true)} />
              <DocumentsCard driver={driver} />
            </div>
          </div>
        </TabsContent>
        <TabsContent value="history" className="mt-6">
           <Card>
               <CardHeader><CardTitle>Historial Detallado</CardTitle></CardHeader>
               <CardContent>
                    <HistoryTabContent driver={driver} vehicle={assignedVehicle} />
               </CardContent>
           </Card>
        </TabsContent>
      </Tabs>

      <EditContactInfoDialog 
        open={isContactDialogOpen} 
        onOpenChange={setIsContactDialogOpen} 
        driver={driver} 
        onSave={handleSaveContactInfo} 
      />
      
      <EditFinancialInfoDialog 
        open={isFinancialDialogOpen} 
        onOpenChange={setIsFinancialDialogOpen} 
        driver={driver} 
        onSave={handleSaveFinancialInfo} 
      />
    </div>
  );
}
