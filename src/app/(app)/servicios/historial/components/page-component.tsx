

"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { ServiceDialog } from "../../components/service-dialog";
import { UnifiedPreviewDialog } from '@/components/shared/unified-preview-dialog';
import { PaymentDetailsDialog, type PaymentDetailsFormValues } from '../../components/PaymentDetailsDialog';
import { TableToolbar } from '@/components/shared/table-toolbar';
import type { ServiceRecord, Vehicle, Technician, InventoryItem, QuoteRecord, ServiceTypeRecord, WorkshopInfo, PaymentMethod, User } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { useTableManager } from "@/hooks/useTableManager";
import { isToday, startOfMonth, endOfMonth, compareDesc } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ServiceAppointmentCard } from '../../components/ServiceAppointmentCard';
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { operationsService, inventoryService, personnelService, adminService } from '@/lib/services';
import { db } from '@/lib/firebaseClient';
import { parseDate } from '@/lib/forms';
import { writeBatch } from 'firebase/firestore';
import { TicketContent } from '@/components/ticket-content';
import { PrintTicketDialog } from '@/components/ui/print-ticket-dialog';
import { Button } from "@/components/ui/button";
import { Printer, Copy, MessageSquare, Share2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

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
    { value: 'Efectivo/Tarjeta', label: 'Efectivo/Tarjeta' },
];

