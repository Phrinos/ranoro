
// src/app/(app)/flotilla/[id]/page.tsx
"use client";

import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loader2, ShieldAlert, ArrowLeft } from 'lucide-react';
import { useEffect, useState, useMemo, useCallback, lazy, Suspense } from 'react';
import type { Vehicle, Driver, ServiceRecord, User } from '@/types';
import { inventoryService, personnelService, serviceService } from '@/lib/services';
import { useToast } from '@/hooks/use-toast';
import { PageHeader } from '@/components/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { VehicleDialog } from '../components/vehicle-dialog';
import type { VehicleFormValues } from '../components/vehicle-form';

// Lazy load tab components
const DetailsTabContent = lazy(() => import('./components/details-tab-content').then(module => ({ default: module.DetailsTabContent })));
const MaintenancesTabContent = lazy(() => import('../../servicios/components/tab-historial')); // Assuming reuse is possible
const PaperworkTabContent = lazy(() => import('./components/paperwork-tab-content').then(module => ({ default: module.PaperworkTabContent })));
const FinesTabContent = lazy(() => import('./components/fines-tab-content').then(module => ({ default: module.FinesTabContent })));


export default function FleetVehicleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const vehicleId = params.id as string;

  const [vehicle, setVehicle] = useState<Vehicle | null | undefined>(undefined);
  const [allDrivers, setAllDrivers] = useState<Driver[]>([]);
  const [allServices, setAllServices] = useState<ServiceRecord[]>([]);
  const [personnel, setPersonnel] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('details');

  const fetchVehicleData = useCallback(async () => {
    if (!vehicleId) return;
    try {
      const [
        vehicleData,
        driversData,
        servicesData,
        personnelData,
      ] = await Promise.all([
        inventoryService.getVehicleById(vehicleId),
        personnelService.onDriversUpdatePromise(),
        serviceService.onServicesUpdatePromise(),
        personnelService.onPersonnelUpdatePromise(),
      ]);

      setVehicle(vehicleData || null);
      setAllDrivers(driversData);
      setAllServices(servicesData.filter(s => s.vehicleId === vehicleId));
      setPersonnel(personnelData);

    } catch (error) {
      console.error("Failed to fetch vehicle data:", error);
      setVehicle(null);
    }
  }, [vehicleId]);

  useEffect(() => {
    fetchVehicleData();
    const authUser = localStorage.getItem('authUser');
    if(authUser) setCurrentUser(JSON.parse(authUser));
  }, [fetchVehicleData]);

  const handleSaveVehicle = async (formData: VehicleFormValues) => {
    try {
      await inventoryService.saveVehicle(formData, vehicleId);
      await fetchVehicleData(); // Refresh data
      setIsEditDialogOpen(false);
      toast({ title: "Datos Actualizados", description: `Se guardaron los cambios para ${formData.licensePlate}.` });
    } catch (error) {
      toast({ title: "Error al Guardar", variant: "destructive" });
    }
  };

  if (vehicle === undefined) {
    return <div className="container mx-auto py-8 text-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (!vehicle) {
    return (
      <div className="container mx-auto py-8 text-center">
        <ShieldAlert className="mx-auto h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold">Vehículo no encontrado</h1>
        <Button asChild className="mt-6"><Link href="/flotilla?tab=vehiculos">Volver</Link></Button>
      </div>
    );
  }

  const tabs = [
    { value: "details", label: "Detalles", content: <DetailsTabContent vehicle={vehicle} drivers={allDrivers} onEdit={() => setIsEditDialogOpen(true)} onRefresh={fetchVehicleData}/> },
    { value: "maintenances", label: "Mantenimientos", content: <MaintenancesTabContent services={allServices} vehicles={[vehicle]} personnel={personnel} currentUser={currentUser} onShowShareDialog={()=>{}} onDelete={()=>{}} onShowTicket={()=>{}} /> },
    { value: "paperwork", label: "Trámites", content: <PaperworkTabContent vehicle={vehicle} setVehicle={setVehicle} /> },
    { value: "fines", label: "Multas", content: <FinesTabContent vehicle={vehicle} /> },
  ];

  return (
    <>
      <div className="container mx-auto py-8">
        <div className="mb-4">
          <Button variant="outline" size="sm" className="bg-white text-black hover:bg-gray-100" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
        </div>
        <PageHeader title={`${vehicle.make} ${vehicle.model} - ${vehicle.licensePlate}`} description={`ID: ${vehicle.id}`} />
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
              {tabs.map(tab => (
                <TabsTrigger key={tab.value} value={tab.value}>{tab.label}</TabsTrigger>
              ))}
            </TabsList>
             {tabs.map(tab => (
                <TabsContent key={tab.value} value={tab.value} className="mt-6 space-y-6">
                    <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>}>
                        {tab.content}
                    </Suspense>
                </TabsContent>
            ))}
        </Tabs>
      </div>
      <VehicleDialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} vehicle={vehicle} onSave={handleSaveVehicle}/>
    </>
  );
}
