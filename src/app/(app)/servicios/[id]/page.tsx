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

const generatePublicId = (length = 16) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};


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
  const [activeTab, setActiveTab] = useState('service-items');
  const [isServicesSheetOpen, setIsServicesSheetOpen] = useState(false);
  const [isChecklistWizardOpen, setIsChecklistWizardOpen] = useState(false);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);

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
    }
  });

  useEffect(() => {
    if (!initialData || !users.length) return;

    const toDate = (x: any) =>
      x && typeof x === 'object' && 'seconds' in x ? new Date(x.seconds * 1000) :
      x ? new Date(x) : undefined;
    
    let advisor = users.find(u => u.id === initialData.serviceAdvisorId);
    if (!advisor && initialData.serviceAdvisorName) {
        advisor = users.find(u => u.name === initialData.serviceAdvisorName);
    }
    
    methods.reset({
      ...initialData,
      status: (["Cotizacion","Agendado","En Taller","Entregado","Cancelado","Proveedor Externo"] as const)
                .includes(initialData.status as any) ? initialData.status as any : "Cotizacion",
      serviceAdvisorId: advisor?.id || initialData.serviceAdvisorId || "",
      technicianId: initialData.technicianId ? String(initialData.technicianId) : "",
      serviceAdvisorName: advisor?.name || initialData.serviceAdvisorName || "",
      technicianName: initialData.technicianName ?? "",
      serviceDate: toDate(initialData.serviceDate) ?? new Date(),
      appointmentDateTime: toDate(initialData.appointmentDateTime),
      receptionDateTime: toDate(initialData.receptionDateTime),
      deliveryDateTime: toDate(initialData.deliveryDateTime),
    });
  }, [initialData, users, methods]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const authUserString = localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY);
      const user = authUserString ? JSON.parse(authUserString) : null;

      try {
        const [usersData, vehiclesData, inventoryData, serviceTypesData, categoriesData, suppliersData, allServicesData] = await Promise.all([
          adminService.onUsersUpdatePromise(),
          inventoryService.onVehiclesUpdatePromise(),
          inventoryService.onItemsUpdatePromise(),
          inventoryService.onServiceTypesUpdatePromise(),
          inventoryService.onCategoriesUpdatePromise(),
          inventoryService.onSuppliersUpdatePromise(),
          serviceService.onServicesUpdatePromise(),
        ]);

        setUsers(usersData);
        setVehicles(vehiclesData);
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
          setInitialData({
            id: doc(collection(db, 'serviceRecords')).id,
            status: 'Cotizacion',
            serviceDate: new Date(),
            serviceAdvisorId: user.id,
            serviceAdvisorName: user.name,
          } as ServiceRecord);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [serviceId, isEditMode]);
  
  const onValidationErrors: SubmitErrorHandler<ServiceFormValues> = (errors) => {
    const errorMessages = Object.values(errors).map(e => e.message).join('\n');
    toast({
      title: "Formulario Incompleto",
      description: errorMessages || "Por favor, revise todos los campos marcados.",
      variant: "destructive",
    });
  };

  const handleShowShareDialog = useCallback(async (service: ServiceRecord, nextUrl: string) => {
    redirectUrl.current = nextUrl;
    let serviceToShare = { ...service };

    if (!serviceToShare.publicId) {
      try {
        toast({ title: "Generando enlace público..." });
        const newPublicId = generatePublicId();
        await serviceService.updateService(service.id, { publicId: newPublicId });
        serviceToShare.publicId = newPublicId;
      } catch (error) {
        console.error("Error generating public link:", error);
        toast({ title: "Error al crear enlace", description: "No se pudo generar el enlace.", variant: "destructive" });
        return;
      }
    }
  
    setRecordForPreview(serviceToShare);
    setIsShareDialogOpen(true);
  }, [toast]);

  const handleSaveService = async (values: ServiceFormValues) => {
    setIsSubmitting(true);
    try {
      const savedRecord = await serviceService.saveService(values as ServiceRecord);
      toast({ title: isEditMode ? 'Cambios Guardados' : 'Registro Creado' });

      if (savedRecord) {
        const { status } = savedRecord;
        let tab = 'historial';
        if (status === 'Cotizacion') tab = 'cotizaciones';
        else if (status === 'Agendado') tab = 'agenda';
        else if (status === 'En Taller' || status === 'Entregado') tab = 'activos';
        
        const nextUrl = `/servicios?tab=${tab}`;

        if (status === 'Cotizacion' || status === 'Agendado' || status === 'Entregado') {
          handleShowShareDialog(savedRecord, nextUrl);
        } else {
          router.push(nextUrl);
        }
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

  const formMode = initialData?.status === 'Cotizacion' ? 'quote' : 'service';
  const pageTitle = isEditMode ? `Editar ${formMode === 'quote' ? 'Cotización' : 'Servicio'} #${initialData?.folio || initialData?.id?.slice(-6)}` : `Nueva Cotización`;
  const pageDescription = isEditMode ? `Modifica los detalles del vehículo.` : "Completa los datos para crear un nuevo registro.";

  if (isLoading) {
    return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="mr-2 h-8 w-8 animate-spin" /></div>;
  }
  
  if (notFound) {
      return <div className="text-center py-10"><h1>Servicio no encontrado</h1><Button onClick={() => router.push('/servicios')}>Volver a Servicios</Button></div>
  }

  return (
    <>
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
        onCancel={formMode === 'quote' ? handleDeleteQuote : handleCancelService}
        mode={formMode}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isChecklistWizardOpen={isChecklistWizardOpen}
        setIsChecklistWizardOpen={setIsChecklistWizardOpen}
        onOpenNewVehicleDialog={() => {}}
        isNewRecord={!isEditMode}
      />
    </FormProvider>
     {recordForPreview && (
      <ShareServiceDialog 
        open={isShareDialogOpen} 
        onOpenChange={(isOpen) => {
            setIsShareDialogOpen(isOpen);
            if (!isOpen && redirectUrl.current) {
                router.push(redirectUrl.current);
            }
        }} 
        service={recordForPreview}
        vehicle={vehicles.find(v => v.id === recordForPreview.vehicleId)}
      />
    )}
    </>
  );
}
