// src/app/(app)/servicios/[id]/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { serviceService, inventoryService, adminService } from '@/lib/services';
import { Loader2, Share2, MessageSquare, FileWarning, PlusCircle } from 'lucide-react';
import { ServiceForm } from '../components/ServiceForm';
import type {
  ServiceRecord,
  Vehicle,
  User,
  InventoryItem,
  ServiceTypeRecord,
  InventoryCategory,
  Supplier
} from '@/types';
import type { VehicleFormValues } from '@/app/(app)/vehiculos/components/vehicle-form';
import { serviceFormSchema, type ServiceFormValues } from '@/schemas/service-form';
import { PageHeader } from '@/components/page-header';
import { AUTH_USER_LOCALSTORAGE_KEY } from '@/lib/placeholder-data';
import { ShareServiceDialog } from '@/components/shared/ShareServiceDialog';
import { Button } from '@/components/ui/button';
import { UnifiedPreviewDialog } from '@/components/shared/unified-preview-dialog';
import { TicketContent } from '@/components/ticket-content';
import { writeBatch, doc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';
import { NotificationDialog } from '../components/notification-dialog';
import { ServiceMobileBar } from '../components/ServiceMobileBar';
import { ActiveServicesSheet } from '../components/ActiveServicesSheet';
import { PhotoReportModal } from '../components/PhotoReportModal';
import { FormProvider, useForm, type FieldErrors, type SubmitErrorHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import type { PaymentDetailsFormValues } from '@/schemas/payment-details-form-schema';
import { PaymentDetailsDialog } from '@/components/shared/PaymentDetailsDialog';

// --- Error Handling Utilities ---
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

export default function ServicioPage() {
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams()
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

  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isTicketDialogOpen, setIsTicketDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [recordForPreview, setRecordForPreview] = useState<ServiceRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const redirectUrl = useRef<string | null>(null);
  const ticketContentRef = React.useRef<HTMLDivElement>(null);

  const [activeTab, setActiveTab] = useState('service-items');
  const [isServicesSheetOpen, setIsServicesSheetOpen] = useState(false);
  const [isChecklistWizardOpen, setIsChecklistWizardOpen] = useState(false);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);

  const isEditMode = serviceId !== 'nuevo';
  const isQuoteModeParam = searchParams.get('mode') === 'quote';

  const methods = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  // Modo del formulario: en edición ignora ?mode=quote y respeta el status real.
  const formMode: 'quote' | 'service' =
    isEditMode
      ? (initialData?.status === 'Cotizacion' ? 'quote' : 'service')
      : (isQuoteModeParam ? 'quote' : 'service');

  useEffect(() => {
    if (initialData) {
      methods.reset({
        ...initialData,
        serviceDate: initialData.serviceDate ? new Date(initialData.serviceDate) : new Date(),
        appointmentDateTime: initialData.appointmentDateTime ? new Date(initialData.appointmentDateTime) : undefined,
        receptionDateTime: initialData.receptionDateTime ? new Date(initialData.receptionDateTime) : undefined,
        deliveryDateTime: initialData.deliveryDateTime ? new Date(initialData.deliveryDateTime) : undefined,
      });
    }
  }, [initialData, methods]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setNotFound(false);
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
            return;
          }
          setInitialData(serviceData);
          setRecordForPreview(serviceData);
        } else {
          const authUserString = typeof window !== 'undefined' ? localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY) : null;
          const currentUser = authUserString ? JSON.parse(authUserString) : null;
          const newId = doc(collection(db, 'serviceRecords')).id;

          const defaultStatus: ServiceRecord['status'] = isQuoteModeParam ? 'Cotizacion' : 'En Taller';

          setInitialData({
            id: newId,
            status: defaultStatus,
            serviceDate: new Date(),
            ...(defaultStatus === 'En Taller' && { receptionDateTime: new Date().toISOString() }),
            vehicleId: '',
            serviceItems: [{
              id: `item_${Math.random().toString(36).slice(2, 8)}`,
              name: '',
              sellingPrice: undefined,
              suppliesUsed: [],
            }],
            ...(currentUser && {
              serviceAdvisorId: currentUser.id,
              serviceAdvisorName: currentUser.name,
              serviceAdvisorSignatureDataUrl: currentUser.signatureDataUrl,
            }),
          } as ServiceRecord);
        }

      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [serviceId, isEditMode, isQuoteModeParam]);

  const handleShowShareDialog = useCallback(async (service: ServiceRecord, redirect?: string) => {
    let serviceToShare = { ...service };
    if (!serviceToShare.publicId) {
      try {
        toast({ title: "Generando enlace público..." });
        const newPublicId = Math.random().toString(36).slice(2, 18);
        await serviceService.updateService(service.id, { publicId: newPublicId });
        serviceToShare.publicId = newPublicId;
      } catch (error) {
        console.error("Error generating public link:", error);
        toast({ title: "Error al crear enlace", variant: "destructive" });
        return;
      }
    }
    setRecordForPreview(serviceToShare);
    setIsShareDialogOpen(true);
    if (redirect) redirectUrl.current = redirect;
  }, [toast]);

  const handleShareDialogClose = (isOpen: boolean) => {
    setIsShareDialogOpen(isOpen);
    if (!isOpen && redirectUrl.current) {
      router.push(redirectUrl.current);
      redirectUrl.current = null;
    }
  };

  const handleShowTicketDialog = useCallback((service: ServiceRecord) => {
    setRecordForPreview(service);
    setIsTicketDialogOpen(true);
  }, []);

  const handleConfirmPayment = async (recordId: string, paymentDetails: PaymentDetailsFormValues) => {
    if (!initialData) return;
    setIsSubmitting(true);
    try {
      if (!db) return;
      const batch = writeBatch(db);
      await serviceService.completeService(initialData, paymentDetails, batch);
      await batch.commit();

      toast({ title: "Servicio Completado" });
      setIsPaymentDialogOpen(false);

      const updatedServiceData = await serviceService.getDocById('serviceRecords', recordId);
      if (updatedServiceData) {
        handleShowShareDialog(updatedServiceData, '/servicios?tab=historial');
      } else {
        router.push('/servicios?tab=historial');
      }
    } catch (e: any) {
      console.error(e);
      toast({ title: "Error al Completar", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenVehicleDialog = (_vehicle: Partial<Vehicle> | null) => {
    // Implementa si usas un diálogo de vehículos desde aquí
  };

  const handleVehicleSave = async (_data: VehicleFormValues): Promise<Vehicle> => {
    // Implementa si necesitas crear/actualizar vehículo desde este formulario
    return {} as Vehicle;
  };

  const handleCancelService = async () => {
    if (!initialData?.id) return;
    await serviceService.cancelService(initialData.id, "Cancelado desde el panel");
    router.push('/servicios?tab=historial');
  };

  const handleDeleteQuote = async () => {
    if (!initialData?.id) return;
    await serviceService.deleteService(initialData.id);
    router.push('/servicios?tab=cotizaciones');
  };

  // GUARDA con sellos de fecha según estado
  const handleSaveService = async (values: ServiceFormValues): Promise<ServiceRecord | void> => {
    setIsSubmitting(true);
    try {
      const rawStatus = String(values.status || '').trim();
      const normalizedStatus: ServiceRecord['status'] =
        rawStatus.toLowerCase() === 'cotizacion' ? 'Cotizacion' :
        rawStatus.toLowerCase() === 'en taller' ? 'En Taller' :
        rawStatus.toLowerCase() === 'entregado' ? 'Entregado' :
        rawStatus.toLowerCase() === 'agendado' ? 'Agendado' :
        rawStatus.toLowerCase() === 'cancelado' ? 'Cancelado' :
        (values.status as ServiceRecord['status'] ?? 'En Taller');

      const nowIso = new Date().toISOString();

      const payload: ServiceRecord = {
        ...(values as unknown as ServiceRecord),
        status: normalizedStatus,
        receptionDateTime:
          normalizedStatus === 'En Taller'
            ? ((values as any).receptionDateTime ?? nowIso)
            : (values as any).receptionDateTime,
        deliveryDateTime:
          normalizedStatus === 'Entregado'
            ? ((values as any).deliveryDateTime ?? nowIso)
            : (values as any).deliveryDateTime,
      };

      const savedRecord = await serviceService.saveService(payload);
      toast({ title: 'Registro Guardado' });

      if (!isEditMode) {
        const redirectTab =
          normalizedStatus === 'Cotizacion' ? 'cotizaciones' :
          normalizedStatus === 'En Taller' ? 'activos' :
          normalizedStatus === 'Entregado' ? 'historial' : 'activos';

        handleShowShareDialog(savedRecord, `/servicios?tab=${redirectTab}`);
      }

      return savedRecord;
    } catch (e) {
      console.error(e);
      toast({ title: 'Error al Guardar', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Completar servicio abre diálogo de pago
  const handleCompleteService = (values: ServiceFormValues) => {
    setInitialData(values as ServiceRecord);
    setIsPaymentDialogOpen(true);
  };

  // UI y carga
  if (isLoading || (isEditMode && !initialData && !notFound)) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="mr-2 h-8 w-8 animate-spin" />
        {isEditMode ? 'Cargando servicio...' : 'Cargando...'}
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center text-center">
        <FileWarning className="h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold">Documento no Encontrado</h1>
        <p className="text-muted-foreground mb-6">El servicio que buscas no existe o ha sido eliminado.</p>
        <Button onClick={() => router.push('/servicios')}>Volver a Servicios</Button>
      </div>
    );
  }

  const isQuote = formMode === 'quote';
  const pageTitle = isEditMode
    ? `Editar ${isQuote ? 'Cotización' : 'Servicio'} #${initialData?.folio || initialData?.id?.slice(-6)}`
    : `Nueva ${isQuote ? 'Cotización' : 'Servicio'}`;
  const pageDescription = isEditMode
    ? `Modifica los detalles para el vehículo ${initialData?.vehicleIdentifier || ''}.`
    : "Completa los datos para crear un nuevo registro.";

  const activeServices = serviceHistory.filter(s => s.status === 'En Taller');

  return (
    <FormProvider {...methods}>
      <div className="md:hidden">
        <h1 className="text-lg font-semibold">{pageTitle}</h1>
        <p className="text-sm text-muted-foreground">{pageDescription}</p>
      </div>
      <div className="hidden md:block">
        <PageHeader
          title={pageTitle}
          description={pageDescription}
          actions={
            <div className="flex items-center gap-2">
              {isEditMode && initialData && (
                <>
                  <Button variant="outline" onClick={() => {}} size="sm" title="Notificar al Cliente">
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={() => handleShowShareDialog(initialData)}
                    size="sm"
                    title="Compartir Documento"
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                </>
              )}
              {!isEditMode && (
                <Button asChild size="sm">
                  <Link href="/servicios/nuevo">
                    <PlusCircle className="mr-2 h-4 w-4" /> Nuevo Servicio
                  </Link>
                </Button>
              )}
            </div>
          }
        />
      </div>

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
        onValidationErrors={(errors) => {
          const plain = materializeErrors(errors);
          console.error("Validation Errors:", plain);
          const msgs = flattenRHFErrors(errors);
          toast({
            title: "Formulario Incompleto",
            description: msgs[0] || "Por favor, revise todos los campos marcados.",
            variant: "destructive",
          });
        }}
        onComplete={handleCompleteService}
        onVehicleCreated={handleVehicleSave}
        onCancel={isQuote ? handleDeleteQuote : handleCancelService}
        mode={formMode}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isChecklistWizardOpen={isChecklistWizardOpen}
        setIsChecklistWizardOpen={setIsChecklistWizardOpen}
        onOpenNewVehicleDialog={() => {}}
      />

      <ServiceMobileBar
        onOpenServicesSheet={() => setIsServicesSheetOpen(true)}
        onTakePhoto={() => setIsPhotoModalOpen(true)}
        onStartChecklist={() => {
          setActiveTab('safety-checklist');
          setIsChecklistWizardOpen(true);
        }}
        onSave={() => methods.handleSubmit(handleSaveService, (errors) => {
          const msgs = flattenRHFErrors(errors);
          toast({
            title: "Formulario Incompleto",
            description: msgs[0] || "Por favor, revise todos los campos marcados.",
            variant: "destructive",
          });
        })()}
        isSubmitting={isSubmitting}
      />

      <ActiveServicesSheet
        open={isServicesSheetOpen}
        onOpenChange={setIsServicesSheetOpen}
        services={activeServices}
        vehicles={vehicles}
      />

      <PhotoReportModal open={isPhotoModalOpen} onOpenChange={setIsPhotoModalOpen} />

      {recordForPreview && (
        <>
          <ShareServiceDialog
            open={isShareDialogOpen}
            onOpenChange={handleShareDialogClose}
            service={recordForPreview}
            vehicle={vehicles.find(v => v.id === recordForPreview.vehicleId)}
          />
          <UnifiedPreviewDialog
            open={isTicketDialogOpen}
            onOpenChange={setIsTicketDialogOpen}
            title="Ticket de Servicio"
            service={recordForPreview}
            footerContent={<></>}
          >
            <TicketContent ref={ticketContentRef} service={recordForPreview} />
          </UnifiedPreviewDialog>
        </>
      )}

      {initialData && (
        <PaymentDetailsDialog
          open={isPaymentDialogOpen}
          onOpenChange={setIsPaymentDialogOpen}
          record={initialData}
          onConfirm={handleConfirmPayment}
          recordType="service"
          isCompletionFlow={true}
        />
      )}

      <NotificationDialog
        isOpen={false}
        onOpenChange={() => {}}
        service={initialData}
        vehicle={vehicles.find(v => v.id === initialData?.vehicleId) || null}
      />
    </FormProvider>
  );
}
