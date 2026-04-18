// src/app/(app)/servicios/components/editor/service-editor.tsx
"use client";

import React, { useState } from "react";
import { useFormContext, type FieldErrors } from "react-hook-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, Settings, ClipboardList, Wrench, User as UserIcon } from "lucide-react";
import { FormField, FormItem } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type {
  ServiceRecord,
  Vehicle,
  User,
  InventoryItem,
  ServiceTypeRecord,
  InventoryCategory,
  Supplier,
  NextServiceInfo,
} from "@/types";
import type { ServiceFormValues } from "@/schemas/service-form";

import { VehicleInfoCard } from "../cards/vehicle-info-card";
import { MileageServiceCard } from "../cards/mileage-service-card";
import { StatusControlsCard } from "../cards/status-controls-card";
import { ServiceItemsEditor } from "./service-items-editor";
import { PaymentSummary } from "./payment-summary";
import { SignatureDialog } from "../dialogs/signature-dialog";
import { cn } from "@/lib/utils";

// Lazy load tabs that may be heavy
const TabReceptionDelivery = React.lazy(() =>
  import("../tabs/tab-reception-delivery").then((m) => ({ default: m.TabReceptionDelivery }))
);
const TabInspection = React.lazy(() =>
  import("../tabs/tab-inspection").then((m) => ({ default: m.TabInspection }))
);

export interface ServiceEditorProps {
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
  onCancel: () => void;
  onValidationErrors: (errors: FieldErrors<ServiceFormValues>) => void;
  onOpenNewVehicleDialog: (vehicle?: Partial<Vehicle> | null) => void;
  isReadOnly?: boolean;
  currentUser?: User | null;
  activeTab?: string;
  onTabChange?: (v: string) => void;
  isChecklistWizardOpen?: boolean;
  setIsChecklistWizardOpen?: (v: boolean) => void;
}

