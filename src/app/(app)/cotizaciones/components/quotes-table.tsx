
"use client";

import React, { useMemo } from "react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { QuoteRecord, Vehicle } from "@/types";
import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { Eye, Edit, Wrench, FileText as FileTextIcon, Calendar as CalendarIcon } from "lucide-react";

interface QuotesTableProps {
  quotes: QuoteRecord[];
  vehicles: Vehicle[];
  onViewQuote: (quote: QuoteRecord) => void;
  onEditQuote: (quote: QuoteRecord) => void;
  onGenerateService: (quote: QuoteRecord) => void;
}

export function QuotesTable({ quotes, vehicles, onViewQuote, onEditQuote, onGenerateService }: QuotesTableProps) {
  if (!quotes.length) {
    return <p className="text-muted-foreground text-center py-8">No hay cotizaciones registradas que coincidan con los filtros.</p>;
  }

  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined) return 'N/A';
    return `$${amount.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  
  const getStatusVariant = (serviceId?: string): "success" | "outline" => {
    return serviceId ? "success" : "outline";
  };
  
  const getStatusText = (serviceId?: string): string => {
      return serviceId ? "Ingresado" : "Pendiente";
  }
  
  const memoizedQuotes = useMemo(() => quotes.map(quote => {
    const quoteDate = quote.quoteDate ? parseISO(quote.quoteDate) : new Date();
    const vehicle = vehicles.find(v => v.id === quote.vehicleId);
    const vehicleDisplay = vehicle 
      ? `${vehicle.licensePlate} - ${vehicle.make} ${vehicle.model} (${vehicle.year})`
      : quote.vehicleIdentifier || 'N/A';

    return {
        ...quote,
        formattedDate: isValid(quoteDate) 
          ? format(quoteDate, "dd MMM yyyy, HH:mm", { locale: es }) 
          : 'Fecha Inválida',
        estimatedCostFormatted: formatCurrency(quote.estimatedTotalCost),
        estimatedProfitFormatted: formatCurrency(quote.estimatedProfit),
        vehicleDisplay,
    }
  }), [quotes, vehicles]);


  return (
    <div className="space-y-4">
      {memoizedQuotes.map((quote) => (
          <Card key={quote.id} className="shadow-sm">
            <CardContent className="p-0">
              <div className="flex items-center">
                
                {/* Bloque Izquierdo: Costo y Ganancia */}
                <div className="w-48 shrink-0 flex flex-col justify-center items-start text-left pl-6 py-4">
                  <p className="font-bold text-lg text-foreground">{quote.estimatedCostFormatted}</p>
                  <p className="text-xs text-muted-foreground -mt-1">Costo Estimado</p>
                  <p className="font-semibold text-lg text-green-600 mt-1">{quote.estimatedProfitFormatted}</p>
                  <p className="text-xs text-muted-foreground -mt-1">Ganancia Estimada</p>
                </div>

                {/* Bloque Central: Detalles */}
                <div className="flex-grow border-l border-r p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5" title="ID de Cotización">
                      <FileTextIcon className="h-4 w-4" />
                      <span>ID: {quote.id}</span>
                    </div>
                    <div className="flex items-center gap-1.5" title="Fecha de Cotización">
                      <CalendarIcon className="h-4 w-4" />
                      <span>Fecha: {quote.formattedDate}</span>
                    </div>
                    <div className="flex items-center gap-1.5" title="Atendido por">
                        <Wrench className="h-4 w-4" />
                        <span>{quote.preparedByTechnicianName || 'N/A'}</span>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-4">
                    <div className="flex-grow">
                      <h4 className="font-semibold text-lg" title={quote.vehicleDisplay}>
                        {quote.vehicleDisplay || 'N/A'}
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1 truncate" title={quote.description}>
                        {quote.description}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bloque Derecho: Estado y Acciones */}
                <div className="w-48 shrink-0 flex flex-col items-center justify-center p-4 gap-y-2">
                  <Badge variant={getStatusVariant(quote.serviceId)} className="w-full justify-center text-center text-base">
                    {getStatusText(quote.serviceId)}
                  </Badge>
                  <div className="flex">
                    <Button variant="ghost" size="icon" onClick={(e) => {e.stopPropagation(); onViewQuote(quotes.find(q => q.id === quote.id)!);}} title="Ver / Reimprimir Cotización">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={(e) => {e.stopPropagation(); onEditQuote(quotes.find(q => q.id === quote.id)!);}} title="Editar Cotización" disabled={!!quote.serviceId}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={(e) => {e.stopPropagation(); onGenerateService(quotes.find(q => q.id === quote.id)!);}} title="Generar Servicio" disabled={!!quote.serviceId}>
                      <Wrench className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      )}
    </div>
  );
}