export function HistorialServiciosPageComponent({ status }: { status?: string }) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState(status || "activos");

  const [allServices, setAllServices] = useState<ServiceRecord[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [personnel, setPersonnel] = useState<User[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceTypeRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ServiceRecord | null>(null);

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [recordForPreview, setRecordForPreview] = useState<ServiceRecord | null>(null);
  
  const [isTicketDialogOpen, setIsTicketDialogOpen] = useState(false);
  const [recordForTicket, setRecordForTicket] = useState<ServiceRecord | null>(null);
  const [workshopInfo, setWorkshopInfo] = useState<WorkshopInfo | null>(null);
  const ticketContentRef = useRef<HTMLDivElement>(null);
  
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [serviceToEditPayment, setServiceToEditPayment] = useState<ServiceRecord | null>(null);


  useEffect(() => {
    setIsLoading(true);
    const unsubs = [
      operationsService.onServicesUpdate((services) => {
        setAllServices(services.filter(s => s.status !== 'Cotizacion'));
        setIsLoading(false); 
      }),
      inventoryService.onVehiclesUpdate(setVehicles),
      adminService.onUsersUpdate(setPersonnel),
      inventoryService.onItemsUpdate(setInventoryItems),
      inventoryService.onServiceTypesUpdate(setServiceTypes),
    ];

    const storedWorkshopInfo = localStorage.getItem('workshopTicketInfo');
    if (storedWorkshopInfo) {
      try { setWorkshopInfo(JSON.parse(storedWorkshopInfo)); } catch (e) { console.error(e); }
    }
    return () => unsubs.forEach((unsub) => unsub());
  }, []);

  const { activeServices, historicalServices } = useMemo(() => {
    const servicesForToday = allServices.filter(s => {
      const serviceDate = parseDate(s.serviceDate);
      const deliveryDate = parseDate(s.deliveryDateTime);
      // Activos son los que están en Taller o Agendados para hoy.
      if (s.status === 'En Taller') return true;
      if (s.status === 'Agendado' && serviceDate && isToday(serviceDate)) return true;
      // También mostramos los que se completaron/cancelaron hoy para tener el resumen del día.
      if ((s.status === 'Entregado' || s.status === 'Cancelado') && deliveryDate && isToday(deliveryDate)) return true;
      return false;
    });

    const getStatusPriority = (service: ServiceRecord): number => {
        if (service.status === 'En Taller' && service.subStatus === 'En Espera de Refacciones') return 1;
        if (service.status === 'En Taller' && service.subStatus === 'Proveedor Externo') return 2;
        if (service.status === 'Agendado' && service.appointmentStatus === 'Confirmada') return 3;
        if (service.status === 'En Taller' && service.subStatus === 'Reparando') return 4;
        if (service.status === 'En Taller' && !service.subStatus) return 4; // Default for 'En Taller'
        if (service.status === 'Agendado' && service.appointmentStatus !== 'Confirmada') return 5;
        if (service.status === 'En Taller' && service.subStatus === 'Completado') return 6;
        if (service.status === 'Entregado') return 7;
        if (service.status === 'Cancelado') return 8;
        return 99; // Default case
    };

    const sortedActiveServices = servicesForToday.sort((a, b) => {
        const priorityA = getStatusPriority(a);
        const priorityB = getStatusPriority(b);
        if (priorityA !== priorityB) {
            return priorityA - priorityB;
        }
        // Use reception date for sorting, fallback to service date
        const dateA = parseDate(a.receptionDateTime) || parseDate(a.serviceDate);
        const dateB = parseDate(b.receptionDateTime) || parseDate(b.serviceDate);

        if (!dateA) return 1;
        if (!dateB) return -1;
        
        return compareDesc(dateA, dateB);
    });

    return { activeServices: sortedActiveServices, historicalServices: allServices };
  }, [allServices]);

  const { 
    filteredData: filteredHistorical,
    ...historicalTableManager
  } = useTableManager<ServiceRecord>({
    initialData: historicalServices,
    searchKeys: ["id", "vehicleIdentifier", "description", "serviceItems.name"],
    dateFilterKey: "deliveryDateTime",
    initialSortOption: "deliveryDateTime_desc",
    initialDateRange: { from: startOfMonth(new Date()), to: endOfMonth(new Date()) },
    itemsPerPage: 10,
  });
  
  const handleSaveRecord = useCallback(async (data: QuoteRecord | ServiceRecord) => {
    if ('status' in data && data.status === 'Entregado' && data.id) {
        setIsPaymentDialogOpen(true);
        setServiceToEditPayment(data as ServiceRecord);
        return;
    }
    
    try {
      await operationsService.saveService(data);
      setIsFormDialogOpen(false);
      // toast({ title: 'Servicio actualizado.' });
    } catch (e) {
      toast({ title: "Error", description: `No se pudo guardar el registro.`, variant: "destructive"});
    }
  }, [toast]);

  const handleCancelRecord = useCallback(async (serviceId: string, reason: string) => {
    try {
      await operationsService.cancelService(serviceId, reason);
      toast({ title: 'Servicio cancelado.' });
      setIsFormDialogOpen(false);
    } catch (e) {
      toast({ title: "Error", description: "No se pudo cancelar el registro.", variant: "destructive"});
    }
  }, [toast]);

  const handleDeleteService = useCallback(async (serviceId: string) => {
    try {
      await operationsService.deleteService(serviceId);
      toast({ title: "Servicio Eliminado", description: "El registro ha sido eliminado permanentemente." });
    } catch (e) {
      toast({ title: "Error", description: "No se pudo eliminar el servicio.", variant: "destructive" });
    }
  }, [toast]);

  const handleShowPreview = useCallback((service: ServiceRecord) => {
    setRecordForPreview(service);
    setIsPreviewOpen(true);
  }, []);

  const handleOpenFormDialog = useCallback((record: ServiceRecord) => {
    setEditingRecord(record);
    setIsFormDialogOpen(true);
  }, []);
  
  const handleOpenPaymentDialog = useCallback((service: ServiceRecord) => {
    setServiceToEditPayment(service);
    setIsPaymentDialogOpen(true);
  }, []);

  const handleUpdatePaymentDetails = useCallback(async (serviceId: string, paymentDetails: PaymentDetailsFormValues) => {
    await operationsService.updateService(serviceId, paymentDetails);
    toast({ title: "Detalles de Pago Actualizados" });
    setIsPaymentDialogOpen(false);
  }, [toast]);


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
      setIsPaymentDialogOpen(false);
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
  
  const handleCopyAsImage = useCallback(async (isForSharing: boolean = false) => {
    if (!ticketContentRef.current || !recordForTicket) return null;
    const html2canvas = (await import('html2canvas')).default;
    try {
      const canvas = await html2canvas(ticketContentRef.current, { scale: 2.5, backgroundColor: null });
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error("Could not create blob from canvas.");
      
      if (isForSharing) {
        return new File([blob], `ticket_servicio_${recordForTicket.id}.png`, { type: 'image/png' });
      } else {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        toast({ title: "Copiado", description: "La imagen ha sido copiada." });
        return null;
      }
    } catch (e) {
      console.error('Error handling image:', e);
      toast({ title: "Error", description: "No se pudo procesar la imagen del ticket.", variant: "destructive" });
      return null;
    }
  }, [recordForTicket, toast]);
  
  const handleShare = async () => {
    const imageFile = await handleCopyAsImage(true);
    if (imageFile && navigator.share) {
      try {
        await navigator.share({
          files: [imageFile],
          title: 'Ticket de Servicio',
          text: `Ticket de tu servicio en ${workshopInfo?.name || 'nuestro taller'}.`,
        });
      } catch (error) {
        console.error('Error sharing:', error);
        if(!String(error).includes('AbortError')) {
           toast({ title: 'Error al compartir', variant: 'destructive' });
        }
      }
    } else {
        handleCopyServiceForWhatsapp(recordForTicket!);
    }
  };

  const handlePrint = () => {
    requestAnimationFrame(() => setTimeout(() => window.print(), 100));
  };
  
  const handleCopyServiceForWhatsapp = useCallback((service: ServiceRecord) => {
    const vehicle = vehicles.find(v => v.id === service.vehicleId);
    const workshopName = workshopInfo?.name || 'nuestro taller';
    
    let message = `Hola ${vehicle?.ownerName || 'Cliente'}, aquí tienes los detalles de tu servicio en ${workshopName}.`;
    if(service.publicId){
        const shareUrl = `${window.location.origin}/s/${service.publicId}`;
        message += `\n\nPuedes ver los detalles y firmar de conformidad en el siguiente enlace:\n${shareUrl}`;
    } else {
        message += `\n\nFolio de Servicio: ${service.id}\nTotal: ${formatCurrency(service.totalCost)}`;
    }
    
    message += `\n\n¡Agradecemos tu preferencia!`;

    navigator.clipboard.writeText(message).then(() => {
      toast({ title: 'Mensaje Copiado', description: 'El mensaje para WhatsApp ha sido copiado a tu portapapeles.' });
    });
  }, [toast, vehicles, workshopInfo]);


  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  const renderServiceCard = (record: ServiceRecord) => (
    <ServiceAppointmentCard 
      key={record.id}
      service={record}
      vehicles={vehicles}
      technicians={personnel}
      onEdit={() => handleOpenFormDialog(record)}
      onView={() => handleShowPreview(record)}
      onComplete={() => handleOpenPaymentDialog(record)}
      onPrintTicket={() => handlePrintTicket(record)}
      onConfirm={() => handleConfirmAppointment(record)}
      onEditPayment={() => handleOpenPaymentDialog(record)}
      onDelete={() => handleDeleteService(record.id)}
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
        <h1 className="text-3xl font-bold tracking-tight">Gestión de Servicios</h1>
        <p className="text-primary-foreground/80 mt-1">Consulta servicios activos y el historial completo.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="activos" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Servicios Activos (Hoy)</TabsTrigger>
          <TabsTrigger value="historial" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Historial Completo</TabsTrigger>
        </TabsList>

        <TabsContent value="activos" className="mt-0 space-y-4">
          {activeServices.length > 0 ? activeServices.map(renderServiceCard) : <p className="text-center text-muted-foreground py-10">No hay servicios activos para hoy.</p>}
        </TabsContent>

        <TabsContent value="historial" className="mt-0 space-y-4">
          <TableToolbar
            searchTerm={historicalTableManager.searchTerm}
            onSearchTermChange={historicalTableManager.setSearchTerm}
            dateRange={historicalTableManager.dateRange}
            onDateRangeChange={historicalTableManager.setDateRange}
            sortOption={historicalTableManager.sortOption}
            onSortOptionChange={historicalTableManager.setSortOption}
            otherFilters={historicalTableManager.otherFilters}
            onFilterChange={historicalTableManager.setOtherFilters}
            searchPlaceholder="Buscar por folio, placa..."
            filterOptions={[
                { value: 'status', label: 'Estado', options: serviceStatusOptions },
                { value: 'paymentMethod', label: 'Método de Pago', options: paymentMethodOptions },
            ]}
          />
           <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-muted-foreground">{historicalTableManager.paginationSummary}</p>
            <div className="flex items-center space-x-2">
              <Button size="sm" onClick={historicalTableManager.goToPreviousPage} disabled={!historicalTableManager.canGoPrevious} variant="outline" className="bg-card">
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              <Button size="sm" onClick={historicalTableManager.goToNextPage} disabled={!historicalTableManager.canGoNext} variant="outline" className="bg-card">
                Siguiente
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {filteredHistorical.length > 0 ? filteredHistorical.map(renderServiceCard) : <p className="text-center text-muted-foreground py-10">No hay servicios que coincidan.</p>}
        </TabsContent>
      </Tabs>

      {isFormDialogOpen && (
        <ServiceDialog
          open={isFormDialogOpen}
          onOpenChange={setIsFormDialogOpen}
          service={editingRecord}
          vehicles={vehicles}
          technicians={personnel}
          inventoryItems={inventoryItems}
          serviceTypes={serviceTypes}
          onCancelService={handleCancelRecord}
          mode='service'
          onSave={handleSaveRecord}
          onComplete={handleConfirmCompletion}
        />
      )}
      
      {serviceToEditPayment && (
        <PaymentDetailsDialog
          open={isPaymentDialogOpen}
          onOpenChange={setIsPaymentDialogOpen}
          service={serviceToEditPayment}
          onConfirm={handleUpdatePaymentDetails}
          isCompletionFlow={serviceToEditPayment.status !== 'Entregado'}
        />
      )}

      {isPreviewOpen && recordForPreview && <UnifiedPreviewDialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen} service={recordForPreview}/>}
      
      {recordForTicket && (
        <PrintTicketDialog
          open={isTicketDialogOpen}
          onOpenChange={setIsTicketDialogOpen}
          title="Ticket de Servicio"
          footerActions={<>
            <Button onClick={() => handleCopyAsImage()} className="w-full bg-white hover:bg-gray-100 text-black border"><Copy className="mr-2 h-4 w-4"/>Copiar Imagen</Button>
            <Button onClick={handleShare} className="w-full bg-green-100 hover:bg-green-200 text-green-800"><Share2 className="mr-2 h-4 w-4" /> Compartir</Button>
            <Button onClick={handlePrint} className="w-full"><Printer className="mr-2 h-4 w-4"/>Imprimir</Button>
          </>}
        >
          <div id="printable-ticket">
            <TicketContent
              ref={ticketContentRef}
              service={recordForTicket}
              vehicle={vehicles.find(v => v.id === recordForTicket.vehicleId)}
              previewWorkshopInfo={workshopInfo || undefined}
            />
          </div>
        </PrintTicketDialog>
      )}
    </>
  );
}
