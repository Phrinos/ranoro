

"use client";

import { useState, useMemo, useEffect, Suspense, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  calculateSaleProfit,
} from '@/lib/placeholder-data';
import type { MonthlyFixedExpense, InventoryItem, FinancialOperation, PaymentMethod, ServiceTypeRecord, SaleReceipt, ServiceRecord, Technician, AdministrativeStaff, InventoryMovement, Personnel } from '@/types';
import {
  format,
  parseISO,
  isWithinInterval,
  isValid,
  startOfDay, endOfDay, startOfWeek, endOfWeek, isSameDay, startOfMonth, endOfMonth, compareDesc, compareAsc
} from "date-fns";
import { es } from 'date-fns/locale';
import { CalendarIcon, DollarSign, TrendingUp, TrendingDown, Pencil, BadgeCent, Search, LineChart, PackageSearch, ListFilter, Filter, Package as PackageIcon } from 'lucide-react';
import { cn, formatCurrency } from "@/lib/utils";
import { FixedExpensesDialog } from './fixed-expenses-dialog'; 
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { DateRange } from 'react-day-picker';
import { operationsService, inventoryService, personnelService } from '@/lib/services';
import { Loader2 } from 'lucide-react';
import { parseDate } from '@/lib/forms';
import { ReporteOperacionesContent } from './reporte-operaciones-content';
import { ReporteInventarioContent } from './reporte-inventario-content';
import { ScrollArea } from '@/components/ui/scroll-area';


