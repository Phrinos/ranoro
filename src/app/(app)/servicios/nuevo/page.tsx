
// src/app/(app)/servicios/nuevo/page.tsx
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { inventoryService, serviceService, adminService } from '@/lib/services';
import { Loader2 } from 'lucide-react';
import { db } from '@/lib/firebaseClient';
import { writeBatch } from 'firebase/firestore';
import { ServiceForm } from '../components/service-form';
import type { VehicleFormValues } from '../../vehiculos/components/vehicle-form';
import type { ServiceFormValues } from '@/schemas/service-form';
import type { Vehicle, User, InventoryItem, ServiceTypeRecord, InventoryCategory, Supplier, ServiceRecord, QuoteRecord } from '@/types';
import { PageHeader } from '@/components/page-header';

export default function NuevoServicioPage() {
  const { toast } = useToast(); 
  const router = useRouter();
  
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [allServices, setAllServices] = useState<ServiceRecord[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceTypeRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubs = [
      inventoryService.onItemsUpdate(setInventoryItems),
      inventoryService.onCategoriesUpdate(setCategories),
      inventoryService.onSuppliersUpdate(setSuppliers),
      inventoryService.onVehiclesUpdate(setVehicles),
      serviceService.onServicesUpdate(setAllServices),
      adminService.onUsersUpdate(setUsers),
      inventoryService.onServiceTypesUpdate((data) => {
        setServiceTypes(data);
        setIsLoading(false);
      }),
    ];
    return () => unsubs.forEach(unsub => unsub());
  }, []);
  
  const handleSaveService = async (values: ServiceFormValues) => {
    if (!db) return toast({ title: 'Error de base de datos', variant: 'destructive'});
    
    try {
        const savedRecord = await serviceService.saveService(values as ServiceRecord);
        toast({ title: 'Registro Creado', description: `El registro #${savedRecord.id.slice(-6)} se ha guardado.` });
        
        const targetTab = savedRecord.status === 'Cotizacion' ? 'cotizaciones' : 'activos';
        router.push(`/servicios?tab=${targetTab}`);
        
    } catch(e) {
      console.error(e);
      toast({ title: 'Error al Registrar', variant: 'destructive'});
    }
  };
  
  const handleVehicleCreated = async (newVehicleData: VehicleFormValues) => {
      await inventoryService.addVehicle(newVehicleData);
      toast({ title: "Vehículo Creado" });
  };
  
  if (isLoading) {
      return <div className="text-center p-8 text-muted-foreground flex justify-center items-center"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Cargando...</div>;
  }
  
  const isQuoteMode = router.toString().includes('cotizacion');

  return (
    <>
      <PageHeader
        title={isQuoteMode ? "Nueva Cotización" : "Nuevo Servicio"}
        description="Completa los datos para crear un nuevo registro."
      />
      <ServiceForm
        vehicles={vehicles}
        technicians={users}
        inventoryItems={inventoryItems}
        serviceTypes={serviceTypes}
        categories={categories}
        suppliers={suppliers}
        serviceHistory={allServices}
        onSubmit={handleSaveService}
        onClose={() => router.back()}
        onVehicleCreated={handleVehicleCreated}
        mode={isQuoteMode ? 'quote' : 'service'}
      />
    </>
  );
}
