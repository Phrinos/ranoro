
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
  placeholderInventory, 
  placeholderAdministrativeStaff,
  calculateSaleProfit,
  IVA_RATE, 
} from "@/lib/placeholder-data";
import type { SaleReceipt, ServiceRecord, Technician, MonthlyFixedExpense, InventoryItem, AdministrativeStaff } from "@/types";
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
import { CalendarIcon, ChevronLeft, ChevronRight, DollarSign, TrendingUp, TrendingDown, Landmark, Users, Info, Pencil, BadgeCent } from "lucide-react";
import { cn } from "@/lib/utils";
import { FixedExpensesDialog } from "../components/fixed-expenses-dialog"; 

export default function ResumenFinancieroPage() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>(placeholderInventory); 
  const [currentFixedExpenses, setCurrentFixedExpenses] = useState<MonthlyFixedExpense[]>(placeholderFixedMonthlyExpenses);
  const [isExpensesDialogOpen, setIsExpensesDialogOpen] = useState(false);

  useEffect(() => {
    // Initialize date on client side to avoid hydration issues
    if (typeof window !== 'undefined') {
      setSelectedDate(startOfMonth(new Date()));
    }
  }, []);

  const financialSummary = useMemo(() => {
    if (!selectedDate) {
      // Return a default/loading state if date is not set yet
      return {
        monthYearLabel: "Cargando...",
        totalOperationalIncome: 0,
        totalIncomeFromSales: 0,
        totalIncomeFromServices: 0,
        totalProfitFromSales: 0,
        totalProfitFromServices: 0,
        totalCostOfGoods: 0,
        totalOperationalProfit: 0,
        totalSalaries: 0,
        totalTechnicianSalaries: 0,
        totalAdministrativeSalaries: 0,
        fixedExpenses: [],
        totalFixedExpenses: 0,
        totalTechnicianCommissions: 0,
        totalAdministrativeCommissions: 0,
        totalExpenses: 0,
        netProfit: 0,
        isProfitableForCommissions: false,
      };
    }

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
    
    const completedServicesThisMonth = servicesThisMonth.filter(s => s.status === 'Completado');

    const totalIncomeFromSales = salesThisMonth.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const totalIncomeFromServices = completedServicesThisMonth.reduce((sum, service) => sum + service.totalCost, 0);
    const totalOperationalIncome = totalIncomeFromSales + totalIncomeFromServices;

    const totalCostOfGoodsFromSales = salesThisMonth.reduce((totalCost, sale) => {
      const saleCost = sale.items.reduce((cost, saleItem) => {
        const inventoryItem = inventory.find(inv => inv.id === saleItem.inventoryItemId);
        const costPrice = inventoryItem ? inventoryItem.unitPrice : 0;
        return cost + (costPrice * saleItem.quantity);
      }, 0);
      return totalCost + saleCost;
    }, 0);
    const totalCostOfGoodsFromServices = completedServicesThisMonth.reduce((sum, service) => sum + (service.totalSuppliesCost || 0), 0);
    const totalCostOfGoods = totalCostOfGoodsFromSales + totalCostOfGoodsFromServices;

    const totalProfitFromSales = salesThisMonth.reduce((sum, sale) => sum + calculateSaleProfit(sale, inventory, IVA_RATE), 0);
    const totalProfitFromServices = completedServicesThisMonth.reduce((sum, service) => sum + (service.serviceProfit || 0), 0);
    const totalOperationalProfit = totalProfitFromSales + totalProfitFromServices;
    
    const totalTechnicianSalaries = placeholderTechnicians.reduce((sum, tech) => sum + (tech.monthlySalary || 0), 0);
    const totalAdministrativeSalaries = placeholderAdministrativeStaff.reduce((sum, staff) => sum + (staff.monthlySalary || 0), 0);
    const totalBaseSalaries = totalTechnicianSalaries + totalAdministrativeSalaries;

    const totalFixedExpensesFromState = currentFixedExpenses.reduce((sum, expense) => sum + expense.amount, 0);

    let totalTechnicianCommissionsMonth = 0;
    let totalAdministrativeCommissionsMonth = 0;
    const isWorkshopProfitableAfterFixedCosts = (totalOperationalProfit - totalFixedExpensesFromState) > 0;

    if (isWorkshopProfitableAfterFixedCosts) {
      placeholderTechnicians.forEach(tech => {
        const techServicesThisMonth = completedServicesThisMonth.filter(s => s.technicianId === tech.id);
        totalTechnicianCommissionsMonth += techServicesThisMonth.reduce((sum, s) => sum + (s.serviceProfit || 0) * (tech.commissionRate || 0), 0);
      });
      const totalProfitFromAllCompletedServicesInMonth = completedServicesThisMonth.reduce((sum, s) => sum + (s.serviceProfit || 0), 0);
      placeholderAdministrativeStaff.forEach(adminStaff => {
        totalAdministrativeCommissionsMonth += totalProfitFromAllCompletedServicesInMonth * (adminStaff.commissionRate || 0);
      });
    }
    
    const totalExpenses = totalBaseSalaries + totalFixedExpensesFromState + totalTechnicianCommissionsMonth + totalAdministrativeCommissionsMonth;
    const netProfit = totalOperationalProfit - totalExpenses;

    return {
      monthYearLabel: format(selectedDate, "MMMM yyyy", { locale: es }),
      totalOperationalIncome,
      totalIncomeFromSales,
      totalIncomeFromServices,
      totalProfitFromSales,
      totalProfitFromServices,
      totalCostOfGoods,
      totalOperationalProfit,
      totalSalaries: totalBaseSalaries,
      totalTechnicianSalaries,
      totalAdministrativeSalaries,
      fixedExpenses: currentFixedExpenses, 
      totalFixedExpenses: totalFixedExpensesFromState,
      totalTechnicianCommissions: totalTechnicianCommissionsMonth,
      totalAdministrativeCommissions: totalAdministrativeCommissionsMonth,
      totalExpenses,
      netProfit,
      isProfitableForCommissions: isWorkshopProfitableAfterFixedCosts,
    };
  }, [selectedDate, inventory, currentFixedExpenses]);

  const handleExpensesUpdated = (updatedExpenses: MonthlyFixedExpense[]) => {
    setCurrentFixedExpenses([...updatedExpenses]); 
  };

  const handlePreviousMonth = () => {
    setSelectedDate(prev => prev ? subMonths(prev, 1) : null);
  };

  const handleNextMonth = () => {
    setSelectedDate(prev => prev ? addMonths(prev, 1) : null);
  };
  
  const formatCurrency = (amount: number) => `$${amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <>
      <PageHeader
        title="Resumen Financiero Mensual"
        description="Visualiza los ingresos, gastos y ganancias netas de cada mes."
      />

      <div className="mb-6 flex items-center justify-center gap-4">
        <Button variant="outline" size="icon" onClick={handlePreviousMonth} aria-label="Mes anterior" disabled={!selectedDate} className="bg-card">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn(
                "w-auto min-w-[200px] justify-center text-left font-semibold text-lg px-6 py-3 bg-card", 
              )}
              disabled={!selectedDate}
            >
              <CalendarIcon className="mr-3 h-5 w-5" /> 
              {selectedDate ? format(selectedDate, "MMMM yyyy", { locale: es }) : "Cargando..."}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={selectedDate || undefined}
              onSelect={(date) => date && setSelectedDate(startOfMonth(date))}
              initialFocus
              defaultMonth={selectedDate || new Date()}
              captionLayout="dropdown-buttons"
              fromYear={getYear(new Date()) - 5}
              toYear={getYear(new Date()) + 5}
              locale={es}
            />
          </PopoverContent>
        </Popover>
        <Button variant="outline" size="icon" onClick={handleNextMonth} aria-label="Mes siguiente" disabled={!selectedDate || endOfMonth(selectedDate) >= endOfMonth(new Date())} className="bg-card">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      
      <Card className="mb-8 bg-card shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-primary" />
            Resumen General del Mes
          </CardTitle>
          <CardDescription>Cálculo de la ganancia neta para {financialSummary.monthYearLabel}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-base">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Ingresos Operativos Totales (Ventas y Servicios):</span>
            <span className="font-semibold text-lg text-green-600">{formatCurrency(financialSummary.totalOperationalIncome)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">(-) Costo Total de Insumos (Compras):</span>
            <span className="font-semibold text-lg text-orange-500">-{formatCurrency(financialSummary.totalCostOfGoods)}</span>
          </div>
          <hr className="my-1 border-dashed"/>
          <div className="flex justify-between items-center font-medium">
            <span className="text-foreground">(=) Ganancia Bruta Operativa:</span>
            <span className="font-semibold text-lg">{formatCurrency(financialSummary.totalOperationalProfit)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">(-) Total de Gastos (Sueldos, Fijos, Comisiones):</span>
            <span className="font-semibold text-lg text-red-600">-{formatCurrency(financialSummary.totalExpenses)}</span>
          </div>
          <hr className="my-2 border-primary/30"/>
          <div className="flex justify-between font-bold text-xl pt-2">
            <span>(=) Resultado Neto del Mes:</span>
            <span className={financialSummary.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}>{formatCurrency(financialSummary.netProfit)}</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
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
              <span className="text-muted-foreground">Ingreso por Ventas (POS):</span>
              <span className="font-semibold">{formatCurrency(financialSummary.totalIncomeFromSales)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Ingreso por Servicios:</span>
              <span className="font-semibold">{formatCurrency(financialSummary.totalIncomeFromServices)}</span>
            </div>
            <hr className="my-1 border-dashed"/>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Ganancia por Ventas:</span>
              <span className="font-semibold text-green-600">{formatCurrency(financialSummary.totalProfitFromSales)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Ganancia por Servicios:</span>
              <span className="font-semibold text-green-600">{formatCurrency(financialSummary.totalProfitFromServices)}</span>
            </div>
            <hr className="my-1 border-border/50"/>
            <div className="flex justify-between items-center">
              <span className="text-foreground font-medium">Ganancia Bruta Operativa:</span>
              <span className="font-semibold text-lg text-green-600">{formatCurrency(financialSummary.totalOperationalProfit)}</span>
            </div>
             <CardDescription className="text-xs pt-1">
                (Suma de ganancias de ventas y servicios)
            </CardDescription>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex items-center justify-between">
                <CardTitle className="text-xl flex items-center gap-2">
                <TrendingDown className="h-6 w-6 text-red-500" />
                Gastos, Sueldos y Comisiones
              </CardTitle>
              <Button variant="outline" size="sm" onClick={() => setIsExpensesDialogOpen(true)}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </Button>
            </div>
             <CardDescription>Costos operativos del mes de {financialSummary.monthYearLabel}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-base">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground flex items-center gap-1"><Users className="h-4 w-4"/>Sueldos Base (Staff Técnico):</span>
              <span className="font-semibold">{formatCurrency(financialSummary.totalTechnicianSalaries)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground flex items-center gap-1"><Users className="h-4 w-4"/>Sueldos Base (Staff Admin.):</span>
              <span className="font-semibold">{formatCurrency(financialSummary.totalAdministrativeSalaries)}</span>
            </div>
            {financialSummary.fixedExpenses.map(expense => (
              <div key={expense.id} className="flex justify-between items-center">
                <span className="text-muted-foreground flex items-center gap-1"><Landmark className="h-4 w-4"/>{expense.name}:</span>
                <span className="font-semibold">{formatCurrency(expense.amount)}</span>
              </div>
            ))}
            <hr className="my-1 border-border/50"/>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground flex items-center gap-1"><BadgeCent className="h-4 w-4"/>Comisiones Pagadas (Técnicos):</span>
              <span className="font-semibold">{formatCurrency(financialSummary.totalTechnicianCommissions)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground flex items-center gap-1"><BadgeCent className="h-4 w-4"/>Comisiones Pagadas (Admin.):</span>
              <span className="font-semibold">{formatCurrency(financialSummary.totalAdministrativeCommissions)}</span>
            </div>
            <hr className="my-2 border-border/70"/>
            <div className="flex justify-between font-bold text-lg">
              <span>Total de Gastos:</span>
              <span className="text-red-600">{formatCurrency(financialSummary.totalExpenses)}</span>
            </div>
          </CardContent>
        </Card>
        
      </div>
      
      <Card className="mt-8 bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700">
        <CardHeader className="flex flex-row items-start gap-3">
            <Info className="h-6 w-6 text-blue-600 dark:text-blue-400 shrink-0 mt-1"/>
            <div>
                <CardTitle className="text-blue-800 dark:text-blue-300">¿Cómo se calcula el resumen?</CardTitle>
                <CardDescription className="text-blue-700/80 dark:text-blue-300/80">
                  Un desglose simplificado de los términos clave.
                </CardDescription>
            </div>
        </CardHeader>
        <CardContent className="text-sm text-blue-700 dark:text-blue-300 space-y-2 pl-12">
            <p><strong>• Ganancia Bruta Operativa:</strong> Ingresos totales (ventas + servicios) menos el costo de los insumos y refacciones utilizados.</p>
            <p><strong>• Gastos Totales:</strong> Suma de sueldos base, gastos fijos (renta, luz, etc.) y comisiones.</p>
            <p><strong>• Comisiones:</strong> Se pagan a técnicos y administrativos sobre la ganancia de los servicios completados, <strong>solo si el taller es rentable</strong> (es decir, si la Ganancia Bruta supera los Gastos Fijos).</p>
            <p><strong>• Resultado Neto:</strong> Es la Ganancia Bruta Operativa menos los Gastos Totales. Representa la ganancia real del taller en el mes.</p>
        </CardContent>
      </Card>

      <FixedExpensesDialog
        open={isExpensesDialogOpen}
        onOpenChange={setIsExpensesDialogOpen}
        onExpensesUpdated={handleExpensesUpdated}
      />
    </>
  );
}
