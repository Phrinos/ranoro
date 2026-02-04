"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, startOfMonth, endOfMonth, isWithinInterval, isValid, getYear } from 'date-fns';
import { es } from 'date-fns/locale';
import { parseDate } from '@/lib/forms';
import { formatCurrency, capitalizeWords } from '@/lib/utils';
import { calcEffectiveProfit, calculateSaleProfit } from '@/lib/money-helpers';
import type { ServiceRecord, SaleReceipt, InventoryItem, MonthlyFixedExpense, CashDrawerTransaction, User } from '@/types';
import CierreEfectivoContent from './cierre-efectivo-content';

type MonthlyData = {
  month: string;
  totalIncome: number;
  serviceIncome: number;
  posIncome: number;
  totalProfit: number;
  totalExpenses: number;
  netProfit: number;
  cashIn: number;
  cashOut: number;
  cashNet: number;
};

interface CierresReporteProps {
  services: ServiceRecord[];
  sales: SaleReceipt[];
  inventory: InventoryItem[];
  expenses: MonthlyFixedExpense[];
  personnel: User[];
  cashTransactions: CashDrawerTransaction[];
}

export function CierresReporteContent({ services, sales, inventory, expenses, personnel, cashTransactions }: CierresReporteProps) {
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  const monthlyReports = useMemo(() => {
    const reports: Record<string, MonthlyData> = {};
    const now = new Date();
    const currentYear = getYear(now);

    // Generamos los últimos 12 meses
    for (let i = 0; i < 12; i++) {
        const date = new Date(currentYear, now.getMonth() - i, 1);
        const monthKey = format(date, 'yyyy-MM');
        const monthName = capitalizeWords(format(date, 'MMMM', { locale: es }));
        const startDate = startOfMonth(date);
        const endDate = endOfMonth(date);
        const interval = { start: startDate, end: endDate };

        const servicesInMonth = services.filter(s => {
            const d = parseDate(s.deliveryDateTime || s.serviceDate);
            return s.status === 'Entregado' && d && isValid(d) && isWithinInterval(d, interval);
        });

        const salesInMonth = sales.filter(s => {
            const d = parseDate(s.saleDate);
            return s.status !== 'Cancelado' && d && isValid(d) && isWithinInterval(d, interval);
        });
        
        const cashInMonth = cashTransactions.filter(t => {
            const d = parseDate(t.date);
            return d && isValid(d) && isWithinInterval(d, interval);
        });

        const serviceIncome = servicesInMonth.reduce((sum, s) => sum + (s.totalCost ?? (s as any).total ?? 0), 0);
        const posIncome = salesInMonth.reduce((sum, s) => sum + (s.totalAmount ?? 0), 0);
        const serviceProfit = servicesInMonth.reduce((sum, s) => sum + calcEffectiveProfit(s, inventory), 0);
        const posProfit = salesInMonth.reduce((sum, s) => sum + calculateSaleProfit(s, inventory), 0);

        const monthlyPayroll = personnel.filter(p => !p.isArchived).reduce((sum, p) => sum + (p.monthlySalary || 0), 0);
        const otherMonthlyExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
        const totalExpenses = monthlyPayroll + otherMonthlyExpenses;
        
        const cashIn = cashInMonth.filter(t => t.type === 'in' || t.type === 'Entrada').reduce((sum, t) => sum + t.amount, 0);
        const cashOut = cashInMonth.filter(t => t.type === 'out' || t.type === 'Salida').reduce((sum, t) => sum + t.amount, 0);

        reports[monthKey] = {
            month: `${monthName} ${getYear(date)}`,
            totalIncome: serviceIncome + posIncome,
            serviceIncome,
            posIncome,
            totalProfit: serviceProfit + posProfit,
            totalExpenses,
            netProfit: serviceProfit + posProfit - totalExpenses,
            cashIn,
            cashOut,
            cashNet: cashIn - cashOut,
        };
    }
    return Object.entries(reports).sort((a, b) => b[0].localeCompare(a[0]));
  }, [services, sales, inventory, expenses, personnel, cashTransactions]);

  const { selectedReport, transactionsForSelectedMonth } = useMemo(() => {
    const key = selectedMonth || (monthlyReports.length > 0 ? monthlyReports[0][0] : null);
    const report = monthlyReports.find(([k]) => k === key)?.[1];
    if (!key || !report) return { selectedReport: null, transactionsForSelectedMonth: [] };

    const [year, month] = key.split('-').map(Number);
    const startDate = startOfMonth(new Date(year, month - 1));
    const endDate = endOfMonth(startDate);
    
    const transactions = cashTransactions.filter(t => {
      const d = parseDate(t.date);
      return d && isValid(d) && isWithinInterval(d, { start: startDate, end: endDate });
    });
    
    return { selectedReport: report, transactionsForSelectedMonth: transactions };
  }, [selectedMonth, monthlyReports, cashTransactions]);

  useEffect(() => {
    if (!selectedMonth && monthlyReports.length > 0) {
        setSelectedMonth(monthlyReports[0][0]);
    }
  }, [monthlyReports, selectedMonth]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <Card className="lg:col-span-1 shadow-sm">
        <CardHeader className="pb-3"><CardTitle className="text-lg">Periodos Mensuales</CardTitle></CardHeader>
        <CardContent className="px-2">
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-1">
              {monthlyReports.map(([key, report]) => (
                <Button 
                    key={key} 
                    variant={selectedMonth === key ? "secondary" : "ghost"} 
                    className={cn(
                        "w-full justify-start font-medium",
                        selectedMonth === key && "bg-primary/10 text-primary hover:bg-primary/20"
                    )} 
                    onClick={() => setSelectedMonth(key)}
                >
                  {report.month}
                </Button>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
      
      <div className="lg:col-span-3">
        {selectedReport ? (
          <Tabs defaultValue="informe">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="informe">Resumen Financiero</TabsTrigger>
              <TabsTrigger value="efectivo">Flujo de Efectivo</TabsTrigger>
            </TabsList>
            <TabsContent value="informe" className="mt-4 animate-in fade-in-50 duration-300">
              <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle>{selectedReport.month}</CardTitle>
                    <CardDescription>Resumen ejecutivo de ingresos, costos y utilidad neta.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border overflow-hidden">
                    <Table>
                        <TableBody>
                        <TableRow><TableCell className="font-medium text-muted-foreground">Ingresos por Servicios</TableCell><TableCell className="text-right font-semibold">{formatCurrency(selectedReport.serviceIncome)}</TableCell></TableRow>
                        <TableRow><TableCell className="font-medium text-muted-foreground">Ingresos por Ventas POS</TableCell><TableCell className="text-right font-semibold">{formatCurrency(selectedReport.posIncome)}</TableCell></TableRow>
                        <TableRow className="bg-muted/30 font-bold"><TableCell>Ingresos Totales (Brutos)</TableCell><TableCell className="text-right text-lg">{formatCurrency(selectedReport.totalIncome)}</TableCell></TableRow>
                        <TableRow className="border-t-2"><TableCell className="font-medium text-muted-foreground">Ganancia Bruta (Venta - Insumos)</TableCell><TableCell className="text-right font-semibold text-green-600">+{formatCurrency(selectedReport.totalProfit)}</TableCell></TableRow>
                        <TableRow><TableCell className="font-medium text-muted-foreground">Gastos Fijos (Nómina, Renta, etc.)</TableCell><TableCell className="text-right font-semibold text-red-600">-{formatCurrency(selectedReport.totalExpenses)}</TableCell></TableRow>
                        <TableRow className="bg-primary/5 font-bold text-xl"><TableCell>Utilidad Neta Estimada</TableCell><TableCell className={cn("text-right", selectedReport.netProfit >= 0 ? "text-primary" : "text-destructive")}>{formatCurrency(selectedReport.netProfit)}</TableCell></TableRow>
                        </TableBody>
                    </Table>
                  </div>
                  <p className="mt-4 text-[10px] text-muted-foreground italic leading-relaxed">
                    * La Utilidad Neta Estimada se calcula restando el costo de insumos vendidos y los gastos fijos mensuales de los ingresos totales. No incluye impuestos corporativos ni depreciación de activos.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="efectivo" className="mt-4 animate-in fade-in-50 duration-300">
              <CierreEfectivoContent 
                transactions={transactionsForSelectedMonth} 
                summary={{ 
                    cashIn: selectedReport.cashIn, 
                    cashOut: selectedReport.cashOut, 
                    cashNet: selectedReport.cashNet 
                }}
              />
            </TabsContent>
          </Tabs>
        ) : (
          <Card className="flex flex-col items-center justify-center h-96 text-muted-foreground">
              <Loader2 className="h-10 w-10 animate-spin mb-4 opacity-20" />
              <p>Seleccione un mes para ver el reporte.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
