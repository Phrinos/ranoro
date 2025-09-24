// src/app/(app)/servicios/components/ServiceForm.tsx
"use client";

import React, { useEffect, useMemo } from 'react';
import { useFormContext, useWatch, type FieldErrors, type SubmitHandler, type SubmitErrorHandler } from 'react-hook-form';
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
import { ReceptionAndDelivery } from './ReceptionAndDelivery';
import { SignatureDialog } from './signature-dialog';
import { enhanceText } from '@/ai/flows/text-enhancement-flow';
import { ServiceFormFooter } from './ServiceFormFooter';
import type { ServiceFormValues } from '@/schemas/service-form';


// Evita el {} “vacío” del console con proxies/referencias
function materializeErrors<T extends FieldErrors<any>>(e: T) {
  try {
    return JSON.parse(JSON.stringify(e));
  } catch {
    // fallback profundo
    const out: any = {};
    const visit = (obj: any, tgt: any) => {
      Object.entries(obj || {}).forEach(([k, v]) => {
        if (!v) return;
        if (typeof v === "object" && !("message" in (v as any))) {
          tgt[k] = Array.isArray(v) ? [] : {};
          visit(v, tgt[k]);
        } else {
          tgt[k] = v;
        }
      });
    };
    visit(e, out);
    return out;
  }
}

