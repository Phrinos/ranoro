

"use client";

import React, { useState, useEffect, lazy, Suspense } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ServiceForm } from "./service-form";
import type { ServiceRecord, Vehicle, Technician, InventoryItem, QuoteRecord, User, ServiceTypeRecord, InventoryCategory, Supplier } from "@/types";
import { useToast } from "@/hooks/use-toast"; 
import { operationsService, inventoryService } from '@/lib/services';
import { ServiceFormValues, serviceFormSchema } from '@/schemas/service-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormProvider, useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';


interface ServiceDialogProps {
  trigger?: React.ReactNode;
  service?: ServiceRecord | null; 
  quote?: Partial<QuoteRecord> | null;
  vehicles: Vehicle[]; 
  technicians: User[]; 
  inventoryItems: InventoryItem[]; 
  serviceTypes: ServiceTypeRecord[];
  categories: InventoryCategory[];
  suppliers: Supplier[];
  serviceHistory: ServiceRecord[];
  onSave?: (data: ServiceRecord | QuoteRecord) => Promise<void>; 
  isReadOnly?: boolean; 
  open?: boolean; 
  onOpenChange?: (isOpen: boolean) => void; 
  onVehicleCreated?: (newVehicle: Omit<Vehicle, 'id'>) => void; 
  mode?: 'service' | 'quote';
  onDelete?: (id: string) => void;
  onCancelService?: (serviceId: string, reason: string) => void;
  onViewQuoteRequest?: (serviceId: string) => void;
}

export function ServiceDialog({ 
  trigger, 
  service, 
  quote,
  vehicles, 
  technicians, 
  inventoryItems, 
  serviceTypes,
  categories,
  suppliers,
  serviceHistory,
  onSave, 
  isReadOnly = false,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  onVehicleCreated,
  mode: initialMode = 'service', // Default to service mode
  onDelete,
  onCancelService,
}: ServiceDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const isControlled = controlledOpen !== undefined && setControlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const onOpenChange = isControlled ? setControlledOpen : setUncontrolledOpen;

  const mode = service?.status === 'Cotizacion' || quote ? 'quote' : initialMode;
  
  const initialData = mode === 'quote' ? quote : service;

  const methods = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
  });

  useEffect(() => {
    if (open) {
      if (initialData) {
        methods.reset({
          ...initialData,
          initialStatus: initialData.status,
          allVehiclesForDialog: vehicles,
        });
      } else {
        methods.reset({
          status: mode === 'quote' ? 'Cotizacion' : 'En Taller',
          initialStatus: mode === 'quote' ? 'Cotizacion' : 'En Taller',
          serviceDate: new Date(),
          appointmentDateTime: new Date(),
          receptionDateTime: new Date(),
          serviceItems: [],
          payments: [{ method: 'Efectivo', amount: undefined }],
          allVehiclesForDialog: vehicles,
        });
      }
    }
  }, [open, initialData, vehicles, mode, methods]);


  const internalOnSave = async (formData: ServiceFormValues) => {
    if (isReadOnly) {
      onOpenChange(false);
      return;
    }
  
    try {
      const savedRecord = await operationsService.saveService(formData as ServiceRecord); // Assuming operationsService handles both create/update
      toast({ title: 'Registro ' + (formData.id ? 'actualizado' : 'creado') + ' con éxito.' });
      
      if (onSave) {
        await onSave(savedRecord);
      }
      
      onOpenChange(false);
      
      const targetTab = savedRecord.status === 'Cotizacion' ? 'cotizaciones' : 
                      savedRecord.status === 'Agendado' ? 'agenda' : 
                      savedRecord.status === 'Entregado' ? 'historial' : 'activos';
      router.push(`/servicios?tab=${targetTab}`);
      router.refresh();

    } catch (error) {
      console.error(`Error saving ${mode} from dialog:`, error);
      toast({
        title: `Error al Guardar ${mode === 'quote' ? 'Cotización' : 'Servicio'}`,
        description: `Ocurrió un problema al intentar guardar.`,
        variant: "destructive",
      });
    }
  };
  
  const getDynamicTitles = () => {
    const status = methods.watch('status') || initialData?.status;
    
    if (isReadOnly) {
        return { title: `Detalles de ${mode === 'quote' ? 'Cotización' : 'Servicio'}`, description: "Visualizando los detalles del registro." };
    }
    if (initialData?.id) { // Editing
        return { title: `Editar ${mode === 'quote' ? 'Cotización' : 'Servicio'}`, description: `Actualiza los detalles del folio #${initialData.id.slice(-6)}` };
    }
    // Creating
    return { title: `Nuevo ${mode === 'quote' ? 'Cotización' : 'Servicio'}`, description: "Completa la información para crear el registro." };
  };

  const { title, description } = getDynamicTitles();
      
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && !isControlled && <DialogTrigger asChild onClick={() => onOpenChange(true)}>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-[600px] md:max-w-[800px] lg:max-w-[900px] xl:max-w-6xl flex flex-col max-h-[90vh] print:hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <FormProvider {...methods}>
            <Suspense fallback={<div className="flex justify-center items-center h-full"><Loader2 className="animate-spin" /></div>}>
              <ServiceForm
                onSubmit={internalOnSave}
                onClose={() => onOpenChange(false)}
                isReadOnly={isReadOnly}
                onDelete={onDelete}
                onCancelService={onCancelService}
                onVehicleCreated={onVehicleCreated as any}
                vehicles={vehicles}
                technicians={technicians}
                inventoryItems={inventoryItems}
                serviceTypes={serviceTypes}
                serviceHistory={serviceHistory}
                categories={categories}
                suppliers={suppliers}
                mode={mode}
              />
            </Suspense>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
