// src/app/(app)/servicios/components/ServiceForm.tsx
"use client";

import React, { useEffect } from 'react';
import { useFormContext, type FieldErrors } from 'react-hook-form';
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

// -------------------- Utils --------------------
const getErrorMessages = (errors: FieldErrors<ServiceFormValues>): string => {
  const messages: string[] = [];
  const parseErrors = (errorObj: any, prefix = '') => {
    for (const key in errorObj) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      const error = (errorObj as any)[key];
      if (error && error.message) messages.push(`${fullKey}: ${error.message}`);
      else if (typeof error === 'object' && error !== null) parseErrors(error, fullKey);
    }
  };
  parseErrors(errors);
  if (messages.length === 0) return "Error de validación desconocido.";
  return `Hay errores en el formulario: ${messages.join('; ')}.`;
};

const normalizeText = (text: string | null | undefined): string => {
  if (!text) return "";
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

// Números robustos ($, comas, etc.)
const toNumber = (v: any) =>
  typeof v === 'number'
    ? (Number.isFinite(v) ? v : 0)
    : typeof v === 'string'
      ? (Number(v.replace(/[^\d.-]/g, '')) || 0)
      : 0;

// --- Normalización de STATUS ---
type CanonStatus = 'Cotizacion' | 'En Taller' | 'Agendado' | 'Entregado' | 'Cancelado';
function canonicalStatus(input?: string | null): CanonStatus | null {
  const s = normalizeText(input || "");
  if (!s) return null;
  if (s.includes('cotiz')) return 'Cotizacion';
  if (s.includes('taller')) return 'En Taller';
  if (s.includes('agenda')) return 'Agendado';
  if (s.includes('entreg')) return 'Entregado';
  if (s.includes('cancel')) return 'Cancelado';
  return null;
}

// -------------------- Componente Principal --------------------
export function ServiceForm({
  initialData, vehicles, users, inventoryItems, serviceTypes, categories, suppliers, serviceHistory,
  onSave, onComplete, onVehicleCreated, onCancel, mode, activeTab, onTabChange,
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
      const normalizedRole = normalizeText(user?.role);
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

  const totalCost = React.useMemo(() => {
    return (serviceItems || []).reduce((sum, item: any) => {
      const qty = toNumber(item?.quantity ?? 1);
      const price = toNumber(item?.sellingPrice);
      const discount = toNumber(item?.discount);
      const line = Math.max(price * (qty || 1) - discount, 0);
      return sum + line;
    }, 0);
  }, [serviceItems]);

  useEffect(() => {
    setValue("total", totalCost, { shouldDirty: true, shouldValidate: false });
    // @ts-ignore
    setValue("Total", totalCost as any, { shouldDirty: true, shouldValidate: false });
  }, [totalCost, setValue]);

  useEffect(() => {
    const current = getValues('status') as string | undefined;
    let next: CanonStatus | null = canonicalStatus(current);
    if (!next) next = mode === 'quote' ? 'Cotizacion' : 'En Taller';

    if (current !== next) {
      setValue('status', next as any, { shouldDirty: !current, shouldValidate: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, initialData?.id]);

  useEffect(() => {
    const subscription = watch((value, { name }) => {
      if (name === 'status') {
        const canon = canonicalStatus(value.status) || (mode === 'quote' ? 'Cotizacion' : 'En Taller');
        if (value.status !== canon) {
          setValue('status', canon as any, { shouldDirty: true, shouldValidate: true });
        }
        if (canon === 'En Taller' && !value.receptionDateTime) {
          setValue('receptionDateTime', new Date() as any, { shouldDirty: true, shouldValidate: true });
        }
        if (canon === 'Entregado' && !value.deliveryDateTime) {
          setValue('deliveryDateTime', new Date() as any, { shouldDirty: true, shouldValidate: true });
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, setValue, mode]);

  const handleVehicleSelection = (vehicle: Vehicle | null) => {
    setValue('vehicleId', vehicle?.id || '', { shouldDirty: true });
    setValue('customerName', vehicle?.ownerName || '', { shouldDirty: true });
    if (touchedFields.vehicleId) trigger('vehicleId');
    if (touchedFields.customerName) trigger('customerName');
  };

  const onValidationErrors = (errors: FieldErrors<ServiceFormValues>) => {
    const description = getErrorMessages(errors);
    toast({ title: "Error de Validación", description, variant: "destructive" });
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
            isReadOnly={false}
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
                    categories={categories}
                    suppliers={suppliers}
                    technicians={technicians}
                    mode={mode}
                    onNewInventoryItemCreated={onVehicleCreated ? (async () => ({} as InventoryItem)) : async () => ({} as InventoryItem)}
                    handleEnhanceText={() => {}}
                    isEnhancingText={false}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <ServiceSummary
                    totalAmount={totalCost}
                    onOpenValidateDialog={() => {}}
                    validatedFolios={{}}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="reception-delivery" className="space-y-6 mt-4">
              <ReceptionAndDelivery
                part="reception"
                onOpenSignature={handleOpenSignatureDialog}
                handleEnhanceText={() => {}}
                isEnhancingText={false}
              />
              <ReceptionAndDelivery
                part="delivery"
                onOpenSignature={handleOpenSignatureDialog}
                handleEnhanceText={() => {}}
                isEnhancingText={false}
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
          formId="service-form"
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
