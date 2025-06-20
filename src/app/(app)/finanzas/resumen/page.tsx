
"use client";

import { useState, useMemo, useEffect } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  placeholderSales,
  placeholderServiceRecords,
  placeholderTechnicians,
  placeholderFixedMonthlyExpenses,
  placeholderInventory, // Import placeholderInventory
  calculateSaleProfit,
  IVA_RATE, // Import IVA_RATE
} from "@/lib/placeholder-data";
import type { SaleReceipt, ServiceRecord, Technician, MonthlyFixedExpense, InventoryItem } from "@/types";
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  subMonths,
  addMonths,
  isValid,
  getYear,
  getMonth,
} from "date-fns";
import { es } from 'date-fns/locale';
import { CalendarIcon, ChevronLeft, ChevronRight, DollarSign, TrendingUp, TrendingDown, Landmark, Users, Info } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ResumenFinancieroPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(startOfMonth(new Date()));
  const [inventory, setInventory] = useState<InventoryItem[]>(placeholderInventory); // Add inventory state

  const financialSummary = useMemo(() => {
    const currentMonthStart = startOfMonth(selectedDate);
    const currentMonthEnd = endOfMonth(selectedDate);

    const salesThisMonth = placeholderSales.filter(sale => {
      const saleDate = parseISO(sale.saleDate);
      return isValid(saleDate) && isWithinInterval(saleDate, { start: currentMonthStart, end: currentMonthEnd });
    });

    const servicesThisMonth = placeholderServiceRecords.filter(service => {
      const serviceDate = parseISO(service.serviceDate);
      return isValid(serviceDate) && isWithinInterval(serviceDate, { start: currentMonthStart, end: currentMonthEnd });
    });

    const totalIncomeFromSales = salesThisMonth.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const totalIncomeFromServices = servicesThisMonth.reduce((sum, service) => sum + service.totalCost, 0);
    const totalOperationalIncome = totalIncomeFromSales + totalIncomeFromServices;

    // Use the imported calculateSaleProfit function
    const totalProfitFromSales = salesThisMonth.reduce((sum, sale) => sum + calculateSaleProfit(sale, inventory, IVA_RATE), 0);
    const totalProfitFromServices = servicesThisMonth.reduce((sum, service) => sum + (service.serviceProfit || 0), 0);
    const totalOperationalProfit = totalProfitFromSales + totalProfitFromServices;

    const totalTechnicianSalaries = placeholderTechnicians.reduce((sum, tech) => sum + (tech.monthlySalary || 0), 0);

    const totalFixedExpenses = placeholderFixedMonthlyExpenses.reduce((sum, expense) => sum + expense.amount, 0);

    const totalExpenses = totalTechnicianSalaries + totalFixedExpenses;
    const netProfit = totalOperationalProfit - totalExpenses;

    return {
      monthYearLabel: format(selectedDate, "MMMM yyyy", { locale: es }),
      totalOperationalIncome,
      totalOperationalProfit,
      totalTechnicianSalaries,
      fixedExpenses: placeholderFixedMonthlyExpenses,
      totalFixedExpenses,
      totalExpenses,
      netProfit,
    };
  }, [selectedDate, inventory]); // Add inventory to dependency array

  const handlePreviousMonth = () => {
    setSelectedDate(prev => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    setSelectedDate(prev => addMonths(prev, 1));
  };
  
  const formatCurrency = (amount: number) => `$${amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <>
      <PageHeader
        title="Resumen Financiero Mensual"
        description="Visualiza los ingresos, gastos y ganancias netas de cada mes."
      />

      <div className="mb-6 flex items-center justify-center gap-4">
        <Button variant="outline" size="icon" onClick={handlePreviousMonth} aria-label="Mes anterior">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn(
                "w-auto min-w-[200px] justify-center text-left font-semibold text-lg px-6 py-3", // Increased padding and min-width
              )}
            >
              <CalendarIcon className="mr-3 h-5 w-5" /> {/* Increased margin */}
              {format(selectedDate, "MMMM yyyy", { locale: es })}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(startOfMonth(date))}
              initialFocus
              defaultMonth={selectedDate}
              captionLayout="dropdown-buttons"
              fromYear={getYear(new Date()) - 5}
              toYear={getYear(new Date()) + 5}
              locale={es}
            />
          </PopoverContent>
        </Popover>
        <Button variant="outline" size="icon" onClick={handleNextMonth} aria-label="Mes siguiente" disabled={endOfMonth(selectedDate) >= endOfMonth(new Date())}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-green-500" />
              Ingresos y Ganancia Bruta
            </CardTitle>
            <CardDescription>Operaciones del mes de {financialSummary.monthYearLabel}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-base">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Ingresos Operativos Totales:</span>
              <span className="font-semibold text-lg">{formatCurrency(financialSummary.totalOperationalIncome)}</span>
            </div>
            <hr className="my-1 border-border/50"/>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Ganancia Bruta Operativa:</span>
              <span className="font-semibold text-lg text-green-600">{formatCurrency(financialSummary.totalOperationalProfit)}</span>
            </div>
             <CardDescription className="text-xs pt-1">
                (Ingresos Totales - Costo de Insumos/Partes)
            </CardDescription>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <TrendingDown className="h-6 w-6 text-red-500" />
              Gastos Fijos y Sueldos
            </CardTitle>
             <CardDescription>Costos operativos del mes de {financialSummary.monthYearLabel}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-base">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground flex items-center gap-1"><Users className="h-4 w-4"/>Sueldos de Técnicos:</span>
              <span className="font-semibold">{formatCurrency(financialSummary.totalTechnicianSalaries)}</span>
            </div>
            {financialSummary.fixedExpenses.map(expense => (
              <div key={expense.id} className="flex justify-between items-center">
                <span className="text-muted-foreground flex items-center gap-1"><Landmark className="h-4 w-4"/>{expense.name}:</span>
                <span className="font-semibold">{formatCurrency(expense.amount)}</span>
              </div>
            ))}
            <hr className="my-2 border-border/70"/>
            <div className="flex justify-between font-bold text-lg">
              <span>Total de Gastos:</span>
              <span className="text-red-600">{formatCurrency(financialSummary.totalExpenses)}</span>
            </div>
          </CardContent>
        </Card>
        
        <Card className="lg:col-span-1 bg-primary/5 dark:bg-primary/10 border-primary/30">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <DollarSign className="h-6 w-6 text-primary" />
              Resultado Neto del Mes
            </CardTitle>
             <CardDescription>Ganancia neta para {financialSummary.monthYearLabel}</CardDescription>
          </CardHeader>
          <CardContent className="text-center py-8">
            <p className={`text-4xl font-bold ${financialSummary.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(financialSummary.netProfit)}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              (Ganancia Bruta Operativa - Total de Gastos)
            </p>
          </CardContent>
        </Card>
      </div>
      
      <Card className="mt-8 bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700">
        <CardHeader className="flex flex-row items-center gap-3">
            <Info className="h-6 w-6 text-blue-600 dark:text-blue-400"/>
            <div>
                <CardTitle className="text-blue-800 dark:text-blue-300">Notas sobre el Cálculo</CardTitle>
            </div>
        </CardHeader>
        <CardContent className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
            <p>• La <strong>Ganancia Bruta Operativa</strong> se calcula como: (Ingresos Totales de Ventas - Costo de los Productos Vendidos) + (Ingresos Totales de Servicios - Costo de los Insumos Usados en Servicios).</p>
            <p>• Los <strong>Sueldos de Técnicos</strong> y <strong>Gastos Fijos Mensuales</strong> (Renta, Servicios, etc.) son valores predefinidos en el sistema para este demo.</p>
            <p>• El <strong>Resultado Neto</strong> es la Ganancia Bruta Operativa menos el Total de Gastos (Sueldos + Gastos Fijos).</p>
            <p>• Esta página no incluye gastos variables adicionales que no estén preconfigurados.</p>
        </CardContent>
      </Card>
    </>
  );
}
