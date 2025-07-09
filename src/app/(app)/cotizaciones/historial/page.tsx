
"use client";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Search, ListFilter, CalendarIcon as CalendarDateIcon, FileText, DollarSign, Wrench, Ban, Edit, Eye, MessageSquare, Copy, Download } from "lucide-react";
import { PrintTicketDialog } from '@/components/ui/print-ticket-dialog';
import { placeholderQuotes, placeholderVehicles, placeholderTechnicians, placeholderServiceRecords, placeholderInventory, persistToFirestore } from "@/lib/placeholder-data"; 
import type { QuoteRecord, Vehicle, ServiceRecord, Technician, InventoryItem, WorkshopInfo } from "@/types"; 
import React, { useState, useEffect, useMemo, useRef, useCallback, Suspense } from "react";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, compareAsc, compareDesc, isWithinInterval, isValid, startOfDay, endOfDay, addDays, isAfter, isBefore } from "date-fns";
import { es } from 'date-fns/locale';
import type { DateRange } from "react-day-picker";
import { useSearchParams } from 'next/navigation';
import { cn, formatCurrency } from "@/lib/utils";
import { ServiceDialog } from "../../servicios/components/service-dialog";
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient.js';
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ServiceSheetContent } from "@/components/service-sheet-content";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusTracker } from "../../servicios/components/StatusTracker";


type QuoteSortOption = 
  | "date_desc" | "date_asc"
  | "total_desc" | "total_asc"
  | "vehicle_asc" | "vehicle_desc";


