// src/app/(app)/finanzas/components/movimientos-content.tsx
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import type { DateRange } from "react-day-picker";
import type { SaleReceipt, ServiceRecord, InventoryItem, Payment } from '@/types';
import { useTableManager } from '@/hooks/useTableManager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency, getPaymentMethodVariant } from "@/lib/utils";
import { format, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { TableToolbar } from '@/components/shared/table-toolbar';
import { FileText, ShoppingCart, Wrench, Wallet, CreditCard, Send, LineChart, DollarSign, ChevronLeft, ChevronRight } from 'lucide-react';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { calculateSaleProfit } from '@/lib/placeholder-data';
import { parseDate } from '@/lib/forms';

// --- Tipos para la pestaña Movimientos ---
interface Movement {
  id: string;
  date: Date | null;
  folio: string;
  type: 'Venta' | 'Servicio';
  client: string;
  payments: Payment[];
  paymentMethod_legacy?: string; // For old records
  total: number;
  profit: number;
}

const sortOptions = [
  { value: 'date_desc', label: 'Más Reciente' },
  { value: 'date_asc', label: 'Más Antiguo' },
  { value: 'total_desc', label: 'Monto (Mayor a Menor)' },
  { value: 'total_asc', label: 'Monto (Menor a Menor)' },
  { value: 'profit_desc', label: 'Utilidad (Mayor a Menor)' },
  { value: 'profit_asc', label: 'Utilidad (Menor a Menor)' },
];

const paymentMethodIcons: Record<Payment['method'], React.ElementType> = {
  "Efectivo": Wallet,
  "Tarjeta": CreditCard,
  "Tarjeta MSI": CreditCard,
  "Transferencia": Send,
};

// --- Componente de la pestaña Movimientos ---
export default function MovimientosTabContent({ allSales, allServices, allInventory, dateRange, onDateRangeChange }: {
  allSales: SaleReceipt[];
  allServices: ServiceRecord[];
  allInventory: InventoryItem[];
  dateRange?: DateRange;
  onDateRangeChange: (range?: DateRange) => void;
}) {
  
  const mergedMovements = useMemo((): Movement[] => {
    const saleMovements: Movement[] = allSales
      .filter(s => s.status !== 'Cancelado')
      .map(s => ({
        id: s.id,
        date: parseDate(s.saleDate),
        folio: s.id,
        type: 'Venta',
        client: s.customerName || 'Cliente Mostrador',
        payments: s.payments || [],
        paymentMethod_legacy: s.paymentMethod,
        total: s.totalAmount,
        profit: calculateSaleProfit(s, allInventory),
      }));

      const serviceMovements: Movement[] = allServices
      .filter(s => {
        const isCancelled = s.status === 'Cancelado';
        const isQuote = s.status === 'Cotizacion';
        const hasNewPayments = s.payments && s.payments.length > 0 && s.payments.some(p => p.amount && p.amount > 0);
        const hasOldPayments = s.paymentMethod && s.totalCost > 0;
        return !isCancelled && !isQuote && (hasNewPayments || hasOldPayments);
      })
      .map(s => ({
        id: s.id,
        date: parseDate(s.deliveryDateTime) || parseDate(s.serviceDate),
        folio: s.id,
        type: 'Servicio',
        client: s.customerName || 'N/A',
        payments: s.payments || [],
        paymentMethod_legacy: s.paymentMethod,
        total: s.totalCost || 0,
        profit: s.serviceProfit || 0,
      }));

    return [...saleMovements, ...serviceMovements];
  }, [allSales, allServices, allInventory]);

  const { 
    paginatedData,
    fullFilteredData,
    ...tableManager 
  } = useTableManager<Movement>({
    initialData: mergedMovements,
    searchKeys: ['folio', 'client'],
    dateFilterKey: 'date',
    initialSortOption: 'date_desc',
    initialDateRange: dateRange,
  });
  
  useEffect(() => {
    if (tableManager.onDateRangeChange) {
      tableManager.onDateRangeChange(dateRange);
    }
  }, [dateRange, tableManager.onDateRangeChange]);


  const summary = useMemo(() => {
    const movements = fullFilteredData;
    const totalMovements = movements.length;
    const grossProfit = movements.reduce((sum, m) => sum + m.total, 0);
    const netProfit = movements.reduce((sum, m) => sum + m.profit, 0);
    const paymentsSummary = new Map<Payment['method'], { count: number; total: number }>();

    movements.forEach(m => {
        if (m.payments && m.payments.length > 0) {
            m.payments.forEach(p => {
                const current = paymentsSummary.get(p.method) || { count: 0, total: 0 };
                current.count += 1;
                current.total += p.amount || 0;
                paymentsSummary.set(p.method, current);
            });
        } else if (m.paymentMethod_legacy) { // Fallback for old records
             const methods = m.paymentMethod_legacy.split(/[+\/]/).map(m => m.trim()) as Payment['method'][];
             methods.forEach(method => {
                const current = paymentsSummary.get(method) || { count: 0, total: 0 };
                current.count += 1; // This might overcount transactions with multiple methods
                current.total += m.total / methods.length; // Approximates amount per method
                paymentsSummary.set(method, current);
             });
        }
    });

    return { totalMovements, grossProfit, netProfit, paymentsSummary };
  }, [fullFilteredData]);

  return (
    <div className="space-y-6">
        <TableToolbar
            {...tableManager}
            onSearchTermChange={tableManager.onSearchTermChange}
            searchPlaceholder="Buscar por folio o cliente..."
            sortOptions={sortOptions}
            dateRange={dateRange} // Pass state to toolbar
            onDateRangeChange={onDateRangeChange} // Pass handler to toolbar
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="lg:col-span-1">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium"># Movimientos</CardTitle><LineChart className="h-4 w-4 text-muted-foreground"/></CardHeader>
                <CardContent><div className="text-2xl font-bold">{summary.totalMovements}</div></CardContent>
            </Card>
            <Card className="lg:col-span-1">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Ingresos / Utilidad (Bruta)</CardTitle><DollarSign className="h-4 w-4 text-muted-foreground"/></CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(summary.grossProfit)}</div>
                <p className="text-xs text-muted-foreground">Utilidad: <span className="font-semibold text-green-600">{formatCurrency(summary.netProfit)}</span></p>
              </CardContent>
            </Card>
             <Card className="lg:col-span-2">
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Ingresos por Método de Pago</CardTitle></CardHeader>
                <CardContent>
                    {Array.from(summary.paymentsSummary.entries()).length > 0 ? (
                        <div className="flex flex-wrap gap-x-4 gap-y-2">
                        {Array.from(summary.paymentsSummary.entries()).map(([method, data]) => {
                            const Icon = paymentMethodIcons[method as keyof typeof paymentMethodIcons] || Wallet;
                            return (
                                <div key={method} className="flex items-center gap-2 text-sm">
                                    <Icon className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-semibold">{method}:</span>
                                    <span className="text-foreground">{formatCurrency(data.total)}</span>
                                    <span className="text-muted-foreground text-xs">({data.count})</span>
                                </div>
                            )
                        })}
                        </div>
                    ) : ( <p className="text-sm text-muted-foreground">No hay pagos registrados.</p> )}
                </CardContent>
            </Card>
        </div>
        <Card>
            <CardContent className="p-0">
                <div className="overflow-x-auto rounded-md border">
                    <Table>
                        <TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Folio</TableHead><TableHead>Tipo</TableHead><TableHead>Cliente</TableHead><TableHead>Método Pago</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="text-right">Utilidad</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {paginatedData.length > 0 ? (
                                paginatedData.map(m => (
                                    <TableRow key={m.id}>
                                        <TableCell>{m.date && isValid(m.date) ? format(m.date, "dd MMM yyyy, HH:mm", { locale: es }) : 'N/A'}</TableCell>
                                        <TableCell className="font-mono">{m.folio.slice(-6)}</TableCell>
                                        <TableCell>
                                          <Badge variant={m.type === 'Venta' ? 'secondary' : 'outline'}>
                                            {m.type === 'Venta' ? <ShoppingCart className="h-3 w-3 mr-1" /> : <Wrench className="h-3 w-3 mr-1" />}
                                            {m.type}
                                          </Badge>
                                        </TableCell>
                                        <TableCell>
                                             <TooltipProvider><Tooltip><TooltipTrigger asChild>
                                                <span className="truncate">{m.client.length > 25 ? `${m.client.substring(0, 25)}...` : m.client}</span>
                                            </TooltipTrigger><TooltipContent><p>{m.client}</p></TooltipContent></Tooltip></TooltipProvider>
                                        </TableCell>
                                        <TableCell>
                                          <div className="flex flex-wrap gap-1">
                                            {(m.payments && m.payments.length > 0) ? (
                                                m.payments.map((p, index) => {
                                                    const Icon = paymentMethodIcons[p.method] || DollarSign;
                                                    return (<Badge key={index} variant={getPaymentMethodVariant(p.method)} className="text-xs">
                                                    <Icon className="h-3 w-3 mr-1"/>{p.method}
                                                    </Badge>);
                                                })
                                            ) : (
                                                m.paymentMethod_legacy ? <Badge variant={getPaymentMethodVariant(m.paymentMethod_legacy as any)}>{m.paymentMethod_legacy}</Badge> : <Badge variant="outline">N/A</Badge>
                                            )}
                                          </div>
                                        </TableCell>
                                        <TableCell className="text-right font-semibold">{formatCurrency(m.total)}</TableCell>
                                        <TableCell className="text-right font-semibold text-green-600">{formatCurrency(m.profit)}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow><TableCell colSpan={7} className="h-24 text-center">No se encontraron movimientos.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
         <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-muted-foreground">{tableManager.paginationSummary}</p>
            <div className="flex items-center space-x-2">
                <Button size="sm" onClick={tableManager.goToPreviousPage} disabled={!tableManager.canGoPrevious} variant="outline" className="bg-card">
                    <ChevronLeft className="h-4 w-4" /> Anterior
                </Button>
                <Button size="sm" onClick={tableManager.goToNextPage} disabled={!tableManager.canGoNext} variant="outline" className="bg-card">
                    Siguiente <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    </div>
  );

}
