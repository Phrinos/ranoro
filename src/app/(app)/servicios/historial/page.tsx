
"use client";

import React, { useState, useEffect, useMemo, useCallback, Suspense, useRef } from "react";
import { ServiceList } from "../components/service-list";
import { ServiceDialog } from "../components/service-dialog";
import { UnifiedPreviewDialog } from '@/components/shared/unified-preview-dialog';
import { CompleteServiceDialog } from '../components/CompleteServiceDialog';
import { PrintTicketDialog } from '@/components/ui/print-ticket-dialog';
import { TicketContent } from '@/components/ticket-content';
import { TableToolbar } from '@/components/shared/table-toolbar';
import type { ServiceRecord, Vehicle, Technician, InventoryItem, QuoteRecord, User } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { useTableManager } from '@/hooks/useTableManager';
import { isToday, parseISO, isValid } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSearchParams } from "next/navigation";

import { operationsService } from '@/lib/services/operations.service';
import { personnelService } from '@/lib/services/personnel.service';
import { inventoryService } from '@/lib/services/inventory.service';
import { adminService } from '@/lib/services/admin.service';


function HistorialServiciosPageComponent() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'activos');
  
  const [allServices, setAllServices] = useState<ServiceRecord[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]); 
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [version, setVersion] = useState(0);

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceRecord | null>(null);
  
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [previewData, setPreviewData] = useState<{ service: ServiceRecord; } | null>(null);

  const [serviceToComplete, setServiceToComplete] = useState<ServiceRecord | null>(null);
  const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false);
  
  const [isTicketDialogOpen, setIsTicketDialogOpen] = useState(false);
  const [ticketData, setTicketData] = useState<{service: ServiceRecord, vehicle?: Vehicle, technician?: Technician} | null>(null);
  const ticketContentRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const loadData = async () => {
        setAllServices(await operationsService.getServices());
        setVehicles(await inventoryService.getVehicles());
        setTechnicians(await personnelService.getTechnicians());
        setInventoryItems(await inventoryService.getItems());
    };
    loadData();

    const handleDbUpdate = () => setVersion(v => v + 1);
    window.addEventListener('databaseUpdated', handleDbUpdate);
    return () => window.removeEventListener('databaseUpdated', handleDbUpdate);
  }, []);

  useEffect(() => {
    const updateData = async () => {
        setAllServices(await operationsService.getServices());
        setVehicles(await inventoryService.getVehicles());
        setTechnicians(await personnelService.getTechnicians());
        setInventoryItems(await inventoryService.getItems());
    };
    if (version > 0) updateData();
  }, [version]);
  
  const activeServices = useMemo(() => {
    return allServices.filter(s => {
      const isScheduledForToday = s.status === 'Agendado' && s.serviceDate && isValid(parseISO(s.serviceDate)) && isToday(parseISO(s.serviceDate));
      const isInWorkshop = s.status === 'En Taller';
      return isScheduledForToday || isInWorkshop;
    }).sort((a,b) => parseISO(a.serviceDate).getTime() - parseISO(b.serviceDate).getTime());
  }, [allServices]);

  const {
    filteredData: historicalServices,
    TableToolbarComponent,
  } = useTableManager({
    initialData: allServices.filter(s => s.status !== 'Cotizacion'),
    initialSortOption: 'serviceDate_desc',
    searchKeys: ['id', 'vehicleIdentifier', 'description'],
    dateFilterKey: 'serviceDate'
  });

  const handleSaveService = useCallback(async (data: QuoteRecord | ServiceRecord) => {
    await operationsService.updateService(data.id!, data as ServiceRecord);
    setIsEditDialogOpen(false);
  }, []);

  const handleCancelService = useCallback(async (serviceId: string, reason: string) => {
    await operationsService.cancelService(serviceId, reason);
    toast({ title: "Servicio Cancelado" });
  }, [toast]);

  const handleVehicleCreated = useCallback(async (newVehicle: Vehicle) => {
    await inventoryService.addVehicle(newVehicle);
  }, []);

  const handleShowPreview = useCallback((service: ServiceRecord) => {
    setPreviewData({ service });
    setIsSheetOpen(true);
  }, []);

  const handleOpenCompleteDialog = useCallback((service: ServiceRecord) => {
    setServiceToComplete(service);
    setIsCompleteDialogOpen(true);
  }, []);
  
  const handleConfirmCompletion = useCallback(async (service: ServiceRecord, paymentDetails: { paymentMethod: any, cardFolio?: string, transferFolio?: string }) => {
    const updatedService = await operationsService.completeService(service.id, paymentDetails);
    
    toast({
      title: "Servicio Completado",
      description: `El servicio para ${service.vehicleIdentifier} ha sido marcado como entregado.`,
    });
    
    setTicketData({
        service: updatedService,
        vehicle: await inventoryService.getVehicleById(updatedService.vehicleId),
        technician: await personnelService.getTechnicianById(updatedService.technicianId),
    });
    setIsTicketDialogOpen(true);
  }, [toast]);

  return (
    <>
      <div className="bg-primary text-primary-foreground rounded-lg p-6 mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Servicios</h1>
          <p className="text-primary-foreground/80 mt-1">Consulta, filtra y gestiona todas las órdenes de servicio del taller.</p>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="activos" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Servicios Activos</TabsTrigger>
              <TabsTrigger value="historial" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Historial</TabsTrigger>
          </TabsList>
          
          <TabsContent value="activos" className="mt-0 space-y-4">
              <ServiceList services={activeServices} vehicles={vehicles} technicians={technicians} onEdit={(s) => {setEditingService(s); setIsEditDialogOpen(true);}} onView={handleShowPreview} onComplete={handleOpenCompleteDialog}/>
          </TabsContent>
          
          <TabsContent value="historial" className="mt-0 space-y-4">
            <TableToolbarComponent />
            <ServiceList services={historicalServices} vehicles={vehicles} technicians={technicians} onEdit={(s) => {setEditingService(s); setIsEditDialogOpen(true);}} onView={handleShowPreview} onComplete={handleOpenCompleteDialog}/>
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

      {isPreviewOpen && previewData && (
        <UnifiedPreviewDialog
          open={isSheetOpen}
          onOpenChange={setIsSheetOpen}
          service={previewData.service}
        />
      )}
      
      {ticketData && (
         <PrintTicketDialog open={isTicketDialogOpen} onOpenChange={setIsTicketDialogOpen} title="Comprobante de Servicio" onDialogClose={() => setTicketData(null)}>
          <TicketContent ref={ticketContentRef} service={ticketData.service} vehicle={ticketData.vehicle} technician={ticketData.technician} />
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
    )
}
