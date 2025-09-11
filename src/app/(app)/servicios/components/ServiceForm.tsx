// src/app/(app)/servicios/components/ServiceForm.tsx
"use client";

import React from 'react';
import { FormProvider, useForm, useFormContext, watch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Loader2, Save, Ban, DollarSign } from 'lucide-react';
import { serviceFormSchema, ServiceFormValues } from '@/schemas/service-form';
import { ServiceRecord, Vehicle, User, InventoryItem, ServiceTypeRecord, InventoryCategory, Supplier } from '@/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { VehicleFormValues } from '@/app/(app)/vehiculos/components/vehicle-form';
import { useToast } from '@/hooks/use-toast';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ServiceSummary } from './ServiceSummary';
import { ServiceItemsList } from './ServiceItemsList';
import { VehicleSelectionCard } from './VehicleSelectionCard';
import { SafetyChecklist } from './SafetyChecklist';
import PhotoReportTab from './PhotoReportTab';
import { ReceptionAndDelivery } from './ReceptionAndDelivery';
import { ServiceDetailsCard } from './ServiceDetailsCard';

interface ServiceFormProps {
  initialData: ServiceRecord | null;
  vehicles: Vehicle[];
  technicians: User[];
  inventoryItems: InventoryItem[];
  serviceTypes: ServiceTypeRecord[];
  categories: InventoryCategory[];
  suppliers: Supplier[];
  serviceHistory: ServiceRecord[];
  onSave: (data: ServiceFormValues) => Promise<void>;
  onComplete?: (data: ServiceFormValues) => void;
  onVehicleCreated?: (newVehicle: VehicleFormValues) => void;
  onCancel?: () => void;
  mode: 'service' | 'quote';
}

const ServiceFormFooter = ({ onCancel, onComplete, mode, initialData, isSubmitting }: {
    onCancel?: () => void;
    onComplete?: (values: ServiceFormValues) => void;
    mode: 'service' | 'quote';
    initialData: ServiceRecord | null;
    isSubmitting: boolean;
}) => {
    const { getValues, reset } = useFormContext<ServiceFormValues>();
    const watchedStatus = watch('status');

    return (
        <footer className="sticky bottom-0 z-10 border-t bg-background/95 p-4 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-2">
            <div>
              {onCancel && (
                <ConfirmDialog
                  triggerButton={<Button variant="destructive" type="button"><Ban className="mr-2 h-4 w-4" />{mode === 'quote' ? 'Eliminar' : 'Cancelar'}</Button>}
                  title={mode === 'quote' ? '¿Eliminar cotización?' : '¿Cancelar servicio?'}
                  description={mode === 'quote' ? 'Esto es permanente.' : 'El servicio se marcará como cancelado.'}
                  onConfirm={onCancel}
                  confirmText={mode === 'quote' ? 'Sí, Eliminar' : 'Sí, Cancelar'}
                />
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={() => reset(initialData || {})}>Descartar</Button>
              {initialData?.id && watchedStatus === 'En Taller' && onComplete ? (
                <Button type="button" onClick={() => onComplete(getValues())} disabled={isSubmitting} className="bg-green-600 hover:bg-green-700">
                  {isSubmitting ? <Loader2 className="animate-spin mr-2"/> : <DollarSign className="mr-2 h-4 w-4"/>}
                  Completar y Cobrar
                </Button>
              ) : (
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="animate-spin mr-2"/> : <Save className="mr-2 h-4 w-4"/>}
                  {initialData?.id ? 'Guardar Cambios' : 'Crear Registro'}
                </Button>
              )}
            </div>
          </div>
        </footer>
    );
};

export function ServiceForm({
  initialData,
  vehicles,
  technicians,
  inventoryItems,
  serviceTypes,
  categories,
  suppliers,
  serviceHistory,
  onSave,
  onComplete,
  onVehicleCreated,
  onCancel,
  mode,
}: ServiceFormProps) {
  const { toast } = useToast();
  const methods = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      ...initialData,
      notes: initialData?.notes ?? '',
      serviceDate: initialData?.serviceDate ? new Date(initialData.serviceDate) : new Date(),
      appointmentDateTime: initialData?.appointmentDateTime ? new Date(initialData.appointmentDateTime) : undefined,
      receptionDateTime: initialData?.receptionDateTime ? new Date(initialData.receptionDateTime) : undefined,
      deliveryDateTime: initialData?.deliveryDateTime ? new Date(initialData.deliveryDateTime) : undefined,
    },
  });

  const { handleSubmit, getValues, setValue, watch, formState: { isSubmitting }, reset } = methods;

  const watchedStatus = watch('status');

  const handleFormSubmit = async (values: ServiceFormValues) => {
    if (values.status === 'Entregado' && initialData?.status !== 'Entregado') {
      toast({
        title: "Acción Requerida",
        description: "Para finalizar un servicio, utiliza el botón 'Completar y Cobrar'. No se puede cambiar el estado a 'Entregado' manualmente.",
        variant: "destructive",
        duration: 7000,
      });
      setValue('status', initialData?.status || 'En Taller'); // Revert status
      return;
    }
    await onSave(values);
  };
  
  const handleCompleteClick = () => {
    if (onComplete) {
      onComplete(getValues());
    }
  };

  const onValidationErrors = (errors: any) => {
    console.log("Validation Errors:", errors);
    toast({
        title: "Error de Validación",
        description: "Por favor, corrija los errores antes de guardar.",
        variant: "destructive",
    });
  };

  return (
    <FormProvider {...methods}>
      <form id="service-form" onSubmit={handleSubmit(handleFormSubmit, onValidationErrors)}>
        <div className="space-y-6 p-1 pb-24">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <VehicleSelectionCard
                vehicles={vehicles}
                onVehicleCreated={onVehicleCreated}
                serviceHistory={serviceHistory || []}
              />
              <ServiceDetailsCard technicians={technicians} />
              <Tabs defaultValue="items">
                <TabsList>
                  <TabsTrigger value="items">Items del Servicio</TabsTrigger>
                  <TabsTrigger value="checklist">Checklist de Seguridad</TabsTrigger>
                  <TabsTrigger value="photos">Reporte Fotográfico</TabsTrigger>
                  <TabsTrigger value="reception">Recepción y Entrega</TabsTrigger>
                </TabsList>
                <TabsContent value="items">
                  <ServiceItemsList
                    inventoryItems={inventoryItems}
                    serviceTypes={serviceTypes}
                    categories={categories}
                    suppliers={suppliers}
                  />
                </TabsContent>
                <TabsContent value="checklist">
                  <SafetyChecklist />
                </TabsContent>
                <TabsContent value="photos">
                  <PhotoReportTab />
                </TabsContent>
                <TabsContent value="reception">
                  <ReceptionAndDelivery />
                </TabsContent>
              </Tabs>
            </div>
            <div className="lg:col-span-1 space-y-6">
              <ServiceSummary />
            </div>
          </div>
        </div>
         <ServiceFormFooter
            onCancel={onCancel}
            onComplete={handleCompleteClick}
            mode={mode}
            initialData={initialData}
            isSubmitting={isSubmitting}
        />
      </form>
    </FormProvider>
  );
}