export function FinanzasPageComponent({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
    const defaultTab = (searchParams?.tab as string) || 'resumen';
    
    const [activeTab, setActiveTab] = useState(defaultTab);
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
    const [isExpensesDialogOpen, setIsExpensesDialogOpen] = useState(false);
    
    const [isLoading, setIsLoading] = useState(true);
    const [allSales, setAllSales] = useState<SaleReceipt[]>([]);
    const [allServices, setAllServices] = useState<ServiceRecord[]>([]);
    const [allInventory, setAllInventory] = useState<InventoryItem[]>([]);
    const [allPersonnel, setAllPersonnel] = useState<Personnel[]>([]);
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
            personnelService.onPersonnelUpdate(setAllPersonnel),
            inventoryService.onFixedExpensesUpdate((expenses) => {
                setFixedExpenses(expenses);
                setIsLoading(false);
            })
        ];
        
        const now = new Date();
        const initialRange = { from: startOfMonth(now), to: endOfMonth(now) };
        setDateRange(initialRange);
        setTempDateRange(initialRange);

        return () => unsubs.forEach(unsub => unsub());
    }, []);

    const { technicians, advisors } = useMemo(() => {
        const techs: Personnel[] = [];
        const ad_visors: Personnel[] = [];
        allPersonnel.forEach(p => {
            // A person can be both, but for salary calculation, we separate them.
            // Assuming 'Técnico' is an exclusive primary role for this calculation.
            if (p.roles.includes('Técnico')) {
                techs.push(p);
            } else {
                ad_visors.push(p);
            }
        });
        return { technicians: techs, advisors: ad_visors };
    }, [allPersonnel]);


    const financialSummary = useMemo(() => {
        const emptyState = { 
            monthYearLabel: 'Cargando...', totalOperationalIncome: 0, totalIncomeFromSales: 0, totalIncomeFromServices: 0,
            totalProfitFromSales: 0, totalProfitFromServices: 0, totalCostOfGoods: 0, totalOperationalProfit: 0, 
            totalTechnicianSalaries: 0, totalAdministrativeSalaries: 0, totalFixedExpenses: 0,
            totalVariableCommissions: 0, netProfit: 0, isProfitableForCommissions: false, serviceIncomeBreakdown: {},
            totalInventoryValue: 0, totalUnitsSold: 0
        };

        if (isLoading || !dateRange?.from) return emptyState;
        
        const from = startOfDay(dateRange.from);
        const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(from);
        
        const salesInRange = allSales.filter(s => {
          const sDate = parseDate(s.saleDate);
          return s.status !== 'Cancelado' && sDate && isValid(sDate) && isWithinInterval(sDate, { start: from, end: to });
        });
        
        const servicesInRange = allServices.filter(s => {
          const dateToParse = s.deliveryDateTime || s.serviceDate;
          if (!dateToParse) return false;
          const parsedDate = parseDate(dateToParse);
          return (s.status === 'Completado' || s.status === 'Entregado') && isValid(parsedDate) && isWithinInterval(parsedDate, { start: from, end: to });
        });

        const totalIncomeFromSales = salesInRange.reduce((sum, s) => sum + s.totalAmount, 0);
        const totalProfitFromSales = salesInRange.reduce((sum, s) => sum + calculateSaleProfit(s, allInventory), 0);
        const totalIncomeFromServices = servicesInRange.reduce((sum, s) => sum + (s.totalCost || 0), 0);
        const totalProfitFromServices = servicesInRange.reduce((sum, s) => sum + (s.serviceProfit || 0), 0);
        
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
        
        const totalOperationalIncome = totalIncomeFromSales + totalIncomeFromServices;
        const totalOperationalProfit = totalProfitFromSales + totalProfitFromServices;

        const totalCostOfGoods = salesInRange.reduce((cost, s) => cost + s.items.reduce((c, i) => c + ((allInventory.find(inv => inv.id === i.inventoryItemId)?.unitPrice || 0) * i.quantity), 0), 0) + servicesInRange.reduce((cost, s) => cost + (s.totalSuppliesWorkshopCost || 0), 0);
        
        const totalUnitsSold = salesInRange.reduce((sum, s) => sum + s.items.reduce((count, item) => count + item.quantity, 0), 0) + servicesInRange.reduce((sum, s) => sum + (s.serviceItems || []).flatMap(si => si.suppliesUsed || []).reduce((count, supply) => count + supply.quantity, 0), 0);

        const totalTechnicianSalaries = technicians.filter(t => !t.isArchived).reduce((sum, tech) => sum + (tech.monthlySalary || 0), 0);
        const totalAdministrativeSalaries = advisors.filter(s => !s.isArchived).reduce((sum, staff) => sum + (staff.monthlySalary || 0), 0);
        const totalFixedExpenses = fixedExpenses.reduce((sum, expense) => sum + expense.amount, 0);
        const totalBaseExpenses = totalTechnicianSalaries + totalAdministrativeSalaries + totalFixedExpenses;
        
        const netProfitBeforeCommissions = totalOperationalProfit - totalBaseExpenses;
        const isProfitableForCommissions = netProfitBeforeCommissions > 0;
        
        let totalVariableCommissions = 0;
        if (isProfitableForCommissions) {
          const techCommissions = technicians.filter(t => !t.isArchived).reduce((sum, tech) => {
            return sum + (netProfitBeforeCommissions * (tech.commissionRate || 0));
          }, 0);
          
          const adminCommissions = advisors.filter(s => !s.isArchived).reduce((sum, admin) => {
            return sum + (netProfitBeforeCommissions * (admin.commissionRate || 0));
          }, 0);
          totalVariableCommissions = techCommissions + adminCommissions;
        }
        
        const netProfit = netProfitBeforeCommissions - totalVariableCommissions;

        const dateLabel = dateRange.to && !isSameDay(dateRange.from, dateRange.to)
            ? `${format(from, 'dd MMM', { locale: es })} - ${format(to, 'dd MMM, yyyy', { locale: es })}`
            : format(from, 'dd \'de\' MMMM, yyyy', { locale: es });

        const totalInventoryValue = allInventory
            .filter(item => !item.isService)
            .reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

        return { 
            monthYearLabel: dateLabel, totalOperationalIncome, totalIncomeFromSales, totalIncomeFromServices, 
            totalProfitFromSales, totalProfitFromServices, totalCostOfGoods, totalOperationalProfit,
            totalTechnicianSalaries, totalAdministrativeSalaries, totalFixedExpenses,
            totalVariableCommissions, netProfit, isProfitableForCommissions, serviceIncomeBreakdown,
            totalInventoryValue, totalUnitsSold
        };
    }, [dateRange, isLoading, allSales, allServices, allInventory, technicians, advisors, fixedExpenses]);

    const inventoryMovements = useMemo((): InventoryMovement[] => {
      if (isLoading) return [];
      const movements: InventoryMovement[] = [];
      const inventoryMap = new Map(allInventory.map(item => [item.id, item]));

      allSales.forEach(sale => {
        sale.items.forEach(item => {
          const invItem = inventoryMap.get(item.inventoryItemId);
          if (invItem && !invItem.isService) {
            movements.push({
              id: `${sale.id}-${item.inventoryItemId}`,
              date: sale.saleDate,
              type: 'Venta',
              relatedId: sale.id,
              itemName: item.itemName,
              quantity: item.quantity,
              unitCost: invItem.unitPrice,
              totalCost: item.quantity * invItem.unitPrice,
            });
          }
        });
      });

      allServices.forEach(service => {
        if(service.status === 'Completado' || service.status === 'Entregado') {
          const date = service.deliveryDateTime || service.serviceDate;
          if(!date) return;
          (service.serviceItems || []).forEach(sItem => {
            (sItem.suppliesUsed || []).forEach(supply => {
              const invItem = inventoryMap.get(supply.supplyId);
              if (invItem && !invItem.isService) {
                movements.push({
                  id: `${service.id}-${supply.supplyId}-${sItem.id}`,
                  date: date,
                  type: 'Servicio',
                  relatedId: service.id,
                  itemName: supply.supplyName,
                  quantity: supply.quantity,
                  unitCost: invItem.unitPrice,
                  totalCost: supply.quantity * invItem.unitPrice
                });
              }
            });
          });
        }
      });
      return movements;
    }, [isLoading, allSales, allServices, allInventory]);

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
                    <Button variant={'outline'} className={cn('w-full sm:w-[240px] justify-start text-left font-normal bg-card', !dateRange && 'text-muted-foreground')}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange?.from ? (dateRange.to ? (`${format(dateRange.from, 'LLL dd, y', { locale: es })} - ${format(dateRange.to, 'LLL dd, y', { locale: es })}`) : format(dateRange.from, 'LLL dd, y', { locale: es })) : (<span>Seleccione rango</span>)}
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
                <div className="w-full">
                    <TabsList className="flex w-full gap-2 sm:gap-4 overflow-x-auto scrollbar-hide p-0 bg-transparent">
                        <TabsTrigger 
                            value="resumen" 
                            className="flex-1 min-w-[30%] sm:min-w-0 text-center px-3 py-2 rounded-md transition-colors duration-200 text-sm sm:text-base break-words whitespace-normal leading-snug data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:bg-muted data-[state=inactive]:text-muted-foreground hover:data-[state=inactive]:bg-muted/80">
                            Resumen
                        </TabsTrigger>
                        <TabsTrigger 
                            value="operaciones" 
                            className="flex-1 min-w-[30%] sm:min-w-0 text-center px-3 py-2 rounded-md transition-colors duration-200 text-sm sm:text-base break-words whitespace-normal leading-snug data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:bg-muted data-[state=inactive]:text-muted-foreground hover:data-[state=inactive]:bg-muted/80">
                            Operaciones
                        </TabsTrigger>
                        <TabsTrigger 
                            value="inventario" 
                            className="flex-1 min-w-[30%] sm:min-w-0 text-center px-3 py-2 rounded-md transition-colors duration-200 text-sm sm:text-base break-words whitespace-normal leading-snug data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:bg-muted data-[state=inactive]:text-muted-foreground hover:data-[state=inactive]:bg-muted/80">
                            Inventario
                        </TabsTrigger>
                    </TabsList>
                </div>
                
                 <TabsContent value="resumen" className="mt-6">
                    <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">{dateFilterComponent}</div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <Card className="lg:col-span-2">
                        <CardHeader><CardTitle className="text-xl flex items-center gap-2"><DollarSign className="h-6 w-6 text-primary" />Estado de Resultados</CardTitle><CardDescription>Resumen de pérdidas y ganancias para el periodo: {financialSummary.monthYearLabel}</CardDescription></CardHeader>
                        <CardContent className="space-y-4 text-base">
                            <div className="space-y-2">
                                <div className="flex justify-between items-center"><span className="text-muted-foreground">Ingresos Operativos Totales:</span><span className="font-semibold text-lg">{formatCurrency(financialSummary.totalOperationalIncome)}</span></div>
                                <div className="flex justify-between items-center"><span className="text-muted-foreground">(-) Costo Total de Insumos:</span><span className="font-semibold text-lg text-orange-500">-{formatCurrency(financialSummary.totalCostOfGoods)}</span></div>
                                <hr className="my-2 border-dashed"/><div className="flex justify-between items-center font-bold text-xl pt-1"><span className="text-foreground">(=) Ganancia Bruta Operativa:</span><span className="text-xl text-green-600">{formatCurrency(financialSummary.totalOperationalProfit)}</span></div></div>
                            <hr className="my-4 border-border"/>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground">(-) Gastos Mensuales Fijos:</span>
                                    <span className="font-semibold text-lg text-red-500">-{formatCurrency(financialSummary.totalTechnicianSalaries + financialSummary.totalAdministrativeSalaries + financialSummary.totalFixedExpenses)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground">(-) Comisiones Variables:</span>
                                    <span className="font-semibold text-lg text-red-500">-{formatCurrency(financialSummary.totalVariableCommissions)}</span>
                                </div>
                                {!financialSummary.isProfitableForCommissions && (<p className="text-xs text-right text-muted-foreground pt-1">Las comisiones no se aplican porque la ganancia no cubrió los gastos fijos.</p>)}
                                <hr className="my-2 border-dashed"/>
                                <div className="flex justify-between items-center font-bold text-2xl pt-1">
                                    <span className="text-foreground">(=) Resultado Neto del Periodo:</span>
                                    <span className={cn('text-2xl', financialSummary.netProfit >= 0 ? 'text-green-600' : 'text-red-600')}>{formatCurrency(financialSummary.netProfit)}</span>
                                </div>
                            </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader><CardTitle className="text-xl flex items-center gap-2"><TrendingUp className="h-6 w-6 text-green-500" />Ingresos y Ganancia Bruta</CardTitle><CardDescription>Detalle de operaciones en el periodo</CardDescription></CardHeader>
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
                            <div className="flex flex-col sm:grid sm:grid-cols-4 gap-2 sm:gap-4 items-end font-bold text-base pt-4 border-t mt-4">
                                <div className="col-span-2 text-right w-full sm:w-auto">Total Ingresos Brutos:</div>
                                <div className="col-span-1 text-right text-lg w-full sm:w-auto">{formatCurrency(financialSummary.totalOperationalIncome)}</div>
                                <div className="col-span-1 text-right text-lg text-green-600 w-full sm:w-auto">{formatCurrency(financialSummary.totalOperationalProfit)}</div>
                            </div>
                        </CardContent>
                      </Card>
                      <Card>
                          <CardHeader><div className="flex items-center justify-between"><CardTitle className="text-xl flex items-center gap-2"><TrendingDown className="h-6 w-6 text-red-500" />Egresos Fijos y Variables</CardTitle><Button variant="outline" size="sm" onClick={() => setIsExpensesDialogOpen(true)}><Pencil className="mr-2 h-4 w-4" />Editar Gastos Fijos</Button></div><CardDescription>Detalle de gastos fijos y variables del periodo.</CardDescription></CardHeader>
                          <CardContent className="space-y-3 text-base">
                              <h3 className="font-semibold text-lg">Nómina y Comisiones</h3>
                              <div className="flex justify-between items-center"><span className="text-muted-foreground">Sueldos (Técnicos):</span><span className="font-semibold">{formatCurrency(financialSummary.totalTechnicianSalaries)}</span></div>
                              <div className="flex justify-between items-center"><span className="text-muted-foreground">Sueldos (Asesores/Admin):</span><span className="font-semibold">{formatCurrency(financialSummary.totalAdministrativeSalaries)}</span></div>
                              <div className="flex justify-between items-center"><span className="text-muted-foreground flex items-center gap-1"><BadgeCent className="h-4 w-4"/>Comisiones Variables:</span><span className="font-semibold">{formatCurrency(financialSummary.totalVariableCommissions)}</span></div>
                              
                              <h3 className="font-semibold text-lg pt-4">Servicios y Gastos Fijos</h3>
                              {fixedExpenses.length > 0 ? (fixedExpenses.map(expense => (<div key={expense.id} className="flex justify-between items-center"><span className="text-muted-foreground">{expense.name}:</span><span className="font-semibold">{formatCurrency(expense.amount)}</span></div>))) : (<p className="text-sm text-muted-foreground text-center">No hay gastos fijos registrados.</p>)}
                          </CardContent>
                      </Card>
                    </div>
                </TabsContent>
                
                <TabsContent value="operaciones" className="mt-6">
                    <ReporteOperacionesContent
                        allSales={allSales}
                        allServices={allServices}
                        allInventory={allInventory}
                        serviceTypes={serviceTypes}
                    />
                </TabsContent>

                <TabsContent value="inventario" className="mt-6">
                    <ReporteInventarioContent movements={inventoryMovements} />
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
