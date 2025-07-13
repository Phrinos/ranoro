
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from 'lucide-react';
import { PageHeader } from "@/components/page-header";
import { ServiceForm } from "../components/service-form";
import { operationsService, inventoryService, personnelService } from '@/lib/services';
import type { ServiceRecord, Vehicle, Technician, InventoryItem, ServiceTypeRecord, QuoteRecord } from "@/types";
import type { VehicleFormValues } from '../../vehiculos/components/vehicle-form';

// This page now renders the form for creating a new service record locally.
export default function NuevoServicioPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceTypeRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubs = [
      inventoryService.onVehiclesUpdate(setVehicles),
      personnelService.onTechniciansUpdate(setTechnicians),
      inventoryService.onItemsUpdate(setInventoryItems),
      inventoryService.onServiceTypesUpdate((data) => {
        setServiceTypes(data);
        setIsLoading(false);
      }),
    ];
    return () => unsubs.forEach(unsub => unsub());
  }, []);

  const handleSaveNewService = async (data: ServiceRecord | QuoteRecord) => {
    try {
      const savedRecord = await operationsService.saveService(data);
      toast({ title: 'Registro Creado', description: `El registro #${savedRecord.id} se ha guardado.` });
      router.push('/servicios/historial');
    } catch (error) {
      console.error('Error creating service:', error);
      toast({ title: 'Error al Guardar', description: 'No se pudo crear el nuevo registro.', variant: 'destructive' });
    }
  };

  const handleVehicleCreated = async (newVehicleData: VehicleFormValues) => {
    try {
      await inventoryService.addVehicle(newVehicleData);
      toast({ title: 'Vehículo Creado' });
    } catch (error) {
       toast({ title: 'Error al Crear Vehículo', variant: 'destructive' });
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-3 text-lg">Cargando datos...</span>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Nuevo Servicio / Cotización"
        description="Complete la información. El registro se guardará en la base de datos al finalizar."
      />
      <ServiceForm
        vehicles={vehicles}
        technicians={technicians}
        inventoryItems={inventoryItems}
        serviceTypes={serviceTypes}
        serviceHistory={[]}
        onSubmit={handleSaveNewService}
        onClose={() => router.push('/servicios/historial')}
        onVehicleCreated={handleVehicleCreated}
        mode="service" // Default mode, can be changed internally by status
      />
    </>
  );
}
