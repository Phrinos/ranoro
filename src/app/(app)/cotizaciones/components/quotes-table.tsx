
"use client";

import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import type { QuoteRecord } from "@/types";
import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { Eye, Edit, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface QuotesTableProps {
  quotes: QuoteRecord[];
  onViewQuote: (quote: QuoteRecord) => void;
  onEditQuote: (quote: QuoteRecord) => void;
  onGenerateService: (quote: QuoteRecord) => void;
}

export function QuotesTable({ quotes, onViewQuote, onEditQuote, onGenerateService }: QuotesTableProps) {
  if (!quotes.length) {
    return <p className="text-muted-foreground text-center py-8">No hay cotizaciones registradas que coincidan con los filtros.</p>;
  }

  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined) return 'N/A';
    return `$${amount.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="rounded-lg border shadow-sm">
      <Table>
        <TableHeader className="bg-white">
          <TableRow>
            <TableHead className="font-bold">Folio</TableHead>
            <TableHead className="font-bold">Fecha</TableHead>
            <TableHead className="font-bold">Vehículo</TableHead>
            <TableHead className="font-bold">Descripción</TableHead>
            <TableHead className="text-right font-bold">Costo</TableHead>
            <TableHead className="font-bold">Estado</TableHead>
            <TableHead className="text-right font-bold">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {quotes.map((quote) => {
            const quoteDate = quote.quoteDate ? parseISO(quote.quoteDate) : new Date();
            const formattedDate = isValid(quoteDate) 
              ? format(quoteDate, "dd MMM yyyy", { locale: es }) 
              : 'Fecha Inválida';
            
            return (
              <TableRow key={quote.id}>
                <TableCell className="font-medium">{quote.id}</TableCell>
                <TableCell>{formattedDate}</TableCell>
                <TableCell>{quote.vehicleIdentifier || 'N/A'}</TableCell>
                <TableCell className="max-w-xs truncate">{quote.description}</TableCell>
                <TableCell className="text-right font-semibold">{formatCurrency(quote.estimatedTotalCost)}</TableCell>
                <TableCell>
                  {quote.serviceId ? (
                    <Badge variant="success">Ingresado</Badge>
                  ) : (
                    <Badge variant="outline">Pendiente</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right space-x-1">
                  <Button variant="ghost" size="icon" onClick={() => onViewQuote(quote)} title="Ver / Reimprimir Cotización">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => onEditQuote(quote)} title="Editar Cotización">
                    <Edit className="h-4 w-4" />
                  </Button>
                   <Button variant="ghost" size="icon" onClick={() => onGenerateService(quote)} title="Generar Servicio" disabled={!!quote.serviceId}>
                    <Wrench className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
