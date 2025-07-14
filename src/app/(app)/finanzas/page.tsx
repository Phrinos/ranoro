

"use client";

import { useState, useMemo, useEffect, useCallback, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  calculateSaleProfit,
} from "@/lib/placeholder-data";
import type { MonthlyFixedExpense, InventoryItem, FinancialOperation, AggregatedInventoryItem, PaymentMethod, ServiceTypeRecord, SaleReceipt, ServiceRecord, Technician, AdministrativeStaff } from "@/types";
import {
  format,
  parseISO,
  isWithinInterval,
  isValid,
  startOfDay, endOfDay, startOfWeek, endOfWeek, isSameDay, startOfMonth, endOfMonth, compareDesc, compareAsc
} from "date-fns";
import { es } from 'date-fns/locale';
import { CalendarIcon, DollarSign, TrendingUp, TrendingDown, Pencil, BadgeCent, Search, LineChart, PackageSearch, ListFilter, Filter, Package as PackageIcon } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { FixedExpensesDialog } from "../finanzas/components/fixed-expenses-dialog"; 
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { DateRange } from "react-day-picker";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { operationsService, inventoryService, personnelService } from '@/lib/services';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { parseDate } from '@/lib/forms';
import { ReporteOperacionesContent } from './components/reporte-operaciones-content';


