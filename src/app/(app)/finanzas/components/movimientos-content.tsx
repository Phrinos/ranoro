
// src/app/(app)/finanzas/components/movimientos-content.tsx
"use client";

import React, { useMemo } from 'react';
import { TableToolbar } from '@/components/shared/table-toolbar';
import { useTableManager } from '@/hooks/useTableManager';
import type { SaleReceipt, ServiceRecord, InventoryItem, PaymentMethod } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { parseDate } from '@/lib/forms';
import { formatCurrency, getPaymentMethodVariant } from '@/lib/utils';
import { calculateSaleProfit } from '@/lib/placeholder-data';
import { Wrench, ShoppingCart, DollarSign, TrendingUp, LineChart } from 'lucide-react';

interface Movement {
  id: string;
  date: Date | null;
  folio: string;
  type: 'Venta' | 'Servicio';
  client: string;
  paymentMethods: PaymentMethod[];
  total: number;
  profit: number;
}

interface MovimientosContentProps {
  allSales: SaleReceipt[];
  allServices: ServiceRecord[];
  allInventory: InventoryItem[];
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


export default function MovimientosContent({ allSales, allServices, allInventory }: MovimientosContentProps) {
  
  const mergedMovements = useMemo((): Movement[] => {
    const saleMovements: Movement[] = allSales
      .filter(s => s.status !== 'Cancelado')
      .map(s => ({
        id: s.id,
        date: parseDate(s.saleDate),
        folio: s.id,
        type: 'Venta',
        client: s.customerName || 'Cliente Mostrador',
        paymentMethods: s.payments ? s.payments.map(p => p.method) : (s.paymentMethod ? [s.paymentMethod as PaymentMethod] : []),
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
        paymentMethods: s.payments ? s.payments.map(p => p.method) : (s.paymentMethod ? [s.paymentMethod as PaymentMethod] : []),
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
  });
  
  const summary = useMemo(() => {
    const movements = tableManager.fullFilteredData;
    const totalMovements = movements.length;
    const grossProfit = movements.reduce((sum, m) => sum + m.total, 0);
    const netProfit = movements.reduce((sum, m) => sum + m.profit, 0);
    const paymentsSummary = new Map<PaymentMethod, number>();

    movements.forEach(m => {
        m.paymentMethods.forEach(method => {
            paymentsSummary.set(method, (paymentsSummary.get(method) || 0) + (m.total / (m.paymentMethods.length || 1)));
        });
    });

    return { totalMovements, grossProfit, netProfit, paymentsSummary };
  }, [tableManager.fullFilteredData]);

  return (
    <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium"># Movimientos</CardTitle><LineChart className="h-4 w-4 text-muted-foreground"/></CardHeader><CardContent><div className="text-2xl font-bold">{summary.totalMovements}</div></CardContent></Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ingresos / Utilidad (Bruta)</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground"/>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(summary.grossProfit)}</div>
                <p className="text-xs text-muted-foreground">Utilidad: <span className="font-semibold text-green-600">{formatCurrency(summary.netProfit)}</span></p>
              </CardContent>
            </Card>
        </div>
        <TableToolbar
            {...tableManager}
            searchPlaceholder="Buscar por folio o cliente..."
            sortOptions={sortOptions}
            filterOptions={[
                { value: 'type', label: 'Tipo', options: typeOptions },
                { value: 'paymentMethods', label: 'Método de Pago', options: paymentMethodOptions }
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
                                        <TableCell>{m.date && isValid(m.date) ? format(m.date, "dd MMM yyyy", { locale: es }) : 'N/A'}</TableCell>
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
                                            {m.paymentMethods.map(pm => <Badge key={pm} variant={getPaymentMethodVariant(pm)} className="text-xs">{pm}</Badge>)}
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
