// src/app/(app)/servicios/components/ServiceForm.tsx
"use client";

import React, { useEffect } from 'react';
import { useFormContext, type FieldErrors } from 'react-hook-form';
import type { ServiceRecord, Vehicle, User, InventoryItem, ServiceTypeRecord, InventoryCategory, Supplier, NextServiceInfo } from '@/types';
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

// --- Utils ---
const getErrorMessages = (errors: FieldErrors<ServiceFormValues>): string => {
  const messages: string[] = [];
  const parseErrors = (errorObj: any, prefix = '') => {
    for (const key in errorObj) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      const error = errorObj[key];
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

// --- Componente Principal ---
export function ServiceForm({
  initialData, vehicles, users, inventoryItems, serviceTypes, categories, suppliers, serviceHistory,
  onSave, onSaveSuccess, onComplete, onVehicleCreated, onCancel, mode, activeTab, onTabChange,
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
  onSaveSuccess?: (saved: ServiceRecord) => void;
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
  const { handleSubmit, getValues, setValue, formState: { isSubmitting, touchedFields }, watch, trigger } = methods;

  const watchedStatus = watch('status');
  const selectedVehicleId = watch('vehicleId');
  const serviceItems = watch('serviceItems');
  const nextServiceInfo = watch('nextServiceInfo');

  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);
  const currentMileage = selectedVehicle?.mileage;

  const totalCost = React.useMemo(() => {
    return (serviceItems || []).reduce((sum, item) => sum + (Number(item.sellingPrice) || 0), 0);
  }, [serviceItems]);
  
  useEffect(() => {
    // Sincroniza el total a nivel de documento para guardarlo/compartirlo
    setValue("total", totalCost, { shouldDirty: true, shouldValidate: false });
    // Si en otros lados leen "Total" (mayúscula), mantenlo también:
    // @ts-ignore
    setValue("Total", totalCost as any, { shouldDirty: true, shouldValidate: false });
  }, [totalCost, setValue]);


  // 1) Asegura valor por defecto y normaliza status al montar/cambiar modo/initialData
  useEffect(() => {
    const current = getValues('status') as string | undefined;
    let next: CanonStatus | null = canonicalStatus(current);

    if (!next) {
      next = mode === 'quote' ? 'Cotizacion' : 'En Taller';
    }

    if (current !== next) {
      setValue('status', next as any, { shouldDirty: !current, shouldValidate: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, initialData?.id]);

  // 2) Normaliza automáticamente cualquier cambio del usuario y sella fechas
  useEffect(() => {
    const subscription = watch((value, { name }) => {
      if (name === 'status') {
        const nowIso = new Date().toISOString();
        const canon = canonicalStatus(value.status) || (mode === 'quote' ? 'Cotizacion' : 'En Taller');

        if (value.status !== canon) {
          setValue('status', canon as any, { shouldDirty: true, shouldValidate: true });
        }

        if (canon === 'En Taller' && !getValues('receptionDateTime')) {
          setValue('receptionDateTime', nowIso, { shouldDirty: true, shouldValidate: true });
        }
        if (canon === 'Entregado' && !getValues('deliveryDateTime')) {
          setValue('deliveryDateTime', nowIso, { shouldDirty: true, shouldValidate: true });
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, setValue, getValues, mode]);

  const handleVehicleSelection = (vehicle: Vehicle | null) => {
    setValue('vehicleId', vehicle?.id || '', { shouldDirty: true });
    setValue('customerName', vehicle?.ownerName || '', { shouldDirty: true });
    if (touchedFields.vehicleId) trigger('vehicleId');
    if (touchedFields.customerName) trigger('customerName');
  };

  const handleFormSubmit = async (values: ServiceFormValues) => {
    const savedService = await onSave(values);
    if (savedService && onSaveSuccess) onSaveSuccess(savedService);
  };

  const onValidationErrors = (errors: FieldErrors<ServiceFormValues>) => {
    const description = getErrorMessages(errors);
    toast({ title: "Error de Validación", description, variant: "destructive" });
  };

  const handleCompleteClick = () => {
    if (onComplete) onComplete(getValues());
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
      <form id="service-form" onSubmit={handleSubmit(handleFormSubmit, onValidationErrors)}>
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
              nextServiceInfo={nextServiceInfo || {}} // Pass empty object if undefined
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
                    isEnhancingText={null}
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
                isEnhancingText={null}
              />
              <ReceptionAndDelivery
                part="delivery"
                onOpenSignature={handleOpenSignatureDialog}
                handleEnhanceText={() => {}}
                isEnhancingText={null}
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
