
"use client";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Search, ListFilter, CalendarIcon as CalendarDateIcon, FileText, DollarSign, Wrench, PlusCircle, Download, Copy, Ban, Edit, MessageSquare } from "lucide-react";
import { PrintTicketDialog } from '@/components/ui/print-ticket-dialog';
import { QuoteContent } from '@/components/quote-content';
import { placeholderQuotes, placeholderVehicles, placeholderTechnicians, placeholderServiceRecords, placeholderInventory, persistToFirestore } from "@/lib/placeholder-data"; 
import type { QuoteRecord, Vehicle, User, ServiceRecord, Technician, InventoryItem, WorkshopInfo } from "@/types"; 
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, compareAsc, compareDesc, isWithinInterval, isValid, startOfDay, endOfDay } from "date-fns";
import { es } from 'date-fns/locale';
import type { DateRange } from "react-day-picker";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ServiceDialog } from "../../servicios/components/service-dialog";
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@root/lib/firebaseClient.js';
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";


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

  const [isServiceDialogOpen, setIsServiceDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceRecord | null>(null);
  
  const [workshopInfo, setWorkshopInfo] = useState<WorkshopInfo | {}>({});
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
    setInventoryItems(inventoryItems);
  }, [inventoryItems]);
  
  const getQuoteDescriptionText = (quote: QuoteRecord) => {
    if (quote.serviceItems && quote.serviceItems.length > 0) {
      return quote.serviceItems.map(item => item.name).join(', ');
    }
    return quote.description || 'Sin descripción';
  };

  const filteredAndSortedQuotes = useMemo(() => {
    let filtered = allQuotes.filter(q => !q.serviceId); // Filter to only show pure quotes

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
        getQuoteDescriptionText(quote).toLowerCase().includes(lowerSearchTerm)
      );
    }
    
    filtered.sort((a, b) => {
      switch (sortOption) {
        case "date_asc":
          return compareAsc(parseISO(a.quoteDate ?? ""), parseISO(b.quoteDate ?? ""));
        case "date_desc":
          return compareDesc(parseISO(a.quoteDate ?? ""), parseISO(b.quoteDate ?? ""));
        case "total_asc": return (a.estimatedTotalCost || 0) - (b.estimatedTotalCost || 0);
        case "total_desc": return (b.estimatedTotalCost || 0) - a.estimatedTotalCost || 0;
        case "vehicle_asc": return (a.vehicleIdentifier || '').localeCompare(b.vehicleIdentifier || '');
        case "vehicle_desc": return (b.vehicleIdentifier || '').localeCompare(a.vehicleIdentifier || '');
        default:
           return compareDesc(parseISO(a.quoteDate ?? ""), parseISO(b.quoteDate ?? ""));
      }
    });
    return filtered;
  }, [allQuotes, searchTerm, dateRange, sortOption]);

  const summaryData = useMemo(() => {
    const totalQuotesCount = filteredAndSortedQuotes.length;
    const totalEstimatedValue = filteredAndSortedQuotes.reduce((sum, q) => sum + (q.estimatedTotalCost || 0), 0);
    
    return { totalQuotesCount, totalEstimatedValue };
  }, [filteredAndSortedQuotes]);


  const handleViewQuote = useCallback((quote: QuoteRecord) => {
    setSelectedQuoteForView(quote);
    setIsViewQuoteDialogOpen(true);
  }, []);
  
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

    const pIndex = placeholderQuotes.findIndex(q => q.id === quoteId);
    if (pIndex > -1) {
      placeholderQuotes.splice(pIndex, 1);
    }
    setAllQuotes([...placeholderQuotes]);
    
    await persistToFirestore(['quotes']);

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
  
  const handleEditService = useCallback((serviceId: string) => {
    const serviceToEdit = placeholderServiceRecords.find(s => s.id === serviceId);
    if (serviceToEdit) {
        setEditingService(serviceToEdit);
        setIsServiceDialogOpen(true);
    } else {
        toast({ title: "Error", description: "No se pudo encontrar el servicio correspondiente.", variant: "destructive" });
    }
  }, [toast]);

  const handleSaveEditedQuote = useCallback(async (data: ServiceRecord | QuoteRecord) => {
      // If the form submits a record with a status, it's being converted to a service
    if ('status' in data && data.status && data.status !== 'Cotizacion') {
      const newService = data as ServiceRecord;
      const originalQuote = selectedQuoteForEdit;
      if (!originalQuote) return;

      const serviceToSave: ServiceRecord = { ...newService, id: `SER_${Date.now().toString(36)}` };
      placeholderServiceRecords.push(serviceToSave);

      // Find original quote and link it to the new service
      const quoteIndex = placeholderQuotes.findIndex(q => q.id === originalQuote.id);
      if (quoteIndex !== -1) {
        placeholderQuotes[quoteIndex].serviceId = serviceToSave.id;
      }
      
      setAllQuotes([...placeholderQuotes]);
      await persistToFirestore(['serviceRecords', 'quotes']);
      toast({
        title: "Servicio Generado desde Cotización",
        description: `Se creó el nuevo servicio ${serviceToSave.id}.`
      });
      
    } else { // It's just a regular quote update
      const editedQuote = data as QuoteRecord;
      const quoteIndex = placeholderQuotes.findIndex(q => q.id === editedQuote.id);
      if (quoteIndex !== -1) {
          placeholderQuotes[quoteIndex] = editedQuote;
          setAllQuotes([...placeholderQuotes]);
          await persistToFirestore(['quotes']);
          toast({ title: "Cotización Actualizada", description: `La cotización ${editedQuote.id} se actualizó correctamente.` });
      }
    }
    setIsEditQuoteDialogOpen(false);
    setSelectedQuoteForEdit(null);
  }, [toast, selectedQuoteForEdit]);
  
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
      
      await persistToFirestore(['serviceRecords', 'quotes']);
      
      toast({ title: "Servicio Generado", description: `Se creó el servicio ${newServiceId} desde la cotización.` });
      setIsGenerateServiceDialogOpen(false);
  }, [toast, quoteToConvert]);

  const handleServiceUpdatedFromDialog = useCallback(async (data: ServiceRecord | QuoteRecord) => {
    if (!('status' in data)) {
      toast({ title: "Error de Tipo", variant: "destructive" });
      return;
    }
    const serviceData = data as ServiceRecord;
    const serviceIndex = placeholderServiceRecords.findIndex(s => s.id === serviceData.id);
    if (serviceIndex > -1) {
      placeholderServiceRecords[serviceIndex] = serviceData;
      await persistToFirestore(['serviceRecords']);
      toast({ title: "Servicio Actualizado", description: `El servicio ${serviceData.id} ha sido actualizado.` });
    }
    setIsServiceDialogOpen(false);
    setEditingService(null);
  }, [toast]);


  const generateAndDownloadPdf = useCallback(async (quoteToPrint: QuoteRecord | null) => {
    if (!quoteContentRef.current || !quoteToPrint) {
      toast({ title: "Error", description: "No se pudo generar el PDF.", variant: "destructive" });
      return;
    }
    const html2pdf = (await import('html2pdf.js')).default;
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
  
  const handleCopyAsImage = async () => {
    if (!quoteContentRef.current) {
        toast({ title: "Error", description: "No se encontró el contenido para copiar.", variant: "destructive" });
        return;
    }
    try {
        const html2canvas = (await import('html2canvas')).default;
        const canvas = await html2canvas(quoteContentRef.current, {
            useCORS: true,
            backgroundColor: '#ffffff',
            scale: 2.5,
        });
        canvas.toBlob(async (blob) => {
            if (blob) {
                try {
                    await navigator.clipboard.write([
                        new ClipboardItem({ 'image/png': blob })
                    ]);
                    toast({ title: "Copiado", description: "La imagen de la cotización ha sido copiada." });
                } catch (clipboardErr) {
                    console.error('Clipboard API error:', clipboardErr);
                    toast({ title: "Error de Copiado", description: "Tu navegador no pudo copiar la imagen. Intenta descargar el PDF.", variant: "destructive" });
                }
            } else {
                 toast({ title: "Error de Conversión", description: "No se pudo convertir a imagen.", variant: "destructive" });
            }
        }, 'image/png');
    } catch (e) {
        console.error("html2canvas error:", e);
        toast({ title: "Error de Captura", description: "No se pudo generar la imagen.", variant: "destructive" });
    }
  };

  const handleSendWhatsApp = useCallback(async (quoteForAction: QuoteRecord | null) => {
    if (!quoteForAction) return;

    if (!quoteForAction.publicId) {
      toast({
        title: 'Enlace no disponible',
        description: 'Esta cotización aún no se ha guardado en la nube. Guarda los cambios primero.',
        variant: 'default',
      });
      return;
    }

    const vehicleForAction = vehicles.find(v => v.id === quoteForAction.vehicleId);
    if (!vehicleForAction) {
        toast({ title: "Faltan Datos", description: "No se encontró el vehículo asociado.", variant: "destructive" });
        return;
    }
    
    const shareUrl = `${window.location.origin}/c/${quoteForAction.publicId}`;
    const workshopName = (quoteForAction.workshopInfo as WorkshopInfo)?.name || 'RANORO';
    const message = `Hola ${vehicleForAction.ownerName || 'Cliente'}, Gracias por confiar en ${workshopName}. Le enviamos su cotización de servicio ${quoteForAction.id} de nuestro taller para su vehículo ${vehicleForAction.make} ${vehicleForAction.model} ${vehicleForAction.year}. En este link encontrara el PDF de la cotizacion: ${shareUrl}`;

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
  }, [toast, vehicles]);

  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined) return 'N/A';
    return `$${amount.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <>
      <div className="mb-6 grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Cotizaciones Activas</CardTitle>
            <FileText className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">{summaryData.totalQuotesCount}</div>
            <p className="text-xs text-muted-foreground">En el rango de fechas seleccionado</p>
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

       <div className="space-y-4">
        {filteredAndSortedQuotes.length > 0 ? (
          filteredAndSortedQuotes.map(quote => {
            const vehicle = vehicles.find(v => v.id === quote.vehicleId);
            const originalQuote = quote;

            return (
              <Card key={quote.id} className="shadow-sm overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex flex-col md:flex-row text-sm">
                    {/* Block 1: Folio y Fecha (Centrado) */}
                    <div className="p-4 flex flex-col justify-center items-center text-center space-y-1 border-b md:border-b-0 md:border-r w-full md:w-48 flex-shrink-0">
                      <p className="text-xs text-muted-foreground">Folio: {quote.id}</p>
                      <p className="text-lg font-semibold">{format(parseISO(quote.quoteDate!), "dd MMM yyyy", { locale: es })}</p>
                    </div>

                    <Separator orientation="vertical" className="hidden md:block h-auto"/>

                    {/* Block 2: Vehículo y Servicio (Centrado verticalmente) */}
                    <div className="p-4 flex flex-col justify-center flex-grow space-y-2 text-left border-b md:border-b-0">
                        <p className="font-bold text-lg">{vehicle ? `${vehicle.licensePlate} - ${vehicle.make} ${vehicle.model} ${vehicle.year}` : 'N/A'}</p>
                        <p className="text-sm text-muted-foreground">{vehicle?.ownerName} - {vehicle?.ownerPhone}</p>
                        <p className="text-sm text-foreground" title={getQuoteDescriptionText(quote)}>
                            <span className="font-semibold">{quote.serviceType}:</span> {getQuoteDescriptionText(quote)}
                        </p>
                    </div>
                    
                    <Separator orientation="vertical" className="hidden md:block h-auto"/>

                    {/* Block 3: Costo y Ganancia (Centrado) */}
                    <div className="p-4 flex flex-col justify-center items-center text-center space-y-1 border-b md:border-b-0 md:border-l w-full md:w-48 flex-shrink-0">
                        <p className="text-xs text-muted-foreground">Costo Estimado</p>
                        <p className="font-bold text-xl text-black">{formatCurrency(quote.estimatedTotalCost)}</p>
                        <p className="text-xs text-muted-foreground mt-1">Ganancia Estimada</p>
                        <p className="font-semibold text-green-600">{formatCurrency(quote.estimatedProfit)}</p>
                    </div>

                    <Separator orientation="vertical" className="hidden md:block h-auto"/>

                    {/* Block 4: Estatus, Asesor y Acciones (Centrado) */}
                    <div className="p-4 flex flex-col justify-center items-center text-center space-y-2 border-b md:border-b-0 md:border-l w-full md:w-56 flex-shrink-0">
                        <Badge variant={quote.serviceId ? "lightRed" : "outline"} className="w-full justify-center text-center text-sm">
                            {quote.serviceId ? "Agendado" : "Cotizacion"}
                        </Badge>
                        <p className="text-xs text-muted-foreground">Asesor: {quote.preparedByTechnicianName || 'N/A'}</p>
                        <div className="flex justify-center items-center gap-1 mt-1">
                          <Button variant="ghost" size="icon" onClick={() => handleViewQuote(originalQuote)} title="Ver Cotización">
                            <FileText className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleEditQuote(originalQuote)} title="Editar Cotización">
                              <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleGenerateService(originalQuote)} title="Generar Servicio" className="text-blue-600 hover:text-blue-700">
                              <Wrench className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" title="Cancelar Cotización" disabled={!!quote.serviceId}>
                                  <Ban className="h-4 w-4 text-destructive" />
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>¿Cancelar esta cotización?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta acción no se puede deshacer y eliminará permanentemente la cotización {quote.id}. No se puede cancelar si ya tiene un servicio agendado.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>No</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteQuote(quote.id)} className="bg-destructive hover:bg-destructive/90">
                                    Sí, Cancelar
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        ) : (
          <p className="text-muted-foreground text-center py-8">No hay cotizaciones que coincidan con los filtros.</p>
        )}
      </div>


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
              <Button variant="outline" onClick={handleCopyAsImage}>
                <Copy className="mr-2 h-4 w-4" /> Copiar Imagen
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
            workshopInfo={selectedQuoteForView.workshopInfo}
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
      
      {isServiceDialogOpen && editingService && (
        <ServiceDialog
            open={isServiceDialogOpen}
            onOpenChange={setIsServiceDialogOpen}
            service={editingService} 
            vehicles={vehicles} 
            technicians={technicians}
            inventoryItems={inventoryItems}
            onSave={handleServiceUpdatedFromDialog}
            mode="service"
        />
      )}
    </>
  );
}