function FinanzasPageComponent() {
    const searchParams = useSearchParams();
    const defaultTab = searchParams.get('tab') || 'resumen';
    
    const [activeTab, setActiveTab] = useState(defaultTab);
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
    const [isExpensesDialogOpen, setIsExpensesDialogOpen] = useState(false);
    
    // States for data
    const [isLoading, setIsLoading] = useState(true);
    const [allSales, setAllSales] = useState<SaleReceipt[]>([]);
    const [allServices, setAllServices] = useState<ServiceRecord[]>([]);
    const [allInventory, setAllInventory] = useState<InventoryItem[]>([]);
    const [allTechnicians, setAllTechnicians] = useState<Technician[]>([]);
    const [allAdminStaff, setAllAdminStaff] = useState<AdministrativeStaff[]>([]);
    const [fixedExpenses, setFixedExpenses] = useState<MonthlyFixedExpense[]>([]);
    const [serviceTypes, setServiceTypes] = useState<ServiceTypeRecord[]>([]);
    
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>(dateRange);

    useEffect(() => {
        setIsLoading(true);
        const unsubs: (() => void)[] = [
            operationsService.onSalesUpdate(setAllSales),
            operationsService.onServicesUpdate(setAllServices),
            inventoryService.onItemsUpdate(setAllInventory),
            inventoryService.onServiceTypesUpdate(setServiceTypes),
            personnelService.onTechniciansUpdate(setAllTechnicians),
            personnelService.onAdminStaffUpdate(setAllAdminStaff),
            inventoryService.onFixedExpensesUpdate((expenses) => {
                setFixedExpenses(expenses);
                setIsLoading(false); // Consider loading finished after the last subscription is active
            })
        ];
        
        const now = new Date();
        const initialRange = { from: startOfMonth(now), to: endOfMonth(now) };
        setDateRange(initialRange);
        setTempDateRange(initialRange);

        return () => unsubs.forEach(unsub => unsub());
    }, []);

    const financialSummary = useMemo(() => {
        const emptyState = { 
            monthYearLabel: "Cargando...", totalOperationalIncome: 0, totalIncomeFromSales: 0, totalIncomeFromServices: 0,
            totalProfitFromSales: 0, totalProfitFromServices: 0, totalCostOfGoods: 0, totalOperationalProfit: 0, totalSalaries: 0, 
            totalTechnicianSalaries: 0, totalAdministrativeSalaries: 0, totalFixedExpenses: 0, totalMonthlyExpenses: 0, 
            totalTechnicianCommissions: 0, totalAdministrativeCommissions: 0, totalExpenses: 0, netProfit: 0, 
            isProfitableForCommissions: false, serviceIncomeBreakdown: {},
            totalInventoryValue: 0, totalUnitsSold: 0
        };

        if (isLoading || !dateRange?.from) return emptyState;
        
        const from = startOfDay(dateRange.from);
        const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);
        
        const salesInRange = allSales.filter(s => s.status !== 'Cancelado' && isValid(parseISO(s.saleDate)) && isWithinInterval(parseISO(s.saleDate), { start: from, end: to }));
        
        const servicesInRange = allServices.filter(s => {
          const dateToParse = s.deliveryDateTime || s.serviceDate;
          if (!dateToParse) return false;
          const parsedDate = parseDate(dateToParse);
          return s.status === 'Completado' && isValid(parsedDate) && isWithinInterval(parsedDate, { start: from, end: to });
        });

        const totalIncomeFromSales = salesInRange.reduce((sum, s) => sum + s.totalAmount, 0);
        const totalProfitFromSales = salesInRange.reduce((sum, s) => sum + calculateSaleProfit(s, allInventory), 0);
        
        const serviceIncomeBreakdown: Record<string, { income: number; profit: number; count: number }> = {};

        // Process Sales
        if (salesInRange.length > 0) {
            serviceIncomeBreakdown['Venta'] = {
                income: totalIncomeFromSales,
                profit: totalProfitFromSales,
                count: salesInRange.length
            };
        }

        // Process Services
        servicesInRange.forEach(s => {
          const type = s.serviceType || 'Servicio General';
          if (!serviceIncomeBreakdown[type]) serviceIncomeBreakdown[type] = { income: 0, profit: 0, count: 0 };
          serviceIncomeBreakdown[type].income += s.totalCost;
          serviceIncomeBreakdown[type].profit += s.serviceProfit || 0;
          serviceIncomeBreakdown[type].count += 1;
        });

        const totalIncomeFromServices = servicesInRange.reduce((sum, s) => sum + s.totalCost, 0);
        const totalProfitFromServices = servicesInRange.reduce((sum, s) => sum + (s.serviceProfit || 0), 0);
        
        const totalOperationalIncome = totalIncomeFromSales + totalIncomeFromServices;
        const totalOperationalProfit = totalProfitFromSales + totalProfitFromServices;

        const totalCostOfGoods = salesInRange.reduce((cost, s) => cost + s.items.reduce((c, i) => c + ((allInventory.find(inv => inv.id === i.inventoryItemId)?.unitPrice || 0) * i.quantity), 0), 0) + servicesInRange.reduce((cost, s) => cost + (s.totalSuppliesWorkshopCost || 0), 0);
        
        const totalUnitsSold = salesInRange.reduce((sum, s) => sum + s.items.reduce((count, item) => count + item.quantity, 0), 0) + servicesInRange.reduce((sum, s) => sum + (s.serviceItems || []).flatMap(si => si.suppliesUsed || []).reduce((count, supply) => count + supply.quantity, 0), 0);

        const totalTechnicianSalaries = allTechnicians.filter(t => !t.isArchived).reduce((sum, tech) => sum + (tech.monthlySalary || 0), 0);
        const totalAdministrativeSalaries = allAdminStaff.filter(s => !s.isArchived).reduce((sum, staff) => sum + (staff.monthlySalary || 0), 0);
        const totalBaseSalaries = totalTechnicianSalaries + totalAdministrativeSalaries;
        const totalFixedExpenses = fixedExpenses.reduce((sum, expense) => sum + expense.amount, 0);
        const totalMonthlyExpenses = totalBaseSalaries + totalFixedExpenses;
        
        let totalTechnicianCommissions = 0;
        let totalAdministrativeCommissions = 0;
        const isProfitableForCommissions = totalOperationalProfit > totalMonthlyExpenses;
        
        if (isProfitableForCommissions) {
          allTechnicians.filter(t => !t.isArchived).forEach(tech => {
            totalTechnicianCommissions += servicesInRange.filter(s => s.technicianId === tech.id).reduce((sum, s) => sum + (s.serviceProfit || 0), 0) * (tech.commissionRate || 0);
          });
          
          allAdminStaff.filter(s => !s.isArchived).forEach(admin => {
            totalAdministrativeCommissions += totalProfitFromServices * (admin.commissionRate || 0);
          });
        }
        
        const totalExpenses = totalMonthlyExpenses + totalTechnicianCommissions + totalAdministrativeCommissions;
        const netProfit = totalOperationalProfit - totalExpenses;

        const dateLabel = dateRange.to && !isSameDay(dateRange.from, dateRange.to)
            ? `${format(from, "dd MMM", { locale: es })} - ${format(to, "dd MMM, yyyy", { locale: es })}`
            : format(from, "dd 'de' MMMM, yyyy", { locale: es });

        const totalInventoryValue = allInventory
            .filter(item => !item.isService)
            .reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

        return { 
            monthYearLabel: dateLabel, totalOperationalIncome, totalIncomeFromSales, totalIncomeFromServices, 
            totalProfitFromSales, totalProfitFromServices, totalCostOfGoods, totalOperationalProfit,
            totalSalaries: totalBaseSalaries, totalTechnicianSalaries, totalAdministrativeSalaries, 
            totalFixedExpenses, totalMonthlyExpenses, totalTechnicianCommissions, totalAdministrativeCommissions,
            totalExpenses, netProfit, isProfitableForCommissions, serviceIncomeBreakdown,
            totalInventoryValue, totalUnitsSold
        };
    }, [dateRange, isLoading, allSales, allServices, allInventory, allTechnicians, allAdminStaff, fixedExpenses]);

    const handleApplyDateFilter = () => {
        setDateRange(tempDateRange);
        setIsCalendarOpen(false);
    };

    const dateFilterComponent = (
        <div className="flex items-center gap-2 flex-wrap justify-start sm:justify-end">
            <Button variant="outline" size="sm" onClick={() => { setDateRange({ from: startOfDay(new Date()), to: endOfDay(new Date()) }); setTempDateRange({ from: startOfDay(new Date()), to: endOfDay(new Date()) }); }} className="bg-card">Hoy</Button>
            <Button variant="outline" size="sm" onClick={() => { const range = { from: startOfWeek(new Date(), { weekStartsOn: 1 }), to: endOfWeek(new Date(), { weekStartsOn: 1 }) }; setDateRange(range); setTempDateRange(range); }} className="bg-card">Esta Semana</Button>
            <Button variant="outline" size="sm" onClick={() => { const range = { from: startOfMonth(new Date()), to: endOfMonth(new Date()) }; setDateRange(range); setTempDateRange(range); }} className="bg-card">Este Mes</Button>
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                    <Button variant={"outline"} className={cn("w-full sm:w-[240px] justify-start text-left font-normal bg-card", !dateRange && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange?.from ? (dateRange.to ? (`${format(dateRange.from, "LLL dd, y", { locale: es })} - ${format(dateRange.to, "LLL dd, y", { locale: es })}`) : format(dateRange.from, "LLL dd, y", { locale: es })) : (<span>Seleccione rango</span>)}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                    <Calendar initialFocus mode="range" defaultMonth={tempDateRange?.from} selected={tempDateRange} onSelect={setTempDateRange} numberOfMonths={2} locale={es} showOutsideDays={false}/>
                    <div className="p-2 border-t flex justify-end">
                        <Button size="sm" onClick={handleApplyDateFilter}>Aceptar</Button>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );

    if (isLoading) { return <div className="flex h-64 justify-center items-center"><Loader2 className="h-8 w-8 animate-spin" /></div>; }
    
    return (
        <>
            <div className="bg-primary text-primary-foreground rounded-lg p-6 mb-6">
                <h1 className="text-3xl font-bold tracking-tight">Finanzas</h1>
                <p className="text-primary-foreground/80 mt-1">Analiza el rendimiento y las operaciones de tu taller.</p>
            </div>
            
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="resumen" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Resumen Financiero</TabsTrigger>
                    <TabsTrigger value="reporte-operaciones" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Reporte de Operaciones</TabsTrigger>
                </TabsList>
                
                 <TabsContent value="resumen" className="mt-0">
                    <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">{dateFilterComponent}</div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <Card className="lg:col-span-2">
                        <CardHeader><CardTitle className="text-xl flex items-center gap-2"><DollarSign className="h-6 w-6 text-primary" />Estado de Resultados</CardTitle><CardDescription>Resumen de pérdidas y ganancias para el periodo: {financialSummary.monthYearLabel}</CardDescription></CardHeader>
                        <CardContent className="space-y-4 text-base">
                            <div className="space-y-2"><div className="flex justify-between items-center"><span className="text-muted-foreground">Ingresos Operativos Totales:</span><span className="font-semibold text-lg">{formatCurrency(financialSummary.totalOperationalIncome)}</span></div><div className="flex justify-between items-center"><span className="text-muted-foreground">(-) Costo Total de Insumos:</span><span className="font-semibold text-lg text-orange-500">-{formatCurrency(financialSummary.totalCostOfGoods)}</span></div><hr className="my-2 border-dashed"/><div className="flex justify-between items-center font-bold text-xl pt-1"><span className="text-foreground">(=) Ganancia Bruta Operativa:</span><span className="text-xl text-green-600">{formatCurrency(financialSummary.totalOperationalProfit)}</span></div></div>
                            <hr className="my-4 border-border"/>
                            <div className="space-y-2"><div className="flex justify-between items-center"><span className="text-muted-foreground">(-) Gastos Mensuales Fijos:</span><span className="font-semibold text-lg text-red-500">-{formatCurrency(financialSummary.totalMonthlyExpenses)}</span></div><div className="flex justify-between items-center"><span className="text-muted-foreground">(-) Comisiones Variables:</span><span className="font-semibold text-lg text-red-500">-{formatCurrency(financialSummary.totalTechnicianCommissions + financialSummary.totalAdministrativeCommissions)}</span></div>{!financialSummary.isProfitableForCommissions && (<p className="text-xs text-right text-muted-foreground pt-1">Las comisiones no se aplican porque la ganancia no cubrió los gastos fijos.</p>)}<hr className="my-2 border-dashed"/><div className="flex justify-between items-center font-bold text-2xl pt-1"><span className="text-foreground">(=) Resultado Neto del Periodo:</span><span className={cn("text-2xl", financialSummary.netProfit >= 0 ? "text-green-600" : "text-red-600")}>{formatCurrency(financialSummary.netProfit)}</span></div></div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader><CardTitle className="text-xl flex items-center gap-2"><TrendingUp className="h-6 w-6 text-green-500" />Ingresos y Ganancia Bruta</CardTitle><CardDescription>Detalle de operaciones en el periodo</CardDescription></CardHeader>
                        <CardContent className="space-y-4 text-base">
                            <div className="grid grid-cols-4 gap-4 font-semibold text-sm text-muted-foreground border-b pb-2">
                                <div className="col-span-1">Categoría</div>
                                <div className="col-span-1 text-right">Operaciones</div>
                                <div className="col-span-1 text-right">Ingresos</div>
                                <div className="col-span-1 text-right">Ganancia</div>
                            </div>
                            <div className="space-y-3 text-sm">
                                {Object.entries(financialSummary.serviceIncomeBreakdown).map(([type, data]) => (
                                    <div key={type} className="grid grid-cols-4 gap-4 items-center">
                                        <div className="col-span-1 font-semibold">{type}</div>
                                        <div className="col-span-1 text-right font-medium">{data.count}</div>
                                        <div className="col-span-1 text-right font-medium">{formatCurrency(data.income)}</div>
                                        <div className="col-span-1 text-right font-medium text-green-600">{formatCurrency(data.profit)}</div>
                                    </div>
                                ))}
                            </div>
                            <div className="grid grid-cols-4 gap-4 items-center font-bold text-base pt-4 border-t mt-4">
                                <div className="col-span-2 text-right">Total Ingresos Brutos:</div>
                                <div className="col-span-1 text-right text-lg">{formatCurrency(financialSummary.totalOperationalIncome)}</div>
                                <div className="col-span-1 text-right text-lg text-green-600">{formatCurrency(financialSummary.totalOperationalProfit)}</div>
                            </div>
                        </CardContent>
                      </Card>
                      <Card>
                          <CardHeader><div className="flex items-center justify-between"><CardTitle className="text-xl flex items-center gap-2"><TrendingDown className="h-6 w-6 text-red-500" />Egresos Fijos y Variables</CardTitle><Button variant="outline" size="sm" onClick={() => setIsExpensesDialogOpen(true)}><Pencil className="mr-2 h-4 w-4" />Editar Gastos Fijos</Button></div><CardDescription>Detalle de gastos fijos y variables del periodo.</CardDescription></CardHeader>
                          <CardContent className="space-y-3 text-base">
                              <h3 className="font-semibold text-lg">Nómina y Comisiones</h3>
                              <div className="flex justify-between items-center"><span className="text-muted-foreground">Sueldos Base (Técnicos):</span><span className="font-semibold">{formatCurrency(financialSummary.totalTechnicianSalaries)}</span></div>
                              <div className="flex justify-between items-center"><span className="text-muted-foreground">Sueldos Base (Admin.):</span><span className="font-semibold">{formatCurrency(financialSummary.totalAdministrativeSalaries)}</span></div>
                              <div className="flex justify-between items-center"><span className="text-muted-foreground flex items-center gap-1"><BadgeCent className="h-4 w-4"/>Comisiones (Técnicos):</span><span className="font-semibold">{formatCurrency(financialSummary.totalTechnicianCommissions)}</span></div>
                              <div className="flex justify-between items-center"><span className="text-muted-foreground flex items-center gap-1"><BadgeCent className="h-4 w-4"/>Comisiones (Admin.):</span><span className="font-semibold">{formatCurrency(financialSummary.totalAdministrativeCommissions)}</span></div>
                              <hr className="my-2 border-dashed"/>
                              <div className="flex justify-between font-bold"><span className="text-foreground">Total Nómina y Comisiones:</span><span className="text-red-600">{formatCurrency(financialSummary.totalSalaries + financialSummary.totalTechnicianCommissions + financialSummary.totalAdministrativeCommissions)}</span></div>
                              
                              <h3 className="font-semibold text-lg pt-4">Servicios y Gastos Fijos</h3>
                              {fixedExpenses.length > 0 ? (fixedExpenses.map(expense => (<div key={expense.id} className="flex justify-between items-center"><span className="text-muted-foreground">{expense.name}:</span><span className="font-semibold">{formatCurrency(expense.amount)}</span></div>))) : (<p className="text-sm text-muted-foreground text-center">No hay gastos fijos registrados.</p>)}
                              <hr className="my-2 border-dashed"/>
                              <div className="flex justify-between font-bold"><span className="text-foreground">Total Gastos Fijos:</span><span className="text-red-600">{formatCurrency(financialSummary.totalFixedExpenses)}</span></div>
                          </CardContent>
                      </Card>

                      <Card className="lg:col-span-2">
                        <CardHeader>
                            <CardTitle className="text-xl flex items-center gap-2"><PackageIcon className="h-6 w-6 text-primary" />Resumen de Inventario</CardTitle>
                            <CardDescription>Estado y movimiento del inventario en el período seleccionado.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                            <div className="p-4 bg-muted/50 rounded-lg">
                                <p className="text-sm font-medium text-muted-foreground">Valor Actual del Inventario</p>
                                <p className="text-2xl font-bold">{formatCurrency(financialSummary.totalInventoryValue)}</p>
                                <p className="text-xs text-muted-foreground">(A precio de costo)</p>
                            </div>
                            <div className="p-4 bg-muted/50 rounded-lg">
                                <p className="text-sm font-medium text-muted-foreground">Costo de Insumos Utilizados</p>
                                <p className="text-2xl font-bold text-orange-600">{formatCurrency(financialSummary.totalCostOfGoods)}</p>
                                <p className="text-xs text-muted-foreground">(En el período seleccionado)</p>
                            </div>
                            <div className="p-4 bg-muted/50 rounded-lg">
                                <p className="text-sm font-medium text-muted-foreground">Unidades Vendidas/Utilizadas</p>
                                <p className="text-2xl font-bold">{financialSummary.totalUnitsSold.toLocaleString('es-MX')}</p>
                                <p className="text-xs text-muted-foreground">(En el período seleccionado)</p>
                            </div>
                        </CardContent>
                    </Card>

                    </div>
                </TabsContent>
                
                <TabsContent value="reporte-operaciones" className="mt-0">
                    <ReporteOperacionesContent
                        allSales={allSales}
                        allServices={allServices}
                        allInventory={allInventory}
                        serviceTypes={serviceTypes}
                    />
                </TabsContent>

            </Tabs>
            
            <FixedExpensesDialog
                open={isExpensesDialogOpen}
                onOpenChange={setIsExpensesDialogOpen}
                initialExpenses={fixedExpenses}
                onExpensesUpdated={(updated) => { setFixedExpenses([...updated]); }}
            />
        </>
    );
}

export default function FinanzasPageWrapper() {
    return (
        <Suspense fallback={<div className="flex h-64 justify-center items-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <FinanzasPageComponent />
        </Suspense>
    );
}

