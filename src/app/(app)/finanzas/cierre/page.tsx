
// src/app/(app)/finanzas/cierre/page.tsx
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { withSuspense } from "@/lib/withSuspense";
import { Loader2 } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { serviceService, saleService, inventoryService, cashService } from '@/lib/services';
import type { ServiceRecord, SaleReceipt, InventoryItem, MonthlyFixedExpense, Personnel, CashDrawerTransaction } from '@/types';
import { format, startOfMonth, endOfMonth, isWithinInterval, isValid, getYear } from 'date-fns';
import { es } from 'date-fns/locale';
import { parseDate } from '@/lib/forms';
import { formatCurrency, capitalizeWords } from '@/lib/utils';
import { calcEffectiveProfit, calculateSaleProfit } from '@/lib/money-helpers';
import CierreEfectivoContent from './components/cierre-efectivo-content';

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

function CierrePageInner() {
  const [allServices, setAllServices] = useState<ServiceRecord[]>([]);
  const [allSales, setAllSales] = useState<SaleReceipt[]>([]);
  const [allInventory, setAllInventory] = useState<InventoryItem[]>([]);
  const [fixedExpenses, setFixedExpenses] = useState<MonthlyFixedExpense[]>([]);
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [cashTransactions, setCashTransactions] = useState<CashDrawerTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    const unsubs = [
      serviceService.onServicesUpdate(setAllServices),
      saleService.onSalesUpdate(setAllSales),
      inventoryService.onItemsUpdate(setAllInventory),
      inventoryService.onFixedExpensesUpdate(setFixedExpenses),
      cashService.onCashTransactionsUpdate(setCashTransactions),
      // Assuming personnel service exists
      // personnelService.onPersonnelUpdate(setPersonnel),
    ];
    // Simulating personnel fetch
    Promise.resolve([]).then(setPersonnel).finally(() => setIsLoading(false));
    return () => unsubs.forEach(unsub => unsub());
  }, []);

  const monthlyReports = useMemo(() => {
    const reports: Record<string, MonthlyData> = {};
    const currentYear = getYear(new Date());

    for (let i = 11; i >= 0; i--) {
        const date = new Date(currentYear, i, 1);
        const monthKey = format(date, 'yyyy-MM');
        const monthName = capitalizeWords(format(date, 'MMMM', { locale: es }));
        
        const startDate = startOfMonth(date);
        const endDate = endOfMonth(date);
        const interval = { start: startDate, end: endDate };

        const servicesInMonth = allServices.filter(s => {
            const d = parseDate((s as any).deliveryDateTime);
            return s.status === 'Entregado' && d && isValid(d) && isWithinInterval(d, interval);
        });

        const salesInMonth = allSales.filter(s => {
            const d = parseDate(s.saleDate);
            return s.status !== 'Cancelado' && d && isValid(d) && isWithinInterval(d, interval);
        });
        
        const cashInMonth = cashTransactions.filter(t => {
            const d = parseDate(t.date);
            return d && isValid(d) && isWithinInterval(d, interval);
        });

        const serviceIncome = servicesInMonth.reduce((sum, s) => sum + (s.totalCost ?? 0), 0);
        const posIncome = salesInMonth.reduce((sum, s) => sum + (s.totalAmount ?? 0), 0);
        const serviceProfit = servicesInMonth.reduce((sum, s) => sum + calcEffectiveProfit(s, allInventory), 0);
        const posProfit = salesInMonth.reduce((sum, s) => sum + calculateSaleProfit(s, allInventory), 0);

        const monthlyPayroll = personnel.reduce((sum, p) => sum + (p.monthlySalary || 0), 0);
        const otherMonthlyExpenses = fixedExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
        const totalExpenses = monthlyPayroll + otherMonthlyExpenses;
        
        const cashIn = cashInMonth.filter(t => t.type === 'in' || t.type === 'Entrada').reduce((sum, t) => sum + t.amount, 0);
        const cashOut = cashInMonth.filter(t => t.type === 'out' || t.type === 'Salida').reduce((sum, t) => sum + t.amount, 0);

        reports[monthKey] = {
            month: `${monthName} ${currentYear}`,
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
  }, [allServices, allSales, allInventory, fixedExpenses, personnel, cashTransactions]);

  const { selectedReport, transactionsForSelectedMonth } = useMemo(() => {
    if (!selectedMonth) {
      const firstMonthKey = monthlyReports[0]?.[0];
      if (firstMonthKey) setSelectedMonth(firstMonthKey);
      return { selectedReport: monthlyReports[0]?.[1], transactionsForSelectedMonth: [] };
    }

    const reportTuple = monthlyReports.find(([key]) => key === selectedMonth);
    const report = reportTuple?.[1];

    const [year, month] = selectedMonth.split('-').map(Number);
    const startDate = startOfMonth(new Date(year, month - 1));
    const endDate = endOfMonth(startDate);
    
    const transactions = cashTransactions.filter(t => {
      const d = parseDate(t.date);
      return d && isValid(d) && isWithinInterval(d, { start: startDate, end: endDate });
    });
    
    return { selectedReport: report, transactionsForSelectedMonth: transactions };
  }, [selectedMonth, monthlyReports, cashTransactions]);
  
  useEffect(() => {
      if(!selectedMonth && monthlyReports.length > 0) {
          setSelectedMonth(monthlyReports[0][0]);
      }
  }, [monthlyReports, selectedMonth]);

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
       <Card>
        <CardHeader>
          <CardTitle>Cierres Mensuales</CardTitle>
          <CardDescription>Resumen financiero y de operaciones por mes.</CardDescription>
        </CardHeader>
      </Card>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
                <CardTitle className="text-lg">Meses ({getYear(new Date())})</CardTitle>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-96">
                    <div className="space-y-2">
                        {monthlyReports.map(([key, report]) => (
                            <Button
                                key={key}
                                variant={selectedMonth === key ? "secondary" : "ghost"}
                                className="w-full justify-start"
                                onClick={() => setSelectedMonth(key)}
                            >
                                {report.month}
                            </Button>
                        ))}
                    </div>
                </ScrollArea>
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-3">
          {selectedReport ? (
            <Tabs defaultValue="informe" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="informe">Informe Financiero</TabsTrigger>
                    <TabsTrigger value="efectivo">Flujo de Efectivo</TabsTrigger>
                </TabsList>
                <TabsContent value="informe" className="mt-4">
                  <Card>
                    <CardHeader>
                        <CardTitle className="text-2xl">{selectedReport.month}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <h3 className="font-semibold text-lg border-b pb-2">Resumen de Rentabilidad</h3>
                            <Table>
                                <TableBody>
                                    <TableRow><TableCell>Ingresos por Servicios</TableCell><TableCell className="text-right font-medium">{formatCurrency(selectedReport.serviceIncome)}</TableCell></TableRow>
                                    <TableRow><TableCell>Ingresos por Venta de Mostrador</TableCell><TableCell className="text-right font-medium">{formatCurrency(selectedReport.posIncome)}</TableCell></TableRow>
                                    <TableRow className="font-bold bg-muted/50"><TableCell>Ingresos Totales</TableCell><TableCell className="text-right">{formatCurrency(selectedReport.totalIncome)}</TableCell></TableRow>
                                    <TableRow><TableCell>Ganancia Bruta (Ingresos - Costo Insumos)</TableCell><TableCell className="text-right font-medium">{formatCurrency(selectedReport.totalProfit)}</TableCell></TableRow>
                                    <TableRow><TableCell>Gastos Fijos (Nómina, Renta, etc.)</TableCell><TableCell className="text-right font-medium text-red-600">-{formatCurrency(selectedReport.totalExpenses)}</TableCell></TableRow>
                                    <TableRow className="font-bold text-lg bg-muted/50"><TableCell>Utilidad Neta del Mes</TableCell><TableCell className="text-right">{formatCurrency(selectedReport.netProfit)}</TableCell></TableRow>
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                 <TabsContent value="efectivo" className="mt-4">
                    <CierreEfectivoContent 
                      transactions={transactionsForSelectedMonth} 
                      summary={{ cashIn: selectedReport.cashIn, cashOut: selectedReport.cashOut, cashNet: selectedReport.cashNet }}
                    />
                </TabsContent>
            </Tabs>
          ) : (
            <Card className="flex items-center justify-center h-96">
                <p className="text-muted-foreground">Seleccione un mes para ver el reporte.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default withSuspense(CierrePageInner);
