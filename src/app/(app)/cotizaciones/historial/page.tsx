
"use client";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, ListFilter, CalendarIcon as CalendarDateIcon, FileText, DollarSign } from "lucide-react";
import { QuotesTable } from "../components/quotes-table"; 
import { PrintTicketDialog } from '@/components/ui/print-ticket-dialog';
import { QuoteContent } from '@/components/quote-content';
import { placeholderQuotes, placeholderVehicles, placeholderTechnicians } from "@/lib/placeholder-data";
import type { QuoteRecord, Vehicle, Technician } from "@/types";
import { useState, useEffect, useMemo } from "react";
import { format, parseISO, compareAsc, compareDesc, isWithinInterval, isValid, startOfDay, endOfDay } from "date-fns";
import { es } from 'date-fns/locale';
import type { DateRange } from "react-day-picker";
import Link from "next/link";
import { cn } from "@/lib/utils";

type QuoteSortOption = 
  | "date_desc" | "date_asc"
  | "total_desc" | "total_asc"
  | "vehicle_asc" | "vehicle_desc";

export default function HistorialCotizacionesPage() {
  const [allQuotes, setAllQuotes] = useState<QuoteRecord[]>(placeholderQuotes);
  const [vehicles, setVehicles] = useState<Vehicle[]>(placeholderVehicles);
  const [technicians, setTechnicians] = useState<Technician[]>(placeholderTechnicians);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [sortOption, setSortOption] = useState<QuoteSortOption>("date_desc");

  const [isViewQuoteDialogOpen, setIsViewQuoteDialogOpen] = useState(false);
  const [selectedQuoteForView, setSelectedQuoteForView] = useState<QuoteRecord | null>(null);
  const [vehicleForSelectedQuote, setVehicleForSelectedQuote] = useState<Vehicle | null>(null);
  const [technicianForSelectedQuote, setTechnicianForSelectedQuote] = useState<Technician | null>(null);


  useEffect(() => {
    setAllQuotes(placeholderQuotes); 
    setVehicles(placeholderVehicles);
    setTechnicians(placeholderTechnicians);
  }, []);

  const filteredAndSortedQuotes = useMemo(() => {
    let filtered = [...allQuotes];

    if (dateRange?.from) {
      filtered = filtered.filter(quote => {
        const quoteDate = parseISO(quote.quoteDate);
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
        case "date_asc": return compareAsc(parseISO(a.quoteDate), parseISO(b.quoteDate));
        case "date_desc": return compareDesc(parseISO(a.quoteDate), parseISO(b.quoteDate));
        case "total_asc": return a.estimatedTotalCost - b.estimatedTotalCost;
        case "total_desc": return b.estimatedTotalCost - a.estimatedTotalCost;
        case "vehicle_asc": return (a.vehicleIdentifier || '').localeCompare(b.vehicleIdentifier || '');
        case "vehicle_desc": return (b.vehicleIdentifier || '').localeCompare(a.vehicleIdentifier || '');
        default: return compareDesc(parseISO(a.quoteDate), parseISO(b.quoteDate));
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
    setTechnicianForSelectedQuote(technicians.find(t => t.id === quote.preparedByTechnicianId) || null);
    setIsViewQuoteDialogOpen(true);
  };

  const handleViewDialogClose = () => {
    setIsViewQuoteDialogOpen(false);
    setSelectedQuoteForView(null);
    setVehicleForSelectedQuote(null);
    setTechnicianForSelectedQuote(null);
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
        >
          <QuoteContent 
            quote={selectedQuoteForView} 
            vehicle={vehicleForSelectedQuote || undefined}
            preparedByTechnician={technicianForSelectedQuote || undefined}
          />
        </PrintTicketDialog>
      )}
    </>
  );
}
