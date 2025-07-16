

"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { ServiceDialog } from "../../components/service-dialog";
import { UnifiedPreviewDialog } from '@/components/shared/unified-preview-dialog';
import { CompleteServiceDialog } from "../../components/CompleteServiceDialog";
import { TableToolbar } from '@/components/shared/table-toolbar';
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
import { formatCurrency } from "@/lib/utils";
import { PaymentDetailsDialog } from '../../components/PaymentDetailsDialog';

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

  const [allServices, setAllServices] = useState<ServiceRecord[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceTypeRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ServiceRecord | null>(null);

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
      operationsService.onServicesUpdate((services) => {
        // Exclude quotes from this page
        setAllServices(services.filter(s => s.status !== 'Cotizacion'));
      }),
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

  const { activeServices, historicalServices } = useMemo(() => {
    const todayServices = allServices.filter(s => {
      const serviceDate = parseDate(s.serviceDate);
      const deliveryDate = parseDate(s.deliveryDateTime);
      if (s.status === 'En Taller') return true;
      if (s.status === 'Agendado' && serviceDate && isToday(serviceDate)) return true;
      if ((s.status === 'Entregado' || s.status === 'Cancelado') && deliveryDate && isToday(deliveryDate)) return true;
      return false;
    });

    const getStatusPriority = (service: ServiceRecord): number => {
      if (service.status === 'Agendado' && service.appointmentStatus === 'Confirmada') return 1;
      if (service.status === 'En Taller' && service.subStatus === 'En Espera de Refacciones') return 2;
      if (service.status === 'En Taller' && service.subStatus === 'Reparando') return 3;
      if (service.status === 'En Taller' && !service.subStatus) return 3; // Default for 'En Taller'
      if (service.status === 'En Taller' && service.subStatus === 'Completado') return 4;
      if (service.status === 'Entregado') return 5;
      if (service.status === 'Agendado' && service.appointmentStatus !== 'Confirmada') return 6;
      if (service.status === 'Cancelado') return 7;
      return 99; // Default case
    };

    const sortedActiveServices = todayServices.sort((a, b) => {
        const priorityA = getStatusPriority(a);
        const priorityB = getStatusPriority(b);
        if (priorityA !== priorityB) {
            return priorityA - priorityB;
        }
        // If priorities are the same, sort by time
        const dateA = parseDate(a.serviceDate)?.getTime() ?? 0;
        const dateB = parseDate(b.serviceDate)?.getTime() ?? 0;
        return dateA - dateB;
    });

    return { activeServices: sortedActiveServices, historicalServices: allServices };
  }, [allServices]);

  const { filteredData: filteredHistorical, ...historicalTableManager } = useTableManager<ServiceRecord>({
    initialData: historicalServices,
    searchKeys: ["id", "vehicleIdentifier", "description"],
    dateFilterKey: "deliveryDateTime",
    initialSortOption: "deliveryDateTime_desc",
  });
  
  const handleSaveRecord = useCallback(async (data: QuoteRecord | ServiceRecord) => {
    if ('status' in data && data.status === 'Entregado' && data.id) {
      const serviceToUpdate = allServices.find(s => s.id === data.id);
      if (serviceToUpdate && serviceToUpdate.status !== 'Entregado') {
        setServiceToComplete({ ...serviceToUpdate, ...data });
        setIsCompleteDialogOpen(true);
        return;
      }
    }
    
    try {
      await operationsService.saveService(data);
      setIsFormDialogOpen(false);
      toast({ title: 'Servicio actualizado.' });
    } catch (e) {
      toast({ title: "Error", description: `No se pudo guardar el registro.`, variant: "destructive"});
    }
  }, [toast, allServices]);

  const handleCancelRecord = useCallback(async (serviceId: string, reason: string) => {
    try {
      await operationsService.cancelService(serviceId, reason);
      toast({ title: 'Servicio cancelado.' });
      setIsFormDialogOpen(false);
    } catch (e) {
      toast({ title: "Error", description: "No se pudo cancelar el registro.", variant: "destructive"});
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
  
  const handleCopyAsImage = useCallback(async () => {
    if (!ticketContentRef.current) return;
    const html2canvas = (await import('html2canvas')).default;
    try {
      const canvas = await html2canvas(ticketContentRef.current, { scale: 2.5, backgroundColor: null });
      canvas.toBlob((blob) => { if (blob) navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]); });
      toast({ title: "Copiado", description: "La imagen ha sido copiada." });
    } catch (e) { toast({ title: "Error", description: "No se pudo copiar la imagen.", variant: "destructive" }); }
  }, [toast]);

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
      toast({ title: 'Mensaje Copiado', description: 'El mensaje para WhatsApp ha sido copiado.' });
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
          <TableToolbar {...historicalTableManager} filterOptions={[{ value: 'status', label: 'Estado', options: serviceStatusOptions }, { value: 'paymentMethod', label: 'Método de Pago', options: paymentMethodOptions }]} searchPlaceholder="Buscar por folio, placa..." />
          {filteredHistorical.length > 0 ? filteredHistorical.map(renderServiceCard) : <p className="text-center text-muted-foreground py-10">No hay servicios que coincidan.</p>}
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
          mode='service'
          onSave={handleSaveRecord}
          onComplete={handleConfirmCompletion}
        />
      )}
      
      {serviceToComplete && <PaymentDetailsDialog open={isCompleteDialogOpen} onOpenChange={setIsCompleteDialogOpen} service={serviceToComplete} onConfirm={handleConfirmCompletion} />}
      {isPreviewOpen && recordForPreview && <UnifiedPreviewDialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen} service={recordForPreview}/>}
      
      {recordForTicket && (
        <PrintTicketDialog
          open={isTicketDialogOpen}
          onOpenChange={setIsTicketDialogOpen}
          title="Ticket de Servicio"
          footerActions={<>
            <Button onClick={handleCopyAsImage} className="w-full bg-white hover:bg-gray-100 text-black border"><Copy className="mr-2 h-4 w-4"/>Copiar Imagen</Button>
            <Button onClick={() => handleCopyServiceForWhatsapp(recordForTicket)} className="w-full bg-green-100 hover:bg-green-200 text-green-800"><MessageSquare className="mr-2 h-4 w-4" /> Enviar por WhatsApp</Button>
            <Button onClick={handlePrint} className="w-full"><Printer className="mr-2 h-4 w-4"/>Imprimir</Button>
          </>}
        >
          <div id="printable-ticket">
            <TicketContent
              ref={ticketContentRef}
              service={recordForTicket}
              vehicle={vehicles.find(v => v.id === recordForTicket.vehicleId)}
              technician={technicians.find(t => t.id === recordForTicket.technicianId)}
              previewWorkshopInfo={workshopInfo || undefined}
            />
          </div>
        </PrintTicketDialog>
      )}
    </>
  );
}
