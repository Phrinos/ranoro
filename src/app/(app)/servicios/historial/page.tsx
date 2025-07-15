

"use client";

import React, { useState, useEffect, useMemo, useCallback, Suspense, useRef } from "react";
import { useSearchParams, useRouter } from 'next/navigation';
import { ServiceDialog } from "../components/service-dialog";
import { UnifiedPreviewDialog } from '@/components/shared/unified-preview-dialog';
import { CompleteServiceDialog } from "../components/CompleteServiceDialog";
import { TableToolbar } from "@/components/shared/table-toolbar";
import type { ServiceRecord, Vehicle, Technician, InventoryItem, QuoteRecord, ServiceTypeRecord, WorkshopInfo, PaymentMethod } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { useTableManager } from "@/hooks/useTableManager";
import { isSameDay, isValid, isToday } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ServiceAppointmentCard } from "../components/ServiceAppointmentCard";
import { Loader2 } from "lucide-react";
import { operationsService, inventoryService, personnelService } from '@/lib/services';
import { db } from '@/lib/firebaseClient';
import { parseDate } from '@/lib/forms';
import { writeBatch } from 'firebase/firestore';
import { TicketContent } from '@/components/ticket-content';
import { PrintTicketDialog } from '@/components/ui/print-ticket-dialog';
import { Button } from "@/components/ui/button";
import { Printer, Copy, MessageSquare } from "lucide-react";
import html2canvas from 'html2canvas';

const serviceStatusOptions: { value: ServiceRecord['status'] | 'all'; label: string }[] = [
    { value: 'all', label: 'Todos los Estados' },
    { value: 'Agendado', label: 'Agendado' },
    { value: 'En Taller', label: 'En Taller' },
    { value: 'Entregado', label: 'Entregado' },
    { value: 'Cancelado', label: 'Cancelado' },
];

