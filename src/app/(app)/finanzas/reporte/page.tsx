
"use client";

import { useState, useMemo, useEffect, useCallback, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
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
  hydrateReady,
} from "@/lib/placeholder-data";
import type { MonthlyFixedExpense, InventoryItem, FinancialOperation, AggregatedInventoryItem } from "@/types";
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
  startOfDay, endOfDay, startOfWeek, endOfWeek, compareDesc
} from "date-fns";
import { es } from 'date-fns/locale';
import { CalendarIcon, ChevronLeft, ChevronRight, DollarSign, TrendingUp, TrendingDown, Landmark, Users, Info, Pencil, BadgeCent, Filter, ListFilter, Search } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { FixedExpensesDialog } from "../components/fixed-expenses-dialog"; 
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { DateRange } from "react-day-picker";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type OperationTypeFilter = "all" | "Venta" | "Servicio" | "C. Aceite" | "Pintura";

function ReportesPageComponent() {
    const searchParams = useSearchParams();
    const defaultTab = searchParams.get('tab') || 'resumen';
    const [activeTab, setActiveTab] = useState(defaultTab);
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
    const [hydrated, setHydrated] = useState(false);
    const [version, setVersion] = useState(0);

    // State for Resumen Financiero
    const [currentFixedExpenses, setCurrentFixedExpenses] = useState<MonthlyFixedExpense[]>(placeholderFixedMonthlyExpenses);
    const [isExpensesDialogOpen, setIsExpensesDialogOpen] = useState(false);
    
    // State for Reporte de Operaciones
    const [reporteOpSearchTerm, setReporteOpSearchTerm] = useState("");
    const [reporteOpTypeFilter, setReporteOpTypeFilter] = useState<OperationTypeFilter>("all");

    // State for Reporte de Inventario
    const [reporteInvSearchTerm, setReporteInvSearchTerm] = useState("");

    useEffect(() => {
        hydrateReady.then(() => setHydrated(true));
        const forceUpdate = () => setVersion(v => v + 1);
        window.addEventListener('databaseUpdated', forceUpdate);
        
        // Set default date range to current month
        const now = new Date();
        setDateRange({ from: startOfMonth(now), to: endOfMonth(now) });

        return () => window.removeEventListener('databaseUpdated', forceUpdate);
    }, []);

    const financialSummary = useMemo(() => {
        if (!dateRange?.from) {
          return { monthYearLabel: "Cargando...", totalOperationalIncome: 0, totalIncomeFromSales: 0, totalIncomeFromServices: 0, totalProfitFromSales: 0, totalProfitFromServices: 0, totalCostOfGoods: 0, totalOperationalProfit: 0, totalSalaries: 0, totalTechnicianSalaries: 0, totalAdministrativeSalaries: 0, fixedExpenses: [], totalFixedExpenses: 0, totalTechnicianCommissions: 0, totalAdministrativeCommissions: 0, totalExpenses: 0, netProfit: 0, isProfitableForCommissions: false };
        }
        
        const reportDate = dateRange.from;
        const currentMonthStart = startOfMonth(reportDate);
        const currentMonthEnd = endOfMonth(reportDate);

        const salesThisMonth = placeholderSales.filter(sale => isValid(parseISO(sale.saleDate)) && isWithinInterval(parseISO(sale.saleDate), { start: currentMonthStart, end: currentMonthEnd }));
        const servicesThisMonth = placeholderServiceRecords.filter(service => service.serviceDate && isValid(parseISO(service.serviceDate)) && isWithinInterval(parseISO(service.serviceDate), { start: currentMonthStart, end: currentMonthEnd }));
        const completedServicesThisMonth = servicesThisMonth.filter(s => s.status === 'Completado');
        const totalIncomeFromSales = salesThisMonth.reduce((sum, sale) => sum + sale.totalAmount, 0);
        const totalIncomeFromServices = completedServicesThisMonth.reduce((sum, service) => sum + service.totalCost, 0);
        const totalOperationalIncome = totalIncomeFromSales + totalIncomeFromServices;
        const totalCostOfGoodsFromSales = salesThisMonth.reduce((totalCost, sale) => totalCost + sale.items.reduce((cost, saleItem) => cost + ((placeholderInventory.find(inv => inv.id === saleItem.inventoryItemId)?.unitPrice || 0) * saleItem.quantity), 0), 0);
        const totalCostOfGoodsFromServices = completedServicesThisMonth.reduce((sum, service) => sum + (service.totalSuppliesCost || 0), 0);
        const totalCostOfGoods = totalCostOfGoodsFromSales + totalCostOfGoodsFromServices;
        const totalProfitFromSales = salesThisMonth.reduce((sum, sale) => sum + calculateSaleProfit(sale, placeholderInventory), 0);
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
          placeholderTechnicians.forEach(tech => { totalTechnicianCommissionsMonth += completedServicesThisMonth.filter(s => s.technicianId === tech.id).reduce((sum, s) => sum + (s.serviceProfit || 0), 0) * (tech.commissionRate || 0); });
          const totalProfitFromAllCompletedServicesInMonth = completedServicesThisMonth.reduce((sum, s) => sum + (s.serviceProfit || 0), 0);
          placeholderAdministrativeStaff.forEach(adminStaff => { totalAdministrativeCommissionsMonth += totalProfitFromAllCompletedServicesInMonth * (adminStaff.commissionRate || 0); });
        }
        const totalExpenses = totalBaseSalaries + totalFixedExpensesFromState + totalTechnicianCommissionsMonth + totalAdministrativeCommissionsMonth;
        const netProfit = totalOperationalProfit - totalExpenses;

        return { monthYearLabel: format(reportDate, "MMMM yyyy", { locale: es }), totalOperationalIncome, totalIncomeFromSales, totalIncomeFromServices, totalProfitFromSales, totalProfitFromServices, totalCostOfGoods, totalOperationalProfit, totalSalaries: totalBaseSalaries, totalTechnicianSalaries, totalAdministrativeSalaries, fixedExpenses: currentFixedExpenses, totalFixedExpenses: totalFixedExpensesFromState, totalTechnicianCommissions: totalTechnicianCommissionsMonth, totalAdministrativeCommissions: totalAdministrativeCommissionsMonth, totalExpenses, netProfit, isProfitableForCommissions: isWorkshopProfitableAfterFixedCosts };
    }, [dateRange, currentFixedExpenses, version]);
    
    const combinedOperations = useMemo((): FinancialOperation[] => {
        if (!hydrated) return [];
        const saleOperations: FinancialOperation[] = placeholderSales.filter(s => s.status !== 'Cancelado').map(sale => ({ id: sale.id, date: sale.saleDate, type: 'Venta', description: sale.items.map(i => i.itemName).join(', '), totalAmount: sale.totalAmount, profit: calculateSaleProfit(sale, placeholderInventory), originalObject: sale }));
        const serviceOperations: FinancialOperation[] = placeholderServiceRecords.filter(s => s.status === 'Completado').map(service => ({ id: service.id, date: service.deliveryDateTime || service.serviceDate, type: service.serviceType || 'Servicio', description: service.description || (service.serviceItems || []).map(i => i.name).join(', '), totalAmount: service.totalCost, profit: service.serviceProfit || 0, originalObject: service }));
        return [...saleOperations, ...serviceOperations];
    }, [hydrated, version]);
    
    const filteredAndSortedOperations = useMemo(() => {
        if (!hydrated || !dateRange?.from) return [];
        const from = startOfDay(dateRange.from);
        const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);
        let list = combinedOperations.filter(op => op.date && isValid(parseISO(op.date)) && isWithinInterval(parseISO(op.date), { start: from, end: to }));
        if (reporteOpTypeFilter !== 'all') { /* ... filtering logic ... */ }
        if (reporteOpSearchTerm) { list = list.filter(op => op.id.toLowerCase().includes(reporteOpSearchTerm.toLowerCase()) || op.description.toLowerCase().includes(reporteOpSearchTerm.toLowerCase())); }
        list.sort((a,b) => compareDesc(parseISO(a.date!), parseISO(b.date!)));
        return list;
    }, [combinedOperations, dateRange, reporteOpSearchTerm, reporteOpTypeFilter, hydrated]);

    const aggregatedInventory = useMemo((): AggregatedInventoryItem[] => {
        if (!hydrated || !dateRange?.from) return [];
        const from = startOfDay(dateRange.from);
        const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);
        const allItemsSold = new Map<string, AggregatedInventoryItem>();
        const processItem = (itemId: string, name: string, sku: string, quantity: number, revenue: number) => {
            const existing = allItemsSold.get(itemId);
            if (existing) { existing.totalQuantity += quantity; existing.totalRevenue += revenue; }
            else { allItemsSold.set(itemId, { itemId, name, sku, totalQuantity: quantity, totalRevenue: revenue }); }
        };
        placeholderSales.forEach(sale => { if (sale.status !== 'Cancelado' && isValid(parseISO(sale.saleDate)) && isWithinInterval(parseISO(sale.saleDate), { start: from, end: to })) { sale.items.forEach(item => { const invItem = placeholderInventory.find(i => i.id === item.inventoryItemId); if (invItem && !invItem.isService) { processItem(invItem.id, invItem.name, invItem.sku, item.quantity, item.totalPrice); } }); } });
        placeholderServiceRecords.forEach(service => { if (service.status === 'Completado' && service.deliveryDateTime && isValid(parseISO(service.deliveryDateTime)) && isWithinInterval(parseISO(service.deliveryDateTime), { start: from, end: to })) { (service.serviceItems || []).forEach(sItem => { (sItem.suppliesUsed || []).forEach(supply => { const invItem = placeholderInventory.find(i => i.id === supply.supplyId); if(invItem && !invItem.isService){ processItem(invItem.id, invItem.name, invItem.sku, supply.quantity, supply.sellingPrice ? supply.sellingPrice * supply.quantity : 0); } }); }); } });
        return Array.from(allItemsSold.values());
    }, [dateRange, hydrated, version]);

    const filteredAndSortedInventory = useMemo(() => {
        let list = [...aggregatedInventory];
        if (reporteInvSearchTerm) { list = list.filter(item => item.name.toLowerCase().includes(reporteInvSearchTerm.toLowerCase()) || item.sku.toLowerCase().includes(reporteInvSearchTerm.toLowerCase())); }
        list.sort((a, b) => b.totalQuantity - a.totalQuantity);
        return list;
    }, [aggregatedInventory, reporteInvSearchTerm]);


    if (!hydrated) { return <div className="text-center py-10">Cargando reportes...</div>; }
    
    return (
        <div className="container mx-auto py-8">
            <PageHeader title="Reportes" description="Analiza el rendimiento de tu negocio con reportes detallados." />
             <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="font-semibold text-lg">Filtrar por Fecha</p>
                <div className="flex items-center gap-2 flex-wrap justify-start sm:justify-end">
                    <Button variant="outline" size="sm" onClick={() => setDateRange({ from: startOfDay(new Date()), to: endOfDay(new Date()) })}>Hoy</Button>
                    <Button variant="outline" size="sm" onClick={() => setDateRange({ from: startOfWeek(new Date(), { weekStartsOn: 1 }), to: endOfWeek(new Date(), { weekStartsOn: 1 }) })}>Esta Semana</Button>
                    <Button variant="outline" size="sm" onClick={() => setDateRange({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) })}>Este Mes</Button>
                    <Popover><PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full sm:w-[240px] justify-start text-left font-normal", !dateRange && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{dateRange?.from ? (dateRange.to ? (`${format(dateRange.from, "LLL dd, y", { locale: es })} - ${format(dateRange.to, "LLL dd, y", { locale: es })}`) : format(dateRange.from, "LLL dd, y", { locale: es })) : (<span>Seleccione rango</span>)}</Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="end"><Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2} locale={es} /></PopoverContent></Popover>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="resumen">Resumen Financiero</TabsTrigger>
                    <TabsTrigger value="operaciones">Reporte de Operaciones</TabsTrigger>
                    <TabsTrigger value="inventario">Reporte de Inventario</TabsTrigger>
                </TabsList>

                <TabsContent value="resumen" className="mt-6">
                    {/* Contenido de Resumen Financiero */}
                    <Card className="mb-8 bg-card shadow-lg"><CardHeader><CardTitle className="text-xl flex items-center gap-2"><DollarSign className="h-6 w-6 text-primary" />Resumen General del Mes</CardTitle><CardDescription>Cálculo de la ganancia neta para {financialSummary.monthYearLabel}</CardDescription></CardHeader><CardContent className="space-y-3 text-base"><div className="flex justify-between items-center"><span className="text-muted-foreground">Ingresos Operativos Totales:</span><span className="font-semibold text-lg text-green-600">{formatCurrency(financialSummary.totalOperationalIncome)}</span></div><div className="flex justify-between items-center"><span className="text-muted-foreground">(-) Costo Total de Insumos:</span><span className="font-semibold text-lg text-orange-500">-{formatCurrency(financialSummary.totalCostOfGoods)}</span></div><hr className="my-1 border-dashed"/><div className="flex justify-between items-center font-medium"><span className="text-foreground">(=) Ganancia Bruta Operativa:</span><span className="font-semibold text-lg">{formatCurrency(financialSummary.totalOperationalProfit)}</span></div><div className="flex justify-between items-center"><span className="text-muted-foreground">(-) Gastos Totales:</span><span className="font-semibold text-lg text-red-600">-{formatCurrency(financialSummary.totalExpenses)}</span></div><hr className="my-2 border-primary/30"/><div className="flex justify-between font-bold text-xl pt-2"><span>(=) Resultado Neto del Mes:</span><span className={financialSummary.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}>{formatCurrency(financialSummary.netProfit)}</span></div></CardContent></Card>
                    <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
                        <Card><CardHeader><CardTitle className="text-xl flex items-center gap-2"><TrendingUp className="h-6 w-6 text-green-500" />Ingresos y Ganancia Bruta</CardTitle><CardDescription>Operaciones de {financialSummary.monthYearLabel}</CardDescription></CardHeader><CardContent className="space-y-3 text-base"><div className="flex justify-between items-center"><span className="text-muted-foreground">Ingreso por Ventas (POS):</span><span className="font-semibold">{formatCurrency(financialSummary.totalIncomeFromSales)}</span></div><div className="flex justify-between items-center"><span className="text-muted-foreground">Ingreso por Servicios:</span><span className="font-semibold">{formatCurrency(financialSummary.totalIncomeFromServices)}</span></div><hr className="my-1 border-dashed"/><div className="flex justify-between items-center"><span className="text-muted-foreground">Ganancia por Ventas:</span><span className="font-semibold text-green-600">{formatCurrency(financialSummary.totalProfitFromSales)}</span></div><div className="flex justify-between items-center"><span className="text-muted-foreground">Ganancia por Servicios:</span><span className="font-semibold text-green-600">{formatCurrency(financialSummary.totalProfitFromServices)}</span></div><hr className="my-1 border-border/50"/><div className="flex justify-between items-center"><span className="text-foreground font-medium">Ganancia Bruta Operativa:</span><span className="font-semibold text-lg text-green-600">{formatCurrency(financialSummary.totalOperationalProfit)}</span></div></CardContent></Card>
                        <Card><CardHeader><div className="flex items-center justify-between"><CardTitle className="text-xl flex items-center gap-2"><TrendingDown className="h-6 w-6 text-red-500" />Gastos, Sueldos y Comisiones</CardTitle><Button variant="outline" size="sm" onClick={() => setIsExpensesDialogOpen(true)}><Pencil className="mr-2 h-4 w-4" />Editar</Button></div><CardDescription>Costos operativos de {financialSummary.monthYearLabel}</CardDescription></CardHeader><CardContent className="space-y-3 text-base"><div className="flex justify-between items-center"><span className="text-muted-foreground flex items-center gap-1"><Users className="h-4 w-4"/>Sueldos Base (Técnicos):</span><span className="font-semibold">{formatCurrency(financialSummary.totalTechnicianSalaries)}</span></div><div className="flex justify-between items-center"><span className="text-muted-foreground flex items-center gap-1"><Users className="h-4 w-4"/>Sueldos Base (Admin.):</span><span className="font-semibold">{formatCurrency(financialSummary.totalAdministrativeSalaries)}</span></div>{financialSummary.fixedExpenses.map(expense => (<div key={expense.id} className="flex justify-between items-center"><span className="text-muted-foreground flex items-center gap-1"><Landmark className="h-4 w-4"/>{expense.name}:</span><span className="font-semibold">{formatCurrency(expense.amount)}</span></div>))}<hr className="my-1 border-border/50"/><div className="flex justify-between items-center"><span className="text-muted-foreground flex items-center gap-1"><BadgeCent className="h-4 w-4"/>Comisiones (Técnicos):</span><span className="font-semibold">{formatCurrency(financialSummary.totalTechnicianCommissions)}</span></div><div className="flex justify-between items-center"><span className="text-muted-foreground flex items-center gap-1"><BadgeCent className="h-4 w-4"/>Comisiones (Admin.):</span><span className="font-semibold">{formatCurrency(financialSummary.totalAdministrativeCommissions)}</span></div><hr className="my-2 border-border/70"/><div className="flex justify-between font-bold text-lg"><span>Total de Gastos:</span><span className="text-red-600">{formatCurrency(financialSummary.totalExpenses)}</span></div></CardContent></Card>
                    </div>
                </TabsContent>

                <TabsContent value="operaciones" className="mt-6">
                    <Card><CardHeader><CardTitle>Detalle de Operaciones</CardTitle><CardDescription>Ventas y servicios completados en el período seleccionado.</CardDescription></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Tipo</TableHead><TableHead>ID</TableHead><TableHead>Descripción</TableHead><TableHead className="text-right">Monto</TableHead><TableHead className="text-right">Ganancia</TableHead></TableRow></TableHeader><TableBody>{filteredAndSortedOperations.map(op => (<TableRow key={`${op.type}-${op.id}`}><TableCell>{op.date ? format(parseISO(op.date), "dd MMM yy, HH:mm", { locale: es }) : 'N/A'}</TableCell><TableCell>{op.type}</TableCell><TableCell>{op.id}</TableCell><TableCell className="max-w-xs truncate">{op.description}</TableCell><TableCell className="text-right">{formatCurrency(op.totalAmount)}</TableCell><TableCell className="text-right">{formatCurrency(op.profit)}</TableCell></TableRow>))}</TableBody></Table></CardContent></Card>
                </TabsContent>

                <TabsContent value="inventario" className="mt-6">
                    <Card><CardHeader><CardTitle>Detalle de Salidas de Inventario</CardTitle><CardDescription>Productos vendidos o utilizados en servicios durante el período.</CardDescription></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>SKU</TableHead><TableHead>Producto</TableHead><TableHead className="text-right">Unidades</TableHead><TableHead className="text-right">Ingreso Generado</TableHead></TableRow></TableHeader><TableBody>{filteredAndSortedInventory.map(item => (<TableRow key={item.itemId}><TableCell>{item.sku}</TableCell><TableCell>{item.name}</TableCell><TableCell className="text-right">{item.totalQuantity}</TableCell><TableCell className="text-right">{formatCurrency(item.totalRevenue)}</TableCell></TableRow>))}</TableBody></Table></CardContent></Card>
                </TabsContent>
            </Tabs>
            
            <FixedExpensesDialog
                open={isExpensesDialogOpen}
                onOpenChange={setIsExpensesDialogOpen}
                onExpensesUpdated={(updated) => { setCurrentFixedExpenses([...updated]); setVersion(v => v + 1); }}
            />
        </div>
    );
}

export default function ReportesPageWrapper() {
    return (
        <Suspense fallback={<div>Cargando...</div>}>
            <ReportesPageComponent />
        </Suspense>
    );
}
