// src/app/(app)/servicios/[id]/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useRouter, useParams } from 'next/navigation';
import { serviceService, inventoryService, adminService } from '@/lib/services';
import { Loader2 } from 'lucide-react';
import { ServiceForm } from '../components/ServiceForm';
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
import { VehicleDialog } from '@/app/(app)/vehiculos/components/vehicle-dialog';
import type { VehicleFormValues } from '@/app/(app)/vehiculos/components/vehicle-form';
import { serviceFormSchema, type ServiceFormValues } from '@/schemas/service-form';
import { PageHeader } from '@/components/page-header';
import { AUTH_USER_LOCALSTORAGE_KEY } from '@/lib/placeholder-data';
import { Button } from '@/components/ui/button';
import { FormProvider, useForm, type SubmitErrorHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { doc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';
import { ShareServiceDialog } from '@/components/shared/ShareServiceDialog';
import { ServiceMobileBar } from '../components/ServiceMobileBar';
import { ActiveServicesSheet } from '../components/ActiveServicesSheet';
import { PhotoReportModal } from '../components/PhotoReportModal';

// --- NORMALIZATION HELPERS ---

function normalizeAdvisor(record: any, users: User[]) {
  const id =
    record?.serviceAdvisorId ??
    record?.serviceAdvisor_id ??
    record?.serviceAdvisorID ??
    record?.advisorId ??
    record?.advisor_id ??
    record?.advisorID ??
    record?.assignedAdvisorId ??
    record?.service_advisor_id ??
    record?.serviceAdvisor?.id ??
    record?.advisor?.id ??
    "";

  const byName = (name?: string) => users.find(u =>
    (u.name ?? "").trim().toLowerCase() === (name ?? "").trim().toLowerCase());

  const uById = users.find(x => x.id === id);
  const name =
    record?.serviceAdvisorName ??
    record?.serviceAdvisor?.name ??
    record?.advisor?.name ??
    uById?.name ??
    "";

  const u = uById ?? byName(name);

  return {
    ...record,
    serviceAdvisorId: (u?.id || id || ""),
    serviceAdvisorName: name || u?.name || "",
    serviceAdvisorSignatureDataUrl:
      record?.serviceAdvisorSignatureDataUrl ??
      record?.serviceAdvisor?.signatureDataUrl ??
      record?.advisor?.signatureDataUrl ??
      u?.signatureDataUrl ??
      null,
  };
}

function normalizeTechnician(record: any, users: User[]) {
  const id =
    record?.technicianId ??
    record?.technician_id ??
    record?.technician?.id ??
    "";

  const u = users.find(x => x.id === id);
  return {
    ...record,
    technicianId: id || "",
    technicianName:
      record?.technicianName ??
      record?.technician?.name ??
      u?.name ??
      "",
    technicianSignatureDataUrl:
      record?.technicianSignatureDataUrl ??
      record?.technician?.signatureDataUrl ??
      u?.signatureDataUrl ??
      null,
  };
}

function normalizeDates(record: any) {
  return {
    ...record,
    serviceDate: record?.serviceDate ? new Date(record.serviceDate) : new Date(),
    appointmentDateTime: record?.appointmentDateTime ? new Date(record.appointmentDateTime) : undefined,
    receptionDateTime: record?.receptionDateTime ? new Date(record.receptionDateTime) : undefined,
    deliveryDateTime: record?.deliveryDateTime ? new Date(record.deliveryDateTime) : undefined,
  };
}

function normalizeForForm(record: any, users: User[]): ServiceFormValues {
  const a = normalizeAdvisor(record, users);
  const t = normalizeTechnician(a, users);
  const d = normalizeDates(t);

  const serviceItems = (Array.isArray(d.serviceItems) ? d.serviceItems : []).map((item: any) => ({
    ...item,
    suppliesUsed: (item.suppliesUsed ?? []).map((s: any) => ({ ...s, unitType: s?.unitType ?? undefined })),
  }));

  return {
    ...d,
    serviceItems,
    status: d.status ?? "Cotizacion",
    vehicleId: d.vehicleId ?? "",
    serviceDate: d.serviceDate,
    appointmentDateTime: d.appointmentDateTime,
    receptionDateTime: d.receptionDateTime,
    deliveryDateTime: d.deliveryDateTime,

    serviceAdvisorId: d.serviceAdvisorId ? String(d.serviceAdvisorId) : "",
    serviceAdvisorName: d.serviceAdvisorName ?? "",
    serviceAdvisorSignatureDataUrl: d.serviceAdvisorSignatureDataUrl ?? null,

    technicianId: d.technicianId ? String(d.technicianId) : "",
    technicianName: d.technicianName ?? "",
    technicianSignatureDataUrl: d.technicianSignatureDataUrl ?? null,
  } as ServiceFormValues;
}


export default function ServicioPage() {
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const serviceId = params.id as string | undefined;

  const [initialData, setInitialData] = useState<ServiceRecord | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceTypeRecord[]>([]);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [serviceHistory, setServiceHistory] = useState<ServiceRecord[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [recordForPreview, setRecordForPreview] = useState<ServiceRecord | null>(null);
  const redirectUrl = useRef<string | null>(null);
  const hydratedRef = useRef<string | null>(null);
  const [activeTab, setActiveTab] = useState('service-items');
  const [isServicesSheetOpen, setIsServicesSheetOpen] = useState(false);
  const [isChecklistWizardOpen, setIsChecklistWizardOpen] = useState(false);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [isVehicleFormDialogOpen, setIsVehicleFormDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Partial<Vehicle> | null>(null);


  const isEditMode = serviceId !== 'nuevo';

  const methods = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    shouldUnregister: false,
    defaultValues: {
      status: 'Cotizacion',
      vehicleId: '',
      serviceAdvisorId: '',
      serviceAdvisorName: '',
      technicianId: '',
      technicianName: '',
      serviceItems: [],
      serviceDate: new Date(),
    }
  });

  useEffect(() => {
    hydratedRef.current = null;
  }, [serviceId]);

  useEffect(() => {
    if (!initialData?.id || !users.length) return;
    if (hydratedRef.current === initialData.id) return;

    const norm = normalizeForForm(initialData, users);

    const currentAdvisorId = methods.getValues("serviceAdvisorId");
    if (!norm.serviceAdvisorId && currentAdvisorId) {
      norm.serviceAdvisorId = currentAdvisorId;
      norm.serviceAdvisorName = methods.getValues("serviceAdvisorName") ?? "";
      norm.serviceAdvisorSignatureDataUrl = methods.getValues("serviceAdvisorSignatureDataUrl") ?? null;
    }

    methods.reset(norm);
    hydratedRef.current = initialData.id;
  }, [initialData, users, methods]);
  
  const advisorId = methods.watch("serviceAdvisorId");
  useEffect(() => {
    if (!users.length || !advisorId) return;
    const currentName = methods.getValues("serviceAdvisorName");
    // Only update if name is missing, to avoid overwriting manual changes
    if (!currentName) {
      const u = users.find(x => x.id === advisorId);
      if (u) {
        methods.setValue("serviceAdvisorName", u.name ?? "", { shouldDirty: false });
        methods.setValue("serviceAdvisorSignatureDataUrl", u.signatureDataUrl ?? null, { shouldDirty: false });
      }
    }
  }, [advisorId, users, methods]);
  
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const authUserString = localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY);
      const user = authUserString ? JSON.parse(authUserString) : null;

      try {
        const [
          vehiclesData, usersData, inventoryData,
          serviceTypesData, categoriesData, suppliersData, allServicesData
        ] = await Promise.all([
          inventoryService.onVehiclesUpdatePromise(),
          adminService.onUsersUpdatePromise(),
          inventoryService.onItemsUpdatePromise(),
          inventoryService.onServiceTypesUpdatePromise(),
          inventoryService.onCategoriesUpdatePromise(),
          inventoryService.onSuppliersUpdatePromise(),
          serviceService.onServicesUpdatePromise(),
        ]);

        setVehicles(vehiclesData);
        setUsers(usersData);
        setInventoryItems(inventoryData);
        setServiceTypes(serviceTypesData);
        setCategories(categoriesData);
        setSuppliers(suppliersData);
        setServiceHistory(allServicesData);

        if (isEditMode && serviceId) {
          const serviceData = await serviceService.getDocById('serviceRecords', serviceId);
          if (!serviceData) {
            setNotFound(true);
          } else {
            setInitialData(normalizeForForm(serviceData, usersData) as ServiceRecord);
          }
        } else if (user) {
          const newId = doc(collection(db, 'serviceRecords')).id;
          const draft = {
            id: newId,
            status: 'Cotizacion',
            serviceDate: new Date(),
            vehicleId: '',
            serviceItems: [{ id: `item_1`, name: '', sellingPrice: undefined, suppliesUsed: [] }],
            serviceAdvisorId: user.id,
            serviceAdvisorName: user.name,
            serviceAdvisorSignatureDataUrl: user.signatureDataUrl ?? null,
          };
          setInitialData(normalizeForForm(draft, usersData) as ServiceRecord);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [serviceId, isEditMode]);
  
  const handleShowShareDialog = useCallback(async (service: ServiceRecord, redirect?: string) => {
    setRecordForPreview(service);
    setIsShareDialogOpen(true);
    if (redirect) redirectUrl.current = redirect;

    if (!service.publicId) {
      try {
        const newPublicId = Math.random().toString(36).slice(2, 18);
        await serviceService.updateService(service.id, { publicId: newPublicId });
        setRecordForPreview(prev => prev && prev.id === service.id ? { ...prev, publicId: newPublicId } : prev);
      } catch (error) {
        console.error("Error generating public link:", error);
        toast({ title: "No se pudo generar el enlace público", variant: "destructive" });
      }
    }
  }, [toast]);

  const handleShareDialogClose = (isOpen: boolean) => {
    setIsShareDialogOpen(isOpen);
    if (!isOpen && redirectUrl.current) {
      router.push(redirectUrl.current);
      redirectUrl.current = null;
    }
  };
  
  const onValidationErrors: SubmitErrorHandler<ServiceFormValues> = (errors) => {
    const errorMessages = Object.values(errors).map(e => e.message).join('\n');
    toast({
      title: "Formulario Incompleto",
      description: errorMessages || "Por favor, revise todos los campos marcados.",
      variant: "destructive",
    });
  };

  const handleSaveService = async (values: ServiceFormValues) => {
    setIsSubmitting(true);
    try {
      toast({ title: isEditMode ? "Guardando cambios…" : "Creando cotización…" });

      const cleanedValues = { ...values };
      cleanedValues.serviceItems = (cleanedValues.serviceItems || [])
        .map(item => ({
          ...item,
          suppliesUsed: (item.suppliesUsed || []).filter(supply => supply.supplyId && supply.quantity > 0)
        }))
        .filter(item => item.name && item.name.trim() !== "");

      const payload = normalizeForForm(cleanedValues, users) as ServiceRecord;

      const saved = await serviceService.saveService(payload);
      
      if (isEditMode) {
        toast({ title: "Cambios Guardados Exitosamente" });
        const tab = 
          saved.status === 'Cotizacion' ? 'cotizaciones' :
          saved.status === 'Agendado' ? 'agenda' :
          saved.status === 'En Taller' ? 'activos' :
          'historial';
        router.push(`/servicios?tab=${tab}`);
      } else {
        toast({ title: "Cotización Creada Exitosamente" });
        handleShowShareDialog(saved, `/servicios?tab=cotizaciones`);
      }
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Error al Guardar', description: e.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelService = async () => {
    if (!initialData?.id) return;
    await serviceService.cancelService(initialData.id, "Cancelado desde el panel");
    toast({ title: "Servicio Cancelado" });
    router.push('/servicios?tab=historial');
  };

  const handleDeleteQuote = async () => {
    if (!initialData?.id) return;
    await serviceService.deleteService(initialData.id);
    toast({ title: "Cotización Eliminada" });
    router.push('/servicios?tab=cotizaciones');
  };

  const handleOpenNewVehicleDialog = (vehicle?: Partial<Vehicle> | null) => {
    setEditingVehicle(vehicle);
    setIsVehicleFormDialogOpen(true);
  };
  
  const onVehicleCreated = useCallback(async (data: VehicleFormValues): Promise<Vehicle> => {
      const newVehicle = await inventoryService.addVehicle(data);
      toast({ title: "Vehículo Creado", description: `${newVehicle.make} ${newVehicle.model} ha sido agregado.` });
      setVehicles(prev => [...prev, newVehicle]);
      return newVehicle;
  }, [toast]);
  
  const handleSaveVehicle = async (data: VehicleFormValues) => {
    if(!onVehicleCreated) return;
    const newVehicle = await onVehicleCreated(data);
    methods.setValue('vehicleId', newVehicle.id, { shouldValidate: true, shouldDirty: true });
    setIsVehicleFormDialogOpen(false);
  };

  const formMode: 'quote' | 'service' = isEditMode ? (initialData?.status === 'Cotizacion' ? 'quote' : 'service') : 'quote';
  
  const pageTitle = isEditMode
    ? `Editar ${formMode === 'quote' ? 'Cotización' : 'Servicio'} #${initialData?.folio || initialData?.id?.slice(-6)}`
    : `Nueva ${formMode === 'quote' ? 'Cotización' : 'Servicio'}`;
  
  const pageDescription = isEditMode
    ? `Modifica los detalles para el vehículo ${initialData?.vehicleIdentifier || ''}.`
    : "Completa los datos para crear un nuevo registro.";

  if (isLoading) {
    return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="mr-2 h-8 w-8 animate-spin" /></div>;
  }
  
  if (notFound) {
      return <div className="text-center py-10"><h1>Servicio no encontrado</h1><Button onClick={() => router.push('/servicios')}>Volver a Servicios</Button></div>
  }

  return (
    <FormProvider {...methods}>
      <PageHeader title={pageTitle} description={pageDescription} />
      
      <ServiceForm
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
        onComplete={() => {}}
        onVehicleCreated={onVehicleCreated}
        onCancel={formMode === 'quote' ? handleDeleteQuote : handleCancelService}
        mode={formMode}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isChecklistWizardOpen={isChecklistWizardOpen}
        setIsChecklistWizardOpen={setIsChecklistWizardOpen}
        onOpenNewVehicleDialog={handleOpenNewVehicleDialog}
        isNewRecord={!isEditMode}
      />

      <ServiceMobileBar
        onOpenServicesSheet={() => setIsServicesSheetOpen(true)}
        onTakePhoto={() => setIsPhotoModalOpen(true)}
        onStartChecklist={() => {
          setActiveTab('safety-checklist');
          setIsChecklistWizardOpen(true);
        }}
        onSave={() => methods.handleSubmit(handleSaveService, onValidationErrors)()}
        isSubmitting={isSubmitting}
      />
      
      <ShareServiceDialog
        open={isShareDialogOpen}
        onOpenChange={handleShareDialogClose}
        service={recordForPreview}
        vehicle={vehicles.find(v => v.id === recordForPreview?.vehicleId)}
      />

      <ActiveServicesSheet
        open={isServicesSheetOpen}
        onOpenChange={setIsServicesSheetOpen}
        services={serviceHistory.filter(s => s.status === 'En Taller')}
        vehicles={vehicles}
      />

      <PhotoReportModal open={isPhotoModalOpen} onOpenChange={setIsPhotoModalOpen} />

      <VehicleDialog
        open={isVehicleFormDialogOpen}
        onOpenChange={setIsVehicleFormDialogOpen}
        vehicle={editingVehicle}
        onSave={handleSaveVehicle}
      />
    </FormProvider>
  );
}