const paymentMethodOptions: { value: PaymentMethod | 'all'; label: string }[] = [
    { value: 'all', label: 'Todos los Métodos' },
    { value: 'Efectivo', label: 'Efectivo' },
    { value: 'Tarjeta', label: 'Tarjeta' },
    { value: 'Transferencia', label: 'Transferencia' },
    { value: 'Efectivo+Transferencia', label: 'Efectivo+Transferencia' },
    { value: 'Tarjeta+Transferencia', label: 'Tarjeta+Transferencia' },
];


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
  const [serviceForPreview, setServiceForPreview] = useState<ServiceRecord | null>(null);

  const [serviceToComplete, setServiceToComplete] = useState<ServiceRecord | null>(null);
  const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false);
  
  const [isTicketDialogOpen, setIsTicketDialogOpen] = useState(false);
  const [serviceForTicket, setServiceForTicket] = useState<ServiceRecord | null>(null);
  const [workshopInfo, setWorkshopInfo] = useState<WorkshopInfo | null>(null);
  const ticketContentRef = useRef<HTMLDivElement>(null);


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

    const storedWorkshopInfo = localStorage.getItem('workshopTicketInfo');
    if (storedWorkshopInfo) {
      try { setWorkshopInfo(JSON.parse(storedWorkshopInfo)); } catch (e) { console.error(e); }
    }


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
    if (!allServices) return [];
    return allServices
      .filter((s) => {
        const status = s.status;
        const serviceDate = parseDate(s.serviceDate);

        // Include services currently being worked on
        if (status === "En Taller") return true;

        // Include services scheduled for today
        if (status === "Agendado" && serviceDate && isToday(serviceDate)) {
            return true;
        }

        // Include services that were delivered or cancelled today
        const actionDate = parseDate(s.deliveryDateTime) || serviceDate;
        if ((status === "Entregado" || status === "Cancelado") && actionDate && isToday(actionDate)) {
          return true;
        }

        return false;
      })
      .sort((a, b) => {
        const statusOrder = { 'En Taller': 1, 'Agendado': 2, 'Entregado': 3, 'Cancelado': 4 };
        const orderA = statusOrder[a.status as keyof typeof statusOrder] || 99;
        const orderB = statusOrder[b.status as keyof typeof statusOrder] || 99;
        if (orderA !== orderB) return orderA - orderB;
        
        const dateA = a.serviceDate ? parseDate(a.serviceDate)?.getTime() ?? 0 : 0;
        const dateB = b.serviceDate ? parseDate(b.serviceDate)?.getTime() ?? 0 : 0;
        return dateA - dateB;
      });
  }, [allServices]);

  const {
    filteredData: historicalServices,
    setOtherFilters,
    ...tableManager
  } = useTableManager<ServiceRecord>({
    initialData: allServices.filter((s) => s.status !== "Cotizacion"),
    searchKeys: ["id", "vehicleIdentifier", "description"],
    dateFilterKey: "deliveryDateTime",
    initialSortOption: "deliveryDateTime_desc",
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

  const handleShowPreview = useCallback((service: ServiceRecord) => {
    setServiceForPreview(service);
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
      },
      nextServiceInfo?: { date: string, mileage?: number }
    ) => {
       if(!db) return toast({ title: "Error de base de datos", variant: "destructive"});
      try {
        const batch = writeBatch(db);
        const dataToUpdate = { ...paymentDetails, nextServiceInfo };
        await operationsService.completeService(service, dataToUpdate, batch);
        await batch.commit();

        toast({
            title: "Servicio Completado",
            description: `El servicio para ${service.vehicleIdentifier} ha sido marcado como entregado.`,
        });
        
        const updatedService = { ...service, ...dataToUpdate, status: 'Entregado', deliveryDateTime: new Date().toISOString() } as ServiceRecord;
        handlePrintTicket(updatedService);

      } catch (e) {
        toast({ title: "Error", description: "No se pudo completar el servicio.", variant: "destructive"});
      } finally {
        setIsCompleteDialogOpen(false);
        setIsEditDialogOpen(false);
      }
    },
    [toast]
  );

  const handleEditService = useCallback((service: ServiceRecord) => {
    setEditingService(service);
    setIsEditDialogOpen(true);
  }, []);
  
  const handlePrintTicket = useCallback((service: ServiceRecord) => {
    setServiceForTicket(service);
    setIsTicketDialogOpen(true);
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
          {activeServices && activeServices.length > 0 ? (
            activeServices.map((service) => (
              <ServiceAppointmentCard
                key={service.id}
                service={service}
                vehicles={vehicles}
                technicians={technicians}
                onEdit={() => handleEditService(service)}
                onConfirm={() => handleConfirmAppointment(service)}
                onView={() => handleShowPreview(service)}
                onComplete={() => handleOpenCompleteDialog(service)}
                 onPrintTicket={() => handlePrintTicket(service)}
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
            sortOptions={[
                { value: 'deliveryDateTime_desc', label: 'Fecha Entrega (Reciente)' },
                { value: 'deliveryDateTime_asc', label: 'Fecha Entrega (Antiguo)' },
                { value: 'totalCost_desc', label: 'Costo (Mayor a Menor)' },
                { value: 'totalCost_asc', label: 'Costo (Menor a Mayor)' },
            ]}
            filterOptions={[
                { value: 'status', label: 'Estado', options: serviceStatusOptions },
                { value: 'paymentMethod', label: 'Método de Pago', options: paymentMethodOptions },
            ]}
            otherFilters={tableManager.otherFilters}
            onFilterChange={setOtherFilters}
            searchPlaceholder="Buscar por folio, placa, descripción..."
          />
          {historicalServices && historicalServices.length > 0 ? (
            historicalServices.map((service) => (
              <ServiceAppointmentCard
                key={service.id}
                service={service}
                vehicles={vehicles}
                technicians={technicians}
                onEdit={() => handleEditService(service)}
                onConfirm={() => handleConfirmAppointment(service)}
                onView={() => handleShowPreview(service)}
                onComplete={() => handleOpenCompleteDialog(service)}
                onPrintTicket={() => handlePrintTicket(service)}
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
          onCancelService={handleCancelService}
          mode="service"
          onSave={handleSaveService}
          onComplete={handleConfirmCompletion}
        />
      )}

      {serviceToComplete && (
        <CompleteServiceDialog
          open={isCompleteDialogOpen}
          onOpenChange={setIsCompleteDialogOpen}
          service={serviceToComplete}
          onConfirm={handleConfirmCompletion}
          inventoryItems={inventoryItems}
        />
      )}

      {isSheetOpen && serviceForPreview && (
        <UnifiedPreviewDialog
          open={isSheetOpen}
          onOpenChange={setIsSheetOpen}
          service={serviceForPreview}
        />
      )}
      
       {serviceForTicket && (
        <PrintTicketDialog
            open={isTicketDialogOpen}
            onOpenChange={setIsTicketDialogOpen}
            title="Ticket de Servicio"
            dialogContentClassName="sm:max-w-md"
            footerActions={
              <div className="flex flex-col-reverse sm:flex-row gap-2">
                <Button variant="outline" onClick={() => {
                  const vehicle = vehicles.find(v => v.id === serviceForTicket.vehicleId);
                  const message = `Ticket de servicio para ${vehicle?.make} ${vehicle?.model}. Folio: ${serviceForTicket.id}`;
                  window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
                }}>
                  <MessageSquare className="mr-2 h-4 w-4" /> Copiar para WhatsApp
                </Button>
                <Button onClick={() => window.print()}><Printer className="mr-2 h-4 w-4"/>Imprimir</Button>
              </div>
            }
            contentRef={ticketContentRef}
        >
          <TicketContent
            ref={ticketContentRef}
            service={serviceForTicket}
            vehicle={vehicles.find(v => v.id === serviceForTicket.vehicleId)}
            technician={technicians.find(t => t.id === serviceForTicket.technicianId)}
            previewWorkshopInfo={workshopInfo || undefined}
          />
        </PrintTicketDialog>
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
