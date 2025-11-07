

// src/app/(app)/servicios/components/ServiceForm.tsx
"use client";

import React, { useEffect } from 'react';
import { useFormContext, type FieldErrors, type SubmitErrorHandler } from 'react-hook-form';
import type {
  ServiceRecord,
  Vehicle,
  User,
  InventoryItem,
  ServiceTypeRecord,
  InventoryCategory,
  Supplier,
  NextServiceInfo
} from '@/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { ServiceItemsList } from './ServiceItemsList';
import { VehicleSelectionCard } from './VehicleSelectionCard';
import { ServiceDetailsCard } from './ServiceDetailsCard';
import { NextServiceInfoCard } from './NextServiceInfoCard';
import { ReceptionAndDelivery } from './ReceptionAndDelivery';
import { SafetyChecklist } from './SafetyChecklist';
import PhotoReportTab from './PhotoReportTab';
import { ServiceSummary } from './ServiceSummary';
import { ServiceFormFooter } from './ServiceFormFooter';
import { SignatureDialog } from './signature-dialog';
import { useToast } from '@/hooks/use-toast';
import type { ServiceFormValues } from '@/schemas/service-form';
import type { VehicleFormValues } from '@/app/(app)/vehiculos/components/vehicle-form';

// --- (Utils sin cambios) ---

