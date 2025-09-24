
// src/app/(app)/servicios/components/ServiceForm.tsx
"use client";

import React, { useEffect } from 'react';
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

// ... (funciones de ayuda como getErrorMessages y normalizeText se mantienen igual)

export function ServiceForm({
  initialData,
  vehicles,
  users, 
  inventoryItems,
  serviceTypes,
  // ... (resto de las props)
  onOpenNewVehicleDialog,
}: ServiceFormProps) {
  const { toast } = useToast();
  const [isSignatureDialogOpen, setIsSignatureDialogOpen] = React.useState(false);
  const [signatureType, setSignatureType] = React.useState<'reception' | 'delivery' | 'advisor' | null>(null);
  const [isEnhancingText, setIsEnhancingText] = React.useState<string | null>(null);

  const { advisors, technicians } = React.useMemo(() => {
    // ... (lógica de memoización para asesores y técnicos se mantiene igual)
  }, [users]);
  
  const methods = useFormContext<ServiceFormValues>();
  const { handleSubmit, getValues, setValue, formState: { isSubmitting, touchedFields }, watch, trigger } = methods;
  
  const watchedStatus = watch('status');

  // Lógica para auto-rellenar la fecha de recepción
  useEffect(() => {
    const subscription = watch((value, { name, type }) => {
      if (name === 'status' && value.status === 'En Taller' && !getValues('receptionDateTime')) {
        setValue('receptionDateTime', new Date().toISOString(), { shouldDirty: true, shouldValidate: true });
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, setValue, getValues]);

  const handleVehicleSelection = (vehicle: Vehicle | null) => {
      setValue('vehicleId', vehicle?.id || '', { shouldDirty: true });
      setValue('customerName', vehicle?.ownerName || '', { shouldDirty: true });
      // Dispara la validación solo para los campos que han sido tocados por el usuario
      if (touchedFields.vehicleId) trigger('vehicleId');
      if (touchedFields.customerName) trigger('customerName');
  };

  const handleFormSubmit = async (values: ServiceFormValues) => {
    const savedService = await onSave(values);
    if (savedService && onSaveSuccess) {
      onSaveSuccess(savedService);
    }
  };
  
  // ... (resto de los manejadores: handleCompleteClick, onValidationErrors, etc., se mantienen igual)

  return (
    <>
      <form id="service-form" onSubmit={handleSubmit(handleFormSubmit, onValidationErrors)}>
       <div className="space-y-6 p-1 pb-24 md:pb-6">
         <VehicleSelectionCard
            vehicles={vehicles}
            onVehicleSelect={handleVehicleSelection} // Usar el nuevo manejador
            serviceHistory={serviceHistory || []}
            onOpenNewVehicleDialog={onOpenNewVehicleDialog}
            initialVehicleId={initialData?.vehicleId}
        />
        {/* ... (resto del JSX se mantiene igual) */}
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
