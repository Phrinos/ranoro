// src/app/(app)/servicios/[id]/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useRouter, useParams } from "next/navigation";
import {
  serviceService,
  inventoryService,
  adminService,
} from "@/lib/services";
import { Loader2, Ban, ArrowLeft, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Textarea } from "@/components/ui/textarea";
import { ServiceEditor } from "../components/editor/service-editor";
import type {
  ServiceRecord,
  Vehicle,
  User,
  InventoryItem,
  ServiceTypeRecord,
  InventoryCategory,
  Supplier,
} from "@/types";
import { VehicleDialog } from "@/app/(app)/vehiculos/components/vehicle-dialog";
import type { VehicleFormValues } from "@/schemas/vehicle-form-schema";
import { serviceFormSchema, type ServiceFormValues } from "@/schemas/service-form";
import { PageHeader } from "@/components/page-header";
import { AUTH_USER_LOCALSTORAGE_KEY } from "@/lib/placeholder-data";
import { Button } from "@/components/ui/button";
import {
  FormProvider,
  useForm,
  type SubmitErrorHandler,
  type Resolver,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { doc, collection, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebaseClient";
import { TicketPreviewModal } from "@/app/(app)/ticket/components";
import { PhotoReportModal } from "@/app/(app)/servicios/components/PhotoReportModal";
import { PaymentDetailsDialog } from "@/components/shared/PaymentDetailsDialog";
import { formatCurrency } from "@/lib/utils";
import { useAutosave } from "@/hooks/useAutosave";

// ── Normalization helpers (unchanged from old page) ──────────────────────────

function normalizeAdvisor(record: any, users: User[]): Partial<ServiceFormValues> {
  const id = record?.serviceAdvisorId ?? "";
  const user = users.find((u) => u.id === id);
  return {
    serviceAdvisorId: id,
    serviceAdvisorName: record?.serviceAdvisorName || user?.name || "",
    serviceAdvisorSignatureDataUrl:
      record?.serviceAdvisorSignatureDataUrl || user?.signatureDataUrl || null,
  };
}

function normalizeTechnician(record: any, users: User[]): Partial<ServiceFormValues> {
  const id = record?.technicianId ?? "";
  const user = users.find((u) => u.id === id);
  return {
    technicianId: id,
    technicianName: record?.technicianName || user?.name || "",
    technicianSignatureDataUrl:
      record?.technicianSignatureDataUrl || user?.signatureDataUrl || null,
  };
}

function normalizeDates(record: any): Partial<ServiceFormValues> {
  return {
    serviceDate: record?.serviceDate ? new Date(record.serviceDate) : new Date(),
    appointmentDateTime: record?.appointmentDateTime
      ? new Date(record.appointmentDateTime)
      : undefined,
    receptionDateTime: record?.receptionDateTime
      ? new Date(record.receptionDateTime)
      : undefined,
    deliveryDateTime: record?.deliveryDateTime
      ? new Date(record.deliveryDateTime)
      : undefined,
  } as Partial<ServiceFormValues>;
}

function normalizeForForm(record: any, users: User[]): ServiceFormValues {
  const serviceItems = (Array.isArray(record.serviceItems) ? record.serviceItems : []).map(
    (item: any) => ({
      ...item,
      name: item.serviceType || item.name,
      itemName: item.name || item.itemName,
      suppliesUsed: (item.suppliesUsed ?? []).map((s: any) => ({
        ...s,
        unitType: s?.unitType ?? undefined,
      })),
    })
  );

  const mileageValue =
    record.mileage !== undefined &&
    record.mileage !== null &&
    !isNaN(Number(record.mileage))
      ? Number(record.mileage)
      : null;

  return {
    ...record,
    ...normalizeAdvisor(record, users),
    ...normalizeTechnician(record, users),
    ...normalizeDates(record),
    serviceItems,
    status: record.status ?? "Cotizacion",
    vehicleId: record.vehicleId ?? "",
    mileage: mileageValue,
  } as ServiceFormValues;
}

// ──────────────────────────────────────────────────────────────────────────────

export default function ServicioEditorPage() {
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const serviceId = params.id as string | undefined;
  const isEditMode = serviceId !== "nuevo";

  // ── State ──
  const [initialData, setInitialData] = useState<ServiceRecord | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceTypeRecord[]>([]);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [serviceHistory, setServiceHistory] = useState<ServiceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [recordForPreview, setRecordForPreview] = useState<ServiceRecord | null>(null);
  const [activeTab, setActiveTab] = useState("jobs");
  const [isChecklistWizardOpen, setIsChecklistWizardOpen] = useState(false);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [isVehicleFormDialogOpen, setIsVehicleFormDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Partial<Vehicle> | null>(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [serviceToComplete, setServiceToComplete] = useState<ServiceRecord | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [cancellationReason, setCancellationReason] = useState("");

  const redirectUrl = useRef<string | null>(null);
  const hydratedRef = useRef<string | null>(null);

  // ── Form ──
  const methods = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema) as Resolver<ServiceFormValues, any>,
    mode: "onSubmit",
    reValidateMode: "onChange",
    shouldUnregister: false,
    defaultValues: {
      status: "Cotizacion",
      vehicleId: "",
      serviceAdvisorId: "",
      technicianId: "",
      serviceItems: [],
      serviceDate: new Date(),
      photoReports: [],
      mileage: null,
    },
  });

  // ── Hydrate form when data arrives ──
  // Reset whenever BOTH initialData and users are available.
  // We track a composite key so that we re-reset when users arrive after initialData.
  const lastHydrationKey = useRef<string>("");

  useEffect(() => {
    if (!initialData?.id) return;
    // Build a key that changes when meaningful data changes
    const key = `${initialData.id}|u=${users.length}`;
    if (lastHydrationKey.current === key) return;

    const normalized = normalizeForForm(initialData, users);
    methods.reset(normalized);
    lastHydrationKey.current = key;
    hydratedRef.current = initialData.id;
  }, [initialData, users, methods]);

  // ── Sync advisor name when id changes ──
  const advisorId = methods.watch("serviceAdvisorId");
  useEffect(() => {
    if (!users.length || !advisorId) return;
    const u = users.find((x) => x.id === advisorId);
    if (u) {
      methods.setValue("serviceAdvisorName", u.name ?? "", { shouldDirty: false });
      methods.setValue("serviceAdvisorSignatureDataUrl", u.signatureDataUrl ?? null, {
        shouldDirty: false,
      });
    }
  }, [advisorId, users, methods]);

  // ── Data fetching ──
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const authUserStr = localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY);
      const user = authUserStr ? JSON.parse(authUserStr) : null;
      setCurrentUser(user);

      try {
        const results = await Promise.allSettled([
          inventoryService.onVehiclesUpdatePromise(),
          adminService.onUsersUpdatePromise(),
          inventoryService.onItemsUpdatePromise(),
          inventoryService.onServiceTypesUpdatePromise(),
          inventoryService.onCategoriesUpdatePromise(),
          inventoryService.onSuppliersUpdatePromise(),
          serviceService.onServicesUpdatePromise(),
        ]);

        const getVal = (r: PromiseSettledResult<any>, def: any = []) =>
          r.status === "fulfilled" ? r.value : def;

        setVehicles(getVal(results[0]));
        setUsers(getVal(results[1]));
        setInventoryItems(getVal(results[2]));
        setServiceTypes(getVal(results[3]));
        setCategories(getVal(results[4]));
        setSuppliers(getVal(results[5]));
        setServiceHistory(getVal(results[6]));

        if (isEditMode && serviceId) {
          const serviceData = await serviceService.getDocById("serviceRecords", serviceId);
          if (!serviceData) setNotFound(true);
          else setInitialData(serviceData);
        } else if (user) {
          const newId = doc(collection(db, "serviceRecords")).id;
          const draft = {
            id: newId,
            status: "Cotizacion",
            serviceDate: new Date(),
            vehicleId: "",
            serviceItems: [{ id: "item_1", name: "", sellingPrice: undefined, suppliesUsed: [] }],
            serviceAdvisorId: user.id,
            serviceAdvisorName: user.name,
            serviceAdvisorSignatureDataUrl: user.signatureDataUrl ?? null,
            photoReports: [],
          };
          setInitialData(draft as any);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast({ title: "Error al cargar datos", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [serviceId, isEditMode]);

  // ── Share dialog ──
  const handleShowShareDialog = useCallback(
    async (service: ServiceRecord, redirect?: string) => {
      setRecordForPreview(service);
      setIsShareDialogOpen(true);
      if (redirect) redirectUrl.current = redirect;

      if (!service.publicId) {
        try {
          const newPublicId = Math.random().toString(36).slice(2, 18);
          await serviceService.updateService(service.id, { publicId: newPublicId });
          setRecordForPreview((prev) =>
            prev && prev.id === service.id ? { ...prev, publicId: newPublicId } : prev
          );
        } catch {
          toast({ title: "No se pudo generar el enlace público", variant: "destructive" });
        }
      }
    },
    [toast]
  );

  const handleShareDialogClose = (isOpen: boolean) => {
    setIsShareDialogOpen(isOpen);
    if (!isOpen && redirectUrl.current) {
      router.push(redirectUrl.current);
      redirectUrl.current = null;
    }
  };

  // ── Form handlers ──
  const onValidationErrors: SubmitErrorHandler<ServiceFormValues> = (errors) => {
    const messages = Object.values(errors)
      .map((e) => e?.message)
      .filter(Boolean)
      .join("\n");
    toast({
      title: "Formulario Incompleto",
      description: messages || "Por favor, revise todos los campos marcados.",
      variant: "destructive",
    });
  };

  const handleSaveService = async (values: ServiceFormValues) => {
    setIsSubmitting(true);
    try {
      const authUserStr = localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY);
      const cu = authUserStr ? JSON.parse(authUserStr) : null;
      if (!cu) throw new Error("No se pudo identificar al usuario.");

      toast({ title: isEditMode ? "Guardando cambios…" : "Creando cotización…" });

      const cleaned = {
        ...values,
        serviceItems: (values.serviceItems || [])
          .map((item) => ({
            ...item,
            suppliesUsed: (item.suppliesUsed || []).filter(
              (s) => s.supplyId && s.quantity > 0
            ),
          }))
          .filter((item) => (item.name || "").trim() !== ""),
      };

      const payload = normalizeForForm(cleaned, users);
      const saved = await serviceService.saveService(payload as unknown as ServiceRecord);

      adminService.logAudit(
        isEditMode ? "Editar" : "Crear",
        `${isEditMode ? "Actualizó" : "Creó"} el servicio #${saved.folio || saved.id.slice(-6)} para ${saved.vehicleIdentifier} con un total de ${formatCurrency(saved.totalCost || 0)}.`,
        { entityType: "Servicio", entityId: saved.id, userId: cu.id, userName: cu.name }
      );

      if (isEditMode) {
        toast({ title: "Cambios Guardados Exitosamente" });
        const tab =
          saved.status === "Cotizacion"
            ? "cotizaciones"
            : saved.status === "Agendado"
            ? "agenda"
            : saved.status === "En Taller"
            ? "activos"
            : "historial";
        router.push(`/servicios?tab=${tab}`);
      } else {
        toast({ title: "Cotización Creada Exitosamente" });
        handleShowShareDialog(saved, `/servicios?tab=cotizaciones`);
      }
    } catch (e: any) {
      toast({ title: "Error al Guardar", description: e.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Quiet save — persists the form to Firestore WITHOUT navigating away.
   * Used by the autosave timer and the "Entregar y Cobrar" pre-save.
   */
  const handleQuietSave = useCallback(async (values: ServiceFormValues) => {
    try {
      const cleaned = {
        ...values,
        serviceItems: (values.serviceItems || [])
          .map((item) => ({
            ...item,
            suppliesUsed: (item.suppliesUsed || []).filter(
              (s) => s.supplyId && s.quantity > 0
            ),
          }))
          .filter((item) => (item.name || "").trim() !== ""),
      };
      const payload = normalizeForForm(cleaned, users);
      await serviceService.saveService(payload as unknown as ServiceRecord);
    } catch (err) {
      console.error("[Autosave] Quiet save failed:", err);
      throw err;
    }
  }, [users]);

  // ── Autosave ──
  const isDeliveredOrCancelled =
    initialData?.status === "Entregado" || initialData?.status === "Cancelado";

  const autosave = useAutosave({
    form: methods,
    onSave: handleQuietSave,
    interval: 30_000,
    enabled: !isDeliveredOrCancelled && !isLoading && !!initialData?.id,
  });

  const formMode: "quote" | "service" = isEditMode
    ? initialData?.status === "Cotizacion"
      ? "quote"
      : "service"
    : "quote";

  const handleCancelService = async (reason: string) => {
    if (!initialData?.id) return;
    await serviceService.updateService(initialData.id, {
      status: "Cancelado",
      cancellationReason: reason,
    });
    toast({ title: "Servicio Cancelado" });
    router.push("/servicios?tab=historial");
  };

  const handleDeleteQuote = async () => {
    if (!initialData?.id) return;
    const serviceRef = doc(db, "serviceRecords", initialData.id);
    const publicRef = doc(db, "publicServices", initialData.publicId || initialData.id);
    const batch = writeBatch(db);
    batch.delete(serviceRef);
    batch.delete(publicRef);
    await batch.commit();
    toast({ title: "Cotización Eliminada" });
    router.push("/servicios?tab=cotizaciones");
  };

  const handleConfirmCancelLocal = async () => {
    if (formMode !== "quote" && !cancellationReason.trim()) {
      toast({
        title: "Falta Motivo",
        description: "El motivo de cancelación es obligatorio",
        variant: "destructive",
      });
      return;
    }
    if (formMode === "quote") handleDeleteQuote();
    else if (initialData?.id) {
      try {
        await serviceService.deleteService(initialData.id);
        toast({ title: "Servicio Eliminado", description: "El servicio ha sido borrado del sistema." });
        router.push("/servicios?tab=activos");
      } catch (error) {
        toast({ title: "Error", description: "No se pudo eliminar el servicio.", variant: "destructive" });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleOpenNewVehicleDialog = (vehicle?: Partial<Vehicle> | null) => {
    setEditingVehicle(vehicle ?? null);
    setIsVehicleFormDialogOpen(true);
  };

  const onVehicleCreated = useCallback(
    async (data: VehicleFormValues): Promise<Vehicle> => {
      const v = await inventoryService.addVehicle(data);
      toast({ title: "Vehículo Creado", description: `${v.make} ${v.model} ha sido agregado.` });
      setVehicles((prev) => [...prev, v]);
      return v;
    },
    [toast]
  );

  const handleSaveVehicle = async (data: VehicleFormValues) => {
    const v = await onVehicleCreated(data);
    methods.setValue("vehicleId", v.id, { shouldValidate: true, shouldDirty: true });
    setIsVehicleFormDialogOpen(false);
  };

  const handleOpenCompletionDialog = useCallback((service: ServiceRecord) => {
    setServiceToComplete(service);
    setIsPaymentDialogOpen(true);
  }, []);

  const handleConfirmCompletion = useCallback(
    async (service: ServiceRecord, paymentDetails: any) => {
      try {
        await serviceService.completeService(service, {
          ...paymentDetails,
          nextServiceInfo: methods.getValues("nextServiceInfo" as any),
        });
        toast({ title: "Servicio Completado" });
        const updated = {
          ...service,
          ...paymentDetails,
          status: "Entregado",
          deliveryDateTime: new Date().toISOString(),
        } as ServiceRecord;
        handleShowShareDialog(updated, "/servicios?tab=activos");
      } catch {
        toast({ title: "Error", description: "No se pudo completar el servicio.", variant: "destructive" });
      } finally {
        setIsPaymentDialogOpen(false);
      }
    },
    [toast, handleShowShareDialog, methods]
  );

  // ── Derived ──
  const isSuperAdmin = currentUser?.role === "Superadministrador";
  const isReadOnly =
    (initialData?.status === "Entregado" || initialData?.status === "Cancelado") &&
    !isSuperAdmin;

  const folio = initialData?.folio || initialData?.id?.slice(-6) || "";
  const pageTitle = (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-8 w-8 text-muted-foreground mr-1">
        <ArrowLeft className="h-5 w-5" />
      </Button>
      <span>
        {isEditMode
          ? `Editar ${formMode === "quote" ? "Cotización" : "Servicio"} #${folio}`
          : `Nuevo Servicio`}
      </span>
      {isEditMode && isSuperAdmin && !isReadOnly && (
        <div className="ml-4">
          <ConfirmDialog
            triggerButton={
              <Button
                variant="outline"
                size="sm"
                type="button"
                className="text-destructive border-destructive/20 hover:bg-destructive/10"
              >
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                {formMode === "quote" ? "Eliminar" : "Eliminar Servicio"}
              </Button>
            }
            title={formMode === "quote" ? "¿Eliminar Cotización?" : "¿Eliminar Servicio?"}
            description={
              formMode === "quote"
                ? "Esta acción no se puede deshacer."
                : "Se borrará permanentemente este servicio del sistema."
            }
            onConfirm={handleConfirmCancelLocal}
            confirmText="Eliminar"
          >
            {formMode !== "quote" && (
              <Textarea
                placeholder="Motivo de la cancelación..."
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                className="mt-4"
              />
            )}
          </ConfirmDialog>
        </div>
      )}
    </div>
  );

  // ── Render ──
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="text-center py-10">
        <h1 className="text-xl font-bold mb-4">Servicio no encontrado</h1>
        <Button onClick={() => router.push("/servicios")}>← Volver a Servicios</Button>
      </div>
    );
  }

  return (
    <FormProvider {...methods}>
      <PageHeader title={pageTitle} />

      <ServiceEditor
        initialData={initialData}
        vehicles={vehicles}
        users={users}
        inventoryItems={inventoryItems}
        serviceTypes={serviceTypes}
        categories={categories}
        suppliers={suppliers}
        serviceHistory={serviceHistory}
        onSave={handleSaveService}
        onValidationErrors={onValidationErrors}
        onComplete={() =>
          methods.handleSubmit(
            () => handleOpenCompletionDialog(methods.getValues() as any),
            onValidationErrors
          )()
        }
        onCancel={handleConfirmCancelLocal}
        onOpenNewVehicleDialog={handleOpenNewVehicleDialog}
        isReadOnly={isReadOnly}
        currentUser={currentUser}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isChecklistWizardOpen={isChecklistWizardOpen}
        setIsChecklistWizardOpen={setIsChecklistWizardOpen}
        autosaveStatus={autosave.status}
        lastSavedAt={autosave.lastSavedAt}
        hasUnsavedChanges={autosave.hasUnsavedChanges}
        onSaveQuiet={autosave.saveNow}
      />

      {/* Modals */}
      <TicketPreviewModal
        open={isShareDialogOpen}
        onOpenChange={handleShareDialogClose}
        service={recordForPreview}
        vehicle={vehicles.find((v) => v.id === recordForPreview?.vehicleId)}
      />

      <PhotoReportModal open={isPhotoModalOpen} onOpenChange={setIsPhotoModalOpen} />

      <VehicleDialog
        open={isVehicleFormDialogOpen}
        onOpenChange={setIsVehicleFormDialogOpen}
        vehicle={editingVehicle}
        onSave={handleSaveVehicle}
      />

      {serviceToComplete && (
        <PaymentDetailsDialog
          open={isPaymentDialogOpen}
          onOpenChange={setIsPaymentDialogOpen}
          record={serviceToComplete}
          onConfirm={(_id, details) => handleConfirmCompletion(serviceToComplete, details)}
          recordType="service"
          isCompletionFlow={true}
        />
      )}
    </FormProvider>
  );
}
