

"use client";

import React, { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import { useSearchParams } from 'next/navigation';
import { PageHeader } from "@/components/page-header";
import { ServiceDialog } from "../../servicios/components/service-dialog";
import { UnifiedPreviewDialog } from '@/components/shared/unified-preview-dialog';
import { TableToolbar } from "@/components/shared/table-toolbar";
import type { QuoteRecord, Vehicle, ServiceRecord, Technician, InventoryItem, User, ServiceTypeRecord } from "@/types"; 
import { useToast } from "@/hooks/use-toast";
import { useTableManager } from "@/hooks/useTableManager";
import { ServiceAppointmentCard } from "../../servicios/components/ServiceAppointmentCard";
import { Loader2 } from "lucide-react";
import { operationsService, inventoryService, personnelService } from '@/lib/services';
import type { VehicleFormValues } from "../../vehiculos/components/vehicle-form";

function HistorialCotizacionesPageComponent() {
  const { toast } = useToast();
  
  const [allServices, setAllServices] = useState<ServiceRecord[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]); 
  const [technicians, setTechnicians] = useState<Technician[]>([]); 
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]); 
  const [serviceTypes, setServiceTypes] = useState<ServiceTypeRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<QuoteRecord | null>(null);

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<{
    service: ServiceRecord;
    vehicle?: Vehicle;
  } | null>(null);

  useEffect(() => {
    setIsLoading(true);
    const unsubs = [
      operationsService.onServicesUpdate(setAllServices),
      inventoryService.onVehiclesUpdate(setVehicles),
      personnelService.onTechniciansUpdate(setTechnicians),
      inventoryService.onItemsUpdate(setInventoryItems),
      inventoryService.onServiceTypesUpdate((data) => {
        setServiceTypes(data);
        setIsLoading(false);
      })
    ];
    return () => unsubs.forEach(unsub => unsub());
  }, []);
  
  const quotesData = useMemo(() => {
    return allServices.filter(service => service.status === 'Cotizacion' || !!service.quoteDate);
  }, [allServices]);

  const {
    filteredData,
    ...tableManager
  } = useTableManager<QuoteRecord>({
    initialData: quotesData,
    searchKeys: ['id', 'vehicleIdentifier', 'description'],
    dateFilterKey: 'quoteDate',
    initialSortOption: 'date_desc',
  });

  const handleViewQuote = useCallback((quote: QuoteRecord) => {
    setPreviewData({ 
        service: quote,
        vehicle: vehicles.find(v => v.id === quote.vehicleId) 
    });
    setIsPreviewOpen(true);
  }, [vehicles]);
  
  const handleEditQuote = useCallback((quote: QuoteRecord) => { 
    setSelectedQuote(quote); 
    setIsFormDialogOpen(true); 
  }, []);

  const handleSaveQuote = useCallback(async (data: ServiceRecord | QuoteRecord) => {
    try {
        await operationsService.saveService(data);
        toast({ title: "Cotización actualizada." });
        setIsFormDialogOpen(false);
    } catch(e) {
        toast({ title: "Error", description: "No se pudo guardar la cotización.", variant: "destructive"});
    }
  }, [toast]);
  
  const handleVehicleCreated = useCallback(async (newVehicle: Omit<Vehicle, 'id'>) => {
      await inventoryService.addVehicle(newVehicle as VehicleFormValues);
      toast({ title: "Vehículo Creado" });
  }, [toast]);


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
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Cotizaciones</h1>
          <p className="text-primary-foreground/80 mt-1">Consulta, filtra y da seguimiento a todas las cotizaciones generadas.</p>
      </div>
      
      <div className="space-y-4">
         <TableToolbar 
            searchTerm={tableManager.searchTerm}
            onSearchTermChange={tableManager.setSearchTerm}
            dateRange={tableManager.dateRange}
            onDateRangeChange={tableManager.setDateRange}
            sortOption={tableManager.sortOption}
            onSortOptionChange={tableManager.setSortOption}
            searchPlaceholder="Buscar por folio o vehículo..."
         />
        {filteredData.length > 0 ? (
          filteredData.map(quote => (
            <ServiceAppointmentCard 
              key={quote.id}
              service={quote}
              vehicles={vehicles}
              onEdit={() => handleEditQuote(quote)}
              onView={() => handleViewQuote(quote)}
            />
          ))
        ) : (
          <div className="text-center py-10 border-2 border-dashed rounded-lg text-muted-foreground">No hay cotizaciones que coincidan con los filtros.</div>
        )}
      </div>

      {isFormDialogOpen && (
         <ServiceDialog 
            open={isFormDialogOpen} 
            onOpenChange={setIsFormDialogOpen} 
            quote={selectedQuote} 
            vehicles={vehicles} 
            technicians={technicians} 
            inventoryItems={inventoryItems} 
            serviceTypes={serviceTypes}
            mode="quote" 
            onSave={handleSaveQuote}
        />
      )}
      
      {isPreviewOpen && previewData && (
        <UnifiedPreviewDialog
          open={isPreviewOpen}
          onOpenChange={setIsPreviewOpen}
          service={previewData.service}
          vehicle={previewData.vehicle || null}
        />
      )}
    </>
  );
}

export default function HistorialCotizacionesPageWrapper() {
    return (<Suspense fallback={<div>Cargando...</div>}><HistorialCotizacionesPageComponent /></Suspense>)
}
