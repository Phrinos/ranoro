

"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { ServiceDialog } from "../../../servicios/components/service-dialog";
import { UnifiedPreviewDialog } from '@/components/shared/unified-preview-dialog';
import { TableToolbar } from "@/components/shared/table-toolbar";
import type { ServiceRecord, Vehicle, Technician, InventoryItem, QuoteRecord, ServiceTypeRecord, WorkshopInfo, PaymentMethod, Personnel } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { useTableManager } from "@/hooks/useTableManager";
import { ServiceAppointmentCard } from "../../../servicios/components/ServiceAppointmentCard";
import { Loader2 } from "lucide-react";
import { serviceService, inventoryService, personnelService } from '@/lib/services';
import { db } from '@/lib/firebaseClient';
import { writeBatch } from 'firebase/firestore';
import { TicketContent } from '@/components/ticket-content';
import { PrintTicketDialog } from '@/components/ui/print-ticket-dialog';
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import Link from 'next/link';

export function CotizacionesPageComponent() {
  const { toast } = useToast();
  
  const [allQuotes, setAllQuotes] = useState<ServiceRecord[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceTypeRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ServiceRecord | null>(null);

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [recordForPreview, setRecordForPreview] = useState<ServiceRecord | null>(null);

  useEffect(() => {
    const unsubs = [
      serviceService.onServicesUpdate((services) => {
        setAllQuotes(services.filter(s => s.status === 'Cotizacion'));
      }),
      inventoryService.onVehiclesUpdate(setVehicles),
      personnelService.onPersonnelUpdate(setPersonnel),
      inventoryService.onItemsUpdate(setInventoryItems),
      inventoryService.onServiceTypesUpdate((data) => {
          setServiceTypes(data);
          setIsLoading(false);
      }),
    ];

    return () => unsubs.forEach((unsub) => unsub());
  }, []);

  const { filteredData: filteredQuotes, ...quotesTableManager } = useTableManager<ServiceRecord>({
    initialData: allQuotes,
    searchKeys: ['id', 'vehicleIdentifier', 'description'],
    dateFilterKey: 'quoteDate',
    initialSortOption: 'quoteDate_desc', // Sort by quote date, newest first
  });

  const handleSaveRecord = useCallback(async (data: QuoteRecord | ServiceRecord) => {
    try {
      await serviceService.saveService(data);
      setIsFormDialogOpen(false);
      toast({ title: 'Cotización actualizada.' });
    } catch (e) {
      toast({ title: "Error", description: `No se pudo guardar la cotización.`, variant: "destructive"});
    }
  }, [toast]);

  const handleCancelRecord = useCallback(async (serviceId: string, reason: string) => {
    try {
      await serviceService.cancelService(serviceId, reason);
      toast({ title: 'Cotización cancelada.' });
      setIsFormDialogOpen(false);
    } catch (e) {
      toast({ title: "Error", description: "No se pudo cancelar la cotización.", variant: "destructive"});
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

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  const renderQuoteCard = (record: ServiceRecord) => (
    <ServiceAppointmentCard 
      key={record.id}
      service={record}
      vehicles={vehicles}
      technicians={personnel as Technician[]}
      onEdit={() => handleOpenFormDialog(record)}
      onView={() => handleShowPreview(record)}
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
        <h1 className="text-3xl font-bold tracking-tight">Cotizaciones</h1>
        <p className="text-primary-foreground/80 mt-1">Gestiona y da seguimiento a todas las cotizaciones generadas.</p>
      </div>

      <div className="mt-0 space-y-4">
          <TableToolbar {...quotesTableManager} searchPlaceholder="Buscar por folio, vehículo..." />
          {filteredQuotes.length > 0 ? filteredQuotes.map(renderQuoteCard) : <p className="text-center text-muted-foreground py-10">No hay cotizaciones que coincidan con la búsqueda.</p>}
      </div>

      {isFormDialogOpen && (
        <ServiceDialog
          open={isFormDialogOpen}
          onOpenChange={setIsFormDialogOpen}
          service={editingRecord}
          vehicles={vehicles}
          technicians={personnel as User[]}
          inventoryItems={inventoryItems}
          serviceTypes={serviceTypes}
          onCancelService={handleCancelRecord}
          mode='quote'
          onSave={handleSaveRecord}
        />
      )}
      
      {isPreviewOpen && recordForPreview && <UnifiedPreviewDialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen} service={recordForPreview}/>}
    </>
  );
}
