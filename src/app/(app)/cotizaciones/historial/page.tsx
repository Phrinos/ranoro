

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
import { PrintTicketDialog } from "@/components/ui/print-ticket-dialog";
import { QuoteContent } from "@/components/quote-content";


type QuoteSortOption = 
  | "date_desc" | "date_asc"
  | "total_desc" | "total_asc"
  | "vehicle_asc" | "vehicle_desc";


const QuoteList = React.memo(({ quotes, vehicles, onEdit, onViewQuote }: { 
    quotes: QuoteRecord[], 
    vehicles: Vehicle[], 
    onEdit: (quote: QuoteRecord) => void,
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
    const quoteDate = parseISO(quote.quoteDate ?? new Date().toISOString());
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

          return (
            <Card key={quote.id} className="shadow-sm overflow-hidden">
              <CardContent className="p-0">
                <div className="flex flex-col md:flex-row">
                   <div className="p-4 flex flex-col justify-center items-center text-center w-full md:w-48 flex-shrink-0">
                      <p className="font-semibold text-xl text-foreground">{format(parseISO(quote.quoteDate ?? new Date().toISOString()), "dd MMM yyyy", { locale: es })}</p>
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
                      <p className="font-bold text-xl text-black">{formatCurrency(quote.totalCost)}</p>
                       {!!quote.serviceProfit && (
                        <p className="text-xs text-green-600 font-medium">
                            Ganancia: {formatCurrency(quote.serviceProfit)}
                        </p>
                       )}
                    </div>
                    <div className="p-4 flex flex-col justify-center items-center text-center border-t md:border-t-0 md:border-l w-full md:w-56 flex-shrink-0 space-y-2">
                        <Badge variant={quoteStatusInfo.variant} className="mb-1">{quoteStatusInfo.label}</Badge>
                        <p className="text-xs text-muted-foreground">Asesor: {quote.preparedByTechnicianName || 'N/A'}</p>
                        <div className="flex justify-center items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => onViewQuote(quote)} title="Vista Previa"><Eye className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => onEdit(quote)} title="Editar Cotización"><Edit className="h-4 w-4" /></Button>
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
  const [workshopInfo, setWorkshopInfo] = useState<WorkshopInfo | undefined>(undefined);
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOption, setSortOption] = useState<QuoteSortOption>("date_desc"); 

  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<QuoteRecord | null>(null);

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [quoteForPreview, setQuoteForPreview] = useState<QuoteRecord | null>(null);
  const quoteContentRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    // This effect can be used to sync with a global state or DB in the future
    setAllServices(placeholderServiceRecords);
    setVehicles(placeholderVehicles);
    setTechnicians(placeholderTechnicians);
    setInventoryItems(placeholderInventory);
    if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('workshopTicketInfo');
        if (stored) setWorkshopInfo(JSON.parse(stored));
    }
  }, []);
  
  const activeQuotes = useMemo(() => {
    // A record is considered a "quote" for this page if its status is Cotizacion,
    // OR if its status has changed but it was originally a quote (and has a quoteDate).
    let filtered = allServices.filter(service => service.status === 'Cotizacion' || service.quoteDate);

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
      const dateA = a.quoteDate ? parseISO(a.quoteDate) : new Date(0);
      const dateB = b.quoteDate ? parseISO(b.quoteDate) : new Date(0);

      switch (sortOption) {
        case "date_asc": return compareAsc(dateA, dateB);
        case "total_asc": return totalA - totalB;
        case "total_desc": return totalB - totalA;
        case "vehicle_asc": return (a.vehicleIdentifier || '').localeCompare(b.vehicleIdentifier || '');
        case "vehicle_desc": return (b.vehicleIdentifier || '').localeCompare(a.vehicleIdentifier || '');
        case "date_desc": default: return compareDesc(dateA, dateB);
      }
    });
    return filtered as QuoteRecord[];
  }, [allServices, searchTerm, sortOption]);

  const handleViewQuote = useCallback((quote: QuoteRecord) => {
    setQuoteForPreview(quote);
    setIsPreviewOpen(true);
  }, []);
  
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

  const handleSaveQuote = useCallback(async (data: QuoteRecord | ServiceRecord) => {
    const isNew = !data.id;
    const recordId = data.id || `doc_${Date.now().toString(36)}`;
    const recordToSave = { ...data, id: recordId };
    
    const recordIndex = placeholderServiceRecords.findIndex(q => q.id === recordId);
    
    if (recordIndex > -1) {
      placeholderServiceRecords[recordIndex] = recordToSave as ServiceRecord;
    } else {
      placeholderServiceRecords.push(recordToSave as ServiceRecord);
    }
    
    await persistToFirestore(['serviceRecords']);
    
    toast({
      title: `Cotización ${isNew ? 'creada' : 'actualizada'}`,
      description: `Se han guardado los cambios para ${recordId}.`,
    });
    
    setIsFormDialogOpen(false);
  }, [toast]);


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
          onEdit={handleEditQuote}
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
      
      {isPreviewOpen && quoteForPreview && (
        <PrintTicketDialog
          open={isPreviewOpen}
          onOpenChange={setIsPreviewOpen}
          title={`Cotización: ${quoteForPreview.id}`}
          dialogContentClassName="printable-quote-dialog"
          footerActions={
            <Button onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" /> Imprimir Cotización
            </Button>
          }
        >
          <QuoteContent
            ref={quoteContentRef}
            quote={quoteForPreview}
            vehicle={vehicles.find(v => v.id === quoteForPreview.vehicleId)}
            workshopInfo={workshopInfo}
          />
        </PrintTicketDialog>
      )}
    </>
  );
}

export default function HistorialCotizacionesPageWrapper() {
    return (<Suspense fallback={<div>Cargando...</div>}><HistorialCotizacionesPageComponent /></Suspense>)
}
