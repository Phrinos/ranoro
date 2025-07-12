
"use client";

import { useState, useMemo, useEffect, useCallback, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
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
  placeholderServiceTypes,
  calculateSaleProfit,
  hydrateReady,
} from "@/lib/placeholder-data";
import type { MonthlyFixedExpense, InventoryItem, FinancialOperation, AggregatedInventoryItem, PaymentMethod, ServiceTypeRecord, SaleReceipt, ServiceRecord } from "@/types";
import {
  format,
  parseISO,
  isWithinInterval,
  isValid,
  startOfDay, endOfDay, startOfWeek, endOfWeek, isSameDay, startOfMonth, endOfMonth, compareDesc, compareAsc
} from "date-fns";
import { es } from 'date-fns/locale';
import { CalendarIcon, DollarSign, TrendingUp, TrendingDown, Landmark, Users, Pencil, BadgeCent, Search, LineChart, PackageSearch, ListFilter, Filter } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { FixedExpensesDialog } from "../components/fixed-expenses-dialog"; 
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { DateRange } from "react-day-picker";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { operationsService, inventoryService } from '@/lib/services';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type OperationTypeFilter = "all" | string;

function ResumenFinancieroPageComponent() {
    const searchParams = useSearchParams();
    const defaultTab = searchParams.get('tab') || 'resumen';
    
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState(defaultTab);
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
    const [hydrated, setHydrated] = useState(false);
    const [version, setVersion] = useState(0);

    const [currentFixedExpenses, setCurrentFixedExpenses] = useState<MonthlyFixedExpense[]>(placeholderFixedMonthlyExpenses);
    const [isExpensesDialogOpen, setIsExpensesDialogOpen] = useState(false);
    
    // States for reportes
    const [isLoading, setIsLoading] = useState(true);
    const [allSales, setAllSales] = useState<SaleReceipt[]>([]);
    const [allServices, setAllServices] = useState<ServiceRecord[]>([]);
    const [allInventory, setAllInventory] = useState<InventoryItem[]>([]);
    const [serviceTypes, setServiceTypes] = useState<ServiceTypeRecord[]>([]);

    const [reporteOpSearchTerm, setReporteOpSearchTerm] = useState("");
    const [reporteOpTypeFilter, setReporteOpTypeFilter] = useState<OperationTypeFilter>("all");
    const [reporteOpSortOption, setReporteOpSortOption] = useState<string>("date_desc");
    const [reporteOpPaymentMethodFilter, setReporteOpPaymentMethodFilter] = useState<PaymentMethod | 'all'>("all");
    
    const [reporteInvSearchTerm, setReporteInvSearchTerm] = useState("");
    const [reporteInvSortOption, setReporteInvSortOption] = useState<string>("quantity_desc");


    useEffect(() => {
        hydrateReady.then(() => setHydrated(true));
        const forceUpdate = () => setVersion(v => v + 1);
        window.addEventListener('databaseUpdated', forceUpdate);
        
        const now = new Date();
        setDateRange({ from: startOfMonth(now), to: endOfMonth(now) });

        return () => window.removeEventListener('databaseUpdated', forceUpdate);
    }, []);

    useEffect(() => {
        const unsubs: (() => void)[] = [];
        setIsLoading(true);

        unsubs.push(operationsService.onSalesUpdate(setAllSales));
        unsubs.push(operationsService.onServicesUpdate(setAllServices));
        unsubs.push(inventoryService.onItemsUpdate(setAllInventory));
        unsubs.push(inventoryService.onServiceTypesUpdate((data) => {
            setServiceTypes(data);
            setIsLoading(false);
        }));

        return () => unsubs.forEach(unsub => unsub());
    }, []);

    const financialSummary = useMemo(() => {
        const emptyState = { 
            monthYearLabel: "Cargando...", totalOperationalIncome: 0, totalIncomeFromSales: 0, totalIncomeFromServices: 0,
            totalIncomeFromServiciosGenerales: 0, totalIncomeFromCambioAceite: 0, totalIncomeFromPintura: 0,
            totalProfitFromSales: 0, totalProfitFromServices: 0, totalProfitFromServiciosGenerales: 0, totalProfitFromCambioAceite: 0, totalProfitFromPintura: 0,
            totalCostOfGoods: 0, totalOperationalProfit: 0, totalSalaries: 0, totalTechnicianSalaries: 0, totalAdministrativeSalaries: 0, 
            fixedExpenses: [], totalFixedExpenses: 0, totalMonthlyExpenses: 0, totalTechnicianCommissions: 0, totalAdministrativeCommissions: 0, 
            totalExpenses: 0, netProfit: 0, isProfitableForCommissions: false 
        };

        if (!dateRange?.from) return emptyState;
        
        const from = startOfDay(dateRange.from);
        const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);
        
        const salesInRange = placeholderSales.filter(sale => sale.status !== 'Cancelado' && isValid(parseISO(sale.saleDate)) && isWithinInterval(parseISO(sale.saleDate), { start: from, end: to }));
        const completedServicesInRange = placeholderServiceRecords.filter(s => s.status === 'Completado' && s.deliveryDateTime && isValid(parseISO(s.deliveryDateTime)) && isWithinInterval(parseISO(s.deliveryDateTime), { start: from, end: to }));

        const totalIncomeFromSales = salesInRange.reduce((sum, sale) => sum + sale.totalAmount, 0);
        const totalProfitFromSales = salesInRange.reduce((sum, sale) => sum + calculateSaleProfit(sale, placeholderInventory), 0);
        
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
            monthYearLabel: dateLabel, totalOperationalIncome, totalIncomeFromSales, totalIncomeFromServices, 
            totalIncomeFromServiciosGenerales, totalIncomeFromCambioAceite, totalIncomeFromPintura,
            totalProfitFromSales, totalProfitFromServices, totalProfitFromServiciosGenerales, totalProfitFromCambioAceite, totalProfitFromPintura,
            totalCostOfGoods, totalOperationalProfit, totalSalaries: totalBaseSalaries, totalTechnicianSalaries, totalAdministrativeSalaries, 
            fixedExpenses: currentFixedExpenses, totalFixedExpenses: totalFixedExpensesFromState, totalMonthlyExpenses,
            totalTechnicianCommissions, totalAdministrativeCommissions, totalExpenses, netProfit, isProfitableForCommissions
        };
    }, [dateRange, currentFixedExpenses, version, hydrated]);
    
    // --- Reportes Logic ---
    const combinedOperations = useMemo((): FinancialOperation[] => {
        if (isLoading) return [];
        const saleOperations: FinancialOperation[] = allSales.filter(s => s.status !== 'Cancelado').map(sale => ({ id: sale.id, date: sale.saleDate, type: 'Venta', description: sale.items.map(i => i.itemName).join(', '), totalAmount: sale.totalAmount, profit: 0, originalObject: sale }));
        const serviceOperations: FinancialOperation[] = allServices.filter(s => s.status === 'Completado').map(service => ({ id: service.id, date: service.deliveryDateTime || service.serviceDate, type: service.serviceType || 'Servicio General', description: service.description || (service.serviceItems || []).map(i => i.name).join(', '), totalAmount: service.totalCost, profit: service.serviceProfit || 0, originalObject: service }));
        return [...saleOperations, ...serviceOperations];
    }, [isLoading, allSales, allServices]);
    
    const filteredAndSortedOperations = useMemo(() => {
        if (isLoading || !dateRange?.from) return [];
        const from = startOfDay(dateRange.from);
        const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);
        let list = combinedOperations.filter(op => op.date && isValid(parseISO(op.date)) && isWithinInterval(parseISO(op.date), { start: from, end: to }));
        
        if (reporteOpTypeFilter !== 'all') { list = list.filter(op => op.type === reporteOpTypeFilter); }
        if (reporteOpPaymentMethodFilter !== 'all') { list = list.filter(op => { const opPaymentMethod = (op.originalObject as SaleReceipt | ServiceRecord).paymentMethod; return (opPaymentMethod || 'Efectivo') === reporteOpPaymentMethodFilter; }); }
        if (reporteOpSearchTerm) { list = list.filter(op => op.id.toLowerCase().includes(reporteOpSearchTerm.toLowerCase()) || op.description.toLowerCase().includes(reporteOpSearchTerm.toLowerCase())); }
        
        list.sort((a,b) => {
            switch (reporteOpSortOption) {
                case 'date_asc': return compareAsc(parseISO(a.date!), parseISO(b.date!));
                case 'amount_desc': return b.totalAmount - a.totalAmount;
                case 'amount_asc': return a.totalAmount - b.totalAmount;
                case 'profit_desc': return b.profit - a.profit;
                case 'profit_asc': return a.profit - b.profit;
                case 'date_desc': default: return compareDesc(parseISO(a.date!), parseISO(b.date!));
            }
        });
        return list;
    }, [combinedOperations, dateRange, reporteOpSearchTerm, reporteOpTypeFilter, reporteOpPaymentMethodFilter, isLoading, reporteOpSortOption]);

    const aggregatedInventory = useMemo((): AggregatedInventoryItem[] => {
        if (isLoading || !dateRange?.from) return [];
        const from = startOfDay(dateRange.from);
        const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);
        const allItemsSold = new Map<string, AggregatedInventoryItem>();
        const processItem = (itemId: string, name: string, sku: string, quantity: number, revenue: number) => {
            const existing = allItemsSold.get(itemId);
            if (existing) { existing.totalQuantity += quantity; existing.totalRevenue += revenue; }
            else { allItemsSold.set(itemId, { itemId, name, sku, totalQuantity: quantity, totalRevenue: revenue }); }
        };
        allSales.forEach(sale => { if (sale.status !== 'Cancelado' && isValid(parseISO(sale.saleDate)) && isWithinInterval(parseISO(sale.saleDate), { start: from, end: to })) { sale.items.forEach(item => { const invItem = allInventory.find(i => i.id === item.inventoryItemId); if (invItem && !invItem.isService) { processItem(invItem.id, invItem.name, invItem.sku, item.quantity, item.totalPrice); } }); } });
        allServices.forEach(service => { if (service.status === 'Completado' && service.deliveryDateTime && isValid(parseISO(service.deliveryDateTime)) && isWithinInterval(parseISO(service.deliveryDateTime), { start: from, end: to })) { (service.serviceItems || []).forEach(sItem => { (sItem.suppliesUsed || []).forEach(supply => { const invItem = allInventory.find(i => i.id === supply.supplyId); if(invItem && !invItem.isService){ processItem(invItem.id, invItem.name, invItem.sku, supply.quantity, supply.sellingPrice ? supply.sellingPrice * supply.quantity : 0); } }); }); } });
        return Array.from(allItemsSold.values());
    }, [dateRange, isLoading, allSales, allServices, allInventory]);

    const filteredAndSortedInventory = useMemo(() => {
        let list = [...aggregatedInventory];
        if (reporteInvSearchTerm) { list = list.filter(item => item.name.toLowerCase().includes(reporteInvSearchTerm.toLowerCase()) || item.sku.toLowerCase().includes(reporteInvSearchTerm.toLowerCase())); }
        list.sort((a, b) => {
            switch (reporteInvSortOption) {
                case 'quantity_asc': return a.totalQuantity - b.totalQuantity;
                case 'revenue_desc': return b.totalRevenue - a.totalRevenue;
                case 'revenue_asc': return a.totalRevenue - b.totalRevenue;
                case 'name_asc': return a.name.localeCompare(b.name);
                case 'name_desc': return b.name.localeCompare(a.name);
                case 'quantity_desc': default: return b.totalQuantity - a.totalQuantity;
            }
        });
        return list;
    }, [aggregatedInventory, reporteInvSearchTerm, reporteInvSortOption]);

    const getOperationTypeVariant = (type: string) => {
        switch (type) {
            case 'Venta': return 'secondary'; case 'Servicio General': return 'default'; case 'Cambio de Aceite': return 'blue';
            case 'Pintura': return 'purple'; default: return 'outline';
        }
    };
    
    const paymentMethods: PaymentMethod[] = ['Efectivo', 'Tarjeta', 'Transferencia', 'Efectivo+Transferencia', 'Tarjeta+Transferencia'];

    const dateFilterComponent = (
        <div className="flex items-center gap-2 flex-wrap justify-start sm:justify-end">
            <Button variant="outline" size="sm" onClick={() => setDateRange({ from: startOfDay(new Date()), to: endOfDay(new Date()) })} className="bg-card">Hoy</Button>
            <Button variant="outline" size="sm" onClick={() => setDateRange({ from: startOfWeek(new Date(), { weekStartsOn: 1 }), to: endOfWeek(new Date(), { weekStartsOn: 1 }) })} className="bg-card">Esta Semana</Button>
            <Button variant="outline" size="sm" onClick={() => setDateRange({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) })} className="bg-card">Este Mes</Button>
            <Popover><PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full sm:w-[240px] justify-start text-left font-normal bg-card", !dateRange && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{dateRange?.from ? (dateRange.to ? (`${format(dateRange.from, "LLL dd, y", { locale: es })} - ${format(dateRange.to, "LLL dd, y", { locale: es })}`) : format(dateRange.from, "LLL dd, y", { locale: es })) : (<span>Seleccione rango</span>)}</Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="end"><Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2} locale={es} /></PopoverContent></Popover>
        </div>
    );

    if (!hydrated || isLoading) { return <div className="flex h-64 justify-center items-center"><Loader2 className="h-8 w-8 animate-spin" /></div>; }
    
    return (
        <>
            <div className="bg-primary text-primary-foreground rounded-lg p-6 mb-6">
                <h1 className="text-3xl font-bold tracking-tight">Finanzas</h1>
                <p className="text-primary-foreground/80 mt-1">Analiza el rendimiento y las operaciones de tu taller.</p>
            </div>
            
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-6">
                    <TabsTrigger value="resumen" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Resumen Financiero</TabsTrigger>
                    <TabsTrigger value="reporte-operaciones" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Reporte de Operaciones</TabsTrigger>
                    <TabsTrigger value="reporte-inventario" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Reporte de Inventario</TabsTrigger>
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
                        <CardContent className="space-y-4 text-base"><div className="grid grid-cols-3 gap-4 font-semibold text-sm text-muted-foreground border-b pb-2"><div className="col-span-1">Categoría</div><div className="col-span-1 text-right">Ingresos</div><div className="col-span-1 text-right">Ganancia</div></div><div className="space-y-3 text-sm"><div className="grid grid-cols-3 gap-4 items-center"><div className="col-span-1 font-semibold">Ventas (POS)</div><div className="col-span-1 text-right font-medium">{formatCurrency(financialSummary.totalIncomeFromSales)}</div><div className="col-span-1 text-right font-medium text-green-600">{formatCurrency(financialSummary.totalProfitFromSales)}</div></div><div className="grid grid-cols-3 gap-4 items-center"><div className="col-span-1 font-semibold">Servicios Generales</div><div className="col-span-1 text-right font-medium">{formatCurrency(financialSummary.totalIncomeFromServiciosGenerales)}</div><div className="col-span-1 text-right font-medium text-green-600">{formatCurrency(financialSummary.totalProfitFromServiciosGenerales)}</div></div><div className="grid grid-cols-3 gap-4 items-center"><div className="col-span-1 font-semibold">Cambio de Aceite</div><div className="col-span-1 text-right font-medium">{formatCurrency(financialSummary.totalIncomeFromCambioAceite)}</div><div className="col-span-1 text-right font-medium text-green-600">{formatCurrency(financialSummary.totalProfitFromCambioAceite)}</div></div><div className="grid grid-cols-3 gap-4 items-center"><div className="col-span-1 font-semibold">Pintura</div><div className="col-span-1 text-right font-medium">{formatCurrency(financialSummary.totalIncomeFromPintura)}</div><div className="col-span-1 text-right font-medium text-green-600">{formatCurrency(financialSummary.totalProfitFromPintura)}</div></div></div><div className="grid grid-cols-3 gap-4 items-center font-bold text-lg pt-4 border-t mt-4"><div className="col-span-2 text-right">Ganancia Bruta Operativa Total:</div><div className="col-span-1 text-right text-xl text-green-600">{formatCurrency(financialSummary.totalOperationalProfit)}</div></div></CardContent>
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
                              {financialSummary.fixedExpenses.length > 0 ? (financialSummary.fixedExpenses.map(expense => (<div key={expense.id} className="flex justify-between items-center"><span className="text-muted-foreground">{expense.name}:</span><span className="font-semibold">{formatCurrency(expense.amount)}</span></div>))) : (<p className="text-sm text-muted-foreground text-center">No hay gastos fijos registrados.</p>)}
                              <hr className="my-2 border-dashed"/>
                              <div className="flex justify-between font-bold"><span className="text-foreground">Total Gastos Fijos:</span><span className="text-red-600">{formatCurrency(financialSummary.totalFixedExpenses)}</span></div>
                          </CardContent>
                      </Card>
                    </div>
                </TabsContent>
                
                <TabsContent value="reporte-operaciones" className="mt-0 space-y-4">
                    <div className="space-y-2">
                        <h2 className="text-2xl font-semibold tracking-tight">Detalle de Operaciones</h2>
                        <p className="text-muted-foreground">Ventas y servicios completados en el período seleccionado.</p>
                    </div>
                    {dateFilterComponent}
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                        <div className="relative flex-1 w-full"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input type="search" placeholder="Buscar por ID o descripción..." className="w-full rounded-lg bg-card pl-8" value={reporteOpSearchTerm} onChange={(e) => setReporteOpSearchTerm(e.target.value)} /></div>
                        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                            <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" className="flex-1 sm:flex-initial bg-card"><Filter className="mr-2 h-4 w-4" /><span>Tipo: {reporteOpTypeFilter === 'all' ? 'Todos' : reporteOpTypeFilter}</span></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuLabel>Filtrar por Tipo</DropdownMenuLabel><DropdownMenuRadioGroup value={reporteOpTypeFilter} onValueChange={(v) => setReporteOpTypeFilter(v as OperationTypeFilter)}><DropdownMenuRadioItem value="all">Todos</DropdownMenuRadioItem><DropdownMenuRadioItem value="Venta">Venta</DropdownMenuRadioItem>{serviceTypes.map((type) => (<DropdownMenuRadioItem key={type.id} value={type.name}>{type.name}</DropdownMenuRadioItem>))}</DropdownMenuRadioGroup></DropdownMenuContent></DropdownMenu>
                            <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" className="flex-1 sm:flex-initial bg-card"><Filter className="mr-2 h-4 w-4" /><span>Pago: {reporteOpPaymentMethodFilter === 'all' ? 'Todos' : reporteOpPaymentMethodFilter}</span></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuLabel>Filtrar por Método de Pago</DropdownMenuLabel><DropdownMenuRadioGroup value={reporteOpPaymentMethodFilter} onValueChange={(v) => setReporteOpPaymentMethodFilter(v as PaymentMethod | 'all')}><DropdownMenuRadioItem value="all">Todos</DropdownMenuRadioItem>{paymentMethods.map(method => (<DropdownMenuRadioItem key={method} value={method}>{method}</DropdownMenuRadioItem>))}</DropdownMenuRadioGroup></DropdownMenuContent></DropdownMenu>
                            <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" className="flex-1 sm:flex-initial bg-card"><ListFilter className="mr-2 h-4 w-4" /><span>Ordenar por</span></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuLabel>Ordenar por</DropdownMenuLabel><DropdownMenuRadioGroup value={reporteOpSortOption} onValueChange={setReporteOpSortOption}><DropdownMenuRadioItem value="date_desc">Fecha (Más Reciente)</DropdownMenuRadioItem><DropdownMenuRadioItem value="date_asc">Fecha (Más Antiguo)</DropdownMenuRadioItem><DropdownMenuRadioItem value="amount_desc">Monto (Mayor a Menor)</DropdownMenuRadioItem><DropdownMenuRadioItem value="amount_asc">Monto (Menor a Mayor)</DropdownMenuRadioItem><DropdownMenuRadioItem value="profit_desc">Ganancia (Mayor a Menor)</DropdownMenuRadioItem><DropdownMenuRadioItem value="profit_asc">Ganancia (Menor a Mayor)</DropdownMenuRadioItem></DropdownMenuRadioGroup></DropdownMenuContent></DropdownMenu>
                        </div>
                    </div>
                    <Card><CardContent className="pt-6"><div className="rounded-md border overflow-x-auto"><Table><TableHeader className="bg-black"><TableRow><TableHead className="text-white">Fecha</TableHead><TableHead className="text-white">Tipo</TableHead><TableHead className="text-white">ID</TableHead><TableHead className="text-white">Descripción</TableHead><TableHead className="text-right text-white">Monto</TableHead><TableHead className="text-right text-white">Ganancia</TableHead><TableHead className="text-right text-white">Método Pago</TableHead></TableRow></TableHeader><TableBody>{filteredAndSortedOperations.length > 0 ? (filteredAndSortedOperations.map(op => (<TableRow key={`${op.type}-${op.id}`}><TableCell>{op.date ? format(parseISO(op.date), "dd MMM yy, HH:mm", { locale: es }) : 'N/A'}</TableCell><TableCell><Badge variant={getOperationTypeVariant(op.type)}>{op.type}</Badge></TableCell><TableCell>{op.id}</TableCell><TableCell className="max-w-xs truncate">{op.description}</TableCell><TableCell className="text-right font-semibold">{formatCurrency(op.totalAmount)}</TableCell><TableCell className="text-right font-semibold">{formatCurrency(op.profit)}</TableCell><TableCell className="text-right">{(op.originalObject as any).paymentMethod || 'Efectivo'}</TableCell></TableRow>))) : (<TableRow><TableCell colSpan={7}><div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground"><LineChart className="h-12 w-12 mb-2" /><h3 className="text-lg font-semibold text-foreground">Sin Operaciones</h3><p className="text-sm">No se encontraron ventas o servicios en el período seleccionado.</p></div></TableCell></TableRow>)}</TableBody></Table></div></CardContent></Card>
                </TabsContent>

                <TabsContent value="reporte-inventario" className="mt-0 space-y-4">
                     <div className="space-y-2">
                        <h2 className="text-2xl font-semibold tracking-tight">Detalle de Salidas de Inventario</h2>
                        <p className="text-muted-foreground">Productos y refacciones vendidos o utilizados en servicios en el período seleccionado.</p>
                    </div>
                     {dateFilterComponent}
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                        <div className="relative flex-1 w-full"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input type="search" placeholder="Buscar por nombre o SKU..." className="w-full rounded-lg bg-card pl-8" value={reporteInvSearchTerm} onChange={(e) => setReporteInvSearchTerm(e.target.value)} /></div>
                        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                            <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" className="flex-1 sm:flex-initial bg-card"><ListFilter className="mr-2 h-4 w-4" /><span>Ordenar por</span></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuLabel>Ordenar por</DropdownMenuLabel><DropdownMenuRadioGroup value={reporteInvSortOption} onValueChange={setReporteInvSortOption}><DropdownMenuRadioItem value="quantity_desc">Unidades (Mayor a Menor)</DropdownMenuRadioItem><DropdownMenuRadioItem value="quantity_asc">Unidades (Menor a Mayor)</DropdownMenuRadioItem><DropdownMenuRadioItem value="revenue_desc">Ingreso (Mayor a Menor)</DropdownMenuRadioItem><DropdownMenuRadioItem value="revenue_asc">Ingreso (Menor a Mayor)</DropdownMenuRadioItem><DropdownMenuRadioItem value="name_asc">Nombre (A-Z)</DropdownMenuRadioItem><DropdownMenuRadioItem value="name_desc">Nombre (Z-A)</DropdownMenuRadioItem></DropdownMenuRadioGroup></DropdownMenuContent></DropdownMenu>
                        </div>
                    </div>
                    <Card><CardContent className="pt-6"><div className="rounded-md border overflow-x-auto"><Table><TableHeader className="bg-black"><TableRow><TableHead className="text-white">SKU</TableHead><TableHead className="text-white">Producto</TableHead><TableHead className="text-right text-white">Unidades</TableHead><TableHead className="text-right text-white">Ingreso Generado</TableHead></TableRow></TableHeader><TableBody>{filteredAndSortedInventory.length > 0 ? (filteredAndSortedInventory.map(item => (<TableRow key={item.itemId}><TableCell>{item.sku}</TableCell><TableCell>{item.name}</TableCell><TableCell className="text-right">{item.totalQuantity}</TableCell><TableCell className="text-right">{formatCurrency(item.totalRevenue)}</TableCell></TableRow>))) : (<TableRow><TableCell colSpan={4}><div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground"><PackageSearch className="h-12 w-12 mb-2" /><h3 className="text-lg font-semibold text-foreground">Sin Movimientos de Inventario</h3><p className="text-sm">No se vendieron productos en el período seleccionado.</p></div></TableCell></TableRow>)}</TableBody></Table></div></CardContent></Card>
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

export default function FinanzasPageWrapper() {
    return (
        <Suspense fallback={<div className="flex h-64 justify-center items-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <ResumenFinancieroPageComponent />
        </Suspense>
    );
}
