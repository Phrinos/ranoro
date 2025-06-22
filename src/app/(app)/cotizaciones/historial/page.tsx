
"use client";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, ListFilter, CalendarIcon as CalendarDateIcon, FileText, DollarSign, Mail, MessageSquare } from "lucide-react";
import { QuotesTable } from "../components/quotes-table"; 
import { PrintTicketDialog } from '@/components/ui/print-ticket-dialog';
import { QuoteContent } from '@/components/quote-content';
import { placeholderQuotes, placeholderVehicles } from "@/lib/placeholder-data"; 
import type { QuoteRecord, Vehicle, User } from "@/types"; 
import { useState, useEffect, useMemo, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, compareAsc, compareDesc, isWithinInterval, isValid, startOfDay, endOfDay } from "date-fns";
import { es } from 'date-fns/locale';
import type { DateRange } from "react-day-picker";
import Link from "next/link";
import { cn } from "@/lib/utils";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

type QuoteSortOption = 
  | "date_desc" | "date_asc"
  | "total_desc" | "total_asc"
  | "vehicle_asc" | "vehicle_desc";

export default function HistorialCotizacionesPage() {
  const [allQuotes, setAllQuotes] = useState<QuoteRecord[]>(placeholderQuotes);
  const [vehicles, setVehicles] = useState<Vehicle[]>(placeholderVehicles);
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [sortOption, setSortOption] = useState<QuoteSortOption>("date_desc"); 

  const [isViewQuoteDialogOpen, setIsViewQuoteDialogOpen] = useState(false);
  const [selectedQuoteForView, setSelectedQuoteForView] = useState<QuoteRecord | null>(null);
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
    const sortedInitialQuotes = [...placeholderQuotes].sort((a, b) => 
      compareDesc(
        parseISO(a.quoteDate ?? ""),
        parseISO(b.quoteDate ?? "")
      )      
    );
    setAllQuotes(sortedInitialQuotes); 
    setVehicles(placeholderVehicles);
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
  return compareAsc(
    parseISO(a.quoteDate ?? ""),
    parseISO(b.quoteDate ?? "")
  );
        case "date_desc":
  return compareDesc(
    parseISO(a.quoteDate ?? ""),
    parseISO(b.quoteDate ?? "")
  );
        case "total_asc": return a.estimatedTotalCost - b.estimatedTotalCost;
        case "total_desc": return b.estimatedTotalCost - a.estimatedTotalCost;
        case "vehicle_asc": return (a.vehicleIdentifier || '').localeCompare(b.vehicleIdentifier || '');
        case "vehicle_desc": return (b.vehicleIdentifier || '').localeCompare(a.vehicleIdentifier || '');
        default: return compareDesc(parseISO(a.quoteDate ?? ""), parseISO(b.quoteDate ?? ""));
      }
    });
    return filtered;
  }, [allQuotes, searchTerm, dateRange, sortOption]);

  const summaryData = useMemo(() => {
    const totalQuotesCount = filteredAndSortedQuotes.length;
    const totalEstimatedValue = filteredAndSortedQuotes.reduce((sum, q) => sum + q.estimatedTotalCost, 0);
    
    return { totalQuotesCount, totalEstimatedValue };
  }, [filteredAndSortedQuotes]);


  const handleViewQuote = (quote: QuoteRecord) => {
    setSelectedQuoteForView(quote);
    setVehicleForSelectedQuote(vehicles.find(v => v.id === quote.vehicleId) || null);
    setIsViewQuoteDialogOpen(true);
  };

  const handleViewDialogClose = () => {
    setIsViewQuoteDialogOpen(false);
    setSelectedQuoteForView(null);
    setVehicleForSelectedQuote(null);
  };
  
  const generatePdf = async () => {
    if (!quoteContentRef.current) {
        toast({ title: "Error", description: "No se pudo generar el PDF.", variant: "destructive" });
        return null;
    }
    const canvas = await html2canvas(quoteContentRef.current, { scale: 3 });
    const imgData = canvas.toDataURL('image/png');
    
    const pdf = new jsPDF('p', 'mm', 'letter');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = imgWidth / imgHeight;
    const imgPdfWidth = pdfWidth;
    const imgPdfHeight = imgPdfWidth / ratio;
    
    let heightLeft = imgPdfHeight;
    let position = 0;
    
    pdf.addImage(imgData, 'PNG', 0, position, imgPdfWidth, imgPdfHeight);
    heightLeft -= pdfHeight;
    
    while (heightLeft > 0) {
        position = heightLeft - imgPdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgPdfWidth, imgPdfHeight);
        heightLeft -= pdfHeight;
    }
    return pdf;
  };

  const handleSendEmail = async () => {
    if (!selectedQuoteForView || !vehicleForSelectedQuote) return;
    
    const pdf = await generatePdf();
    if (pdf) {
      pdf.save(`Cotizacion-${selectedQuoteForView.id}.pdf`);
      toast({ title: "PDF Descargado", description: "El PDF de la cotización ha sido descargado. Por favor, adjúntalo manualmente a tu correo." });
      
      const subject = encodeURIComponent(`Cotización de Servicio: ${selectedQuoteForView.id} - ${workshopInfo?.name || 'Su Taller'}`);
      const body = encodeURIComponent(
        `Estimado/a ${vehicleForSelectedQuote.ownerName || 'Cliente'},\n\n` +
        `Adjunto encontrará la cotización de servicio solicitada.\n\n`+
        `Saludos cordiales,\n${selectedQuoteForView.preparedByTechnicianName || workshopInfo?.name || 'El equipo del Taller'}`
      );
      const mailtoLink = `mailto:${vehicleForSelectedQuote.ownerEmail || ''}?subject=${subject}&body=${body}`;
      window.open(mailtoLink, '_blank');
    }
  };

  const handleSendWhatsApp = async () => {
    if (!selectedQuoteForView || !vehicleForSelectedQuote || !vehicleForSelectedQuote.ownerPhone) {
      toast({ title: "Faltan Datos", description: "No se encontró el teléfono del cliente para enviar por WhatsApp.", variant: "destructive" });
      return;
    }
    const pdf = await generatePdf();
    if(pdf) {
        pdf.save(`Cotizacion-${selectedQuoteForView.id}.pdf`);
        toast({ title: "PDF Descargado", description: "El PDF de la cotización ha sido descargado. Por favor, adjúntalo manualmente a tu conversación de WhatsApp." });
        
        const phoneNumber = vehicleForSelectedQuote.ownerPhone.replace(/\D/g, ''); 
        const message = encodeURIComponent(
          `Hola ${vehicleForSelectedQuote.ownerName || 'Cliente'}, le enviamos su cotización de servicio ${selectedQuoteForView.id} de ${workshopInfo?.name || 'nuestro taller'} para su vehículo ${vehicleForSelectedQuote.make} ${vehicleForSelectedQuote.model}. Le hemos enviado el PDF a su dispositivo para que pueda adjuntarlo.`
        );
        const whatsappLink = `https://wa.me/${phoneNumber}?text=${message}`;
        window.open(whatsappLink, '_blank');
    }
  };


  return (
    <>
      <PageHeader
        title="Cotizaciones"
        description="Consulta, filtra y ordena todas las cotizaciones generadas."
        actions={
          <Button asChild>
            <Link href="/cotizaciones/nuevo">Nueva Cotización</Link>
          </Button>
        }
      />

      <div className="mb-6 grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Cotizaciones</CardTitle>
            <FileText className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">{summaryData.totalQuotesCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Valor Estimado Total</CardTitle>
            <DollarSign className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">${summaryData.totalEstimatedValue.toLocaleString('es-ES')}</div>
          </CardContent>
        </Card>
      </div>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:flex-wrap">
        <div className="relative flex-1 min-w-[200px] sm:min-w-[300px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar por folio, vehículo, descripción..."
            className="w-full rounded-lg bg-background pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn(
                "min-w-[240px] justify-start text-left font-normal flex-1 sm:flex-initial",
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
            <Button variant="outline" className="min-w-[150px] flex-1 sm:flex-initial">
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

      <QuotesTable quotes={filteredAndSortedQuotes} onViewQuote={handleViewQuote} />

      {isViewQuoteDialogOpen && selectedQuoteForView && (
        <PrintTicketDialog
          open={isViewQuoteDialogOpen}
          onOpenChange={setIsViewQuoteDialogOpen}
          title={`Cotización: ${selectedQuoteForView.id}`}
          printButtonText="Imprimir Cotización"
          dialogContentClassName="printable-quote-dialog"
          onDialogClose={handleViewDialogClose}
          footerActions={
            <>
              <Button variant="outline" onClick={handleSendEmail} disabled={!vehicleForSelectedQuote?.ownerEmail}>
                <Mail className="mr-2 h-4 w-4" /> Enviar por Email
              </Button>
              <Button variant="outline" onClick={handleSendWhatsApp} disabled={!vehicleForSelectedQuote?.ownerPhone}>
                <MessageSquare className="mr-2 h-4 w-4" /> Enviar por WhatsApp
              </Button>
            </>
          }
        >
          <QuoteContent 
            ref={quoteContentRef}
            quote={selectedQuoteForView} 
            vehicle={vehicleForSelectedQuote || undefined}
          />
        </PrintTicketDialog>
      )}
    </>
  );
}
