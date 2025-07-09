

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
import { useState, useEffect, useMemo, useRef, useCallback, Suspense } from "react";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, compareAsc, compareDesc, isWithinInterval, isValid, startOfDay, endOfDay, addDays, isAfter } from "date-fns";
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


type QuoteSortOption = 
  | "date_desc" | "date_asc"
  | "total_desc" | "total_asc"
  | "vehicle_asc" | "vehicle_desc";


// Helper component for the list of quotes to avoid code repetition
const QuoteList = ({ quotes, vehicles, onEditQuote, onGenerateService, onViewQuote, onDeleteQuote }: { 
    quotes: QuoteRecord[], 
    vehicles: Vehicle[], 
    onEditQuote: (quote: QuoteRecord) => void,
    onGenerateService: (quote: QuoteRecord) => void,
    onViewQuote: (quote: QuoteRecord) => void,
    onDeleteQuote: (quoteId: string) => void,
}) => {
  
  const getQuoteDescriptionText = (quote: QuoteRecord) => {
    if (quote.serviceItems && quote.serviceItems.length > 0) {
      return quote.serviceItems.map(item => item.name).join(', ');
    }
    return quote.description || 'Sin descripción';
  };
  
  const getStatusVariant = (status: ServiceRecord['status'] | 'Cotizacion'): "default" | "secondary" | "outline" | "destructive" | "success" | "lightRed" | "waiting" | "delivered" => {
    switch (status) {
      case "Completado": return "success"; case "Reparando": return "secondary"; case "Cancelado": return "destructive";
      case "Agendado": return "lightRed"; case "Cotizacion": return "outline";
      case "En Espera de Refacciones": return "waiting"; case "Entregado": return "delivered";
      default: return "default";
    }
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
                   <div className="p-4 flex flex-col justify-center items-center text-center w-full md:w-48 flex-shrink-0">
                      <p className="text-muted-foreground text-xs">Folio: {quote.id}</p>
                      <p className="font-semibold text-lg text-foreground">{format(parseISO(quote.quoteDate!), "dd MMM yyyy", { locale: es })}</p>
                    </div>
                    <div className="p-4 flex flex-col justify-center flex-grow space-y-2 text-left border-y md:border-y-0 md:border-x">
                      <p className="text-sm text-muted-foreground">{vehicle?.ownerName} - {vehicle?.ownerPhone}</p>
                      <p className="font-bold text-2xl text-black">{vehicle ? `${vehicle.licensePlate} - ${vehicle.make} ${vehicle.model} ${vehicle.year}` : 'N/A'}</p>
                      <p className="text-sm text-foreground">
                        <span className="font-semibold">{quote.serviceType}:</span> {getQuoteDescriptionText(quote)}
                      </p>
                    </div>
                    <div className="p-4 flex flex-col justify-center items-center text-center w-full md:w-48 flex-shrink-0">
                      <p className="text-xs text-muted-foreground">Costo Estimado</p>
                      <p className="font-bold text-2xl text-black">{formatCurrency(quote.estimatedTotalCost)}</p>
                    </div>
                    <div className="p-4 flex flex-col justify-center items-center text-center border-t md:border-t-0 md:border-l w-full md:w-56 flex-shrink-0 space-y-2">
                        <Badge variant={getStatusVariant(status)} className="w-full justify-center text-center text-sm">{status}</Badge>
                         <p className="text-xs text-muted-foreground mt-4">Asesor: {quote.preparedByTechnicianName || 'N/A'}</p>
                        <div className="flex justify-center items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => onViewQuote(quote)} title="Vista Previa"><Eye className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => onEditQuote(quote)} title="Editar Cotización"><Edit className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => onGenerateService(quote)} title="Generar Servicio" className="text-blue-600 hover:text-blue-700"><Wrench className="h-4 w-4" /></Button>
                          <AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon" title="Cancelar Cotización" disabled={!!quote.serviceId}><Ban className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Cancelar esta cotización?</AlertDialogTitle><AlertDialogDescription>Esta acción no se puede deshacer y eliminará permanentemente la cotización {quote.id}.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>No</AlertDialogCancel><AlertDialogAction onClick={() => onDeleteQuote(quote.id)} className="bg-destructive hover:bg-destructive/90">Sí, Cancelar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
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
};


function HistorialCotizacionesPageComponent() {
  const [allQuotes, setAllQuotes] = useState<QuoteRecord[]>(placeholderQuotes);
  const [vehicles, setVehicles] = useState<Vehicle[]>(placeholderVehicles);
  const [technicians, setTechnicians] = useState<Technician[]>(placeholderTechnicians);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>(placeholderInventory);
  const [workshopInfo, setWorkshopInfo] = useState<WorkshopInfo | undefined>(undefined);
  const { toast } = useToast();
  
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'resumen');
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
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
  
  const historicalQuotes = useMemo(() => {
    let filtered = [...allQuotes];
    if (dateRange?.from) {
      filtered = filtered.filter(quote => {
        const quoteDate = parseISO(quote.quoteDate ?? "");
        if (!isValid(quoteDate)) return false;
        const from = startOfDay(dateRange.from!);
        const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from!);
        return isWithinInterval(quoteDate, { start: from, end: to });
      });
    }

    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(quote => 
        quote.id.toLowerCase().includes(lowerSearchTerm) ||
        (quote.vehicleIdentifier && quote.vehicleIdentifier.toLowerCase().includes(lowerSearchTerm))
      );
    }
    
    filtered.sort((a, b) => {
      switch (sortOption) {
        case "date_asc": return compareAsc(parseISO(a.quoteDate ?? ""), parseISO(b.quoteDate ?? ""));
        case "total_asc": return (a.estimatedTotalCost || 0) - (b.estimatedTotalCost || 0);
        case "total_desc": return (b.estimatedTotalCost || 0) - (a.estimatedTotalCost || 0);
        case "vehicle_asc": return (a.vehicleIdentifier || '').localeCompare(b.vehicleIdentifier || '');
        case "vehicle_desc": return (b.vehicleIdentifier || '').localeCompare(a.vehicleIdentifier || '');
        case "date_desc": default: return compareDesc(parseISO(a.quoteDate ?? ""), parseISO(b.quoteDate ?? ""));
      }
    });
    return filtered;
  }, [allQuotes, searchTerm, dateRange, sortOption]);
  
  const vigentesQuotes = useMemo(() => {
    const today = new Date();
    return allQuotes.filter(quote => {
      if (quote.status !== 'Cotizacion') return false;
      const quoteDate = parseISO(quote.quoteDate ?? "");
      if (!isValid(quoteDate)) return false;
      const expirationDate = addDays(quoteDate, 15);
      return isAfter(expirationDate, today);
    });
  }, [allQuotes]);


  const summaryData = useMemo(() => {
    const activeQuotes = allQuotes.filter(q => q.status === 'Cotizacion');
    const totalQuotesCount = activeQuotes.length;
    const totalEstimatedValue = activeQuotes.reduce((sum, q) => sum + (q.estimatedTotalCost || 0), 0);
    return { totalQuotesCount, totalEstimatedValue };
  }, [allQuotes]);

  const handleViewQuote = useCallback((quote: QuoteRecord) => { /* Logic to show quote preview */ }, []);
  const handleEditQuote = useCallback((quote: QuoteRecord) => { setSelectedQuoteForEdit(quote); setIsEditQuoteDialogOpen(true); }, []);
  const handleDeleteQuote = useCallback(async (quoteId: string) => { /* ... delete logic ... */ }, []);
  const handleGenerateService = useCallback((quote: QuoteRecord) => { /* ... convert to service logic ... */ }, []);
  const handleSaveQuote = useCallback(async (data: QuoteRecord | ServiceRecord) => { /* ... save logic ... */ }, []);

  return (
    <>
      <PageHeader
          title="Gestión de Cotizaciones"
          description="Consulta, filtra y da seguimiento a todas las cotizaciones generadas."
      />
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="resumen">Resumen</TabsTrigger>
            <TabsTrigger value="vigentes">Vigentes</TabsTrigger>
            <TabsTrigger value="historial">Historial</TabsTrigger>
        </TabsList>
        
        <TabsContent value="resumen" className="mt-0 space-y-6">
           <div className="grid gap-6 md:grid-cols-2">
            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total de Cotizaciones Pendientes</CardTitle><FileText className="h-5 w-5 text-blue-500" /></CardHeader><CardContent><div className="text-2xl font-bold font-headline">{summaryData.totalQuotesCount}</div><p className="text-xs text-muted-foreground">Solo cotizaciones sin convertir a servicio.</p></CardContent></Card>
            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Valor Estimado (Pendientes)</CardTitle><DollarSign className="h-5 w-5 text-purple-500" /></CardHeader><CardContent><div className="text-2xl font-bold font-headline">{formatCurrency(summaryData.totalEstimatedValue)}</div><p className="text-xs text-muted-foreground">De las cotizaciones pendientes.</p></CardContent></Card>
          </div>
        </TabsContent>
        
        <TabsContent value="vigentes" className="mt-0 space-y-4">
          <QuoteList quotes={vigentesQuotes} vehicles={vehicles} onEditQuote={handleEditQuote} onDeleteQuote={handleDeleteQuote} onGenerateService={handleGenerateService} onViewQuote={handleViewQuote} />
        </TabsContent>

        <TabsContent value="historial" className="mt-0 space-y-4">
           <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:flex-wrap">
            <div className="relative flex-1 min-w-[200px] sm:min-w-[300px]"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input type="search" placeholder="Buscar por folio o vehículo..." className="w-full rounded-lg bg-card pl-8" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
            <Popover><PopoverTrigger asChild><Button variant={"outline"} className={cn("min-w-[240px] justify-start text-left font-normal flex-1 sm:flex-initial bg-card", !dateRange && "text-muted-foreground")}><CalendarDateIcon className="mr-2 h-4 w-4" />{dateRange?.from ? (dateRange.to ? (`${format(dateRange.from, "LLL dd, y")} - ${format(dateRange.to, "LLL dd, y")}`) : format(dateRange.from, "LLL dd, y")) : (<span>Seleccione rango de fechas</span>)}</Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2} locale={es} /></PopoverContent></Popover>
            <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" className="min-w-[150px] flex-1 sm:flex-initial bg-card"><ListFilter className="mr-2 h-4 w-4" />Ordenar</Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuLabel>Ordenar por</DropdownMenuLabel><DropdownMenuRadioGroup value={sortOption} onValueChange={(value) => setSortOption(value as QuoteSortOption)}><DropdownMenuRadioItem value="date_desc">Fecha (Más Reciente)</DropdownMenuRadioItem><DropdownMenuRadioItem value="date_asc">Fecha (Más Antiguo)</DropdownMenuRadioItem><DropdownMenuRadioItem value="total_desc">Monto Total (Mayor a Menor)</DropdownMenuRadioItem><DropdownMenuRadioItem value="total_asc">Monto Total (Menor a Mayor)</DropdownMenuRadioItem></DropdownMenuRadioGroup></DropdownMenuContent></DropdownMenu>
          </div>
          <QuoteList quotes={historicalQuotes} vehicles={vehicles} onEditQuote={handleEditQuote} onDeleteQuote={handleDeleteQuote} onGenerateService={handleGenerateService} onViewQuote={handleViewQuote}/>
        </TabsContent>
      </Tabs>

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

