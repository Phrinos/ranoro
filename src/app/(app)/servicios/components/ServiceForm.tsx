
// src/app/(app)/servicios/components/ServiceForm.tsx
"use client";

import React from 'react';
import { FormProvider, useForm, useFormContext, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Loader2, Save, Ban, Trash2, DollarSign } from 'lucide-react';
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
import { ServiceDetailsCard } from './ServiceDetailsCard';
import { NextServiceInfoCard } from './NextServiceInfoCard';
import { Card, CardContent } from '@/components/ui/card';
import { FieldErrors } from 'react-hook-form';
import { ReceptionAndDelivery } from './ReceptionAndDelivery';
import { SignatureDialog } from './signature-dialog';
import { enhanceText } from '@/ai/flows/text-enhancement-flow';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';


interface ServiceFormProps {
  initialData: ServiceRecord | null;
  vehicles: Vehicle[];
  technicians: User[];
  inventoryItems: InventoryItem[];
  serviceTypes: ServiceTypeRecord[];
  categories: InventoryCategory[];
  suppliers: Supplier[];
  serviceHistory: ServiceRecord[];
  onSave: (data: ServiceFormValues) => Promise<ServiceRecord | void>;
  onSaveSuccess?: (service: ServiceRecord) => void;
  onComplete?: (data: ServiceFormValues) => void;
  onVehicleCreated?: (newVehicle: VehicleFormValues) => Promise<Vehicle>;
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
    const isEditMode = !!initialData?.id;
    const { status } = useWatch();

    const isQuoteMode = status === 'Cotizacion';
    const isScheduledMode = status === 'Agendado';

    let cancelTexts = {
        button: 'Cancelar Servicio',
        title: '¿Cancelar servicio?',
        description: 'El servicio se marcará como cancelado y los insumos se devolverán al inventario.',
        confirm: 'Sí, Cancelar Servicio'
    };

    if (isQuoteMode) {
        cancelTexts = {
            button: 'Eliminar Cotización',
            title: '¿Eliminar cotización?',
            description: 'Esta acción es permanente y no se puede deshacer.',
            confirm: 'Sí, Eliminar'
        };
    } else if (isScheduledMode) {
        cancelTexts = {
            button: 'Cancelar Cita',
            title: '¿Cancelar cita?',
            description: 'La cita se cancelará y el registro volverá a ser una cotización.',
            confirm: 'Sí, Cancelar Cita'
        };
    }


    return (
        <footer className="sticky bottom-0 z-10 border-t bg-background/95 p-4 backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {onCancel && (
                <ConfirmDialog
                  triggerButton={<Button variant="destructive" type="button" className="w-full sm:w-auto"><Ban className="mr-2 h-4 w-4" />{cancelTexts.button}</Button>}
                  title={cancelTexts.title}
                  description={cancelTexts.description}
                  onConfirm={onCancel}
                  confirmText={cancelTexts.confirm}
                />
              )}
              <Button type="button" variant="outline" onClick={() => reset(initialData || {})} className="w-full sm:w-auto">Descartar</Button>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
               {isEditMode && onComplete && status !== 'Entregado' && status !== 'Cancelado' && (
                 <Button type="button" onClick={() => onComplete(getValues())} disabled={isSubmitting} variant="outline" className="text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700 w-full sm:w-auto">
                    <DollarSign className="mr-2 h-4 w-4"/> Completar y Cobrar
                 </Button>
               )}
              <Button type="submit" disabled={isSubmitting} className="bg-green-600 hover:bg-green-700 w-full sm:w-auto">
                {isSubmitting ? <Loader2 className="animate-spin mr-2"/> : <Save className="mr-2 h-4 w-4"/>}
                Guardar
              </Button>
            </div>
          </div>
        </footer>
    );
};

const fieldLabels: { [key: string]: string } = {
    vehicleId: 'Vehículo',
    serviceDate: 'Fecha del Servicio',
    technicianId: 'Técnico Asignado',
    serviceItems: 'Artículos de Servicio',
    'nextServiceInfo.nextServiceDate': 'Fecha de Próximo Servicio',
    'nextServiceInfo.nextServiceMileage': 'Kilometraje de Próximo Servicio',
    nextServiceInfo: 'Próximo Servicio',
};

