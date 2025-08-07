

"use client";

import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { useRouter } from 'next/navigation';
import { TabbedPageLayout } from '@/components/layout/tabbed-page-layout';
import { Loader2, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import type { ServiceRecord, Vehicle, User, InventoryItem, ServiceTypeRecord, WorkshopInfo, InventoryCategory, Supplier } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { serviceService, inventoryService, adminService, operationsService } from '@/lib/services';
import { AUTH_USER_LOCALSTORAGE_KEY } from '@/lib/placeholder-data';
import { writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';

const ActivosTabContent = lazy(() => import('./tab-activos'));
const HistorialTabContent = lazy(() => import('./tab-historial'));
const AgendaTabContent = lazy(() => import('./tab-agenda'));
const CotizacionesTabContent = lazy(() => import('./tab-cotizaciones'));
const UnifiedPreviewDialog = lazy(() => import('@/components/shared/unified-preview-dialog').then(module => ({ default: module.UnifiedPreviewDialog })));
const PaymentDetailsDialog = lazy(() => import('../components/PaymentDetailsDialog').then(module => ({ default: module.PaymentDetailsDialog })));

export function ServiciosPageComponent({ tab }: { tab?: string }) {
  const { toast } = useToast();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(tab || 'activos');

  const [allServices, setAllServices] = useState<ServiceRecord[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [personnel, setPersonnel] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [recordForPreview, setRecordForPreview] = useState<ServiceRecord | null>(null);
  
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [serviceToEditPayment, setServiceToEditPayment] = useState<ServiceRecord | null>(null);

  useEffect(() => {
    setIsLoading(true);

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
  
  const handleOpenPaymentDialog = useCallback((service: ServiceRecord) => {
    setServiceToEditPayment(service);
    setIsPaymentDialogOpen(true);
  }, []);

  const handleUpdatePaymentDetails = useCallback(async (serviceId: string, paymentDetails: any) => {
    await serviceService.updateService(serviceId, paymentDetails);
    toast({ title: "Detalles de Pago Actualizados" });
    setIsPaymentDialogOpen(false);
  }, [toast]);
  
  const handleConfirmCompletion = useCallback(async (service: ServiceRecord, paymentDetails: any, nextServiceInfo?: any) => {
    if(!db) return toast({ title: "Error de base de datos", variant: "destructive"});
    try {
      const batch = writeBatch(db);
      await serviceService.completeService(service, { ...paymentDetails, nextServiceInfo }, batch);
      await batch.commit();
      toast({ title: "Servicio Completado" });
      const updatedService = { ...service, ...paymentDetails, status: 'Entregado', deliveryDateTime: new Date().toISOString() } as ServiceRecord;
      setRecordForPreview(updatedService); // Show the completed record in preview
      setIsPreviewOpen(true);
    } catch (e) {
      toast({ title: "Error", description: "No se pudo completar el servicio.", variant: "destructive"});
    } finally {
      setIsPaymentDialogOpen(false);
    }
  }, [toast]);
  
  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  const pageActions = (
    <Button asChild>
      <Link href="/servicios/nuevo">
        <PlusCircle className="mr-2 h-4 w-4" /> Nuevo Servicio
      </Link>
    </Button>
  );

  const tabs = [
    { value: 'activos', label: 'Activos (Hoy)', content: <ActivosTabContent allServices={allServices} vehicles={vehicles} personnel={personnel} onShowPreview={handleShowPreview} onCompleteService={handleOpenPaymentDialog} /> },
    { value: 'agenda', label: 'Agenda', content: <AgendaTabContent services={allServices} vehicles={vehicles} personnel={personnel} onShowPreview={handleShowPreview} /> },
    { value: 'cotizaciones', label: 'Cotizaciones', content: <CotizacionesTabContent services={allServices} vehicles={vehicles} personnel={personnel} onShowPreview={handleShowPreview} /> },
    { value: 'historial', label: 'Historial', content: <HistorialTabContent services={allServices} vehicles={vehicles} personnel={personnel} onShowPreview={handleShowPreview} onEditPayment={handleOpenPaymentDialog} /> }
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
        {serviceToEditPayment && (
          <PaymentDetailsDialog
            open={isPaymentDialogOpen}
            onOpenChange={setIsPaymentDialogOpen}
            record={serviceToEditPayment}
            onConfirm={(id, details) => handleUpdatePaymentDetails(id, details)}
            isCompletionFlow={serviceToEditPayment.status !== 'Entregado'}
          />
        )}
      </Suspense>
    </>
  );
}
