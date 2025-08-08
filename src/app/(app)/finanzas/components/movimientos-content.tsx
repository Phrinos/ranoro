// src/app/(app)/finanzas/components/movimientos-content.tsx
"use client";

import React, { useMemo } from 'react';
import { TableToolbar } from '@/components/shared/table-toolbar';
import { useTableManager } from '@/hooks/useTableManager';
import type { SaleReceipt, ServiceRecord, InventoryItem, PaymentMethod, Payment } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { parseDate } from '@/lib/forms';
import { formatCurrency, getPaymentMethodVariant } from '@/lib/utils';
import { calculateSaleProfit } from '@/lib/placeholder-data';
import { Wrench, ShoppingCart, DollarSign, TrendingUp, LineChart, Wallet, CreditCard, Send } from 'lucide-react';
import type { DateRange } from 'react-day-picker';

interface Movement {
  id: string;
  date: Date | null;
  folio: string;
  type: 'Venta' | 'Servicio';
  client: string;
  payments: Payment[];
  total: number;
  profit: number;
}

interface MovimientosContentProps {
  allSales: SaleReceipt[];
  allServices: ServiceRecord[];
  allInventory: InventoryItem[];
  dateRange: DateRange | undefined;
  onDateRangeChange: (range?: DateRange) => void;
}

const sortOptions = [
  { value: 'date_desc', label: 'Más Reciente' },
  { value: 'date_asc', label: 'Más Antiguo' },
  { value: 'total_desc', label: 'Monto (Mayor a Menor)' },
  { value: 'total_asc', label: 'Monto (Menor a Menor)' },
  { value: 'profit_desc', label: 'Utilidad (Mayor a Menor)' },
  { value: 'profit_asc', label: 'Utilidad (Menor a Menor)' },
];

const typeOptions = [
    { value: 'all', label: 'Todos' },
    { value: 'Venta', label: 'Venta (POS)' },
    { value: 'Servicio', label: 'Servicio' },
];

const paymentMethodOptions: { value: PaymentMethod | 'all', label: string }[] = [
    { value: 'all', label: 'Todos' },
    { value: 'Efectivo', label: 'Efectivo' },
    { value: 'Tarjeta', label: 'Tarjeta' },
    { value: 'Tarjeta MSI', label: 'Tarjeta MSI'},
    { value: 'Transferencia', label: 'Transferencia' },
];


export default function MovimientosContent({ allSales, allServices, allInventory, dateRange, onDateRangeChange }: MovimientosContentProps) {
  
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
        total: s.totalAmount,
        profit: calculateSaleProfit(s, allInventory),
      }));

    const serviceMovements: Movement[] = allServices
      .filter(s => s.status === 'Entregado')
      .map(s => ({
        id: s.id,
        date: parseDate(s.deliveryDateTime) || parseDate(s.serviceDate),
        folio: s.id,
        type: 'Servicio',
        client: s.customerName || 'N/A',
        payments: s.payments || [],
        total: s.totalCost || 0,
        profit: s.serviceProfit || 0,
      }));

    return [...saleMovements, ...serviceMovements];
  }, [allSales, allServices, allInventory]);

  const { 
    filteredData: filteredMovements, 
    ...tableManager 
  } = useTableManager<Movement>({
    initialData: mergedMovements,
    searchKeys: ['folio', 'client'],
    dateFilterKey: 'date',
    initialSortOption: 'date_desc',
    initialDateRange: dateRange,
  });
  
  // Propagate date changes from the toolbar up to the parent page
  React.useEffect(() => {
    onDateRangeChange(tableManager.dateRange);
  }, [tableManager.dateRange, onDateRangeChange]);
  
  const paymentMethodIcons: Record<Payment['method'], React.ElementType> = {
    "Efectivo": Wallet,
    "Tarjeta": CreditCard,
    "Tarjeta MSI": CreditCard,
    "Transferencia": Send,
  };

  const summary = useMemo(() => {
    const movements = tableManager.fullFilteredData;
    const totalMovements = movements.length;
    const grossProfit = movements.reduce((sum, m) => sum + m.total, 0);
    const netProfit = movements.reduce((sum, m) => sum + m.profit, 0);
    const paymentsSummary = new Map<Payment['method'], { count: number; total: number }>();

    movements.forEach(m => {
        m.payments.forEach(p => {
            const current = paymentsSummary.get(p.method) || { count: 0, total: 0 };
            current.count += 1;
            current.total += (p.amount || 0);
            paymentsSummary.set(p.method, current);
        });
    });

    return { totalMovements, grossProfit, netProfit, paymentsSummary };
  }, [tableManager.fullFilteredData]);

  return (
    <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="lg:col-span-1">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium"># Movimientos</CardTitle>
                    <LineChart className="h-4 w-4 text-muted-foreground"/>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{summary.totalMovements}</div>
                </CardContent>
            </Card>
            <Card className="lg:col-span-1">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ingresos / Utilidad (Bruta)</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground"/>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(summary.grossProfit)}</div>
                <p className="text-xs text-muted-foreground">Utilidad: <span className="font-semibold text-green-600">{formatCurrency(summary.netProfit)}</span></p>
              </CardContent>
            </Card>
             <Card className="lg:col-span-2">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Ingresos por Método de Pago</CardTitle>
                </CardHeader>
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
                    ) : (
                        <p className="text-sm text-muted-foreground">No hay pagos registrados.</p>
                    )}
                </CardContent>
            </Card>
        </div>
        <TableToolbar
            {...tableManager}
            searchPlaceholder="Buscar por folio o cliente..."
            sortOptions={sortOptions}
            filterOptions={[
                { value: 'type', label: 'Tipo', options: typeOptions },
                { value: 'payments.method', label: 'Método de Pago', options: paymentMethodOptions }
            ]}
        />
        <Card>
            <CardContent className="p-0">
                <div className="overflow-x-auto rounded-md border">
                    <Table>
                        <TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Folio</TableHead><TableHead>Tipo</TableHead><TableHead>Cliente</TableHead><TableHead>Método Pago</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="text-right">Utilidad</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {filteredMovements.length > 0 ? (
                                filteredMovements.map(m => (
                                    <TableRow key={m.id}>
                                        <TableCell>{m.date && isValid(m.date) ? format(m.date, "dd MMM yyyy, HH:mm", { locale: es }) : 'N/A'}</TableCell>
                                        <TableCell className="font-mono">{m.folio.slice(-6)}</TableCell>
                                        <TableCell>
                                          <Badge variant={m.type === 'Venta' ? 'secondary' : 'outline'}>
                                            {m.type === 'Venta' ? <ShoppingCart className="h-3 w-3 mr-1" /> : <Wrench className="h-3 w-3 mr-1" />}
                                            {m.type}
                                          </Badge>
                                        </TableCell>
                                        <TableCell>{m.client}</TableCell>
                                        <TableCell>
                                          <div className="flex flex-wrap gap-1">
                                            {m.payments.map((p, index) => {
                                                const Icon = paymentMethodIcons[p.method] || DollarSign;
                                                return (<Badge key={index} variant={getPaymentMethodVariant(p.method)} className="text-xs">
                                                  <Icon className="h-3 w-3 mr-1"/>{p.method}
                                                </Badge>)
                                            })}
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
    </div>
  );
}
