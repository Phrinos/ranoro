

"use client";

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { CashDrawerTransaction, SaleReceipt, ServiceRecord, InitialCashBalance } from '@/types';
import { format, parseISO, compareDesc, startOfDay, endOfDay, isWithinInterval, isValid, isSameDay } from "date-fns";
import { es } from 'date-fns/locale';
import { formatCurrency, cn } from "@/lib/utils";
import { Badge } from '@/components/ui/badge';
import { useTableManager } from '@/hooks/useTableManager';
import { TableToolbar } from '@/components/shared/table-toolbar';
import { FileText, Wallet } from 'lucide-react';
import { parseDate } from '@/lib/forms';

interface MovimientosPosContentProps {
  allCashTransactions: CashDrawerTransaction[];
  allSales: SaleReceipt[];
  allServices: ServiceRecord[];
  initialCashBalance: InitialCashBalance | null;
}

export function MovimientosPosContent({ allCashTransactions, allSales, allServices, initialCashBalance }: MovimientosPosContentProps) {
  
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

  const {
    filteredData: filteredTransactions,
    ...tableManager
  } = useTableManager<CashDrawerTransaction>({
    initialData: allCashTransactions,
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
  
  const totalCashBalanceToday = useMemo(() => {
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());
    const interval = { start: todayStart, end: todayEnd };

    const balanceDoc = (initialCashBalance && isSameDay(parseISO(initialCashBalance.date), todayStart)) ? initialCashBalance : null;
    const initialBalance = balanceDoc?.amount || 0;
    
    const salesToday = allSales.filter(s => s.status !== 'Cancelado' && isValid(parseISO(s.saleDate)) && isWithinInterval(parseISO(s.saleDate), interval));
    const servicesToday = allServices.filter(s => s.status === 'Entregado' && s.deliveryDateTime && isValid(parseISO(s.deliveryDateTime)) && isWithinInterval(parseISO(s.deliveryDateTime), interval));
    
    const cashFromSales = salesToday
        .filter(s => s.paymentMethod?.includes('Efectivo'))
        .reduce((sum, s) => sum + (s.paymentMethod === 'Efectivo' ? s.totalAmount : s.amountInCash || 0), 0);
    const cashFromServices = servicesToday
        .filter(s => s.paymentMethod?.includes('Efectivo'))
        .reduce((sum, s) => sum + (s.paymentMethod === 'Efectivo' ? (s.totalCost || 0) : s.amountInCash || 0), 0);
    const totalCashOperations = cashFromSales + cashFromServices;
    
    const cashInManual = allCashTransactions.filter(t => t.type === 'Entrada' && isWithinInterval(parseISO(t.date), interval)).reduce((sum, t) => sum + t.amount, 0);
    const cashOutManual = allCashTransactions.filter(t => t.type === 'Salida' && isWithinInterval(parseISO(t.date), interval)).reduce((sum, t) => sum + t.amount, 0);

    return initialBalance + totalCashOperations + cashInManual - cashOutManual;
  }, [allSales, allServices, allCashTransactions, initialCashBalance]);

  return (
    <div className="space-y-4">
      <Card className="bg-secondary/50 border-secondary">
        <CardHeader>
            <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2 text-primary">
                    <Wallet className="h-6 w-6"/>
                    Saldo en Caja (Hoy)
                </CardTitle>
                <span className="text-2xl font-bold text-primary">{formatCurrency(totalCashBalanceToday)}</span>
            </div>
        </CardHeader>
      </Card>
      
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
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Concepto</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.length > 0 ? (
                  filteredTransactions.map(t => (
                    <TableRow key={t.id}>
                      <TableCell>{format(parseISO(t.date), 'dd/MM/yy, HH:mm', { locale: es })}</TableCell>
                      <TableCell><Badge variant={getBadgeVariant(t.type)}>{t.type}</Badge></TableCell>
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
    </div>
  );
}
