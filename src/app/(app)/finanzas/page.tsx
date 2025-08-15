

// src/app/(app)/finanzas/page.tsx

"use client";

import React, { useState, useMemo, useEffect, Suspense, lazy } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  calculateSaleProfit,
} from '@/lib/placeholder-data';
import type { MonthlyFixedExpense, InventoryItem, FinancialOperation, PaymentMethod, ServiceTypeRecord, SaleReceipt, ServiceRecord, Technician, AdministrativeStaff, InventoryMovement, Personnel, Payment, CashDrawerTransaction } from '@/types';
import {
  format,
  parseISO,
  isWithinInterval,
  isValid,
  startOfDay, endOfDay, startOfWeek, endOfWeek, isSameDay, startOfMonth, endOfMonth, compareDesc, compareAsc, isAfter, differenceInDays, getDaysInMonth, subDays
} from "date-fns";
import { es } from 'date-fns/locale';
import { CalendarIcon, DollarSign, TrendingUp, TrendingDown, Pencil, BadgeCent, Search, LineChart, PackageSearch, ListFilter, Filter, Package as PackageIcon, Wrench, ShoppingCart, Wallet, CreditCard, Send, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn, formatCurrency, getPaymentMethodVariant } from "@/lib/utils";
import type { DateRange } from "react-day-picker";
import { serviceService, saleService, inventoryService, personnelService, cashService } from '@/lib/services';
import { Loader2 } from 'lucide-react';
import { parseDate } from '@/lib/forms';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TabbedPageLayout } from '@/components/layout/tabbed-page-layout';
import { TableToolbar } from '@/components/shared/table-toolbar';
import { useTableManager } from '@/hooks/useTableManager';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipTrigger, TooltipProvider, TooltipContent } from '@/components/ui/tooltip';
import { calcEffectiveProfit } from "@/lib/money-helpers";


const EgresosContent = lazy(() => import('./components/egresos-content').then(m => ({ default: m.EgresosContent })));
const MovimientosTabContent = lazy(() => import('./components/movimientos-content').then(m => ({ default: m.default })));
const CajaContent = lazy(() => import('./components/caja-content'));

// --- Tipos para la pestaña Movimientos ---
interface Movement {
  id: string;
  date: Date | null;
  folio: string;
  type: 'Venta' | 'Servicio';
  client: string;
  payments: Payment[];
  paymentMethod_legacy?: string; // For old records
  total: number;
  profit: number;
}

const sortOptions = [
  { value: 'date_desc', label: 'Más Reciente' },
  { value: 'date_asc', label: 'Más Antiguo' },
  { value: 'total_desc', label: 'Monto (Mayor a Menor)' },
  { value: 'total_asc', label: 'Monto (Menor a Menor)' },
  { value: 'profit_desc', label: 'Utilidad (Mayor a Menor)' },
  { value: 'profit_asc', label: 'Utilidad (Menor a Menor)' },
];

const paymentMethodIcons: Record<Payment['method'], React.ElementType> = {
  "Efectivo": Wallet,
  "Tarjeta": CreditCard,
  "Tarjeta MSI": CreditCard,
  "Transferencia": Send,
};