// -------------------- Componente Principal --------------------
export function ServiceForm({
  initialData, vehicles, users, inventoryItems, serviceTypes, categories, suppliers, serviceHistory,
  onSave, onComplete, onVehicleCreated, onCancel, onValidationErrors, mode, activeTab, onTabChange,
  isChecklistWizardOpen, setIsChecklistWizardOpen, onOpenNewVehicleDialog, isNewRecord, onSaveSuccess,
  isReadOnly
}: {
  initialData: ServiceRecord | null;
  vehicles: Vehicle[];
  users: User[];
  inventoryItems: InventoryItem[];
  serviceTypes: ServiceTypeRecord[];
  categories: InventoryCategory[];
  suppliers: Supplier[];
  serviceHistory: ServiceRecord[];
  onSave: (values: ServiceFormValues) => Promise<ServiceRecord | void>;
  onComplete?: () => void; 
  onSaveSuccess?: (s: ServiceRecord) => void;
  onValidationErrors: (errors: FieldErrors<ServiceFormValues>) => void;
  onVehicleCreated?: (data: VehicleFormValues) => Promise<Vehicle>;
  onCancel: () => void;
  mode: 'quote' | 'service';
  activeTab: string;
  onTabChange: (v: string) => void;
  isChecklistWizardOpen: boolean;
  setIsChecklistWizardOpen: (v: boolean) => void;
  onOpenNewVehicleDialog: (vehicle?: Partial<Vehicle> | null) => void;
  isNewRecord: boolean;
  isReadOnly?: boolean; // Prop para controlar el modo solo lectura
}) {
  const { toast } = useToast();
  const [isSignatureDialogOpen, setIsSignatureDialogOpen] = React.useState(false);
  const [signatureType, setSignatureType] = React.useState<'reception' | 'delivery' | 'advisor' | 'technician' | null>(null);

  const { advisors, technicians } = React.useMemo(() => {
    const advisorsList: User[] = [];
    const techniciansList: User[] = [];
    for (const u of users) {
      if ((u as any)?.isArchived) continue;
      const f = (u as any)?.functions || [];
      const role = String((u as any)?.role || "").toLowerCase();
      if (f.includes('asesor') || role.includes('asesor')) advisorsList.push(u);
      if (f.includes('tecnico') || role.includes('tecnico')) techniciansList.push(u);
    }
    return { advisors: advisorsList, technicians: techniciansList };
  }, [users]);

  const methods = useFormContext<ServiceFormValues>();
  const {
    handleSubmit,
    getValues,
    setValue,
    formState: { isSubmitting },
    watch,
  } = methods;

  const watchedStatus = watch('status');
  const serviceItems = watch('serviceItems');

  const totalCost = React.useMemo(() => {
    return (serviceItems || []).reduce((sum, item: any) => sum + (Number(item?.sellingPrice) || 0), 0);
  }, [serviceItems]);

  useEffect(() => {
    setValue("totalCost", totalCost, { shouldDirty: true, shouldValidate: false });
  }, [totalCost, setValue]);

  const handleOpenSignatureDialog = (type: 'reception' | 'delivery' | 'advisor' | 'technician') => {
    setSignatureType(type);
    setIsSignatureDialogOpen(true);
  };

  const handleSaveSignature = (dataUrl: string) => {
    let fieldName: keyof ServiceFormValues | undefined;
    if (signatureType === 'reception') fieldName = 'customerSignatureReception';
    if (signatureType === 'delivery') fieldName = 'customerSignatureDelivery' as any;
    if (signatureType === 'advisor') fieldName = 'serviceAdvisorSignatureDataUrl';
    if (signatureType === 'technician') fieldName = 'technicianSignatureDataUrl';
    if (fieldName) setValue(fieldName as any, dataUrl, { shouldDirty: true, shouldValidate: true });
    setIsSignatureDialogOpen(false);
  };

  return (
    <>
      <form id="service-form" onSubmit={handleSubmit(onSave, onValidationErrors)}>
        <div className="space-y-6 p-1 pb-24 md:pb-6">
          <VehicleSelectionCard
            vehicles={vehicles}
            serviceHistory={serviceHistory}
            onOpenNewVehicleDialog={onOpenNewVehicleDialog}
            initialVehicleId={initialData?.vehicleId}
          />

          <ServiceDetailsCard
            isReadOnly={isReadOnly}
            advisors={advisors}
            technicians={technicians}
            onOpenSignature={handleOpenSignatureDialog}
            isNew={isNewRecord}
          />

          {(watchedStatus === 'En Taller' || watchedStatus === 'Entregado') && (
            <NextServiceInfoCard
              nextServiceInfo={(watch('nextServiceInfo' as any) as NextServiceInfo) || {}}
              onUpdate={(info: NextServiceInfo) => setValue('nextServiceInfo' as any, info, { shouldDirty: true })}
              isSubmitting={isSubmitting}
              currentMileage={watch('vehicle.currentMileage' as any)}
            />
          )}

          <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto">
              <TabsTrigger value="service-items">Trabajos y Resumen</TabsTrigger>
              <TabsTrigger value="reception-delivery">Recepción</TabsTrigger>
              <TabsTrigger value="photo-report">Fotos</TabsTrigger>
              <TabsTrigger value="safety-checklist">Checklist</TabsTrigger>
            </TabsList>

            <TabsContent value="service-items" className="space-y-6 mt-4">
                <Card>
                    <CardContent className="pt-6">
                        <ServiceItemsList
                            inventoryItems={inventoryItems}
                            serviceTypes={serviceTypes}
                            technicians={technicians}
                            mode={mode}
                            onNewInventoryItemCreated={async () => ({} as InventoryItem)}
                            categories={categories}
                            suppliers={suppliers}
                        />
                    </CardContent>
                </Card>
                <ServiceSummary 
                    onOpenValidateDialog={()=>{}} 
                    validatedFolios={{}} 
                />
            </TabsContent>

            <TabsContent value="reception-delivery" className="mt-4">
              <ReceptionAndDelivery 
                part="reception"
                isReadOnly={isReadOnly}
                isEnhancingText={null}
                handleEnhanceText={() => {}}
                onOpenSignature={handleOpenSignatureDialog}
              />
            </TabsContent>
            
            <TabsContent value="photo-report" className="mt-4">
              <PhotoReportTab />
            </TabsContent>
            
            <TabsContent value="safety-checklist" className="mt-4">
                <SafetyChecklist 
                    isWizardOpen={isChecklistWizardOpen}
                    setIsWizardOpen={setIsChecklistWizardOpen}
                />
            </TabsContent>
          </Tabs>
        </div>

        <ServiceFormFooter
          onSaveClick={handleSubmit(onSave, onValidationErrors)}
          onCancel={onCancel}
          onComplete={onComplete ? handleSubmit(onComplete, onValidationErrors) : undefined}
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
