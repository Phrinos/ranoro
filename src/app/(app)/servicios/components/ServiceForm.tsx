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
import { ServiceMobileBar } from './ServiceMobileBar';

// -------------------- Utils --------------------
function materializeErrors<T extends FieldErrors<any>>(e: T) {
  try {
    return JSON.parse(JSON.stringify(e));
  } catch {
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
      if (typeof val === "object") walk(val);
    }
  };
  walk(errs);
  return Array.from(new Set(out)).filter(Boolean);
}

const hasTechnician = (val: Partial<ServiceRecord> | ServiceFormValues) => {
  const tid =
    (val as any).technicianId ??
    (val as any).technician_id ??
    (val as any).technician?.id ??
    null;

  if (typeof tid === 'string') return tid.trim().length > 0;
  return Boolean(tid);
};

// -------------------- Componente Principal --------------------
export function ServiceForm({
  initialData, vehicles, users, inventoryItems, serviceTypes, categories, suppliers, serviceHistory,
  onSave, onComplete, onVehicleCreated, onCancel, onValidationErrors, mode, activeTab, onTabChange,
  isChecklistWizardOpen, setIsChecklistWizardOpen, onOpenNewVehicleDialog,
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
  onComplete?: (values: ServiceFormValues) => void; 
  onValidationErrors: (errors: FieldErrors<ServiceFormValues>) => void;
  onVehicleCreated?: (data: VehicleFormValues) => Promise<Vehicle>;
  onCancel: () => void;
  mode: 'quote' | 'service';
  activeTab: string;
  onTabChange: (v: string) => void;
  isChecklistWizardOpen: boolean;
  setIsChecklistWizardOpen: (v: boolean) => void;
  onOpenNewVehicleDialog: () => void;
}) {
  const { toast } = useToast();
  const [isSignatureDialogOpen, setIsSignatureDialogOpen] = React.useState(false);
  const [signatureType, setSignatureType] = React.useState<'reception' | 'delivery' | 'advisor' | null>(null);

  // Advisors / Technicians
  const { advisors, technicians } = React.useMemo(() => {
    const advisorsList: User[] = [];
    const techniciansList: User[] = [];
    const safeUsers = Array.isArray(users) ? users : [];
    for (const user of safeUsers) {
      // @ts-ignore
      if (user?.isArchived) continue;
      // @ts-ignore
      const userFunctions = Array.isArray(user?.functions) ? user.functions : [];
      // @ts-ignore
      const normalizedRole = user?.role?.toLowerCase() || '';
      if (userFunctions.includes('asesor') || normalizedRole.includes('asesor')) advisorsList.push(user);
      if (userFunctions.includes('tecnico') || normalizedRole.includes('tecnico')) techniciansList.push(user);
    }
    return { advisors: [...new Set(advisorsList)], technicians: [...new Set(techniciansList)] };
  }, [users]);

  const methods = useFormContext<ServiceFormValues>();
  const {
    handleSubmit,
    getValues,
    setValue,
    formState: { isSubmitting, touchedFields },
    watch,
    trigger,
  } = methods;

  const watchedStatus = watch('status');
  const selectedVehicleId = watch('vehicleId');
  const serviceItems = watch('serviceItems');
  const nextServiceInfo = watch('nextServiceInfo');

  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);
  const isReadOnly = initialData?.status === 'Entregado' || initialData?.status === 'Cancelado';

  const totalCost = React.useMemo(() => {
    return (serviceItems || []).reduce((sum, item: any) => sum + (Number(item?.sellingPrice) || 0), 0);
  }, [serviceItems]);

  useEffect(() => {
    setValue("total", totalCost, { shouldDirty: true, shouldValidate: false });
    // @ts-ignore
    setValue("Total", totalCost, { shouldDirty: true, shouldValidate: false });
  }, [totalCost, setValue]);

  const handleVehicleSelection = (vehicle: Vehicle | null) => {
    setValue('vehicleId', vehicle?.id || '', { shouldDirty: true });
    setValue('customerName', vehicle?.ownerName || '', { shouldDirty: true });
    if (touchedFields.vehicleId) trigger('vehicleId');
    if (touchedFields.customerName) trigger('customerName');
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
    if (fieldName) setValue(fieldName, dataUrl, { shouldDirty: true, shouldValidate: true });
    setIsSignatureDialogOpen(false);
  };

  const handleUpdateNextService = (info: NextServiceInfo) => {
    setValue('nextServiceInfo', info, { shouldDirty: true });
  };

  return (
    <>
      <form id="service-form" onSubmit={handleSubmit(onSave, onValidationErrors)}>
        <div className="space-y-6 p-1 pb-24 md:pb-6">
          <VehicleSelectionCard
            vehicles={vehicles}
            onVehicleSelect={handleVehicleSelection}
            serviceHistory={serviceHistory}
            onOpenNewVehicleDialog={onOpenNewVehicleDialog}
            initialVehicleId={initialData?.vehicleId}
          />

          <ServiceDetailsCard
            isReadOnly={isReadOnly}
            advisors={advisors}
            technicians={technicians}
            serviceTypes={serviceTypes}
            onOpenSignature={handleOpenSignatureDialog}
            isNew={!initialData?.id}
          />

          {(watchedStatus === 'En Taller' || watchedStatus === 'Entregado') && (
            <NextServiceInfoCard
              nextServiceInfo={nextServiceInfo || {}}
              onUpdate={handleUpdateNextService}
              isSubmitting={isSubmitting}
              currentMileage={selectedVehicle?.currentMileage}
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
                    onNewInventoryItemCreated={onVehicleCreated ? (async () => ({} as InventoryItem)) : async () => ({} as InventoryItem)}
                    handleEnhanceText={() => {}}
                    isEnhancingText={false}
                    isReadOnly={isReadOnly}
                  />
                </CardContent>
              </Card>

              {(watchedStatus === 'En Taller' || watchedStatus === 'Entregado') && (
                <Card>
                  <CardContent className="pt-6">
                    <ServiceSummary
                      totalAmount={totalCost}
                      onOpenValidateDialog={() => {}}
                      validatedFolios={{}}
                    />
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="reception-delivery" className="space-y-6 mt-4">
              <ReceptionAndDelivery
                part="reception"
                onOpenSignature={handleOpenSignatureDialog}
                handleEnhanceText={() => {}}
                isEnhancingText={false}
                isReadOnly={isReadOnly}
              />
              <ReceptionAndDelivery
                part="delivery"
                onOpenSignature={handleOpenSignatureDialog}
                handleEnhanceText={() => {}}
                isEnhancingText={false}
                isReadOnly={isReadOnly}
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
          onComplete={
            onComplete
              ? () => {
                  const values = getValues();
                  onComplete(values);
                }
              : undefined
          }
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
