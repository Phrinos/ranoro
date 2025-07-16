
"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { ServiceDialog } from "../../components/service-dialog";
import { UnifiedPreviewDialog } from '@/components/shared/unified-preview-dialog';
import { CompleteServiceDialog } from "../../components/CompleteServiceDialog";
import { TableToolbar } from "@/components/shared/table-toolbar";
import type { ServiceRecord, Vehicle, Technician, InventoryItem, QuoteRecord, ServiceTypeRecord, WorkshopInfo, PaymentMethod } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { useTableManager } from "@/hooks/useTableManager";
import { isToday } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ServiceAppointmentCard } from "../../components/ServiceAppointmentCard";
import { Loader2 } from "lucide-react";
import { operationsService, inventoryService, personnelService } from '@/lib/services';
import { db } from '@/lib/firebaseClient';
import { parseDate } from '@/lib/forms';
import { writeBatch } from 'firebase/firestore';
import { TicketContent } from '@/components/ticket-content';
import { PrintTicketDialog } from '@/components/ui/print-ticket-dialog';
import { Button } from "@/components/ui/button";
import { Printer, Copy, MessageSquare } from "lucide-react";

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

export function HistorialServiciosPageComponent({ status }: { status?: string }) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState(status || "activos");

  const [allServicesAndQuotes, setAllServicesAndQuotes] = useState<ServiceRecord[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceTypeRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ServiceRecord | null>(null);
  const [formMode, setFormMode] = useState<'service' | 'quote'>('service');

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [recordForPreview, setRecordForPreview] = useState<ServiceRecord | null>(null);

  const [serviceToComplete, setServiceToComplete] = useState<ServiceRecord | null>(null);
  const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false);
  
  const [isTicketDialogOpen, setIsTicketDialogOpen] = useState(false);
  const [recordForTicket, setRecordForTicket] = useState<ServiceRecord | null>(null);
  const [workshopInfo, setWorkshopInfo] = useState<WorkshopInfo | null>(null);
  const ticketContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubs = [
      operationsService.onServicesUpdate(setAllServicesAndQuotes),
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

  const { activeServices, historicalServices, quotes } = useMemo(() => {
    const allRecords = allServicesAndQuotes || [];
    const active = allRecords.filter(s => {
      const status = s.status;
      const serviceDate = parseDate(s.serviceDate);
      if (status === "En Taller") return true;
      if (status === "Agendado" && serviceDate && isToday(serviceDate)) return true;
      const actionDate = parseDate(s.deliveryDateTime) || serviceDate;
      if ((status === "Entregado" || status === "Cancelado") && actionDate && isToday(actionDate)) return true;
      return false;
    }).sort((a, b) => {
      const statusOrder = { 'En Taller': 1, 'Agendado': 2, 'Entregado': 3, 'Cancelado': 4 };
      return (statusOrder[a.status as keyof typeof statusOrder] || 99) - (statusOrder[b.status as keyof typeof statusOrder] || 99) || (parseDate(a.serviceDate)?.getTime() ?? 0) - (parseDate(b.serviceDate)?.getTime() ?? 0);
    });
    
    const historical = allRecords.filter(s => s.status !== 'Cotizacion');
    const quotesList = allRecords.filter(s => s.status === 'Cotizacion');
    
    return { activeServices: active, historicalServices: historical, quotes: quotesList };
  }, [allServicesAndQuotes]);

  const { filteredData: filteredHistorical, ...historicalTableManager } = useTableManager<ServiceRecord>({
    initialData: historicalServices,
    searchKeys: ["id", "vehicleIdentifier", "description"],
    dateFilterKey: "deliveryDateTime",
    initialSortOption: "deliveryDateTime_desc",
  });

  const { filteredData: filteredQuotes, ...quotesTableManager } = useTableManager<ServiceRecord>({
    initialData: quotes,
    searchKeys: ['id', 'vehicleIdentifier', 'description'],
    dateFilterKey: 'quoteDate',
    initialSortOption: 'date_desc',
  });

  const handleSaveRecord = useCallback(async (data: QuoteRecord | ServiceRecord) => {
    try {
      await operationsService.saveService(data);
      setIsFormDialogOpen(false);
      toast({ title: `${formMode === 'quote' ? 'Cotización' : 'Servicio'} actualizado.` });
    } catch (e) {
      toast({ title: "Error", description: `No se pudo guardar el registro.`, variant: "destructive"});
    }
  }, [toast, formMode]);

  const handleCancelRecord = useCallback(async (serviceId: string, reason: string) => {
    try {
      await operationsService.cancelService(serviceId, reason);
      toast({ title: `${formMode === 'quote' ? 'Cotización' : 'Servicio'} cancelado/a.` });
      setIsFormDialogOpen(false);
    } catch (e) {
      toast({ title: "Error", description: "No se pudo cancelar el registro.", variant: "destructive"});
    }
  }, [toast, formMode]);

  const handleShowPreview = useCallback((service: ServiceRecord) => {
    setRecordForPreview(service);
    setIsPreviewOpen(true);
  }, []);

  const handleOpenFormDialog = useCallback((record: ServiceRecord) => {
    setFormMode(record.status === 'Cotizacion' ? 'quote' : 'service');
    setEditingRecord(record);
    setIsFormDialogOpen(true);
  }, []);

  const handleOpenCompleteDialog = useCallback((service: ServiceRecord) => {
    setServiceToComplete(service);
    setIsCompleteDialogOpen(true);
  }, []);

  const handleConfirmCompletion = useCallback(async (service: ServiceRecord, paymentDetails: any, nextServiceInfo?: any) => {
     if(!db) return toast({ title: "Error de base de datos", variant: "destructive"});
    try {
      const batch = writeBatch(db);
      await operationsService.completeService(service, { ...paymentDetails, nextServiceInfo }, batch);
      await batch.commit();
      toast({ title: "Servicio Completado" });
      const updatedService = { ...service, ...paymentDetails, status: 'Entregado', deliveryDateTime: new Date().toISOString() } as ServiceRecord;
      setRecordForTicket(updatedService);
      setIsTicketDialogOpen(true);
    } catch (e) {
      toast({ title: "Error", description: "No se pudo completar el servicio.", variant: "destructive"});
    } finally {
      setIsCompleteDialogOpen(false);
      setIsFormDialogOpen(false);
    }
  }, [toast]);
  
  const handlePrintTicket = useCallback((record: ServiceRecord) => {
    setRecordForTicket(record);
    setIsTicketDialogOpen(true);
  }, []);

  const handleConfirmAppointment = useCallback(async (service: ServiceRecord) => {
    await operationsService.updateService(service.id, { appointmentStatus: "Confirmada" });
    toast({ title: "Cita Confirmada" });
  }, [toast]);

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  const renderServiceCard = (record: ServiceRecord) => (
    <ServiceAppointmentCard 
      key={record.id}
      service={record}
      vehicles={vehicles}
      technicians={technicians}
      onEdit={() => handleOpenFormDialog(record)}
      onView={() => handleShowPreview(record)}
      onComplete={() => handleOpenCompleteDialog(record)}
      onPrintTicket={() => handlePrintTicket(record)}
      onConfirm={() => handleConfirmAppointment(record)}
      onCancel={() => {
        if (record.id) {
          const reason = prompt("Motivo de la cancelación:");
          if (reason) handleCancelRecord(record.id, reason);
        }
      }}
    />
  );

  return (
    <>
      <div className="bg-primary text-primary-foreground rounded-lg p-6 mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Gestión de Taller</h1>
        <p className="text-primary-foreground/80 mt-1">Consulta servicios activos, historial y cotizaciones.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="activos">Servicios Activos</TabsTrigger>
          <TabsTrigger value="historial">Historial</TabsTrigger>
          <TabsTrigger value="cotizaciones">Cotizaciones</TabsTrigger>
        </TabsList>

        <TabsContent value="activos" className="mt-0 space-y-4">
          {activeServices.length > 0 ? activeServices.map(renderServiceCard) : <p className="text-center text-muted-foreground py-10">No hay servicios activos para hoy.</p>}
        </TabsContent>

        <TabsContent value="historial" className="mt-0 space-y-4">
          <TableToolbar {...historicalTableManager} filterOptions={[{ value: 'status', label: 'Estado', options: serviceStatusOptions }, { value: 'paymentMethod', label: 'Método de Pago', options: paymentMethodOptions }]} searchPlaceholder="Buscar por folio, placa..." />
          {filteredHistorical.length > 0 ? filteredHistorical.map(renderServiceCard) : <p className="text-center text-muted-foreground py-10">No hay servicios que coincidan.</p>}
        </TabsContent>
        
        <TabsContent value="cotizaciones" className="mt-0 space-y-4">
          <TableToolbar {...quotesTableManager} searchPlaceholder="Buscar por folio, vehículo..." />
          {filteredQuotes.length > 0 ? filteredQuotes.map(renderServiceCard) : <p className="text-center text-muted-foreground py-10">No hay cotizaciones que coincidan.</p>}
        </TabsContent>
      </Tabs>

      {isFormDialogOpen && (
        <ServiceDialog
          open={isFormDialogOpen}
          onOpenChange={setIsFormDialogOpen}
          service={editingRecord}
          vehicles={vehicles}
          technicians={technicians}
          inventoryItems={inventoryItems}
          serviceTypes={serviceTypes}
          onCancelService={handleCancelRecord}
          mode={formMode}
          onSave={handleSaveRecord}
          onComplete={handleConfirmCompletion}
        />
      )}
      
      {serviceToComplete && <CompleteServiceDialog open={isCompleteDialogOpen} onOpenChange={setIsCompleteDialogOpen} service={serviceToComplete} onConfirm={handleConfirmCompletion} inventoryItems={inventoryItems}/>}
      {isPreviewOpen && recordForPreview && <UnifiedPreviewDialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen} service={recordForPreview}/>}
      {recordForTicket && <PrintTicketDialog open={isTicketDialogOpen} onOpenChange={setIsTicketDialogOpen} title="Ticket de Servicio" contentRef={ticketContentRef}><TicketContent ref={ticketContentRef} service={recordForTicket} vehicle={vehicles.find(v => v.id === recordForTicket.vehicleId)} technician={technicians.find(t => t.id === recordForTicket.technicianId)} previewWorkshopInfo={workshopInfo || undefined}/></PrintTicketDialog>}
    </>
  );
}
