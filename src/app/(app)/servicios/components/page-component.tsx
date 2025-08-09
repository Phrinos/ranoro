
// src/app/(app)/servicios/components/page-component.tsx
"use client";

import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { useRouter } from 'next/navigation';
import { TabbedPageLayout } from '@/components/layout/tabbed-page-layout';
import { Loader2, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import type { ServiceRecord, Vehicle, User } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { inventoryService, adminService, serviceService } from '@/lib/services';
import { AUTH_USER_LOCALSTORAGE_KEY } from '@/lib/placeholder-data';
import { writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';

const ActivosTabContent = lazy(() => import('./tab-activos'));
const HistorialTabContent = lazy(() => import('./tab-historial'));
const AgendaTabContent = lazy(() => import('./tab-agenda'));
const CotizacionesTabContent = lazy(() => import('./tab-cotizaciones'));
const UnifiedPreviewDialog = lazy(() => import('@/components/shared/unified-preview-dialog').then(module => ({ default: module.UnifiedPreviewDialog })));
const PaymentDetailsDialog = lazy(() => import('@/components/shared/PaymentDetailsDialog').then(module => ({ default: module.PaymentDetailsDialog })));

export function ServiciosPageComponent({ tab }: { tab?: string }) {
  const { toast } = useToast();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(tab || 'activos');

  // Unified state for all services
  const [allServices, setAllServices] = useState<ServiceRecord[]>([]);
  
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [personnel, setPersonnel] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [recordForPreview, setRecordForPreview] = useState<ServiceRecord | null>(null);
  
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [serviceToComplete, setServiceToComplete] = useState<ServiceRecord | null>(null);

  useEffect(() => {
    const authUserString = typeof window !== 'undefined' ? localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY) : null;
    if (authUserString) {
      try { setCurrentUser(JSON.parse(authUserString)); } catch (e) { console.error("Error parsing auth user", e); }
    }

    const unsubs = [
        serviceService.onServicesUpdate((services) => {
            setAllServices(services);
            setIsLoading(false);
        }),
        inventoryService.onVehiclesUpdate(setVehicles),
        adminService.onUsersUpdate(setPersonnel),
    ];
    
    return () => unsubs.forEach((unsub) => unsub());
  }, []);

  const handleShowPreview = useCallback((service: ServiceRecord) => {
    setRecordForPreview(service);
    setIsPreviewOpen(true);
  }, []);

  const handleOpenCompletionDialog = useCallback((service: ServiceRecord) => {
    setServiceToComplete(service);
    setIsPaymentDialogOpen(true);
  }, []);
  
  const handleConfirmCompletion = useCallback(async (service: ServiceRecord, paymentDetails: any, nextServiceInfo?: any) => {
    if(!db) return toast({ title: "Error de base de datos", variant: "destructive"});
    try {
      const batch = writeBatch(db);
      await serviceService.completeService(service, { ...paymentDetails, nextServiceInfo }, batch);
      await batch.commit();
      toast({ title: "Servicio Completado" });
      const updatedService = { ...service, ...paymentDetails, status: 'Entregado', deliveryDateTime: new Date().toISOString() } as ServiceRecord;
      setRecordForPreview(updatedService);
      setIsPreviewOpen(true);
    } catch (e) {
      toast({ title: "Error", description: "No se pudo completar el servicio.", variant: "destructive"});
    } finally {
      setIsPaymentDialogOpen(false);
    }
  }, [toast]);
  
  const handleDeleteService = async (serviceId: string) => {
    try {
        await serviceService.deleteService(serviceId);
        toast({ title: "Servicio Eliminado", description: `El registro ha sido eliminado permanentemente.` });
    } catch(e) {
        toast({ title: "Error al Eliminar", description: `No se pudo eliminar el servicio. ${e instanceof Error ? e.message : ''}`, variant: "destructive"});
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  const pageActions = (
    <Button asChild className="bg-white text-black hover:bg-gray-200">
      <Link href="/servicios/nuevo">
        <PlusCircle className="mr-2 h-4 w-4" /> Nuevo Servicio
      </Link>
    </Button>
  );

  const tabs = [
    { value: 'activos', label: 'Activos', content: <ActivosTabContent allServices={allServices} vehicles={vehicles} personnel={personnel} onShowPreview={handleShowPreview} onCompleteService={handleOpenCompletionDialog} currentUser={currentUser} onDelete={handleDeleteService} /> },
    { value: 'agenda', label: 'Agenda', content: <AgendaTabContent services={allServices} vehicles={vehicles} personnel={personnel} onShowPreview={handleShowPreview} /> },
    { value: 'cotizaciones', label: 'Cotizaciones', content: <CotizacionesTabContent services={allServices} vehicles={vehicles} personnel={personnel} onShowPreview={handleShowPreview} currentUser={currentUser} onDelete={handleDeleteService}/> },
    { value: 'historial', label: 'Historial', content: <HistorialTabContent services={allServices} vehicles={vehicles} personnel={personnel} onShowPreview={handleShowPreview} currentUser={currentUser} onDelete={handleDeleteService} /> }
  ];

  return (
    <>
      <TabbedPageLayout
        title="Gestión de Servicios"
        description="Planifica, gestiona y consulta todo el ciclo de vida de los servicios."
        activeTab={activeTab}
        onTabChange={setActiveTab}
        tabs={tabs}
        actions={pageActions}
      />
      <Suspense fallback={null}>
        {isPreviewOpen && recordForPreview && (
          <UnifiedPreviewDialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen} service={recordForPreview} />
        )}
        {serviceToComplete && (
          <PaymentDetailsDialog
            open={isPaymentDialogOpen}
            onOpenChange={setIsPaymentDialogOpen}
            record={serviceToComplete}
            onConfirm={(id, details) => handleConfirmCompletion(serviceToComplete, details, serviceToComplete.nextServiceInfo)}
            recordType="service"
            isCompletionFlow={true}
          />
        )}
      </Suspense>
    </>
  );
}
