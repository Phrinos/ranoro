
"use client";

import React, { useMemo, useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { CashDrawerTransaction, SaleReceipt, ServiceRecord, InitialCashBalance } from '@/types';
import { format, parseISO, compareDesc } from "date-fns";
import { es } from 'date-fns/locale';
import { formatCurrency, cn } from "@/lib/utils";
import { Badge } from '@/components/ui/badge';
import { useTableManager } from '@/hooks/useTableManager';
import { TableToolbar } from '@/components/shared/table-toolbar';
import { FileText, Wallet, ArrowUpCircle, ArrowDownCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { parseDate } from '@/lib/forms';
import { Button } from "@/components/ui/button";

interface MovimientosCajaContentProps {
  allCashTransactions: CashDrawerTransaction[];
  allSales: SaleReceipt[];
  allServices: ServiceRecord[];
}

export function MovimientosCajaContent({ allCashTransactions, allSales, allServices }: MovimientosCajaContentProps) {
  
  const getBadgeVariant = (type: string): "success" | "destructive" | "outline" => {
    switch (type) {
      case 'Entrada': return 'success';
      case 'Salida': return 'destructive';
      default: return 'outline';
    }
  };

  const getConceptBadgeVariant = (type?: string) => {
    switch (type) {
      case 'Venta': return 'blue';
      case 'Servicio': return 'purple';
      case 'Compra': return 'lightRed';
      default: return 'secondary';
    }
  };

  const unifiedTransactions = useMemo((): CashDrawerTransaction[] => {
    const servicePaymentsAsTransactions: CashDrawerTransaction[] = allServices
      .filter(s => s.status === 'Entregado' && s.paymentMethod?.includes('Efectivo'))
      .map(s => ({
        id: `service-${s.id}`,
        date: s.deliveryDateTime || s.serviceDate,
        type: 'Entrada',
        amount: s.amountInCash || s.totalCost, // Use partial cash amount if available
        concept: `Servicio #${s.id.slice(0, 6)}`,
        userName: s.serviceAdvisorName || 'Sistema',
        relatedType: 'Servicio',
        relatedId: s.id,
      }));

    // Filter out any service transactions that already exist in allCashTransactions to prevent duplicates
    const existingServiceTransactionIds = new Set(allCashTransactions.filter(t => t.relatedType === 'Servicio').map(t => t.relatedId));
    const uniqueServiceTransactions = servicePaymentsAsTransactions.filter(st => !existingServiceTransactionIds.has(st.relatedId));
      
    return [...allCashTransactions, ...uniqueServiceTransactions];

  }, [allCashTransactions, allServices]);
  

  const {
    filteredData: filteredTransactions,
    paginationSummary,
    canGoNext,
    canGoPrevious,
    goToNextPage,
    goToPreviousPage,
    ...tableManager
  } = useTableManager<CashDrawerTransaction>({
    initialData: unifiedTransactions,
    searchKeys: ['concept', 'userName', 'relatedId'],
    dateFilterKey: 'date',
    initialSortOption: 'date_desc'
  });

  const sortOptions = [
    { value: 'date_desc', label: 'Fecha (Más Reciente)' },
    { value: 'date_asc', label: 'Fecha (Más Antiguo)' },
    { value: 'amount_desc', label: 'Monto (Mayor a Menor)' },
    { value: 'amount_asc', label: 'Monto (Menor a Mayor)' },
  ];
  
  const transactionTypes = [
    { value: 'all', label: 'Todos' },
    { value: 'Entrada', label: 'Entradas' },
    { value: 'Salida', label: 'Salidas' },
  ];

  const filterOptions = [
    { value: 'type', label: 'Tipo de Movimiento', options: transactionTypes },
  ];

  return (
    <div className="space-y-4">
      <TableToolbar
        {...tableManager}
        searchPlaceholder="Buscar por concepto, usuario o ID..."
        sortOptions={sortOptions}
        filterOptions={filterOptions}
      />
      
      <Card>
        <CardContent className="pt-6">
          <div className="rounded-md border">
            <Table>
              <TableHeader className="bg-black">
                <TableRow>
                  <TableHead className="text-white">Fecha</TableHead>
                  <TableHead className="text-white">Tipo</TableHead>
                  <TableHead className="text-white">Concepto</TableHead>
                  <TableHead className="text-white">Usuario</TableHead>
                  <TableHead className="text-right text-white">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.length > 0 ? (
                  filteredTransactions.map(t => (
                    <TableRow key={t.id + t.date}>
                      <TableCell>{t.date ? format(parseDate(t.date)!, 'dd/MM/yy, HH:mm', { locale: es }) : 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant={getBadgeVariant(t.type)} className="flex items-center gap-1 w-fit">
                          {t.type === 'Entrada' ? <ArrowUpCircle className="h-3 w-3" /> : <ArrowDownCircle className="h-3 w-3" />}
                          {t.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <p>{t.concept}</p>
                        {t.relatedType && (
                           <Badge variant={getConceptBadgeVariant(t.relatedType)} className="mt-1">
                                {t.relatedType}: {t.relatedId}
                           </Badge>
                        )}
                      </TableCell>
                      <TableCell>{t.userName}</TableCell>
                      <TableCell className={cn("text-right font-semibold", t.type === 'Entrada' ? 'text-green-600' : 'text-red-600')}>
                        {t.type === 'Entrada' ? '+' : '-'} {formatCurrency(t.amount)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                        <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
                            <FileText className="h-12 w-12 mb-2" />
                            <h3 className="text-lg font-semibold text-foreground">Sin Movimientos</h3>
                            <p className="text-sm">No se encontraron transacciones de caja para el período seleccionado.</p>
                        </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-muted-foreground">{paginationSummary}</p>
            <div className="flex items-center space-x-2">
                <Button size="sm" onClick={goToPreviousPage} disabled={!canGoPrevious} variant="outline" className="bg-card">
                    <ChevronLeft className="h-4 w-4" />
                    Anterior
                </Button>
                <Button size="sm" onClick={goToNextPage} disabled={!canGoNext} variant="outline" className="bg-card">
                    Siguiente
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    </div>
  );
}
