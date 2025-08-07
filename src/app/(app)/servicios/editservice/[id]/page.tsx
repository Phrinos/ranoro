
// src/app/(app)/servicios/editservice/[id]/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PageHeader } from "@/components/page-header";
import type { ServiceRecord, QuoteRecord, Vehicle, User, InventoryItem, ServiceTypeRecord, InventoryCategory, Supplier } from '@/types'; 
import { useToast } from '@/hooks/use-toast';
import { useRouter, useParams } from 'next/navigation';
import { serviceService, inventoryService, adminService, operationsService } from '@/lib/services';
import { Loader2 } from 'lucide-react';
import { db } from '@/lib/firebaseClient';
import { writeBatch } from 'firebase/firestore';
import type { VehicleFormValues } from '../../../vehiculos/components/vehicle-form';
import { ServiceForm } from '../../components/service-form';

export default function EditarServicioPage() {
  const { toast } = useToast(); 
  const router = useRouter();
  const params = useParams();
  const serviceId = params.id as string;
  
  const [initialData, setInitialData] = useState<ServiceRecord | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceTypeRecord[]>([]);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [serviceHistory, setServiceHistory] = useState<ServiceRecord[]>([]);

  useEffect(() => {
    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [
              serviceData, vehiclesData, usersData, inventoryData,
              serviceTypesData, categoriesData, suppliersData, allServicesData
            ] = await Promise.all([
              serviceService.getDocById('serviceRecords', serviceId),
              inventoryService.onVehiclesUpdatePromise(),
              adminService.onUsersUpdatePromise(),
              inventoryService.onItemsUpdatePromise(),
              inventoryService.onServiceTypesUpdatePromise(),
              inventoryService.onCategoriesUpdatePromise(),
              inventoryService.onSuppliersUpdatePromise(),
              serviceService.onServicesUpdatePromise(),
            ]);

            if (!serviceData) {
              toast({ title: 'Error', description: 'Servicio no encontrado.', variant: 'destructive' });
              router.push('/servicios/historial');
              return;
            }

            setInitialData(serviceData);
            setVehicles(vehiclesData);
            setUsers(usersData);
            setInventoryItems(inventoryData);
            setServiceTypes(serviceTypesData);
            setCategories(categoriesData);
            setSuppliers(suppliersData);
            setServiceHistory(allServicesData);
            
        } catch (error) {
            console.error("Error fetching data for edit page:", error);
            toast({ title: 'Error', description: 'No se pudieron cargar los datos del servicio.', variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };
    fetchData();
  }, [serviceId, router, toast]);

  const handleUpdateService = async (values: ServiceFormValues) => {
    if (!initialData) return;
    try {
      await serviceService.saveService({ ...values, id: serviceId });
      toast({ title: 'Servicio Actualizado', description: `El registro #${serviceId.slice(-6)} ha sido actualizado.` });
      const targetTab = values.status === 'Cotizacion' ? 'cotizaciones' : 'historial';
      router.push(`/servicios?tab=${targetTab}`);
    } catch(e) {
      console.error(e);
      toast({ title: 'Error al Actualizar', variant: 'destructive'});
    }
  };

  const handleCancelService = async (id: string, reason: string) => {
      await serviceService.cancelService(id, reason);
      toast({ title: "Servicio Cancelado" });
      router.push('/servicios?tab=historial');
  };
  
  const handleDeleteQuote = async (id: string) => {
      await serviceService.deleteService(id);
      toast({ title: "Cotización Eliminada", variant: "destructive" });
      router.push('/servicios?tab=cotizaciones');
  };
  
  if (isLoading || !initialData) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="mr-2 h-8 w-8 animate-spin" />
        Cargando servicio...
      </div>
    );
  }

  return (
    <ServiceForm
      initialDataService={initialData}
      vehicles={vehicles}
      technicians={users}
      inventoryItems={inventoryItems}
      serviceTypes={serviceTypes}
      categories={categories}
      suppliers={suppliers}
      serviceHistory={serviceHistory}
      onSubmit={handleUpdateService}
      onClose={() => router.back()}
      onDelete={handleDeleteQuote}
      onCancelService={handleCancelService}
    />
  );
}
