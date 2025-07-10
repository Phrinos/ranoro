

"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback, Suspense } from "react";
import { useSearchParams } from 'next/navigation';
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";
import { Search, ListFilter, FileText, Eye, Edit, Printer } from "lucide-react";
import { placeholderServiceRecords, placeholderVehicles, placeholderTechnicians, placeholderInventory, persistToFirestore, AUTH_USER_LOCALSTORAGE_KEY } from "@/lib/placeholder-data"; 
import type { QuoteRecord, Vehicle, ServiceRecord, Technician, InventoryItem, WorkshopInfo, User } from "@/types"; 
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, compareAsc, compareDesc, isBefore, addDays, isValid } from "date-fns";
import { es } from 'date-fns/locale';
import { cn, formatCurrency } from "@/lib/utils";
import { ServiceDialog } from "../../servicios/components/service-dialog";
import { StatusTracker } from "../../servicios/components/StatusTracker";
import { Badge } from "@/components/ui/badge";
import { UnifiedPreviewDialog } from '@/components/shared/unified-preview-dialog';


type QuoteSortOption = 
  | "date_desc" | "date_asc"
  | "total_desc" | "total_asc"
  | "vehicle_asc" | "vehicle_desc";


const QuoteList = React.memo(({ quotes, vehicles, onEditQuote, onViewQuote }: { 
    quotes: QuoteRecord[], 
    vehicles: Vehicle[], 
    onEditQuote: (quote: QuoteRecord) => void,
    onViewQuote: (quote: QuoteRecord) => void,
}) => {
  
  const getServiceDescriptionText = (quote: QuoteRecord) => {
    if (quote.serviceItems && quote.serviceItems.length > 0) {
      return quote.serviceItems.map(item => item.name).join(', ');
    }
    return quote.description || 'Sin descripción';
  };
  
  const getQuoteStatus = (quote: QuoteRecord): { label: string; variant: "success" | "blue" | "secondary" } => {
    if (quote.status !== 'Cotizacion') {
      return { label: 'Procesada', variant: 'blue' };
    }
    const quoteDateStr = quote.quoteDate;
    if (!quoteDateStr) return { label: 'Archivada', variant: 'secondary' };

    const quoteDate = typeof quoteDateStr === 'string' ? parseISO(quoteDateStr) : new Date(quoteDateStr);
    
    if (!isValid(quoteDate)) {
        return { label: 'Archivada', variant: 'secondary' };
    }
    
    const expirationDate = addDays(quoteDate, 15);
    
    if (isBefore(new Date(), expirationDate)) {
      return { label: 'Vigente', variant: 'success' };
    }
    return { label: 'Archivada', variant: 'secondary' };
  };


  return (
    <div className="space-y-4">
      {quotes.length > 0 ? (
        quotes.map(quote => {
          const vehicle = vehicles.find(v => v.id === quote.vehicleId);
          const status = quote.status;
          const quoteStatusInfo = getQuoteStatus(quote);
          const quoteDate = quote.quoteDate ? parseISO(quote.quoteDate as string) : new Date();

          return (
            <Card key={quote.id} className="shadow-sm overflow-hidden">
              <CardContent className="p-0">
                <div className="flex flex-col md:flex-row">
                   <div className="p-4 flex flex-col justify-center items-center text-center w-full md:w-48 flex-shrink-0">
                      <p className="font-semibold text-xl text-foreground">{isValid(quoteDate) ? format(quoteDate, "dd MMM yyyy", { locale: es }) : "Fecha inválida"}</p>
                      <p className="text-muted-foreground text-xs mt-1">Folio: {quote.id}</p>
                      <StatusTracker status={status} />
                    </div>
                    <div className="p-4 flex flex-col justify-center flex-grow space-y-2 text-left border-y md:border-y-0 md:border-x">
                      <p className="text-sm text-muted-foreground">{vehicle?.ownerName} - {vehicle?.ownerPhone}</p>
                      <p className="font-bold text-2xl text-black">{vehicle ? `${vehicle.licensePlate} - ${vehicle.make} ${vehicle.model} ${vehicle.year}` : 'N/A'}</p>
                      <p className="text-sm text-foreground">
                        <span className="font-semibold">{quote.serviceType}:</span> {getServiceDescriptionText(quote)}
                      </p>
                    </div>
                    <div className="p-3 flex flex-col justify-center items-center text-center w-full md:w-48 flex-shrink-0">
                      <p className="text-xs text-muted-foreground">Costo Estimado</p>
                      <p className="font-bold text-2xl text-black">{formatCurrency(quote.totalCost)}</p>
                       {quote.serviceProfit !== undefined && (
                        <p className="text-xs text-green-600 font-medium">
                            Ganancia: {formatCurrency(quote.serviceProfit)}
                        </p>
                       )}
                    </div>
                    <div className="p-4 flex flex-col justify-center items-center text-center border-t md:border-t-0 md:border-l w-full md:w-56 flex-shrink-0 space-y-2">
                        <Badge variant={quoteStatusInfo.variant} className="mb-1">{quoteStatusInfo.label}</Badge>
                        <p className="text-xs text-muted-foreground">Asesor: {quote.serviceAdvisorName || 'N/A'}</p>
                        <div className="flex justify-center items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => onViewQuote(quote)} title="Vista Previa"><Eye className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => onEditQuote(quote)} title="Editar Cotización"><Edit className="h-4 w-4" /></Button>
                        </div>
                    </div>
                </div>
              </CardContent>
            </Card>
          )
        })
      ) : (
        <div className="text-center py-10 border-2 border-dashed rounded-lg text-muted-foreground">No hay cotizaciones que coincidan con los filtros.</div>
      )}
    </div>
  );
});
QuoteList.displayName = 'QuoteList';


