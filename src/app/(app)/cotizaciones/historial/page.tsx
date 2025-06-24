
"use client";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, ListFilter, CalendarIcon as CalendarDateIcon, FileText, DollarSign, MessageSquare, PlusCircle, Download, Wrench } from "lucide-react";
import { QuotesTable } from "../components/quotes-table"; 
import { PrintTicketDialog } from '@/components/ui/print-ticket-dialog';
import { QuoteContent } from '@/components/quote-content';
import { placeholderQuotes, placeholderVehicles, placeholderTechnicians, placeholderServiceRecords, placeholderInventory, persistToFirestore } from "@/lib/placeholder-data"; 
import type { QuoteRecord, Vehicle, User, ServiceRecord, Technician, InventoryItem } from "@/types"; 
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, compareAsc, compareDesc, isWithinInterval, isValid, startOfDay, endOfDay } from "date-fns";
import { es } from 'date-fns/locale';
import type { DateRange } from "react-day-picker";
import Link from "next/link";
import { cn } from "@/lib/utils";
import html2pdf from 'html2pdf.js';
import { ServiceDialog } from "../../servicios/components/service-dialog";
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@root/lib/firebaseClient.js';


type QuoteSortOption = 
  | "date_desc" | "date_asc"
  | "total_desc" | "total_asc"
  | "vehicle_asc" | "vehicle_desc";