const getErrorMessages = (errors: FieldErrors<ServiceFormValues>): string => {
    const messages = Object.keys(errors).map(key => {
        if (key === 'nextServiceInfo' && typeof errors.nextServiceInfo === 'object') {
            const subErrors = Object.keys(errors.nextServiceInfo);
            if (subErrors.length > 0) return fieldLabels['nextServiceInfo'];
        }
        return fieldLabels[key] || key;
    }).filter(Boolean);

    const uniqueMessages = [...new Set(messages)];
    if (uniqueMessages.length === 0) return "Por favor, revise los campos marcados en rojo.";
    return `Por favor, revise los siguientes campos: ${uniqueMessages.join(', ')}.`;
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
  onSaveSuccess,
  onComplete,
  onVehicleCreated,
  onCancel,
  mode,
}: ServiceFormProps) {
  const { toast } = useToast();
  const [isSignatureDialogOpen, setIsSignatureDialogOpen] = React.useState(false);
  const [signatureType, setSignatureType] = React.useState<'reception' | 'delivery' | 'advisor' | null>(null);
  const [isEnhancingText, setIsEnhancingText] = React.useState<string | null>(null);

  const methods = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      ...initialData,
      vehicleId: initialData?.vehicleId || '',
      serviceItems: initialData?.serviceItems || [],
      notes: initialData?.notes ?? '',
      serviceDate: initialData?.serviceDate ? new Date(initialData.serviceDate) : new Date(),
      appointmentDateTime: initialData?.appointmentDateTime ? new Date(initialData.appointmentDateTime) : undefined,
      receptionDateTime: initialData?.receptionDateTime ? new Date(initialData.receptionDateTime) : undefined,
      deliveryDateTime: initialData?.deliveryDateTime ? new Date(initialData.deliveryDateTime) : undefined,
      nextServiceInfo: initialData?.nextServiceInfo ? {
          ...initialData.nextServiceInfo,
          nextServiceDate: initialData.nextServiceInfo.nextServiceDate ? new Date(initialData.nextServiceInfo.nextServiceDate) : null,
      } : { nextServiceDate: null, nextServiceMileage: null },
    },
  });

  const { handleSubmit, getValues, setValue, formState: { isSubmitting }, reset, watch } = methods;
  
  const selectedVehicleId = watch('vehicleId');
  const watchedStatus = watch('status');
  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);
  const currentMileage = selectedVehicle?.mileage;

  const handleFormSubmit = async (values: ServiceFormValues) => {
    const savedService = await onSave(values);
    if (savedService && onSaveSuccess) {
      onSaveSuccess(savedService);
    }
  };
  
  const handleCompleteClick = () => {
    if (onComplete) {
      onComplete(getValues());
    }
  };

  const onValidationErrors = (errors: FieldErrors<ServiceFormValues>) => {
    const description = getErrorMessages(errors);
    toast({
        title: "Error de Validación",
        description: description,
        variant: "destructive",
    });
  };

  const handleOpenSignatureDialog = (type: 'reception' | 'delivery' | 'advisor') => {
    setSignatureType(type);
    setIsSignatureDialogOpen(true);
  };
  
  const handleSaveSignature = (dataUrl: string) => {
    let fieldName: keyof ServiceFormValues | undefined;
    if (signatureType === 'reception') fieldName = 'customerSignatureReception';
    if (signatureType === 'delivery') fieldName = 'customerSignatureDelivery';
    if (signatureType === 'advisor') fieldName = 'serviceAdvisorSignatureDataUrl';
    
    if (fieldName) {
      setValue(fieldName, dataUrl, { shouldDirty: true, shouldValidate: true });
    }
    setIsSignatureDialogOpen(false);
  };

  const handleEnhanceText = async (
    fieldName: 'notes' | 'vehicleConditions' | 'customerItems' | `photoReports.${number}.description`
  ) => {
    const contextMap = {
        notes: "Notas Adicionales del Servicio",
        vehicleConditions: "Condiciones del Vehículo",
        customerItems: "Pertenencias del Cliente",
    };
    
    const textToEnhance = getValues(fieldName);
    const context = fieldName.startsWith('photoReports') ? 'Descripción de Foto' : contextMap[fieldName];
    
    if (!textToEnhance) return;
    setIsEnhancingText(fieldName);
    
    try {
        const enhancedText = await enhanceText({ text: textToEnhance, context });
        setValue(fieldName, enhancedText, { shouldDirty: true });
    } catch (error) {
        console.error("Error enhancing text:", error);
        toast({ title: 'Error de IA', description: 'No se pudo mejorar el texto.', variant: 'destructive' });
    } finally {
        setIsEnhancingText(null);
    }
  };

  return (
    <FormProvider {...methods}>
      <form id="service-form" onSubmit={handleSubmit(handleFormSubmit, onValidationErrors)}>
       <div className="space-y-6 p-1 pb-24">
         <VehicleSelectionCard
            vehicles={vehicles}
            onVehicleCreated={onVehicleCreated}
            serviceHistory={serviceHistory || []}
            onOpenNewVehicleDialog={() => {}}
            initialVehicleId={initialData?.vehicleId}
        />
        <ServiceDetailsCard
            isReadOnly={false}
            users={technicians}
            serviceTypes={serviceTypes}
            onOpenSignature={handleOpenSignatureDialog}
            isNew={!initialData?.id}
        />
        {(watchedStatus === 'En Taller' || watchedStatus === 'Entregado') && (
            <NextServiceInfoCard currentMileage={currentMileage} />
        )}
        <Tabs defaultValue="service-items">
            <div className="sticky top-0 z-10 border-b bg-background/95 p-1 backdrop-blur-sm">
                <ScrollArea className="w-full whitespace-nowrap">
                    <TabsList className="w-max">
                        <TabsTrigger value="service-items">Trabajos y Refacciones</TabsTrigger>
                        <TabsTrigger value="reception-delivery">Recepción/Entrega</TabsTrigger>
                        <TabsTrigger value="photo-report">Reporte de Fotos</TabsTrigger>
                        <TabsTrigger value="safety-checklist">Revisión de Seguridad</TabsTrigger>
                    </TabsList>
                    <ScrollBar orientation="horizontal" />
                </ScrollArea>
            </div>
            <div className="mt-4">
                <TabsContent value="service-items" className="space-y-6">
                    <Card><CardContent className="pt-6">
                        <ServiceItemsList
                            inventoryItems={inventoryItems}
                            serviceTypes={serviceTypes}
                            categories={categories}
                            suppliers={suppliers}
                            onNewInventoryItemCreated={onVehicleCreated ? (async () => ({} as InventoryItem)) : async () => ({} as InventoryItem)}
                            mode={mode}
                            isEnhancingText={isEnhancingText}
                            handleEnhanceText={handleEnhanceText as any}
                        />
                    </CardContent></Card>
                    <Card><CardContent className="pt-6">
                         <ServiceSummary
                            onOpenValidateDialog={() => {}}
                            validatedFolios={{}}
                        />
                    </CardContent></Card>
                </TabsContent>
                <TabsContent value="reception-delivery" className="space-y-6">
                    <ReceptionAndDelivery part="reception" isEnhancingText={isEnhancingText} handleEnhanceText={handleEnhanceText as any} onOpenSignature={handleOpenSignatureDialog}/>
                    <ReceptionAndDelivery part="delivery" isEnhancingText={isEnhancingText} handleEnhanceText={handleEnhanceText as any} onOpenSignature={handleOpenSignatureDialog}/>
                </TabsContent>
                <TabsContent value="photo-report"><PhotoReportTab /></TabsContent>
                <TabsContent value="safety-checklist"><SafetyChecklist /></TabsContent>
            </div>
        </Tabs>
       </div>
        <ServiceFormFooter
            onCancel={onCancel}
            onComplete={handleCompleteClick}
            mode={mode}
            initialData={initialData}
            isSubmitting={isSubmitting}
        />
      </form>
       <SignatureDialog
          open={isSignatureDialogOpen}
          onOpenChange={setIsSignatureDialogOpen}
          onSave={handleSaveSignature}
       />
    </FormProvider>
  );
}