function HistorialCotizacionesPageComponent() {
  const [allServices, setAllServices] = useState<ServiceRecord[]>(placeholderServiceRecords);
  const [vehicles, setVehicles] = useState<Vehicle[]>(placeholderVehicles);
  const [technicians, setTechnicians] = useState<Technician[]>(placeholderTechnicians);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>(placeholderInventory);
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOption, setSortOption] = useState<QuoteSortOption>("date_desc"); 

  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<QuoteRecord | null>(null);

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<{
    service: ServiceRecord;
    quote?: QuoteRecord;
    vehicle?: Vehicle;
  } | null>(null);

  useEffect(() => {
    // This effect can be used to sync with a global state or DB in the future
    setAllServices(placeholderServiceRecords);
    setVehicles(placeholderVehicles);
    setTechnicians(placeholderTechnicians);
    setInventoryItems(placeholderInventory);
  }, []);
  
  const activeQuotes = useMemo(() => {
    let filtered = allServices.filter(service => service.status === 'Cotizacion' || (service.quoteDate && service.status !== 'Cotizacion'));

    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(quote => 
        quote.id.toLowerCase().includes(lowerSearchTerm) ||
        (quote.vehicleIdentifier && quote.vehicleIdentifier.toLowerCase().includes(lowerSearchTerm))
      );
    }
    
    filtered.sort((a, b) => {
      const totalA = a.totalCost ?? 0;
      const totalB = b.totalCost ?? 0;
      
      const dateA = a.quoteDate ? (typeof a.quoteDate === 'string' ? parseISO(a.quoteDate) : new Date(a.quoteDate)) : new Date(0);
      const dateB = b.quoteDate ? (typeof b.quoteDate === 'string' ? parseISO(b.quoteDate) : new Date(b.quoteDate)) : new Date(b.quoteDate);

      switch (sortOption) {
        case "date_asc": return compareAsc(dateA, dateB);
        case "total_asc": return totalA - totalB;
        case "total_desc": return totalB - a.totalCost;
        case "vehicle_asc": return (a.vehicleIdentifier || '').localeCompare(b.vehicleIdentifier || '');
        case "vehicle_desc": return (b.vehicleIdentifier || '').localeCompare(a.vehicleIdentifier || '');
        case "date_desc": default: return compareDesc(dateA, dateB);
      }
    });
    return filtered as QuoteRecord[];
  }, [allServices, searchTerm, sortOption]);

  const handleViewQuote = useCallback((quote: QuoteRecord) => {
    let currentUser: User | null = null;
    try {
      const raw = typeof window !== "undefined"
        ? localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY)
        : null;
      if (raw) currentUser = JSON.parse(raw);
    } catch { /* ignore */ }
  
    const enrichedQuote: QuoteRecord = {
      ...quote,
      serviceAdvisorName:
        quote.serviceAdvisorName || currentUser?.name || "",
      serviceAdvisorSignatureDataUrl:
        quote.serviceAdvisorSignatureDataUrl || currentUser?.signatureDataUrl || "",
    };
  
    setPreviewData({ 
        service: enrichedQuote,
        quote: enrichedQuote,
        vehicle: vehicles.find(v => v.id === enrichedQuote.vehicleId) 
    });
    setIsPreviewOpen(true);
  }, [vehicles]);
  
  const handleEditQuote = useCallback((quote: QuoteRecord) => { 
    setSelectedQuote(quote); 
    setIsFormDialogOpen(true); 
  }, []);

  const handleDeleteQuote = useCallback(async (quoteId: string) => { 
    const recordIndex = placeholderServiceRecords.findIndex(q => q.id === quoteId);
    if (recordIndex === -1) return;
    placeholderServiceRecords.splice(recordIndex, 1);
    await persistToFirestore(['serviceRecords']);
    setAllServices([...placeholderServiceRecords]);
    toast({ title: "Cotización Eliminada", description: `La cotización ${quoteId} ha sido eliminada.` });
  }, [toast]);

  const handleSaveQuote = useCallback(async (data: ServiceRecord | QuoteRecord) => {
    const recordIndex = placeholderServiceRecords.findIndex(q => q.id === data.id);
      
      if (recordIndex > -1) {
        placeholderServiceRecords[recordIndex] = data as ServiceRecord;
      } else {
        placeholderServiceRecords.push(data as ServiceRecord);
      }
      
      await persistToFirestore(['serviceRecords']);

    setAllServices([...placeholderServiceRecords]);
    setIsFormDialogOpen(false);
  }, []);


  return (
    <>
      <div className="bg-primary text-primary-foreground rounded-lg p-6 mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Cotizaciones</h1>
          <p className="text-primary-foreground/80 mt-1">Consulta, filtra y da seguimiento a todas las cotizaciones generadas.</p>
      </div>
      
      <div className="space-y-4">
         <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:flex-wrap">
          <div className="relative flex-1 min-w-[200px] sm:min-w-[300px]"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input type="search" placeholder="Buscar por folio o vehículo..." className="w-full rounded-lg bg-card pl-8" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
          <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" className="min-w-[150px] flex-1 sm:flex-initial bg-card"><ListFilter className="mr-2 h-4 w-4" />Ordenar</Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuLabel>Ordenar por</DropdownMenuLabel><DropdownMenuRadioGroup value={sortOption} onValueChange={(value) => setSortOption(value as QuoteSortOption)}><DropdownMenuRadioItem value="date_desc">Fecha (Más Reciente)</DropdownMenuRadioItem><DropdownMenuRadioItem value="date_asc">Fecha (Más Antiguo)</DropdownMenuRadioItem><DropdownMenuRadioItem value="total_desc">Monto Total (Mayor a Menor)</DropdownMenuRadioItem><DropdownMenuRadioItem value="total_asc">Monto Total (Menor a Mayor)</DropdownMenuRadioItem></DropdownMenuRadioGroup></DropdownMenuContent></DropdownMenu>
        </div>
        <QuoteList
          quotes={activeQuotes}
          vehicles={vehicles}
          onEditQuote={handleEditQuote}
          onViewQuote={handleViewQuote}
        />
      </div>

      {isFormDialogOpen && (
         <ServiceDialog 
            open={isFormDialogOpen} 
            onOpenChange={setIsFormDialogOpen} 
            quote={selectedQuote} 
            vehicles={vehicles} 
            technicians={technicians} 
            inventoryItems={inventoryItems} 
            onDelete={handleDeleteQuote} 
            mode="quote" 
            onSave={handleSaveQuote}
        />
      )}
      
      {isPreviewOpen && previewData && (
        <UnifiedPreviewDialog
          open={isPreviewOpen}
          onOpenChange={setIsPreviewOpen}
          service={previewData.service}
        />
      )}
    </>
  );
}

export default function HistorialCotizacionesPageWrapper() {
    return (<Suspense fallback={<div>Cargando...</div>}><HistorialCotizacionesPageComponent /></Suspense>)
}
