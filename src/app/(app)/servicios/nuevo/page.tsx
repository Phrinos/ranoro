

"use client";

import { useState, useEffect } from 'react';
import { PageHeader } from "@/components/page-header";
import { ServiceDialog } from "../components/service-dialog";
import type { ServiceRecord, Vehicle, Technician, InventoryItem, QuoteRecord, ServiceTypeRecord } from '@/types'; 
import { useToast } from "@/hooks/use-toast";
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { inventoryService, personnelService, operationsService } from '@/lib/services';
import type { VehicleFormValues } from '../../vehiculos/components/vehicle-form';


type DialogStep = 'form' | 'closed';

export default function NuevoServicioPage() {
  const { toast } = useToast(); 
  const router = useRouter();
  
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceTypeRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [dialogStep, setDialogStep] = useState<DialogStep>('form');
  const [redirectPath, setRedirectPath] = useState('/tablero'); 
  
  useEffect(() => {
    const loadData = async () => {
        try {
            const [
                vehiclesData, 
                techniciansData, 
                inventoryData,
                serviceTypesData,
            ] = await Promise.all([
                inventoryService.onVehiclesUpdatePromise(),
                personnelService.onTechniciansUpdatePromise(),
                inventoryService.onItemsUpdatePromise(),
                inventoryService.onServiceTypesUpdatePromise(),
            ]);
            
            setVehicles(vehiclesData);
            setTechnicians(techniciansData);
            setInventoryItems(inventoryData);
            setServiceTypes(serviceTypesData);
        } catch (error) {
            console.error("Failed to load initial data:", error);
            toast({
                title: 'Error de Carga',
                description: 'No se pudieron cargar los datos necesarios. Intente recargar la página.',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    loadData();
  }, [toast]);

  useEffect(() => {
    if (dialogStep === 'closed') {
      router.push(redirectPath); 
    }
  }, [dialogStep, router, redirectPath]);
  
  const handleSaveComplete = async (data: ServiceRecord | QuoteRecord) => {
    // The dialog now handles the save logic. This function primarily handles the redirect.
    toast({
      title: "Registro Creado",
      description: `Se ha creado el registro #${data.id}.`
    });

    switch (data.status) {
      case 'Cotizacion':
        setRedirectPath('/cotizaciones/historial');
        break;
      case 'Agendado':
        setRedirectPath('/servicios/agenda');
        break;
      case 'En Taller':
      case 'Entregado':
        setRedirectPath('/servicios/historial');
        break;
      default:
        setRedirectPath('/dashboard');
    }

    setDialogStep('closed');
  };


  const handleFormDialogClose = () => { 
     if (dialogStep === 'form') { 
      setRedirectPath('/dashboard'); 
      setDialogStep('closed');
    }
  };
  
  const handleVehicleCreated = async (newVehicleData: Omit<Vehicle, 'id'>) => {
    try {
        const addedVehicle = await inventoryService.addVehicle(newVehicleData as VehicleFormValues);
        setVehicles(prev => [...prev, addedVehicle]);
        toast({ title: 'Vehículo Creado', description: `${addedVehicle.make} ${addedVehicle.model} ha sido agregado.`});
    } catch (e) {
      console.error("Error creating vehicle:", e);
      toast({ title: 'Error al crear vehículo', variant: 'destructive'});
    }
  };

  if (isLoading) {
      return <div className="flex h-64 w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-3 text-lg">Cargando datos...</span>
        </div>;
  }

  return (
    <>
      <PageHeader
        title="Nuevo Registro"
        description="Crear una nueva cotización o una orden de servicio."
      />
      {dialogStep === 'form' && (
        <ServiceDialog
          open={true} 
          onOpenChange={(isOpen) => { 
            if (!isOpen) handleFormDialogClose();
          }}
          service={null} 
          vehicles={vehicles}
          technicians={technicians}
          inventoryItems={inventoryItems}
          serviceTypes={serviceTypes}
          onSave={handleSaveComplete}
          onVehicleCreated={handleVehicleCreated}
          mode="quote"
        />
      )}
      
      {dialogStep === 'closed' && (
        <div className="text-center p-8">
          <p className="text-muted-foreground">Redireccionando...</p>
        </div>
      )}
    </>
  );
}
