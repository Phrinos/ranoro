
"use client";

import { useState, useMemo, useEffect, useCallback, Suspense } from 'react';
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
  hydrateReady,
} from "@/lib/placeholder-data";
import type { MonthlyFixedExpense } from "@/types";
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  isValid,
  startOfDay, endOfDay, startOfWeek, endOfWeek, isSameDay
} from "date-fns";
import { es } from 'date-fns/locale';
import { CalendarIcon, DollarSign, TrendingUp, TrendingDown, Landmark, Users, Pencil, BadgeCent } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { FixedExpensesDialog } from "../components/fixed-expenses-dialog"; 
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { DateRange } from "react-day-picker";

function ResumenFinancieroPageComponent() {
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
    const [hydrated, setHydrated] = useState(false);
    const [version, setVersion] = useState(0);

    const [currentFixedExpenses, setCurrentFixedExpenses] = useState<MonthlyFixedExpense[]>(placeholderFixedMonthlyExpenses);
    const [isExpensesDialogOpen, setIsExpensesDialogOpen] = useState(false);

    useEffect(() => {
        hydrateReady.then(() => setHydrated(true));
        const forceUpdate = () => setVersion(v => v + 1);
        window.addEventListener('databaseUpdated', forceUpdate);
        
        const now = new Date();
        setDateRange({ from: startOfMonth(now), to: endOfMonth(now) });

        return () => window.removeEventListener('databaseUpdated', forceUpdate);
    }, []);

    const financialSummary = useMemo(() => {
        const emptyState = { 
            monthYearLabel: "Cargando...", 
            totalOperationalIncome: 0, 
            totalIncomeFromSales: 0, 
            totalIncomeFromServices: 0,
            totalIncomeFromServiciosGenerales: 0,
            totalIncomeFromCambioAceite: 0,
            totalIncomeFromPintura: 0,
            totalProfitFromSales: 0, 
            totalProfitFromServices: 0,
            totalProfitFromServiciosGenerales: 0,
            totalProfitFromCambioAceite: 0,
            totalProfitFromPintura: 0,
            totalCostOfGoods: 0, 
            totalOperationalProfit: 0, 
            totalSalaries: 0, 
            totalTechnicianSalaries: 0, 
            totalAdministrativeSalaries: 0, 
            fixedExpenses: [], 
            totalFixedExpenses: 0, 
            totalMonthlyExpenses: 0, 
            totalTechnicianCommissions: 0, 
            totalAdministrativeCommissions: 0, 
            totalExpenses: 0, 
            netProfit: 0, 
            isProfitableForCommissions: false 
        };

        if (!dateRange?.from) {
          return emptyState;
        }
        
        const from = startOfDay(dateRange.from);
        const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);
        
        const salesInRange = placeholderSales.filter(sale => sale.status !== 'Cancelado' && isValid(parseISO(sale.saleDate)) && isWithinInterval(parseISO(sale.saleDate), { start: from, end: to }));
        const completedServicesInRange = placeholderServiceRecords.filter(s => s.status === 'Completado' && s.deliveryDateTime && isValid(parseISO(s.deliveryDateTime)) && isWithinInterval(parseISO(s.deliveryDateTime), { start: from, end: to }));

        const totalIncomeFromSales = salesInRange.reduce((sum, sale) => sum + sale.totalAmount, 0);
        const totalProfitFromSales = salesInRange.reduce((sum, sale) => sum + calculateSaleProfit(sale, placeholderInventory), 0);
        
        // Detailed service breakdown
        const servicesGenerales = completedServicesInRange.filter(s => s.serviceType === 'Servicio General' || !s.serviceType);
        const servicesAceite = completedServicesInRange.filter(s => s.serviceType === 'Cambio de Aceite');
        const servicesPintura = completedServicesInRange.filter(s => s.serviceType === 'Pintura');

        const totalIncomeFromServiciosGenerales = servicesGenerales.reduce((sum, s) => sum + s.totalCost, 0);
        const totalIncomeFromCambioAceite = servicesAceite.reduce((sum, s) => sum + s.totalCost, 0);
        const totalIncomeFromPintura = servicesPintura.reduce((sum, s) => sum + s.totalCost, 0);
        
        const totalProfitFromServiciosGenerales = servicesGenerales.reduce((sum, s) => sum + (s.serviceProfit || 0), 0);
        const totalProfitFromCambioAceite = servicesAceite.reduce((sum, s) => sum + (s.serviceProfit || 0), 0);
        const totalProfitFromPintura = servicesPintura.reduce((sum, s) => sum + (s.serviceProfit || 0), 0);

        const totalIncomeFromServices = totalIncomeFromServiciosGenerales + totalIncomeFromCambioAceite + totalIncomeFromPintura;
        const totalProfitFromServices = totalProfitFromServiciosGenerales + totalProfitFromCambioAceite + totalProfitFromPintura;

        const totalOperationalIncome = totalIncomeFromSales + totalIncomeFromServices;
        const totalOperationalProfit = totalProfitFromSales + totalProfitFromServices;

        const totalCostOfGoodsFromSales = salesInRange.reduce((totalCost, sale) => totalCost + sale.items.reduce((cost, saleItem) => cost + ((placeholderInventory.find(inv => inv.id === saleItem.inventoryItemId)?.unitPrice || 0) * saleItem.quantity), 0), 0);
        const totalCostOfGoodsFromServices = completedServicesInRange.reduce((sum, service) => sum + (service.totalSuppliesCost || 0), 0);
        const totalCostOfGoods = totalCostOfGoodsFromSales + totalCostOfGoodsFromServices;

        const totalTechnicianSalaries = placeholderTechnicians.reduce((sum, tech) => sum + (tech.monthlySalary || 0), 0);
        const totalAdministrativeSalaries = placeholderAdministrativeStaff.reduce((sum, staff) => sum + (staff.monthlySalary || 0), 0);
        const totalBaseSalaries = totalTechnicianSalaries + totalAdministrativeSalaries;
        const totalFixedExpensesFromState = currentFixedExpenses.reduce((sum, expense) => sum + expense.amount, 0);
        const totalMonthlyExpenses = totalBaseSalaries + totalFixedExpensesFromState;
        
        let totalTechnicianCommissions = 0;
        let totalAdministrativeCommissions = 0;
        const isProfitableForCommissions = totalOperationalProfit > totalMonthlyExpenses;
        
        if (isProfitableForCommissions) {
          placeholderTechnicians.forEach(tech => {
            totalTechnicianCommissions += completedServicesInRange
                .filter(s => s.technicianId === tech.id)
                .reduce((sum, s) => sum + (s.serviceProfit || 0), 0) * (tech.commissionRate || 0);
          });
          
          const totalProfitFromAllCompletedServicesInRange = completedServicesInRange.reduce((sum, s) => sum + (s.serviceProfit || 0), 0);
          placeholderAdministrativeStaff.forEach(adminStaff => {
            totalAdministrativeCommissions += totalProfitFromAllCompletedServicesInRange * (adminStaff.commissionRate || 0);
          });
        }
        
        const totalExpenses = totalMonthlyExpenses + totalTechnicianCommissions + totalAdministrativeCommissions;
        const netProfit = totalOperationalProfit - totalExpenses;

        const dateLabel = dateRange.to && !isSameDay(dateRange.from, dateRange.to)
            ? `${format(from, "dd MMM", { locale: es })} - ${format(to, "dd MMM, yyyy", { locale: es })}`
            : format(from, "dd 'de' MMMM, yyyy", { locale: es });

        return { 
            monthYearLabel: dateLabel, 
            totalOperationalIncome, totalIncomeFromSales, totalIncomeFromServices, 
            totalIncomeFromServiciosGenerales, totalIncomeFromCambioAceite, totalIncomeFromPintura,
            totalProfitFromSales, totalProfitFromServices, 
            totalProfitFromServiciosGenerales, totalProfitFromCambioAceite, totalProfitFromPintura,
            totalCostOfGoods, totalOperationalProfit, 
            totalSalaries: totalBaseSalaries, totalTechnicianSalaries, totalAdministrativeSalaries, 
            fixedExpenses: currentFixedExpenses, totalFixedExpenses: totalFixedExpensesFromState, 
            totalMonthlyExpenses,
            totalTechnicianCommissions, totalAdministrativeCommissions, 
            totalExpenses, netProfit, 
            isProfitableForCommissions
        };
    }, [dateRange, currentFixedExpenses, version, hydrated]);
    
    if (!hydrated) { return <div className="text-center py-10">Cargando reporte...</div>; }
    
    const setDateToToday = () => setDateRange({ from: startOfDay(new Date()), to: endOfDay(new Date()) });
    const setDateToThisWeek = () => setDateRange({ from: startOfWeek(new Date(), { weekStartsOn: 1 }), to: endOfWeek(new Date(), { weekStartsOn: 1 }) });
    const setDateToThisMonth = () => setDateRange({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) });

    return (
        <>
            <div className="bg-primary text-primary-foreground rounded-lg p-6 mb-6">
                <h1 className="text-3xl font-bold tracking-tight">Finanzas</h1>
                <p className="text-primary-foreground/80 mt-1">Analiza el rendimiento financiero mensual de tu taller.</p>
            </div>
             <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="font-semibold text-lg">Filtrar por Fecha</p>
                <div className="flex items-center gap-2 flex-wrap justify-start sm:justify-end">
                    <Button variant="outline" size="sm" onClick={setDateToToday} className="bg-card">Hoy</Button>
                    <Button variant="outline" size="sm" onClick={setDateToThisWeek} className="bg-card">Esta Semana</Button>
                    <Button variant="outline" size="sm" onClick={setDateToThisMonth} className="bg-card">Este Mes</Button>
                    <Popover><PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full sm:w-[240px] justify-start text-left font-normal bg-card", !dateRange && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{dateRange?.from ? (dateRange.to ? (`${format(dateRange.from, "LLL dd, y", { locale: es })} - ${format(dateRange.to, "LLL dd, y", { locale: es })}`) : format(dateRange.from, "LLL dd, y", { locale: es })) : (<span>Seleccione rango</span>)}</Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="end"><Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2} locale={es} /></PopoverContent></Popover>
                </div>
            </div>

            <Tabs defaultValue="resumen" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-6">
                    <TabsTrigger value="resumen">Resumen</TabsTrigger>
                    <TabsTrigger value="ingresos">Ingresos</TabsTrigger>
                    <TabsTrigger value="egresos">Egresos</TabsTrigger>
                </TabsList>
                
                <TabsContent value="resumen" className="mt-0">
                    <Card className="mb-8 bg-card shadow-lg">
                        <CardHeader>
                            <CardTitle className="text-xl flex items-center gap-2"><DollarSign className="h-6 w-6 text-primary" />Resumen del Periodo</CardTitle>
                            <CardDescription>Cálculos de rentabilidad para {financialSummary.monthYearLabel}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3 text-base">
                            <div className="flex justify-between items-center"><span className="text-muted-foreground">Ingresos Operativos Totales:</span><span className="font-semibold text-lg text-green-600">{formatCurrency(financialSummary.totalOperationalIncome)}</span></div>
                            <div className="flex justify-between items-center"><span className="text-muted-foreground">(-) Costo Total de Insumos:</span><span className="font-semibold text-lg text-orange-500">-{formatCurrency(financialSummary.totalCostOfGoods)}</span></div>
                            <hr className="my-1 border-dashed"/>
                            <div className="flex justify-between items-center font-bold text-xl pt-2">
                                <span className="text-foreground">(=) Ganancia Bruta Operativa:</span>
                                <span className="font-semibold text-xl text-green-600">{formatCurrency(financialSummary.totalOperationalProfit)}</span>
                            </div>
                            <p className="text-xs text-muted-foreground pt-2">El Resultado Neto final se calcula comparando la Ganancia Bruta con los Gastos Mensuales fijos. Los gastos no se prorratean por día.</p>
                        </CardContent>
                    </Card>
                </TabsContent>
                
                <TabsContent value="ingresos" className="mt-0">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-xl flex items-center gap-2"><TrendingUp className="h-6 w-6 text-green-500" />Ingresos y Ganancia Bruta</CardTitle>
                            <CardDescription>Detalle de operaciones en el periodo de {financialSummary.monthYearLabel}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 text-base">
                             <div className="grid grid-cols-3 gap-4 font-semibold text-sm text-muted-foreground border-b pb-2">
                                <div className="col-span-1">Categoría</div>
                                <div className="col-span-1 text-right">Ingresos</div>
                                <div className="col-span-1 text-right">Ganancia</div>
                            </div>
                            
                            <div className="space-y-3 text-sm">
                                <div className="grid grid-cols-3 gap-4 items-center">
                                    <div className="col-span-1 font-semibold">Ventas (POS)</div>
                                    <div className="col-span-1 text-right font-medium">{formatCurrency(financialSummary.totalIncomeFromSales)}</div>
                                    <div className="col-span-1 text-right font-medium text-green-600">{formatCurrency(financialSummary.totalProfitFromSales)}</div>
                                </div>
                                <div className="grid grid-cols-3 gap-4 items-center">
                                    <div className="col-span-1 font-semibold">Servicios Generales</div>
                                    <div className="col-span-1 text-right font-medium">{formatCurrency(financialSummary.totalIncomeFromServiciosGenerales)}</div>
                                    <div className="col-span-1 text-right font-medium text-green-600">{formatCurrency(financialSummary.totalProfitFromServiciosGenerales)}</div>
                                </div>
                                <div className="grid grid-cols-3 gap-4 items-center">
                                    <div className="col-span-1 font-semibold">Cambio de Aceite</div>
                                    <div className="col-span-1 text-right font-medium">{formatCurrency(financialSummary.totalIncomeFromCambioAceite)}</div>
                                    <div className="col-span-1 text-right font-medium text-green-600">{formatCurrency(financialSummary.totalProfitFromCambioAceite)}</div>
                                </div>
                                <div className="grid grid-cols-3 gap-4 items-center">
                                    <div className="col-span-1 font-semibold">Pintura</div>
                                    <div className="col-span-1 text-right font-medium">{formatCurrency(financialSummary.totalIncomeFromPintura)}</div>
                                    <div className="col-span-1 text-right font-medium text-green-600">{formatCurrency(financialSummary.totalProfitFromPintura)}</div>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-4 items-center font-bold text-lg pt-4 border-t mt-4">
                                <div className="col-span-2 text-right">Ganancia Bruta Operativa Total:</div>
                                <div className="col-span-1 text-right text-xl text-green-600">{formatCurrency(financialSummary.totalOperationalProfit)}</div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
                
                <TabsContent value="egresos" className="mt-0">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-xl flex items-center gap-2">
                            <Users className="h-6 w-6 text-red-500" />
                            Nómina y Comisiones
                          </CardTitle>
                          <CardDescription>Sueldos base y comisiones variables del personal para {financialSummary.monthYearLabel}.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3 text-base">
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Sueldos Base (Técnicos):</span>
                            <span className="font-semibold">{formatCurrency(financialSummary.totalTechnicianSalaries)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Sueldos Base (Admin.):</span>
                            <span className="font-semibold">{formatCurrency(financialSummary.totalAdministrativeSalaries)}</span>
                          </div>
                          <hr className="my-2 border-dashed" />
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground flex items-center gap-1"><BadgeCent className="h-4 w-4"/>Comisiones (Técnicos):</span>
                            <span className="font-semibold">{formatCurrency(financialSummary.totalTechnicianCommissions)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground flex items-center gap-1"><BadgeCent className="h-4 w-4"/>Comisiones (Admin.):</span>
                            <span className="font-semibold">{formatCurrency(financialSummary.totalAdministrativeCommissions)}</span>
                          </div>
                          <hr className="my-2 border-border/70"/>
                          <div className="flex justify-between font-bold text-lg">
                              <span>Total Nómina:</span>
                              <span className="text-red-600">{formatCurrency(financialSummary.totalSalaries + financialSummary.totalTechnicianCommissions + financialSummary.totalAdministrativeCommissions)}</span>
                          </div>
                           {!financialSummary.isProfitableForCommissions && (
                              <p className="text-xs text-center text-muted-foreground pt-2">Las comisiones no se aplican porque la ganancia bruta no cubrió el total de gastos fijos.</p>
                          )}
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-xl flex items-center gap-2">
                              <Landmark className="h-6 w-6 text-red-500" />
                              Servicios y Gastos Fijos
                            </CardTitle>
                            <Button variant="outline" size="sm" onClick={() => setIsExpensesDialogOpen(true)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Editar
                            </Button>
                          </div>
                          <CardDescription>Gastos operativos fijos mensuales del taller.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3 text-base">
                          {financialSummary.fixedExpenses.length > 0 ? (
                            financialSummary.fixedExpenses.map(expense => (
                              <div key={expense.id} className="flex justify-between items-center">
                                <span className="text-muted-foreground">{expense.name}:</span>
                                <span className="font-semibold">{formatCurrency(expense.amount)}</span>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-muted-foreground text-center">No hay gastos fijos registrados.</p>
                          )}
                          <hr className="my-2 border-border/70"/>
                          <div className="flex justify-between font-bold text-lg">
                              <span>Total Gastos Fijos:</span>
                              <span className="text-red-600">{formatCurrency(financialSummary.totalFixedExpenses)}</span>
                          </div>
                        </CardContent>
                      </Card>
                  </div>
                </TabsContent>
            </Tabs>
            
            <FixedExpensesDialog
                open={isExpensesDialogOpen}
                onOpenChange={setIsExpensesDialogOpen}
                onExpensesUpdated={(updated) => { setCurrentFixedExpenses([...updated]); setVersion(v => v + 1); }}
            />
        </>
    );
}

export default function ResumenFinancieroPageWrapper() {
    return (
        <Suspense fallback={<div>Cargando...</div>}>
            <ResumenFinancieroPageComponent />
        </Suspense>
    );
}
