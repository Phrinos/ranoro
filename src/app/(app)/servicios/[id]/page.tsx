

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
} from '@/types';
import { VehicleDialog } from '@/app/(app)/vehiculos/components/vehicle-dialog';
import type { VehicleFormValues } from '@/schemas/vehicle-form-schema';
import { serviceFormSchema, type ServiceFormValues } from '@/schemas/service-form';
import { PageHeader } from '@/components/page-header';
import { AUTH_USER_LOCALSTORAGE_KEY } from '@/lib/placeholder-data';
import { Button } from '@/components/ui/button';
import { FormProvider, useForm, type SubmitErrorHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { doc, collection, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';
import { ShareServiceDialog } from '@/components/shared/ShareServiceDialog';
import { ServiceMobileBar } from '../components/ServiceMobileBar';
import { ActiveServicesSheet } from '../components/ActiveServicesSheet';
import { PhotoReportModal } from '../components/PhotoReportModal';
import { PaymentDetailsDialog } from '@/components/shared/PaymentDetailsDialog';
import { formatCurrency } from '@/lib/utils';
import { nanoid } from 'nanoid';

// --- Normalization Functions ---

function normalizeAdvisor(record: any, users: User[]): Partial<ServiceFormValues> {
  const id = record?.serviceAdvisorId || "";
  const user = users.find(u => u.id === id);
  return {
    serviceAdvisorId: id,
    serviceAdvisorName: record?.serviceAdvisorName || user?.name || "",
    serviceAdvisorSignatureDataUrl: record?.serviceAdvisorSignatureDataUrl || user?.signatureDataUrl || null,
  };
}

function normalizeTechnician(record: any, users: User[]): Partial<ServiceFormValues> {
    const id = record?.technicianId || "";
    const user = users.find(u => u.id === id);
    return {
        technicianId: id,
        technicianName: record?.technicianName || user?.name || "",
        technicianSignatureDataUrl: record?.technicianSignatureDataUrl || user?.signatureDataUrl || null,
    };
}

function normalizeDates(record: any): Partial<ServiceFormValues> {
    return {
        serviceDate: record?.serviceDate ? new Date(record.serviceDate) : new Date(),
        appointmentDateTime: record?.appointmentDateTime ? new Date(record.appointmentDateTime) : undefined,
        receptionDateTime: record?.receptionDateTime ? new Date(record.receptionDateTime) : undefined,
        deliveryDateTime: record?.deliveryDateTime ? new Date(record.deliveryDateTime) : undefined,
    } as Partial<ServiceFormValues>;
}

function normalizeForForm(record: any, users: User[]): ServiceFormValues {
  const serviceItems = (Array.isArray(record.serviceItems) ? record.serviceItems : []).map((item: any) => ({
    ...item,
    name: item.serviceType || item.name, // Map serviceType to name for the form's select
    itemName: item.name || item.itemName, // The detailed name
    suppliesUsed: (item.suppliesUsed ?? []).map((s: any) => ({ ...s, unitType: s?.unitType ?? undefined })),
  }));
  
  const mileageValue = (record.mileage !== undefined && record.mileage !== null && !isNaN(Number(record.mileage)))
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
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [serviceToComplete, setServiceToComplete] = useState<ServiceRecord | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

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
      technicianId: '',
      serviceItems: [],
      serviceDate: new Date(),
      photoReports: [],
    }
  });

  useEffect(() => {
    if (!initialData?.id || !users.length || hydratedRef.current === initialData.id) return;
  
    const norm = normalizeForForm(initialData, users);
    methods.reset(norm);
    hydratedRef.current = initialData.id;
  }, [initialData, users, methods]);
  
  const advisorId = methods.watch("serviceAdvisorId");
  useEffect(() => {
    if (!users.length || !advisorId) return;

    const u = users.find(x => x.id === advisorId);
    if (u) {
      methods.setValue("serviceAdvisorName", u.name ?? "", { shouldDirty: false });
      methods.setValue("serviceAdvisorSignatureDataUrl", u.signatureDataUrl ?? null, { shouldDirty: false });
    }
  }, [advisorId, users, methods]);
  
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const authUserString = localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY);
      const user = authUserString ? JSON.parse(authUserString) : null;
      setCurrentUser(user);

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
            setInitialData(serviceData);
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
            photoReports: [],
          };
          setInitialData(draft as any);
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
    console.log("Validation Errors:", errors);
    const errorMessages = Object.values(errors).map(e => e?.message).join('\n');
    toast({
      title: "Formulario Incompleto",
      description: errorMessages || "Por favor, revise todos los campos marcados.",
      variant: "destructive",
    });
  };

  const handleSaveService = async (values: ServiceFormValues) => {
    setIsSubmitting(true);
    try {
      const authUserString = localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY);
      const currentUser = authUserString ? JSON.parse(authUserString) : null;
      if (!currentUser) throw new Error("No se pudo identificar al usuario.");

      toast({ title: isEditMode ? "Guardando cambios…" : "Creando cotización…" });

      const cleanedValues = { ...values };
      cleanedValues.serviceItems = (cleanedValues.serviceItems || [])
        .map(item => ({
          ...item,
          suppliesUsed: (item.suppliesUsed || []).filter(supply => supply.supplyId && supply.quantity > 0)
        }))
        .filter(item => (item.name || '').trim() !== "");

      const payload = normalizeForForm(cleanedValues, users);

      const saved = await serviceService.saveService(payload as unknown as ServiceRecord);
      
      const logDescription = `${isEditMode ? 'Actualizó' : 'Creó'} el servicio #${saved.folio || saved.id.slice(-6)} para ${saved.vehicleIdentifier} con un total de ${formatCurrency(saved.totalCost || 0)}.`;
      adminService.logAudit(isEditMode ? 'Editar' : 'Crear', logDescription, {
        entityType: 'Servicio',
        entityId: saved.id,
        userId: currentUser.id,
        userName: currentUser.name,
      });
      
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

  const handleCancelService = async (reason: string) => {
    if (!initialData?.id) return;
    await serviceService.updateService(initialData.id, { status: 'Cancelado', cancellationReason: reason });
    toast({ title: "Servicio Cancelado" });
    router.push('/servicios?tab=historial');
  };

  const handleDeleteQuote = async () => {
    if (!initialData?.id) return;
    const serviceRef = doc(db, 'serviceRecords', initialData.id);
    const publicRef = doc(db, 'publicServices', initialData.publicId || initialData.id);
    const batch = writeBatch(db);
    batch.delete(serviceRef);
    batch.delete(publicRef);
    await batch.commit();
    toast({ title: "Cotización Eliminada" });
    router.push('/servicios?tab=cotizaciones');
  };

  const handleOpenNewVehicleDialog = (vehicle?: Partial<Vehicle> | null) => {
    setEditingVehicle(vehicle || null);
    setIsVehicleFormDialogOpen(true);
  };
  
  const onVehicleCreated = useCallback(async (data: VehicleFormValues): Promise<Vehicle> => {
      const newVehicle = await inventoryService.addVehicle(data);
      toast({ title: "Vehículo Creado", description: `${newVehicle.make} ${newVehicle.model} ha sido agregado.` });
      setVehicles(prev => [...prev, newVehicle]);
      return newVehicle;
  }, [toast]);
  
  const handleSaveVehicle = async (data: VehicleFormValues) => {
    const newVehicle = await onVehicleCreated(data);
    methods.setValue('vehicleId', newVehicle.id, { shouldValidate: true, shouldDirty: true });
    setIsVehicleFormDialogOpen(false);
  };

  const handleOpenCompletionDialog = useCallback((service: ServiceRecord) => {
    setServiceToComplete(service);
    setIsPaymentDialogOpen(true);
  }, []);

  const handleConfirmCompletion = useCallback(async (service: ServiceRecord, paymentDetails: any, nextServiceInfo?: any) => {
    try {
      await serviceService.completeService(service, { ...paymentDetails, nextServiceInfo });
      toast({ title: "Servicio Completado" });
      const updatedService = { ...service, ...paymentDetails, status: 'Entregado', deliveryDateTime: new Date().toISOString() } as ServiceRecord;
      handleShowShareDialog(updatedService, '/servicios?tab=activos');
    } catch (e) {
      console.error('Completion error:', e);
      toast({ title: "Error", description: "No se pudo completar el servicio.", variant: "destructive"});
    } finally {
      setIsPaymentDialogOpen(false);
    }
  }, [toast, handleShowShareDialog]);

  const formMode: 'quote' | 'service' = isEditMode ? (initialData?.status === 'Cotizacion' ? 'quote' : 'service') : 'quote';
  
  const pageTitle = isEditMode
    ? `Editar ${formMode === 'quote' ? 'Cotización' : 'Servicio'} #${initialData?.folio || initialData?.id?.slice(-6)}`
    : `Nueva ${formMode === 'quote' ? 'Cotización' : 'Servicio'}`;
  
  const pageDescription = isEditMode
    ? `Modifica los detalles para el vehículo ${initialData?.vehicleIdentifier || ''}.`
    : "Completa los datos para crear un nuevo registro.";
    
  const isReadOnly = (initialData?.status === 'Entregado' || initialData?.status === 'Cancelado') && currentUser?.role !== 'Superadministrador';
  
  const selectedVehicle = vehicles.find(v => v.id === methods.watch('vehicleId'));

  if (isLoading) {
    return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="mr-2 h-8 w-8 animate-spin" /></div>;
  }
  
  if (notFound) {
      return <div className="text-center py-10"><h1>Servicio no encontrado</h1><Button onClick={() => router.push('/servicios')}>Volver</Button></div>
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
        onComplete={() => methods.handleSubmit(() => handleOpenCompletionDialog(methods.getValues() as any), onValidationErrors)()}
        onVehicleCreated={onVehicleCreated}
        onCancel={formMode === 'quote' ? handleDeleteQuote : () => handleCancelService("Cancelled from form")}
        mode={formMode}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isChecklistWizardOpen={isChecklistWizardOpen}
        setIsChecklistWizardOpen={setIsChecklistWizardOpen}
        onOpenNewVehicleDialog={handleOpenNewVehicleDialog}
        isNewRecord={!isEditMode}
        isReadOnly={isReadOnly}
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

      {serviceToComplete && (
        <PaymentDetailsDialog
            open={isPaymentDialogOpen}
            onOpenChange={setIsPaymentDialogOpen}
            record={serviceToComplete}
            onConfirm={(id, details) => handleConfirmCompletion(serviceToComplete, details, methods.getValues('nextServiceInfo' as any))}
            recordType="service"
            isCompletionFlow={true}
        />
      )}
    </FormProvider>
  );
}
