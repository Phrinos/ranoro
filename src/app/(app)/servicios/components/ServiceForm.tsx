
// src/app/(app)/servicios/components/ServiceForm.tsx
"use client";

import React from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Loader2, Save, Ban, Trash2, DollarSign } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import { ServiceFormFooter } from './ServiceFormFooter';
import type { ServiceFormValues } from '@/schemas/service-form';


interface ServiceFormProps {
  initialData: ServiceRecord | null;
  vehicles: Vehicle[];
  users: User[]; 
  inventoryItems: InventoryItem[];
  serviceTypes: ServiceTypeRecord[];
  categories: InventoryCategory[];
  suppliers: Supplier[];
  serviceHistory: ServiceRecord[];
  onSave: (data: ServiceFormValues) => Promise<ServiceRecord | void>;
  onSaveSuccess: (service: ServiceRecord) => void;
  onComplete?: (data: ServiceFormValues) => void;
  onVehicleCreated?: (newVehicle: VehicleFormValues) => Promise<Vehicle>;
  onCancel?: () => void;
  mode: 'service' | 'quote';
  activeTab: string;
  onTabChange: (tab: string) => void;
  isChecklistWizardOpen: boolean;
  setIsChecklistWizardOpen: (isOpen: boolean) => void;
  onOpenNewVehicleDialog: (plate?: string) => void;
}

const getErrorMessages = (errors: FieldErrors<ServiceFormValues>): string => {
    const messages: string[] = [];
    
    const parseErrors = (errorObj: any, prefix = '') => {
        for (const key in errorObj) {
            const fullKey = prefix ? `${prefix}.${key}` : key;
            const error = errorObj[key];
            if (error && error.message) {
                messages.push(`${fullKey}: ${error.message}`);
            } else if (typeof error === 'object' && error !== null) {
                parseErrors(error, fullKey);
            }
        }
    };

    parseErrors(errors);
    
    if (messages.length === 0) return "Error de validación desconocido. Revisa la consola para más detalles.";
    return `Hay errores en el formulario. ${messages.join('; ')}.`;
};


const normalizeText = (text: string = '') => {
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, ""); // Remove accents
};


export function ServiceForm({
  initialData,
  vehicles,
  users, 
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
  activeTab,
  onTabChange,
  isChecklistWizardOpen,
  setIsChecklistWizardOpen,
  onOpenNewVehicleDialog,
}: ServiceFormProps) {
  const { toast } = useToast();
  const [isSignatureDialogOpen, setIsSignatureDialogOpen] = React.useState(false);
  const [signatureType, setSignatureType] = React.useState<'reception' | 'delivery' | 'advisor' | null>(null);
  const [isEnhancingText, setIsEnhancingText] = React.useState<string | null>(null);

  const { advisors, technicians } = React.useMemo(() => {
    const advisorsList: User[] = [];
    const techniciansList: User[] = [];
    const safeUsers = Array.isArray(users) ? users : [];

    for (const user of safeUsers) {
        if (user.isArchived) continue;

        const userFunctions = user.functions || [];
        const normalizedRole = normalizeText(user.role);

        if (userFunctions.includes('asesor') || normalizedRole.includes('asesor')) {
            advisorsList.push(user);
        }
        if (userFunctions.includes('tecnico') || normalizedRole.includes('tecnico')) {
            techniciansList.push(user);
        }
    }
    return { 
        advisors: [...new Set(advisorsList)], 
        technicians: [...new Set(techniciansList)] 
    };
  }, [users]);
  
  const methods = useFormContext<ServiceFormValues>();
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
    <>
      <form id="service-form" onSubmit={handleSubmit(handleFormSubmit, onValidationErrors)}>
       <div className="space-y-6 p-1 pb-24 md:pb-6">
         <VehicleSelectionCard
            vehicles={vehicles}
            onVehicleCreated={onVehicleCreated}
            serviceHistory={serviceHistory || []}
            onOpenNewVehicleDialog={onOpenNewVehicleDialog}
            initialVehicleId={initialData?.vehicleId}
        />
        <ServiceDetailsCard
            isReadOnly={false}
            advisors={advisors}
            technicians={technicians}
            serviceTypes={serviceTypes}
            onOpenSignature={handleOpenSignatureDialog}
            isNew={!initialData?.id}
        />
        {(watchedStatus === 'En Taller' || watchedStatus === 'Entregado') && (
            <NextServiceInfoCard currentMileage={currentMileage} />
        )}
        <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
            <div className="sticky top-0 z-10 border-b bg-background/95 p-1 backdrop-blur-sm">
                 <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 gap-2 md:gap-0 h-auto md:h-10 bg-transparent p-0">
                    <TabsTrigger value="service-items" className="h-full">Trabajos</TabsTrigger>
                    <TabsTrigger value="reception-delivery" className="h-full">Recepción</TabsTrigger>
                    <TabsTrigger value="photo-report" className="h-full">Fotos</TabsTrigger>
                    <TabsTrigger value="safety-checklist" className="h-full">Checklist</TabsTrigger>
                </TabsList>
            </div>
            <div className="mt-4">
                <TabsContent value="service-items" className="space-y-6">
                    <Card><CardContent className="pt-6">
                        <ServiceItemsList
                            inventoryItems={inventoryItems}
                            serviceTypes={serviceTypes}
                            categories={categories}
                            suppliers={suppliers}
                            technicians={technicians || []}
                            mode={mode}
                            onNewInventoryItemCreated={onVehicleCreated ? (async () => ({} as InventoryItem)) : async () => ({} as InventoryItem)}
                            isEnhancingText={isEnhancingText}
                            handleEnhanceText={handleEnhanceText as any}
                        />
                    </CardContent></Card>
                    <Card><CardContent className="pt-6">
                         <ServiceSummary />
                    </CardContent></Card>
                </TabsContent>
                <TabsContent value="reception-delivery" className="space-y-6">
                    <ReceptionAndDelivery part="reception" isEnhancingText={isEnhancingText} handleEnhanceText={handleEnhanceText as any} onOpenSignature={handleOpenSignatureDialog}/>
                    <ReceptionAndDelivery part="delivery" isEnhancingText={isEnhancingText} handleEnhanceText={handleEnhanceText as any} onOpenSignature={handleOpenSignatureDialog}/>
                </TabsContent>
                <TabsContent value="photo-report"><PhotoReportTab /></TabsContent>
                <TabsContent value="safety-checklist">
                    <SafetyChecklist 
                        isWizardOpen={isChecklistWizardOpen}
                        setIsWizardOpen={setIsChecklistWizardOpen}
                    />
                </TabsContent>
            </div>
        </Tabs>
       </div>
        <ServiceFormFooter
            formId="service-form"
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
    </>
  );
}
