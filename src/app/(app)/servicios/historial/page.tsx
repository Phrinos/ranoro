

"use client";

import React, { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from 'next/navigation';
import { ServiceDialog } from "../components/service-dialog";
import { UnifiedPreviewDialog } from '@/components/shared/unified-preview-dialog';
import { CompleteServiceDialog } from "../components/CompleteServiceDialog";
import { TableToolbar } from "@/components/shared/table-toolbar";
import type { ServiceRecord, Vehicle, Technician, InventoryItem, QuoteRecord, ServiceTypeRecord } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { useTableManager } from "@/hooks/useTableManager";
import { isSameDay, parseISO, isValid } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ServiceAppointmentCard } from "../components/ServiceAppointmentCard";
import { Loader2 } from "lucide-react";
import { operationsService, inventoryService, personnelService } from '@/lib/services';
import { collection, onSnapshot, doc, getDoc, updateDoc, addDoc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';

function HistorialServiciosPageComponent() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "activos");

  const [allServices, setAllServices] = useState<ServiceRecord[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceTypeRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceRecord | null>(null);

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [previewData, setPreviewData] = useState<{ service: ServiceRecord } | null>(null);

  const [serviceToComplete, setServiceToComplete] = useState<ServiceRecord | null>(null);
  const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false);

  useEffect(() => {
    const unsubs = [
      operationsService.onServicesUpdate(setAllServices),
      inventoryService.onVehiclesUpdate(setVehicles),
      personnelService.onTechniciansUpdate(setTechnicians),
      inventoryService.onItemsUpdate(setInventoryItems),
      inventoryService.onServiceTypesUpdate((data) => {
          setServiceTypes(data);
          setIsLoading(false);
      }),
    ];

    return () => unsubs.forEach((unsub) => unsub());
  }, []);

  // Effect to handle opening a service for editing via URL param
  useEffect(() => {
    const serviceId = searchParams.get('id');
    const editMode = searchParams.get('edit');

    if (editMode === 'true' && serviceId && allServices.length > 0) {
      const serviceToEdit = allServices.find(s => s.id === serviceId);
      if (serviceToEdit) {
        handleEditService(serviceToEdit);
        // Clean up URL params after opening dialog
        const newUrl = window.location.pathname;
        router.replace(newUrl, { scroll: false });
      }
    }
  }, [searchParams, allServices, router]);


  const activeServices = useMemo(() => {
    const today = new Date();
    return allServices
      .filter((s) => {
        const status = s.status as string;
        const deliveryDate = s.deliveryDateTime
          ? parseISO(s.deliveryDateTime)
          : null;
        const isDeliveredToday =
          deliveryDate && isValid(deliveryDate) && isSameDay(deliveryDate, today);

        const serviceDate = s.serviceDate ? parseISO(s.serviceDate) : null;
        const isScheduledForToday =
          serviceDate && isValid(serviceDate) && isSameDay(serviceDate, today);

        if (status === "En Taller" || status === "Reparando") return true;
        if ((status === "Entregado" || status === "Completado") && isDeliveredToday)
          return true;
        if (status === "Agendado" && isScheduledForToday) return true;

        return false;
      })
      .sort((a, b) => {
        const dateA = a.serviceDate ? parseISO(a.serviceDate) : new Date(0);
        const dateB = b.serviceDate ? parseISO(b.serviceDate) : new Date(0);
        return isValid(dateA) && isValid(dateB)
          ? dateA.getTime() - dateB.getTime()
          : 0;
      });
  }, [allServices]);

  const {
    filteredData: historicalServices,
    ...tableManager
  } = useTableManager<ServiceRecord>({
    initialData: allServices.filter((s) => s.status !== "Cotizacion"),
    searchKeys: ["id", "vehicleIdentifier", "description"],
    dateFilterKey: "serviceDate",
    initialSortOption: "date_desc",
  });

  const handleSaveService = useCallback(
    async (data: QuoteRecord | ServiceRecord) => {
      try {
        await operationsService.saveService(data);
        setIsEditDialogOpen(false);
        toast({ title: "Servicio actualizado." });
      } catch (e) {
        toast({ title: "Error", description: "No se pudo actualizar el servicio.", variant: "destructive"});
      }
    },
    [toast]
  );

  const handleCancelService = useCallback(
    async (serviceId: string, reason: string) => {
      try {
        await operationsService.cancelService(serviceId, reason);
        toast({ title: "Servicio Cancelado" });
      } catch (e) {
        toast({ title: "Error", description: "No se pudo cancelar el servicio.", variant: "destructive"});
      }
    },
    [toast]
  );

  const handleVehicleCreated = useCallback(
    async (newVehicle: any) => {
      await inventoryService.addVehicle(newVehicle);
    },
    []
  );

  const handleShowPreview = useCallback((service: ServiceRecord) => {
    setPreviewData({ service });
    setIsSheetOpen(true);
  }, []);

  const handleOpenCompleteDialog = useCallback((service: ServiceRecord) => {
    setServiceToComplete(service);
    setIsCompleteDialogOpen(true);
  }, []);

  const handleConfirmCompletion = useCallback(
    async (
      service: ServiceRecord,
      paymentDetails: {
        paymentMethod: any;
        cardFolio?: string;
        transferFolio?: string;
      }
    ) => {
       if(!db) return toast({ title: "Error de base de datos", variant: "destructive"});
      try {
        const batch = writeBatch(db);
        await operationsService.completeService(service, paymentDetails, batch);
        await batch.commit();

        toast({
            title: "Servicio Completado",
            description: `El servicio para ${service.vehicleIdentifier} ha sido marcado como entregado.`,
        });
      } catch (e) {
        toast({ title: "Error", description: "No se pudo completar el servicio.", variant: "destructive"});
      }
    },
    [toast]
  );

  const handleEditService = useCallback((service: ServiceRecord) => {
    setEditingService(service);
    setIsEditDialogOpen(true);
  }, []);

  const handleConfirmAppointment = useCallback(
    async (service: ServiceRecord) => {
      await operationsService.updateService(service.id, { appointmentStatus: "Confirmada" });
      toast({ title: "Cita Confirmada" });
    },
    [toast]
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div className="bg-primary text-primary-foreground rounded-lg p-6 mb-6">
        <h1 className="text-3xl font-bold tracking-tight">
          Gestión de Servicios
        </h1>
        <p className="text-primary-foreground/80 mt-1">
          Consulta, filtra y gestiona todas las órdenes de servicio del taller.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger
            value="activos"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            Servicios Activos
          </TabsTrigger>
          <TabsTrigger
            value="historial"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            Historial
          </TabsTrigger>
        </TabsList>

        <TabsContent value="activos" className="mt-0 space-y-4">
          {activeServices.length > 0 ? (
            activeServices.map((service) => (
              <ServiceAppointmentCard
                key={service.id}
                service={service}
                vehicles={vehicles}
                onEdit={() => handleEditService(service)}
                onConfirm={() => handleConfirmAppointment(service)}
                onView={() => handleShowPreview(service)}
                onComplete={() => handleOpenCompleteDialog(service)}
                onCancel={() => {
                  if (service.id) {
                    const reason = prompt("Motivo de la cancelación:");
                    if (reason) handleCancelService(service.id, reason);
                  }
                }}
              />
            ))
          ) : (
            <p className="text-center text-muted-foreground py-10">
              No hay servicios activos para hoy.
            </p>
          )}
        </TabsContent>

        <TabsContent value="historial" className="mt-0 space-y-4">
          <TableToolbar
            searchTerm={tableManager.searchTerm}
            onSearchTermChange={tableManager.setSearchTerm}
            dateRange={tableManager.dateRange}
            onDateRangeChange={tableManager.setDateRange}
            sortOption={tableManager.sortOption}
            onSortOptionChange={tableManager.setSortOption}
            searchPlaceholder="Buscar por folio, placa, descripción..."
          />
          {historicalServices.length > 0 ? (
            historicalServices.map((service) => (
              <ServiceAppointmentCard
                key={service.id}
                service={service}
                vehicles={vehicles}
                onEdit={() => handleEditService(service)}
                onConfirm={() => handleConfirmAppointment(service)}
                onView={() => handleShowPreview(service)}
                onComplete={() => handleOpenCompleteDialog(service)}
                onCancel={() => {
                  if (service.id) {
                    const reason = prompt("Motivo de la cancelación:");
                    if (reason) handleCancelService(service.id, reason);
                  }
                }}
              />
            ))
          ) : (
            <p className="text-center text-muted-foreground py-10">
              No hay servicios en el historial que coincidan con los filtros.
            </p>
          )}
        </TabsContent>
      </Tabs>

      {isEditDialogOpen && (
        <ServiceDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          service={editingService}
          vehicles={vehicles}
          technicians={technicians}
          inventoryItems={inventoryItems}
          serviceTypes={serviceTypes}
          onVehicleCreated={handleVehicleCreated}
          onCancelService={handleCancelService}
          mode="service"
          onSave={handleSaveService}
        />
      )}

      {serviceToComplete && (
        <CompleteServiceDialog
          open={isCompleteDialogOpen}
          onOpenChange={setIsCompleteDialogOpen}
          service={serviceToComplete}
          onConfirm={handleConfirmCompletion}
        />
      )}

      {isSheetOpen && previewData && (
        <UnifiedPreviewDialog
          open={isSheetOpen}
          onOpenChange={setIsSheetOpen}
          service={previewData.service}
          vehicle={vehicles.find(v => v.id === previewData.service.vehicleId) || null}
          associatedQuote={null}
        />
      )}
    </>
  );
}

export default function HistorialServiciosPageWrapper() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <HistorialServiciosPageComponent />
    </Suspense>
  );
}