const QuoteList = React.memo(({ quotes, vehicles, onEditQuote, onGenerateService, onViewQuote, onDeleteQuote }: { 
    quotes: QuoteRecord[], 
    vehicles: Vehicle[], 
    onEditQuote: (quote: QuoteRecord) => void,
    onGenerateService: (quote: QuoteRecord) => void,
    onViewQuote: (quote: QuoteRecord) => void,
    onDeleteQuote: (quoteId: string) => void,
}) => {
  
  const getStatusVariant = (status: ServiceRecord['status']): "default" | "secondary" | "outline" | "destructive" | "success" | "waiting" | "delivered" => {
      switch (status) {
        case "Completado": return "success"; 
        case "Reparando": return "secondary"; 
        case "Cancelado": return "destructive"; 
        case "Agendado": return "default";
        case "En Espera de Refacciones": return "waiting";
        case "Entregado": return "delivered";
        case "Cotizacion": return "outline";
        default: return "default";
      }
  };
  
  const getServiceDescriptionText = (quote: QuoteRecord) => {
    if (quote.serviceItems && quote.serviceItems.length > 0) {
      return quote.serviceItems.map(item => item.name).join(', ');
    }
    return quote.description || 'Sin descripción';
  };

  return (
    <div className="space-y-4">
      {quotes.length > 0 ? (
        quotes.map(quote => {
          const vehicle = vehicles.find(v => v.id === quote.vehicleId);
          const service = quote.serviceId ? placeholderServiceRecords.find(s => s.id === quote.serviceId) : null;
          const status = service ? service.status : 'Cotizacion';

          return (
            <Card key={quote.id} className="shadow-sm overflow-hidden">
              <CardContent className="p-0">
                <div className="flex flex-col md:flex-row">
                   <div className="p-4 flex flex-col justify-start items-start text-left w-full md:w-48 flex-shrink-0">
                      <p className="font-semibold text-lg text-foreground">{format(parseISO(quote.quoteDate ?? new Date().toISOString()), "dd MMM yyyy", { locale: es })}</p>
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
                    <div className="p-4 flex flex-col justify-center items-center text-center w-full md:w-48 flex-shrink-0">
                      <p className="text-xs text-muted-foreground">Costo Estimado</p>
                      <p className="font-bold text-2xl text-black">{formatCurrency(quote.totalCost ?? quote.estimatedTotalCost)}</p>
                      <p className="text-xs text-green-600 font-medium mt-1">
                        Ganancia: {formatCurrency(quote.serviceProfit ?? quote.estimatedProfit)}
                      </p>
                    </div>
                    <div className="p-4 flex flex-col justify-center items-center text-center border-t md:border-t-0 md:border-l w-full md:w-56 flex-shrink-0 space-y-2">
                        <Badge variant={getStatusVariant(status)} className="w-full justify-center text-center text-sm">{status}</Badge>
                        <p className="text-xs text-muted-foreground">Asesor: {quote.preparedByTechnicianName || 'N/A'}</p>
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
  const [allQuotes, setAllQuotes] = useState<QuoteRecord[]>(placeholderQuotes);
  const [vehicles, setVehicles] = useState<Vehicle[]>(placeholderVehicles);
  const [technicians, setTechnicians] = useState<Technician[]>(placeholderTechnicians);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>(placeholderInventory);
  const [workshopInfo, setWorkshopInfo] = useState<WorkshopInfo | undefined>(undefined);
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOption, setSortOption] = useState<QuoteSortOption>("date_desc"); 

  const [isEditQuoteDialogOpen, setIsEditQuoteDialogOpen] = useState(false);
  const [selectedQuoteForEdit, setSelectedQuoteForEdit] = useState<QuoteRecord | null>(null);
  const [isGenerateServiceDialogOpen, setIsGenerateServiceDialogOpen] = useState(false);
  const [quoteToConvert, setQuoteToConvert] = useState<QuoteRecord | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [serviceForSheet, setServiceForSheet] = useState<ServiceRecord | null>(null);
  const quoteContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // This effect can be used to sync with a global state or DB in the future
    setAllQuotes(placeholderQuotes);
    setVehicles(placeholderVehicles);
    setTechnicians(placeholderTechnicians);
    setInventoryItems(placeholderInventory);
    if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('workshopTicketInfo');
        if (stored) setWorkshopInfo(JSON.parse(stored));
    }
  }, []);
  
  const activeQuotes = useMemo(() => {
    let filtered = allQuotes.filter(quote => quote.status === 'Cotizacion');

    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(quote => 
        quote.id.toLowerCase().includes(lowerSearchTerm) ||
        (quote.vehicleIdentifier && quote.vehicleIdentifier.toLowerCase().includes(lowerSearchTerm))
      );
    }
    
    filtered.sort((a, b) => {
      const totalA = a.totalCost ?? a.estimatedTotalCost ?? 0;
      const totalB = b.totalCost ?? b.estimatedTotalCost ?? 0;
      switch (sortOption) {
        case "date_asc": return compareAsc(parseISO(a.quoteDate ?? ""), parseISO(b.quoteDate ?? ""));
        case "total_asc": return totalA - totalB;
        case "total_desc": return totalB - totalA;
        case "vehicle_asc": return (a.vehicleIdentifier || '').localeCompare(b.vehicleIdentifier || '');
        case "vehicle_desc": return (b.vehicleIdentifier || '').localeCompare(a.vehicleIdentifier || '');
        case "date_desc": default: return compareDesc(parseISO(a.quoteDate ?? ""), parseISO(b.quoteDate ?? ""));
      }
    });
    return filtered;
  }, [allQuotes, searchTerm, sortOption]);

  const handleViewQuote = useCallback((quote: QuoteRecord) => { /* Logic to show quote preview */ }, []);
  const handleEditQuote = useCallback((quote: QuoteRecord) => { setSelectedQuoteForEdit(quote); setIsEditQuoteDialogOpen(true); }, []);
  const handleDeleteQuote = useCallback(async (quoteId: string) => { /* ... delete logic ... */ }, []);
  const handleGenerateService = useCallback((quote: QuoteRecord) => { /* ... convert to service logic ... */ }, []);
  const handleSaveQuote = useCallback(async (data: QuoteRecord | ServiceRecord) => { /* ... save logic ... */ }, []);

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
          onDeleteQuote={handleDeleteQuote}
          onGenerateService={handleGenerateService}
          onViewQuote={handleViewQuote}
        />
      </div>

      {/* Dialogs */}
      {isEditQuoteDialogOpen && selectedQuoteForEdit && (
         <ServiceDialog open={isEditQuoteDialogOpen} onOpenChange={setIsEditQuoteDialogOpen} quote={selectedQuoteForEdit} vehicles={vehicles} technicians={technicians} inventoryItems={inventoryItems} onSave={handleSaveQuote} onDelete={handleDeleteQuote} mode="quote" />
      )}
      {isGenerateServiceDialogOpen && quoteToConvert && (
          <ServiceDialog open={isGenerateServiceDialogOpen} onOpenChange={setIsGenerateServiceDialogOpen} quote={quoteToConvert} vehicles={vehicles} technicians={technicians} inventoryItems={inventoryItems} onSave={handleSaveQuote} mode="service" />
      )}
    </>
  );
}

export default function HistorialCotizacionesPageWrapper() {
    return (<Suspense fallback={<div>Cargando...</div>}><HistorialCotizacionesPageComponent /></Suspense>)
}