export default function HistorialCotizacionesPage() {
  const [allQuotes, setAllQuotes] = useState<QuoteRecord[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);

  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [sortOption, setSortOption] = useState<QuoteSortOption>("date_desc"); 

  const [isViewQuoteDialogOpen, setIsViewQuoteDialogOpen] = useState(false);
  const [selectedQuoteForView, setSelectedQuoteForView] = useState<QuoteRecord | null>(null);
  
  const [isEditQuoteDialogOpen, setIsEditQuoteDialogOpen] = useState(false);
  const [selectedQuoteForEdit, setSelectedQuoteForEdit] = useState<QuoteRecord | null>(null);

  const [isGenerateServiceDialogOpen, setIsGenerateServiceDialogOpen] = useState(false);
  const [quoteToConvert, setQuoteToConvert] = useState<QuoteRecord | null>(null);

  const [vehicleForSelectedQuote, setVehicleForSelectedQuote] = useState<Vehicle | null>(null);
  
  const [workshopInfo, setWorkshopInfo] = useState<{name?: string}>({});
  const quoteContentRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('workshopTicketInfo');
        if (stored) setWorkshopInfo(JSON.parse(stored));
    }
  }, []);

  useEffect(() => {
    setAllQuotes(placeholderQuotes);
    setVehicles(placeholderVehicles);
    setTechnicians(placeholderTechnicians);
    setInventoryItems(placeholderInventory);
  }, []);

  const filteredAndSortedQuotes = useMemo(() => {
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
        (quote.vehicleIdentifier && quote.vehicleIdentifier.toLowerCase().includes(lowerSearchTerm)) ||
        quote.description.toLowerCase().includes(lowerSearchTerm)
      );
    }
    
    filtered.sort((a, b) => {
      switch (sortOption) {
        case "date_asc":
          return compareAsc(parseISO(a.quoteDate ?? ""), parseISO(b.quoteDate ?? ""));
        case "date_desc":
          return compareDesc(parseISO(a.quoteDate ?? ""), parseISO(b.quoteDate ?? ""));
        case "total_asc": return (a.estimatedTotalCost || 0) - (b.estimatedTotalCost || 0);
        case "total_desc": return (b.estimatedTotalCost || 0) - (a.estimatedTotalCost || 0);
        case "vehicle_asc": return (a.vehicleIdentifier || '').localeCompare(b.vehicleIdentifier || '');
        case "vehicle_desc": return (b.vehicleIdentifier || '').localeCompare(a.vehicleIdentifier || '');
        default: return compareDesc(parseISO(a.quoteDate ?? ""), parseISO(b.quoteDate ?? ""));
      }
    });
    return filtered;
  }, [allQuotes, searchTerm, dateRange, sortOption]);

  const summaryData = useMemo(() => {
    const totalQuotesCount = filteredAndSortedQuotes.length;
    const totalEstimatedValue = filteredAndSortedQuotes.reduce((sum, q) => sum + (q.estimatedTotalCost || 0), 0);
    const completedQuotesCount = filteredAndSortedQuotes.filter(q => !!q.serviceId).length;
    
    return { totalQuotesCount, totalEstimatedValue, completedQuotesCount };
  }, [filteredAndSortedQuotes]);


  const handleViewQuote = useCallback((quote: QuoteRecord) => {
    setSelectedQuoteForView(quote);
    setVehicleForSelectedQuote(vehicles.find(v => v.id === quote.vehicleId) || null);
    setIsViewQuoteDialogOpen(true);
  }, [vehicles]);
  
  const handleEditQuote = useCallback((quote: QuoteRecord) => {
    setSelectedQuoteForEdit(quote);
    setIsEditQuoteDialogOpen(true);
  }, []);

  const handleDeleteQuote = useCallback(async (quoteId: string) => {
    const quoteToDelete = allQuotes.find(q => q.id === quoteId);
    if (!quoteToDelete) {
      toast({ title: "Error", description: "No se pudo encontrar la cotización para eliminar.", variant: "destructive" });
      return;
    }

    if (quoteToDelete.publicId && db) {
      try {
        await deleteDoc(doc(db, "publicQuotes", quoteToDelete.publicId));
      } catch (e) {
        console.error("Failed to delete public quote:", e);
      }
    }

    setAllQuotes(prev => prev.filter(q => q.id !== quoteId));
    const pIndex = placeholderQuotes.findIndex(q => q.id === quoteId);
    if (pIndex > -1) {
      placeholderQuotes.splice(pIndex, 1);
    }
    
    await persistToFirestore();

    toast({ title: "Cotización Eliminada", description: `La cotización ${quoteId} ha sido eliminada.` });
    setIsEditQuoteDialogOpen(false);
  }, [allQuotes, toast]);
  
  const handleGenerateService = useCallback((quote: QuoteRecord) => {
    if (quote.serviceId) {
      toast({ title: "Ya Ingresado", description: `Esta cotización ya fue ingresada al servicio ID: ${quote.serviceId}.` });
      return;
    }
    setQuoteToConvert(quote);
    setIsGenerateServiceDialogOpen(true);
  }, [toast]);

  const handleSaveEditedQuote = useCallback(async (data: ServiceRecord | QuoteRecord) => {
      const editedQuote = data as QuoteRecord;
      const quoteIndex = placeholderQuotes.findIndex(q => q.id === editedQuote.id);
      if (quoteIndex !== -1) {
          if (!editedQuote.publicId) {
            editedQuote.publicId = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 9)}`;
          }
          placeholderQuotes[quoteIndex] = editedQuote;
          setAllQuotes([...placeholderQuotes]);
          await persistToFirestore();

          const vehicleForPublicQuote = vehicles.find(v => v.id === editedQuote.vehicleId);
          if (vehicleForPublicQuote && db) { // Add check for db
              const publicQuoteData = {
                  ...editedQuote,
                  vehicle: { ...vehicleForPublicQuote },
              };
              try {
                  await setDoc(doc(db, "publicQuotes", editedQuote.publicId!), publicQuoteData);
              } catch (e) {
                  console.error("Failed to update public quote:", e);
              }
          }

          toast({ title: "Cotización Actualizada", description: `La cotización ${editedQuote.id} se actualizó correctamente.` });
      }
      setIsEditQuoteDialogOpen(false);
  }, [toast, vehicles]);
  
  const handleSaveServiceFromQuote = useCallback(async (data: ServiceRecord | QuoteRecord) => {
      const newService = data as ServiceRecord;
      if (!quoteToConvert) return;

      const newServiceId = `SER_${Date.now().toString(36)}`;
      const serviceToSave: ServiceRecord = { ...newService, id: newServiceId };
      placeholderServiceRecords.push(serviceToSave);

      const quoteIndex = placeholderQuotes.findIndex(q => q.id === quoteToConvert.id);
      if (quoteIndex !== -1) {
          placeholderQuotes[quoteIndex].serviceId = newServiceId;
          setAllQuotes([...placeholderQuotes]);
      }
      
      await persistToFirestore();
      
      toast({ title: "Servicio Generado", description: `Se creó el servicio ${newServiceId} desde la cotización.` });
      setIsGenerateServiceDialogOpen(false);
  }, [toast, quoteToConvert]);


  const generateAndDownloadPdf = useCallback((quoteToPrint: QuoteRecord | null) => {
    if (!quoteContentRef.current || !quoteToPrint) {
      toast({ title: "Error", description: "No se pudo generar el PDF.", variant: "destructive" });
      return;
    }
    const element = quoteContentRef.current;
    const pdfFileName = `Cotizacion-${quoteToPrint.id}.pdf`;
    const opt = {
      margin: 7.5,
      filename: pdfFileName,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true },
      jsPDF: { unit: 'mm', format: 'letter', orientation: 'portrait' }
    };
    toast({ title: "Generando PDF...", description: `Se está preparando ${pdfFileName}.` });
    html2pdf().from(element).set(opt).save();
  }, [toast]);

  const handleSendWhatsApp = useCallback(async (quoteForAction: QuoteRecord | null) => {
    if (!quoteForAction) return;
    const vehicleForAction = vehicles.find(v => v.id === quoteForAction.vehicleId);
    if (!vehicleForAction) {
        toast({ title: "Faltan Datos", description: "No se encontró el vehículo asociado.", variant: "destructive" });
        return;
    }

    if (!quoteForAction.publicId) {
      quoteForAction.publicId = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 9)}`;
      const quoteIndex = placeholderQuotes.findIndex(q => q.id === quoteForAction.id);
      if (quoteIndex !== -1) {
          placeholderQuotes[quoteIndex] = quoteForAction;
          await persistToFirestore();
          setAllQuotes([...placeholderQuotes]);
          toast({
              title: "Enlace Público Creado",
              description: "Se ha generado un nuevo enlace aleatorio para esta cotización antigua.",
              duration: 4000,
          });
      }
    }
    
    const shareUrl = `${window.location.origin}/c/${quoteForAction.publicId}`;
    
    const message = `Hola ${vehicleForAction.ownerName || 'Cliente'}, Gracias por confiar en ${workshopInfo?.name || 'RANORO'}. Le enviamos su cotización de servicio ${quoteForAction.id} de nuestro taller para su vehículo ${vehicleForAction.make} ${vehicleForAction.model} ${vehicleForAction.year}. En este link encontrara el PDF de la cotizacion: ${shareUrl}`;

    navigator.clipboard.writeText(message).then(() => {
        toast({
            title: "Mensaje Copiado",
            description: "El mensaje para WhatsApp ha sido copiado a tu portapapeles.",
            duration: 2000,
        });
    }).catch(err => {
        console.error("Could not copy text: ", err);
        toast({
            title: "Error al Copiar",
            description: "No se pudo copiar el mensaje.",
            variant: "destructive",
        });
    });
  }, [toast, vehicles, workshopInfo]);

  return (
    <>
      <div className="mb-6 grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Cotizaciones</CardTitle>
            <FileText className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">{summaryData.totalQuotesCount}</div>
            <p className="text-xs text-muted-foreground">En el rango de fechas seleccionado</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Cotizaciones Concretadas</CardTitle>
            <Wrench className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">{summaryData.completedQuotesCount}</div>
            <p className="text-xs text-muted-foreground">Convertidas en órdenes de servicio</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Valor Estimado Total</CardTitle>
            <DollarSign className="h-5 w-5 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">${(summaryData.totalEstimatedValue || 0).toLocaleString('es-ES')}</div>
            <p className="text-xs text-muted-foreground">De las cotizaciones filtradas</p>
          </CardContent>
        </Card>
      </div>

      <PageHeader
        title="Cotizaciones"
        description="Consulta, filtra y ordena todas las cotizaciones generadas."
        actions={
          <Button asChild>
            <Link href="/cotizaciones/crear">
              <PlusCircle className="mr-2 h-4 w-4" />
              Nueva Cotización
            </Link>
          </Button>
        }
      />

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:flex-wrap">
        <div className="relative flex-1 min-w-[200px] sm:min-w-[300px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar por folio, vehículo, descripción..."
            className="w-full rounded-lg bg-card pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn(
                "min-w-[240px] justify-start text-left font-normal flex-1 sm:flex-initial bg-card",
                !dateRange && "text-muted-foreground"
              )}
            >
              <CalendarDateIcon className="mr-2 h-4 w-4" />
              {dateRange?.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, "LLL dd, y", { locale: es })} -{" "}
                    {format(dateRange.to, "LLL dd, y", { locale: es })}
                  </>
                ) : (
                  format(dateRange.from, "LLL dd, y", { locale: es })
                )
              ) : (
                <span>Seleccione rango de fechas</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange?.from}
              selected={dateRange}
              onSelect={setDateRange}
              numberOfMonths={2}
              locale={es}
            />
          </PopoverContent>
        </Popover>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="min-w-[150px] flex-1 sm:flex-initial bg-card">
              <ListFilter className="mr-2 h-4 w-4" />
              Ordenar
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Ordenar por</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={sortOption} onValueChange={(value) => setSortOption(value as QuoteSortOption)}>
              <DropdownMenuRadioItem value="date_desc">Fecha (Más Reciente)</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="date_asc">Fecha (Más Antiguo)</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="total_desc">Monto Total (Mayor a Menor)</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="total_asc">Monto Total (Menor a Mayor)</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="vehicle_asc">Vehículo (A-Z)</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="vehicle_desc">Vehículo (Z-A)</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <QuotesTable 
        quotes={filteredAndSortedQuotes} 
        vehicles={vehicles}
        onViewQuote={handleViewQuote} 
        onEditQuote={handleEditQuote}
        onGenerateService={handleGenerateService}
      />

      {isViewQuoteDialogOpen && selectedQuoteForView && (
        <PrintTicketDialog
          open={isViewQuoteDialogOpen}
          onOpenChange={setIsViewQuoteDialogOpen}
          title={`Cotización: ${selectedQuoteForView.id}`}
          dialogContentClassName="printable-quote-dialog"
          onDialogClose={() => setSelectedQuoteForView(null)}
          footerActions={
            <>
              <Button variant="outline" onClick={() => handleSendWhatsApp(selectedQuoteForView)}>
                <MessageSquare className="mr-2 h-4 w-4" /> Copiar para WhatsApp
              </Button>
              <Button onClick={() => generateAndDownloadPdf(selectedQuoteForView)}>
                 <Download className="mr-2 h-4 w-4" /> Descargar PDF
              </Button>
            </>
          }
        >
          <QuoteContent 
            ref={quoteContentRef}
            quote={selectedQuoteForView} 
            vehicle={vehicles.find(v => v.id === selectedQuoteForView.vehicleId) || undefined}
          />
        </PrintTicketDialog>
      )}

      {isEditQuoteDialogOpen && selectedQuoteForEdit && (
         <ServiceDialog
            open={isEditQuoteDialogOpen}
            onOpenChange={setIsEditQuoteDialogOpen}
            quote={selectedQuoteForEdit}
            vehicles={vehicles}
            technicians={technicians}
            inventoryItems={inventoryItems}
            onSave={handleSaveEditedQuote}
            onDelete={handleDeleteQuote}
            mode="quote"
         />
      )}
      
      {isGenerateServiceDialogOpen && quoteToConvert && (
          <ServiceDialog
            open={isGenerateServiceDialogOpen}
            onOpenChange={setIsGenerateServiceDialogOpen}
            quote={quoteToConvert}
            vehicles={vehicles}
            technicians={technicians}
            inventoryItems={inventoryItems}
            onSave={handleSaveServiceFromQuote}
            mode="service"
          />
      )}

    </>
  );
}
