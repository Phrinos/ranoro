
"use client";

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from '@/components/ui/table';
import { formatCurrency, capitalizeWords } from "@/lib/utils";
import { format, startOfMonth, endOfMonth, isWithinInterval, getYear } from 'date-fns';
import { es } from 'date-fns/locale';
import { parseDate } from '@/lib/forms';
import { calcEffectiveProfit, calculateSaleProfit } from '@/lib/money-helpers';
import type { ServiceRecord, SaleReceipt, CashDrawerTransaction, InventoryItem } from '@/types';

interface MensualReporteProps {
  services: ServiceRecord[];
  sales: SaleReceipt[];
  cashTransactions: CashDrawerTransaction[];
  inventory: InventoryItem[];
}

export default function MensualReporteContent({ services, sales, cashTransactions, inventory }: MensualReporteProps) {
  const currentYear = getYear(new Date());

  const monthlyData = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => {
      const date = new Date(currentYear, i, 1);
      return {
        key: format(date, 'yyyy-MM'),
        label: capitalizeWords(format(date, 'MMMM', { locale: es })),
        start: startOfMonth(date),
        end: endOfMonth(date),
        ingresos: 0,
        egresos: 0,
        gananciaReal: 0,
      };
    });

    // Procesar Servicios
    services.forEach(s => {
      if (s.status !== 'Entregado') return;
      const d = parseDate(s.deliveryDateTime);
      if (!d) return;
      const month = months.find(m => isWithinInterval(d, { start: m.start, end: m.end }));
      if (month) {
        month.ingresos += (Number(s.totalCost) || 0);
        month.gananciaReal += calcEffectiveProfit(s, inventory);
      }
    });

    // Procesar Ventas
    sales.forEach(s => {
      if (s.status === 'Cancelado') return;
      const d = parseDate(s.saleDate);
      if (!d) return;
      const month = months.find(m => isWithinInterval(d, { start: m.start, end: m.end }));
      if (month) {
        month.ingresos += (Number(s.totalAmount) || 0);
        month.gananciaReal += calculateSaleProfit(s, inventory);
      }
    });

    // Procesar Egresos (Caja)
    cashTransactions.forEach(t => {
      const d = parseDate(t.date);
      if (!d) return;
      const month = months.find(m => isWithinInterval(d, { start: m.start, end: m.end }));
      if (month) {
        if (t.type === 'out' || t.type === 'Salida') {
          month.egresos += t.amount;
        } else if (t.relatedType === 'Manual' && (t.type === 'in' || t.type === 'Entrada')) {
            // Solo sumamos ingresos manuales a los ingresos totales del mes
            month.ingresos += t.amount;
        }
      }
    });

    return months.filter(m => m.ingresos > 0 || m.egresos > 0).reverse();
  }, [services, sales, cashTransactions, inventory, currentYear]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Comparativo Mensual {currentYear}</CardTitle>
          <CardDescription>Resumen ejecutivo del rendimiento financiero por mes.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-black">
                <TableRow>
                  <TableHead className="text-white">Mes</TableHead>
                  <TableHead className="text-white text-right">Ingresos Totales</TableHead>
                  <TableHead className="text-white text-right">Egresos Totales</TableHead>
                  <TableHead className="text-white text-right">Flujo Neto</TableHead>
                  <TableHead className="text-white text-right font-bold">Ganancia Bruta Real*</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthlyData.map(m => (
                  <TableRow key={m.key}>
                    <TableCell className="font-bold">{m.label}</TableCell>
                    <TableCell className="text-right text-green-600 font-medium">{formatCurrency(m.ingresos)}</TableCell>
                    <TableCell className="text-right text-red-600">{formatCurrency(m.egresos)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(m.ingresos - m.egresos)}</TableCell>
                    <TableCell className="text-right font-bold text-primary">{formatCurrency(m.gananciaReal)}</TableCell>
                  </TableRow>
                ))}
                {monthlyData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No hay datos suficientes para generar el reporte anual.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div className="p-4 bg-muted/30">
            <p className="text-[10px] text-muted-foreground italic">
              * Ganancia Bruta Real: Calculada descontando el costo de insumos de inventario y comisiones bancarias de cada operación. 
              No incluye el descuento de gastos fijos mensuales (renta, nómina).
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