// --- Componente principal de la página de Finanzas ---
function FinanzasPageComponent({ tab }: { tab?: string }) {
    const defaultTab = tab || 'resumen';
    
    const [activeTab, setActiveTab] = useState(defaultTab);
    const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
        const now = new Date();
        return { from: startOfMonth(now), to: endOfMonth(now) };
    });
    
    const [isLoading, setIsLoading] = useState(true);
    const [allSales, setAllSales] = useState<SaleReceipt[]>([]);
    const [allServices, setAllServices] = useState<ServiceRecord[]>([]);
    const [allInventory, setAllInventory] = useState<InventoryItem[]>([]);
    const [allPersonnel, setAllPersonnel] = useState<Personnel[]>([]);
    const [fixedExpenses, setFixedExpenses] = useState<MonthlyFixedExpense[]>([]);
    const [cashTransactions, setCashTransactions] = useState<CashDrawerTransaction[]>([]);
    
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>(dateRange);

    useEffect(() => {
        setIsLoading(true);
        const unsubs: (() => void)[] = [
            saleService.onSalesUpdate(setAllSales),
            serviceService.onServicesUpdate(setAllServices),
            inventoryService.onItemsUpdate(setAllInventory),
            personnelService.onPersonnelUpdate(setAllPersonnel),
            cashService.onCashTransactionsUpdate(setCashTransactions),
            inventoryService.onFixedExpensesUpdate((expenses) => {
                setFixedExpenses(expenses);
                setIsLoading(false);
            })
        ];

        return () => unsubs.forEach(unsub => unsub());
    }, []);

    const financialSummary = useMemo(() => {
        const emptyState = { 
            monthYearLabel: 'Cargando...', totalOperationalIncome: 0, totalIncomeFromSales: 0, totalIncomeFromServices: 0,
            totalProfitFromSales: 0, totalProfitFromServices: 0, totalCostOfGoods: 0, totalOperationalProfit: 0, 
            totalTechnicianSalaries: 0, totalAdministrativeSalaries: 0, totalFixedExpenses: 0, totalBaseExpenses: 0,
            totalVariableCommissions: 0, netProfit: 0, isProfitableForCommissions: false, serviceIncomeBreakdown: {},
            totalInventoryValue: 0, totalUnitsSold: 0
        };

        if (isLoading) {
             return emptyState;
        }

        const dateFilter = dateRange || { from: new Date('2000-01-01'), to: new Date('2100-01-01') };
        if(!dateFilter.from) {
          return emptyState;
        }
        
        const from = startOfDay(dateFilter.from);
        const to = dateFilter.to ? endOfDay(dateFilter.to) : endOfDay(from);
        const interval = { start: from, end: to };
        
        const salesInRange = allSales.filter(s => {
          const sDate = parseDate(s.saleDate);
          return s.status !== 'Cancelado' && sDate && isValid(sDate) && isWithinInterval(sDate, interval);
        });
        
        const servicesInRange = allServices.filter(s => {
          const dateToParse = s.deliveryDateTime || s.serviceDate;
          if (!dateToParse) return false;
          const parsedDate = parseDate(dateToParse);
          const isCancelled = s.status === 'Cancelado';
          const isQuote = s.status === 'Cotizacion';
          return !isCancelled && !isQuote && parsedDate && isValid(parsedDate) && isWithinInterval(parsedDate, interval);
        });

        // --- INGRESOS Y GANANCIA BRUTA ---
        const totalIncomeFromSales = salesInRange.reduce((sum, s) => sum + s.totalAmount, 0);
        const totalProfitFromSales = salesInRange.reduce((sum, s) => sum + calculateSaleProfit(s, allInventory), 0);
        const totalIncomeFromServices = servicesInRange.reduce((sum, s) => sum + (s.totalCost || 0), 0);
        const totalProfitFromServices = servicesInRange.reduce((sum, s) => sum + calcEffectiveProfit(s), 0);
        
        const totalOperationalIncome = totalIncomeFromSales + totalIncomeFromServices;
        const totalOperationalProfit = totalProfitFromSales + totalProfitFromServices;

        // --- EGRESOS Y RESULTADO NETO ---
        const daysInPeriod = differenceInDays(to, from) + 1;
        const daysInMonthOfPeriod = getDaysInMonth(from);
        const periodFactor = daysInPeriod / daysInMonthOfPeriod;

        const totalBaseSalaries = allPersonnel
          .filter(p => !p.isArchived)
          .reduce((sum, person) => sum + (person.monthlySalary || 0), 0);
            
        const totalOtherFixedExpenses = fixedExpenses
            .filter(expense => {
                const createdAt = parseDate(expense.createdAt);
                return !createdAt || !isValid(createdAt) || !isAfter(createdAt, to);
            })
            .reduce((sum, expense) => sum + expense.amount, 0);
        
        const proportionalBaseExpenses = (totalBaseSalaries + totalOtherFixedExpenses) * periodFactor;
        
        // La ganancia neta no incluye comisiones, según el requerimiento.
        const netProfit = totalOperationalProfit - proportionalBaseExpenses;
        
        // --- MÉTRICAS ADICIONALES ---
        const serviceIncomeBreakdown: Record<string, { income: number; profit: number; count: number }> = {};
        if (salesInRange.length > 0) {
            serviceIncomeBreakdown['Venta'] = {
                income: totalIncomeFromSales,
                profit: totalProfitFromSales,
                count: salesInRange.length
            };
        }
        servicesInRange.forEach(s => {
          const type = s.serviceType || 'Servicio General';
          if (!serviceIncomeBreakdown[type]) serviceIncomeBreakdown[type] = { income: 0, profit: 0, count: 0 };
          serviceIncomeBreakdown[type].income += (s.totalCost || 0);
          serviceIncomeBreakdown[type].profit += s.serviceProfit || 0;
          serviceIncomeBreakdown[type].count += 1;
        });

        const totalCostOfGoods = salesInRange.reduce((cost, s) => cost + s.items.reduce((c, i) => c + ((allInventory.find(inv => inv.id === i.inventoryItemId)?.unitPrice || 0) * i.quantity), 0), 0) + servicesInRange.reduce((cost, s) => cost + (s.totalSuppliesWorkshopCost || 0), 0);
        const totalUnitsSold = salesInRange.reduce((sum, s) => sum + s.items.reduce((count, item) => count + item.quantity, 0), 0) + servicesInRange.reduce((sum, s) => sum + (s.serviceItems || []).flatMap(si => si.suppliesUsed || []).reduce((count, supply) => count + supply.quantity, 0), 0);
        const totalInventoryValue = allInventory.filter(item => !item.isService).reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
        const dateLabel = dateRange?.from ? (dateRange.to && !isSameDay(dateRange.from, dateRange.to)
            ? `${format(dateRange.from, 'dd MMM', { locale: es })} - ${format(dateRange.to, 'dd MMM, yyyy', { locale: es })}`
            : format(dateRange.from, 'dd \'de\' MMMM, yyyy', { locale: es })) : 'Todo el historial';

        return { 
            monthYearLabel: dateLabel, totalOperationalIncome, totalIncomeFromSales, totalIncomeFromServices, 
            totalProfitFromSales, totalProfitFromServices, totalCostOfGoods, totalOperationalProfit,
            totalTechnicianSalaries: totalBaseSalaries, 
            totalAdministrativeSalaries: 0, 
            totalFixedExpenses: totalOtherFixedExpenses,
            totalBaseExpenses: proportionalBaseExpenses,
            totalVariableCommissions: 0, // No se calculan comisiones
            netProfit: netProfit, // Ganancia neta sin comisiones
            isProfitableForCommissions: false,
            serviceIncomeBreakdown,
            totalInventoryValue, totalUnitsSold
        };
    }, [dateRange, isLoading, allSales, allServices, allInventory, allPersonnel, fixedExpenses]);

    const handleApplyDateFilter = () => {
        setDateRange(tempDateRange);
        setIsCalendarOpen(false);
    };

    const dateFilterComponent = (
        <div className="flex items-center gap-2 flex-wrap justify-start sm:justify-end">
            <Button variant="outline" size="sm" onClick={() => { const range = { from: startOfDay(new Date()), to: endOfDay(new Date()) }; setDateRange(range); setTempDateRange(range); }} className="bg-card">Hoy</Button>
            <Button variant="outline" size="sm" onClick={() => { const range = { from: startOfWeek(new Date(), { weekStartsOn: 1 }), to: endOfWeek(new Date(), { weekStartsOn: 1 }) }; setDateRange(range); setTempDateRange(range); }} className="bg-card">Esta Semana</Button>
            <Button variant="outline" size="sm" onClick={() => { const range = { from: startOfMonth(new Date()), to: endOfMonth(new Date()) }; setDateRange(range); setTempDateRange(range); }} className="bg-card">Este Mes</Button>
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                    <Button variant={'outline'} className={cn('w-full sm:w-[240px] justify-start text-left font-normal bg-card', !dateRange && 'text-muted-foreground')}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange?.from ? (dateRange.to && !isSameDay(dateRange.from, dateRange.to) ? (`${format(dateRange.from, 'LLL dd, y', { locale: es })} - ${format(dateRange.to, 'dd MMM, yyyy', { locale: es })}`) : format(dateRange.from, 'dd \'de\' MMMM, yyyy', { locale: es })) : (<span>Seleccione rango</span>)}
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

    const tabs = [
        {
            value: "resumen", label: "Resumen Financiero",
            content: (
                 <div className="space-y-6">
                    <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">{dateFilterComponent}</div>
                    
                    <Card>
                        <CardHeader><CardTitle className="text-xl flex items-center gap-2"><DollarSign className="h-6 w-6 text-primary" />Estado de Resultados</CardTitle><CardDescription>Resumen de pérdidas y ganancias para el periodo: {financialSummary.monthYearLabel}</CardDescription></CardHeader>
                        <CardContent className="space-y-4 text-base">
                            <div className="space-y-2">
                                <div className="flex justify-between items-center"><span className="text-muted-foreground">Ingresos Operativos Totales:</span><span className="font-semibold text-lg">{formatCurrency(financialSummary.totalOperationalIncome)}</span></div>
                                <div className="flex justify-between items-center"><span className="text-muted-foreground">(-) Costo Total de Insumos:</span><span className="font-semibold text-lg text-orange-500">-{formatCurrency(financialSummary.totalCostOfGoods)}</span></div>
                                <hr className="my-2 border-dashed"/><div className="flex justify-between items-center font-bold text-xl pt-1"><span className="text-foreground">(=) Ganancia Bruta Operativa:</span><span className="text-xl text-green-600">{formatCurrency(financialSummary.totalOperationalProfit)}</span></div></div>
                            <hr className="my-4 border-border"/>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground">(-) Gastos Fijos (Proporcionales):</span>
                                    <span className="font-semibold text-lg text-red-500">-{formatCurrency(financialSummary.totalBaseExpenses)}</span>
                                </div>
                                <hr className="my-2 border-dashed"/>
                                <div className="flex justify-between items-center font-bold text-2xl pt-1">
                                    <span className="text-foreground">(=) Utilidad Neta del Periodo:</span>
                                    <span className={cn('text-2xl', financialSummary.netProfit >= 0 ? 'text-green-600' : 'text-red-600')}>{formatCurrency(financialSummary.netProfit)}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card>
                          <CardHeader><CardTitle className="text-xl flex items-center gap-2"><TrendingUp className="h-6 w-6 text-green-500" />Ingresos y Ganancia</CardTitle><CardDescription>Detalle por tipo de operación</CardDescription></CardHeader>
                          <CardContent className="space-y-4 text-base">
                              <div className="grid grid-cols-4 gap-4 font-semibold text-sm text-muted-foreground border-b pb-2">
                                  <div className="col-span-1">Categoría</div>
                                  <div className="col-span-1 text-right">Ops.</div>
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
                          </CardContent>
                        </Card>
                        <Suspense fallback={<Loader2 className="animate-spin" />}>
                           <EgresosContent financialSummary={financialSummary} fixedExpenses={fixedExpenses} personnel={allPersonnel} onExpensesUpdated={(updated) => setFixedExpenses([...updated])} />
                        </Suspense>
                    </div>
                </div>
            )
        },
        { 
            value: 'movimientos', 
            label: 'Movimientos', 
            content: (
                <Suspense fallback={<div className="p-8 text-center"><Loader2 className="h-8 w-8 animate-spin"/></div>}>
                    <MovimientosTabContent
                        allSales={allSales} 
                        allServices={allServices} 
                        allInventory={allInventory} 
                        dateRange={dateRange}
                        onDateRangeChange={setDateRange}
                    />
                </Suspense>
            )
        },
        {
            value: 'caja',
            label: 'Caja',
            content: (
                 <Suspense fallback={<div className="p-8 text-center"><Loader2 className="h-8 w-8 animate-spin"/></div>}>
                    <CajaContent 
                      allSales={allSales} 
                      allServices={allServices}
                      cashTransactions={cashTransactions}
                    />
                 </Suspense>
            )
        }
    ];
    
    return (
        <TabbedPageLayout
          title="Finanzas"
          description="Analiza el rendimiento y las operaciones de tu taller."
          activeTab={activeTab}
          onTabChange={setActiveTab}
          tabs={tabs}
        />
    );
}

function FinanzasPageWrapper() {
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab') as string | undefined;

  return <FinanzasPageComponent tab={tab} />;
}

export default function FinanzasPage() {
    return (
        <Suspense fallback={<div className="flex h-64 w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <FinanzasPageWrapper />
        </Suspense>
    )
}