// Recolecta todos los messages (incluye arrays anidados)
function flattenRHFErrors(errs: FieldErrors<any>): string[] {
  const out: string[] = [];
  const walk = (node: any) => {
    if (!node || typeof node !== "object") return;
    for (const key of Object.keys(node)) {
      const val = node[key];
      if (!val) continue;
      if (typeof val === "object" && "message" in val && val.message) {
        out.push(String(val.message));
      }
      // RHF para arrays guarda índices numéricos como claves
      if (typeof val === "object") walk(val);
    }
  };
  walk(errs);
  // único + limpio
  return Array.from(new Set(out)).filter(Boolean);
}


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
    const advisors: User[] = [];
    const technicians: User[] = [];
    (users || []).forEach(user => {
      if (user.functions?.includes('asesor')) advisors.push(user);
      if (user.functions?.includes('tecnico')) technicians.push(user);
    });
    return { advisors, technicians };
  }, [users]);

  const methods = useFormContext<ServiceFormValues>();
  const { handleSubmit, getValues, setValue, formState: { isSubmitting }, watch, trigger } = methods;

  const watchedStatus = watch('status');

  useEffect(() => {
    const subscription = watch((value, { name, type }) => {
      if (name === 'status' && value.status === 'En Taller' && !getValues('receptionDateTime')) {
        setValue('receptionDateTime', new Date(), { shouldDirty: true, shouldValidate: true });
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, setValue, getValues]);

  const handleFormSubmit: SubmitHandler<ServiceFormValues> = async (values) => {
    const savedService = await onSave(values);
    if (savedService && onSaveSuccess) {
      onSaveSuccess(savedService);
    }
  };

  const onValidationErrors: SubmitErrorHandler<ServiceFormValues> = (errors) => {
    const plainErrors = materializeErrors(errors);
    console.error("Validation Errors:", plainErrors);
    
    const errorMessages = flattenRHFErrors(errors);
    toast({
        title: "Formulario Incompleto",
        description: errorMessages[0] || "Por favor, revise todos los campos marcados.",
        variant: "destructive",
    });
  };
  
  const handleCompleteClick = () => {
    if (onComplete) {
      onComplete(getValues());
    }
  };
  
  const handleOpenSignature = (type: 'reception' | 'delivery' | 'advisor') => {
    setSignatureType(type);
    setIsSignatureDialogOpen(true);
  };
  
  const handleSaveSignature = (signatureDataUrl: string) => {
    let fieldName: 'customerSignatureReception' | 'customerSignatureDelivery' | 'serviceAdvisorSignatureDataUrl' | null = null;
    if (signatureType === 'reception') fieldName = 'customerSignatureReception';
    else if (signatureType === 'delivery') fieldName = 'customerSignatureDelivery';
    else if (signatureType === 'advisor') fieldName = 'serviceAdvisorSignatureDataUrl';
    
    if (fieldName) {
        setValue(fieldName, signatureDataUrl, { shouldDirty: true });
        toast({ title: "Firma guardada exitosamente." });
    }
    setIsSignatureDialogOpen(false);
  };
  
  const handleEnhanceText = async (fieldName: 'notes' | 'vehicleConditions' | 'customerItems' | 'safetyInspection.inspectionNotes' | `photoReports.${number}.description`) => {
    const currentValue = getValues(fieldName);
    if (!currentValue) return;
    setIsEnhancingText(fieldName);
    try {
      const enhanced = await enhanceText({ text: currentValue, context: 'Service Notes' });
      setValue(fieldName, enhanced, { shouldDirty: true });
    } catch (e) {
      console.error(e);
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
            onOpenNewVehicleDialog={onOpenNewVehicleDialog}
            initialVehicleId={initialData?.vehicleId}
            serviceHistory={serviceHistory}
        />
          
        <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
            <TabsList className="hidden md:grid w-full grid-cols-5 mb-4">
              <TabsTrigger value="service-items">Items del Servicio</TabsTrigger>
              <TabsTrigger value="reception-delivery">Recepción y Entrega</TabsTrigger>
              <TabsTrigger value="safety-checklist">Checklist Seguridad</TabsTrigger>
              <TabsTrigger value="photo-report">Reporte Fotográfico</TabsTrigger>
              <TabsTrigger value="details">Detalles y Estado</TabsTrigger>
            </TabsList>
            <TabsContent value="service-items">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
                    <div className="lg:col-span-3">
                      <ServiceItemsList
                        isReadOnly={isSubmitting}
                        inventoryItems={inventoryItems}
                        serviceTypes={serviceTypes}
                        technicians={technicians}
                        mode={mode}
                        onNewInventoryItemCreated={onVehicleCreated as any}
                        categories={categories}
                        suppliers={suppliers}
                        isEnhancingText={isEnhancingText}
                        handleEnhanceText={handleEnhanceText}
                      />
                    </div>
                    <div className="lg:col-span-2 space-y-6">
                      <ServiceSummary onOpenValidateDialog={() => {}} validatedFolios={{}} />
                    </div>
                </div>
            </TabsContent>
            <TabsContent value="reception-delivery">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <ReceptionAndDelivery part="reception" isReadOnly={isSubmitting} isEnhancingText={isEnhancingText} handleEnhanceText={handleEnhanceText} onOpenSignature={handleOpenSignature} />
                    {watchedStatus === 'Entregado' && <ReceptionAndDelivery part="delivery" isReadOnly={isSubmitting} isEnhancingText={isEnhancingText} handleEnhanceText={handleEnhanceText} onOpenSignature={handleOpenSignature} />}
                 </div>
            </TabsContent>
            <TabsContent value="safety-checklist">
                <SafetyChecklist isWizardOpen={isChecklistWizardOpen} setIsWizardOpen={setIsChecklistWizardOpen}/>
            </TabsContent>
             <TabsContent value="photo-report">
                <PhotoReportTab />
            </TabsContent>
            <TabsContent value="details">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <ServiceDetailsCard
                        isReadOnly={isSubmitting}
                        advisors={advisors}
                        technicians={technicians}
                        serviceTypes={serviceTypes}
                        onOpenSignature={handleOpenSignature}
                        isNew={!initialData?.id}
                      />
                     <NextServiceInfoCard isReadOnly={isSubmitting} currentMileage={watch('mileage')}/>
                 </div>
            </TabsContent>
        </Tabs>
       </div>
        <ServiceFormFooter
            formId="service-form"
            onCancel={onCancel}
            onComplete={onComplete}
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
