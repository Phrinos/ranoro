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
import CierreEfectivoContent from '../../finanzas/cierre/components/cierre-efectivo-content';

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
    const currentYear = getYear(new Date());

    for (let i = 11; i >= 0; i--) {
        const date = new Date(currentYear, i, 1);
        const monthKey = format(date, 'yyyy-MM');
        const monthName = capitalizeWords(format(date, 'MMMM', { locale: es }));
        const startDate = startOfMonth(date);
        const endDate = endOfMonth(date);
        const interval = { start: startDate, end: endDate };

        const servicesInMonth = services.filter(s => {
            const d = parseDate(s.deliveryDateTime);
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

        const serviceIncome = servicesInMonth.reduce((sum, s) => sum + (s.totalCost ?? 0), 0);
        const posIncome = salesInMonth.reduce((sum, s) => sum + (s.totalAmount ?? 0), 0);
        const serviceProfit = servicesInMonth.reduce((sum, s) => sum + calcEffectiveProfit(s, inventory), 0);
        const posProfit = salesInMonth.reduce((sum, s) => sum + calculateSaleProfit(s, inventory), 0);

        const monthlyPayroll = personnel.reduce((sum, p) => sum + (p.monthlySalary || 0), 0);
        const otherMonthlyExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
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
  }, [services, sales, inventory, expenses, personnel, cashTransactions]);

  const { selectedReport, transactionsForSelectedMonth } = useMemo(() => {
    const key = selectedMonth || monthlyReports[0]?.[0];
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
    if (!selectedMonth && monthlyReports.length > 0) setSelectedMonth(monthlyReports[0][0]);
  }, [monthlyReports, selectedMonth]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <Card className="lg:col-span-1">
        <CardHeader><CardTitle className="text-lg">Meses</CardTitle></CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            <div className="space-y-2">
              {monthlyReports.map(([key, report]) => (
                <Button key={key} variant={selectedMonth === key ? "secondary" : "ghost"} className="w-full justify-start" onClick={() => setSelectedMonth(key)}>
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
              <TabsTrigger value="efectivo">Flujo Efectivo</TabsTrigger>
            </TabsList>
            <TabsContent value="informe" className="mt-4">
              <Card>
                <CardHeader><CardTitle>{selectedReport.month}</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableBody>
                      <TableRow><TableCell>Ingresos por Servicios</TableCell><TableCell className="text-right font-medium">{formatCurrency(selectedReport.serviceIncome)}</TableCell></TableRow>
                      <TableRow><TableCell>Ingresos por Ventas POS</TableCell><TableCell className="text-right font-medium">{formatCurrency(selectedReport.posIncome)}</TableCell></TableRow>
                      <TableRow className="font-bold bg-muted/50"><TableCell>Ingresos Totales</TableCell><TableCell className="text-right">{formatCurrency(selectedReport.totalIncome)}</TableCell></TableRow>
                      <TableRow><TableCell>Ganancia Bruta</TableCell><TableCell className="text-right font-medium">{formatCurrency(selectedReport.totalProfit)}</TableCell></TableRow>
                      <TableRow><TableCell>Gastos Fijos</TableCell><TableCell className="text-right font-medium text-red-600">-{formatCurrency(selectedReport.totalExpenses)}</TableCell></TableRow>
                      <TableRow className="font-bold text-lg bg-muted/50"><TableCell>Utilidad Neta</TableCell><TableCell className="text-right">{formatCurrency(selectedReport.netProfit)}</TableCell></TableRow>
                    </TableBody>
                  </Table>
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
          <Card className="flex items-center justify-center h-96"><p className="text-muted-foreground">Seleccione un mes.</p></Card>
        )}
      </div>
    </div>
  );
}