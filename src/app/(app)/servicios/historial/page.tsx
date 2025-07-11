
"use client";

import React, { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  addDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebaseClient";
import { ServiceDialog } from "../components/service-dialog";
import { UnifiedPreviewDialog } from "@/components/shared/unified-preview-dialog";
import { CompleteServiceDialog } from "../components/CompleteServiceDialog";
import { TableToolbar } from "@/components/shared/table-toolbar";
import type {
  ServiceRecord,
  Vehicle,
  Technician,
  InventoryItem,
  QuoteRecord,
} from "@/types";
import { useToast } from "@/hooks/use-toast";
import { useTableManager } from "@/hooks/useTableManager";
import { isSameDay, parseISO, isValid } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSearchParams } from "next/navigation";
import { ServiceAppointmentCard } from "../components/ServiceAppointmentCard";
import { Loader2 } from "lucide-react";

function HistorialServiciosPageComponent() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "activos");

  const [allServices, setAllServices] = useState<ServiceRecord[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceRecord | null>(null);

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [previewData, setPreviewData] = useState<{ service: ServiceRecord } | null>(null);

  const [serviceToComplete, setServiceToComplete] = useState<ServiceRecord | null>(null);
  const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false);

  useEffect(() => {
    const unsubscribes = [
      onSnapshot(collection(db, "serviceRecords"), (snapshot) => {
        setAllServices(
          snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as ServiceRecord))
        );
        setIsLoading(false);
      }),
      onSnapshot(collection(db, "vehicles"), (snapshot) => {
        setVehicles(
          snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Vehicle))
        );
      }),
      onSnapshot(collection(db, "technicians"), (snapshot) => {
        setTechnicians(
          snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Technician))
        );
      }),
      onSnapshot(collection(db, "inventory"), (snapshot) => {
        setInventoryItems(
          snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as InventoryItem))
        );
      }),
    ];

    return () => unsubscribes.forEach((unsub) => unsub());
  }, []);

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
      const { id, ...rest } = data;
      if (id) {
        await updateDoc(doc(db, "serviceRecords", id), rest);
      } else {
        await addDoc(collection(db, "serviceRecords"), rest);
      }
      setIsEditDialogOpen(false);
      toast({ title: "Servicio actualizado." });
    },
    [toast]
  );

  const handleCancelService = useCallback(
    async (serviceId: string, reason: string) => {
      await updateDoc(doc(db, "serviceRecords", serviceId), {
        status: "Cancelado",
        cancellationReason: reason,
      });
      toast({ title: "Servicio Cancelado" });
    },
    [toast]
  );

  const handleVehicleCreated = useCallback(
    async (newVehicle: Vehicle) => {
      const { id, ...rest } = newVehicle;
      await addDoc(collection(db, "vehicles"), rest);
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
      const batch = writeBatch(db);
      const serviceRef = doc(db, "serviceRecords", service.id);

      batch.update(serviceRef, {
        status: "Entregado",
        deliveryDateTime: new Date().toISOString(),
        ...paymentDetails,
      });

      for (const item of service.serviceItems || []) {
        for (const supply of item.suppliesUsed || []) {
          const supplyRef = doc(db, "inventory", supply.supplyId);
          const inventoryItem = inventoryItems.find(i => i.id === supply.supplyId);
          if (inventoryItem && !inventoryItem.isService) {
            batch.update(supplyRef, {
              quantity: inventoryItem.quantity - supply.quantity,
            });
          }
        }
      }

      await batch.commit();

      toast({
        title: "Servicio Completado",
        description: `El servicio para ${service.vehicleIdentifier} ha sido marcado como entregado.`,
      });
    },
    [toast, inventoryItems]
  );

  const handleEditService = useCallback((service: ServiceRecord) => {
    setEditingService(service);
    setIsEditDialogOpen(true);
  }, []);

  const handleConfirmAppointment = useCallback(
    async (service: ServiceRecord) => {
      await updateDoc(doc(db, "serviceRecords", service.id), {
        appointmentStatus: "Confirmada",
      });
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