export function ServiceEditor({
  initialData,
  vehicles,
  users,
  inventoryItems,
  serviceTypes,
  categories,
  suppliers,
  serviceHistory,
  onSave,
  onComplete,
  onCancel,
  onValidationErrors,
  onOpenNewVehicleDialog,
  isReadOnly,
  currentUser,
  activeTab = "jobs",
  onTabChange,
  isChecklistWizardOpen = false,
  setIsChecklistWizardOpen,
}: ServiceEditorProps) {
  const { handleSubmit, watch, setValue, control, formState: { isSubmitting } } = useFormContext<ServiceFormValues>();

  const [signatureOpen, setSignatureOpen] = useState(false);
  const [signatureType, setSignatureType] = useState<"reception" | "delivery" | "advisor" | "technician" | null>(null);

  const serviceItems = watch("serviceItems");
  const totalCost = React.useMemo(
    () => (serviceItems || []).reduce((sum: number, item: any) => sum + (Number(item?.sellingPrice) || 0), 0),
    [serviceItems]
  );

  // Show all active users in both selects.
  // Deduplicate by ID to prevent React "duplicate key" warnings.
  const activeUsers = React.useMemo(() => {
    const seen = new Map<string, User>();
    for (const u of users) {
      if (!seen.has(u.id)) seen.set(u.id, u);
    }
    return Array.from(seen.values());
  }, [users]);
  
  const currentAdvisorId = watch("serviceAdvisorId");
  const currentAdvisorName = watch("serviceAdvisorName");
  const advisors = React.useMemo(() => {
    const list = [...activeUsers];
    if (currentAdvisorId && !list.some((u) => u.id === currentAdvisorId)) {
      list.push({ id: currentAdvisorId, name: currentAdvisorName || "Usuario Eliminado" } as User);
    }
    return list;
  }, [activeUsers, currentAdvisorId, currentAdvisorName]);

  const currentTechId = watch("technicianId");
  const currentTechName = watch("technicianName");
  const technicians = React.useMemo(() => {
    const list = [...activeUsers];
    if (currentTechId && !list.some((u) => u.id === currentTechId)) {
      list.push({ id: currentTechId, name: currentTechName || "Usuario Eliminado" } as User);
    }
    return list;
  }, [activeUsers, currentTechId, currentTechName]);

  const handleOpenSig = (type: typeof signatureType) => {
    setSignatureType(type);
    setSignatureOpen(true);
  };

  const handleSaveSig = (dataUrl: string) => {
    const map: Record<string, string> = {
      reception: "customerSignatureReception",
      delivery: "deliverySignatureDataUrl",
      advisor: "serviceAdvisorSignatureDataUrl",
      technician: "technicianSignatureDataUrl",
    };
    const field = signatureType ? map[signatureType] : null;
    if (field) setValue(field as any, dataUrl, { shouldDirty: true });
    setSignatureOpen(false);
  };

  return (
    <>
      <form id="service-form" onSubmit={handleSubmit(onSave, onValidationErrors)}>
        {/* ── STICKY HEADER ─────────────────────────────────────── */}
        <div
          className={cn(
            "sticky top-16 z-40 py-4 mb-6",
            "flex flex-col xl:flex-row gap-4 items-stretch",
            "bg-background/95 backdrop-blur-md border-b shadow-sm sm:-mx-6 sm:px-6"
          )}
        >
          {/* Card 1: Vehicle + Mileage */}
          <Card className="flex-1 shadow-sm border border-border/50 bg-card overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border/30 h-full">
              {/* Left: vehicle info */}
              <div className="p-4 bg-card flex items-center">
                <div className="w-full">
                  <VehicleInfoCard
                    vehicles={vehicles}
                    serviceHistory={serviceHistory}
                    onEditVehicle={(v) => onOpenNewVehicleDialog(v)}
                    initialVehicleId={initialData?.vehicleId}
                  />
                </div>
              </div>
              {/* Right: km + next service */}
              <div className="p-4 bg-card flex items-center">
                <div className="w-full">
                  <MileageServiceCard
                    nextServiceInfo={(watch("nextServiceInfo" as any) as NextServiceInfo) || {}}
                    onUpdate={(info: NextServiceInfo) =>
                      setValue("nextServiceInfo" as any, info, { shouldDirty: true })
                    }
                    currentMileage={watch("mileage" as any)}
                    onUpdateCurrentMileage={(m) =>
                      setValue("mileage", m, { shouldValidate: true, shouldDirty: true })
                    }
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Card 2: Status + Advisor/Technician compact row */}
          <Card className="w-full xl:w-[420px] shrink-0 shadow-sm border border-border/50 bg-card p-4">
            <StatusControlsCard
              onSave={() => handleSubmit(onSave, onValidationErrors)()}
              onCancel={onCancel}
              isSubmitting={isSubmitting}
              isReadOnly={isReadOnly}
            />
          </Card>
        </div>

        {/* ── TABS ───────────────────────────────────────────────── */}
        <div className="pb-24">
          <Tabs
            value={activeTab}
            onValueChange={onTabChange}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-3 md:w-fit h-auto mb-6 p-1 bg-muted/50 rounded-xl relative z-10 shadow-sm border border-border/50">
              <TabsTrigger value="jobs" className="rounded-lg data-[state=active]:shadow-sm gap-1.5">
                <Wrench className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">Trabajos</span>
              </TabsTrigger>
              <TabsTrigger value="reception-delivery" className="rounded-lg data-[state=active]:shadow-sm gap-1.5">
                <ClipboardList className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">Recepción y Entrega</span>
              </TabsTrigger>
              <TabsTrigger value="inspection" className="rounded-lg data-[state=active]:shadow-sm gap-1.5">
                <Settings className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">Servicio Mecánico</span>
              </TabsTrigger>
            </TabsList>

            {/* ── TAB: TRABAJOS ── */}
            <TabsContent value="jobs" className="space-y-6">

              {/* Advisor + Technician selectors */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/20 p-4 rounded-xl border border-border/50">
                <FormField
                  control={control}
                  name="serviceAdvisorId"
                  render={({ field }) => (
                    <FormItem>
                      <Label className="flex items-center gap-1.5">
                        <UserIcon className="h-4 w-4 text-muted-foreground" /> Asesor de Servicio
                      </Label>
                      <Select
                        key={`advisor-${field.value || "none"}`}
                        defaultValue={field.value || undefined}
                        onValueChange={(val) => {
                          const u = advisors.find((a) => a.id === val);
                          field.onChange(val);
                          setValue("serviceAdvisorName", u?.name ?? "", { shouldDirty: true });
                          setValue("serviceAdvisorSignatureDataUrl", (u as any)?.signatureDataUrl ?? null, { shouldDirty: true });
                        }}
                      >
                        <SelectTrigger className="bg-card shadow-sm">
                          <SelectValue placeholder="Seleccione asesor..." />
                        </SelectTrigger>
                        <SelectContent>
                          {advisors.map((a) => (
                            <SelectItem key={a.id} value={a.id}>
                              {a.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                <FormField
                  control={control}
                  name="technicianId"
                  render={({ field }) => (
                    <FormItem>
                      <Label className="flex items-center gap-1.5">
                        <Wrench className="h-4 w-4 text-muted-foreground" /> Técnico Asignado
                      </Label>
                      <Select
                        key={`tech-${field.value || "none"}`}
                        defaultValue={field.value || undefined}
                        onValueChange={(val) => {
                          const u = technicians.find((t) => t.id === val);
                          field.onChange(val);
                          setValue("technicianName", u?.name ?? "", { shouldDirty: true });
                          setValue("technicianSignatureDataUrl", (u as any)?.signatureDataUrl ?? null, { shouldDirty: true });
                        }}
                      >
                        <SelectTrigger className="bg-card shadow-sm">
                          <SelectValue placeholder="Seleccione técnico..." />
                        </SelectTrigger>
                        <SelectContent>
                          {technicians.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </div>

              {/* Items list + summary */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                <div className="xl:col-span-8">
                  <ServiceItemsEditor
                    inventoryItems={inventoryItems}
                    serviceTypes={serviceTypes}
                    technicians={technicians}
                    mode="service"
                    onNewInventoryItemCreated={async () => ({} as InventoryItem)}
                    categories={categories}
                    suppliers={suppliers}
                    isReadOnly={isReadOnly}
                  />
                </div>
                <div className="xl:col-span-4 sticky top-48 space-y-4">
                  <PaymentSummary
                    onOpenValidateDialog={() => {}}
                    validatedFolios={{}}
                  />

                  {!!initialData?.id &&
                    onComplete &&
                    watch("status") !== "Entregado" &&
                    watch("status") !== "Cancelado" &&
                    !isReadOnly && (
                      <Button
                        type="button"
                        onClick={onComplete}
                        disabled={isSubmitting || totalCost <= 0 || watch("status") === "Cotizacion"}
                        className="w-full bg-blue-600 hover:bg-blue-700 shadow-md h-12 text-base font-semibold"
                        title={
                          watch("status") === "Cotizacion"
                            ? "No puedes entregar un servicio en estado Cotización."
                            : totalCost <= 0
                              ? "Agrega al menos un trabajo con importe > $0 para cobrar."
                              : "Entregar y cobrar este servicio"
                        }
                      >
                        <DollarSign className="mr-2 h-5 w-5" /> Entregar y Cobrar
                      </Button>
                    )}
                </div>
              </div>
            </TabsContent>

            {/* ── TAB: RECEPCION Y ENTREGA ── */}
            <TabsContent value="reception-delivery" className="space-y-6">
              <React.Suspense fallback={<div className="animate-pulse h-64 bg-muted rounded-xl" />}>
                <TabReceptionDelivery
                  isReadOnly={isReadOnly}
                  onOpenSignature={handleOpenSig}
                />
              </React.Suspense>
            </TabsContent>

            {/* ── TAB: INSPECCION ── */}
            <TabsContent value="inspection" className="space-y-6">
              <React.Suspense fallback={<div className="animate-pulse h-64 bg-muted rounded-xl" />}>
                <TabInspection
                  isWizardOpen={isChecklistWizardOpen}
                  setIsWizardOpen={setIsChecklistWizardOpen ?? (() => {})}
                />
              </React.Suspense>
            </TabsContent>
          </Tabs>
        </div>
      </form>

      <SignatureDialog
        open={signatureOpen}
        onOpenChange={setSignatureOpen}
        onSave={handleSaveSig}
        title={
          signatureType === "reception"
            ? "Firma de Recepción"
            : signatureType === "delivery"
            ? "Firma de Entrega"
            : signatureType === "advisor"
            ? "Firma del Asesor"
            : "Firma del Técnico"
        }
      />
    </>
  );
}
