
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, ListFilter, CalendarIcon as CalendarDateIcon, DollarSign, Activity } from "lucide-react";
import { placeholderSales, placeholderServiceRecords, placeholderInventory, getCurrentMonthRange, getLastMonthRange, getTodayRange, calculateSaleProfit, IVA_RATE } from "@/lib/placeholder-data";
import type { SaleReceipt, ServiceRecord, FinancialOperation, InventoryItem } from "@/types";
import { useState, useEffect, useMemo } from "react";
import { format, parseISO, compareAsc, compareDesc, isWithinInterval, isValid, startOfDay, endOfDay, isSameDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { es } from 'date-fns/locale';
import type { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";


type OperationSortOption = 
  | "date_desc" | "date_asc"
  | "amount_desc" | "amount_asc"
  | "profit_desc" | "profit_asc";

type OperationTypeFilter = "all" | "Venta" | "Servicio" | "C. Aceite" | "Pintura";

interface SummaryData {
  operationsTodayCount: number;
  salesTodayCount: number;
  servicesTodayCount: number;
  totalGeneratedToday: number;
  totalProfitToday: number;
  totalGeneratedCurrentMonth: number;
  profitCurrentMonth: number;
  totalGeneratedLastMonth: number;
  profitLastMonth: number;
  currentMonthFormatted: string;
  lastMonthFormatted: string;
}

export default function FinancialReportPage() {
  const [allSales] = useState<SaleReceipt[]>(placeholderSales);
  const [allServices] = useState<ServiceRecord[]>(placeholderServiceRecords);
  const [inventory] = useState<InventoryItem[]>(placeholderInventory);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [sortOption, setSortOption] = useState<OperationSortOption>("date_desc");
  const [operationTypeFilter, setOperationTypeFilter] = useState<OperationTypeFilter>("all");

  const getServiceTypeForReport = (service: ServiceRecord): 'Servicio' | 'C. Aceite' | 'Pintura' => {
      if (service.serviceType === 'Cambio de Aceite') return 'C. Aceite';
      if (service.serviceType === 'Pintura') return 'Pintura';
      // Fallback for older data without the serviceType field
      if (service.description.toLowerCase().includes('cambio de aceite')) return 'C. Aceite';
      if (service.description.toLowerCase().includes('pintura')) return 'Pintura';
      return 'Servicio';
  };

  const combinedOperations = useMemo((): FinancialOperation[] => {
    const salesOperations: FinancialOperation[] = allSales.map(sale => ({
      id: sale.id,
      date: sale.saleDate,
      type: 'Venta',
      description: `Venta a ${sale.customerName || 'Cliente Mostrador'} - ${sale.items.length} artículo(s)`,
      totalAmount: sale.totalAmount, 
      profit: calculateSaleProfit(sale, inventory),
      originalObject: sale,
    }));

    const serviceOperations: FinancialOperation[] = allServices.map(service => {
      const profit = service.serviceProfit ?? ((service.totalCost || 0) - (service.totalSuppliesCost || 0));

      return {
        id: service.id,
        date: service.serviceDate,
        type: getServiceTypeForReport(service),
        description: service.description,
        totalAmount: service.totalCost, 
        profit: isFinite(profit) ? profit : 0, 
        originalObject: service,
      }
    });

    return [...salesOperations, ...serviceOperations];
  }, [allSales, allServices, inventory]);


  const filteredAndSortedOperations = useMemo(() => {
    let filtered = [...combinedOperations];

    if (dateRange?.from) {
      filtered = filtered.filter(op => {
        const opDate = parseISO(op.date);
        if (!isValid(opDate)) return false;
        const from = startOfDay(dateRange.from!);
        const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from!);
        return isWithinInterval(opDate, { start: from, end: to });
      });
    }

    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(op => 
        op.id.toLowerCase().includes(lowerSearchTerm) ||
        op.description.toLowerCase().includes(lowerSearchTerm) ||
        (op.type === 'Venta' && (op.originalObject as SaleReceipt).customerName?.toLowerCase().includes(lowerSearchTerm)) ||
        ((op.type === 'Servicio' || op.type === 'C. Aceite' || op.type === 'Pintura') && (op.originalObject as ServiceRecord).vehicleIdentifier?.toLowerCase().includes(lowerSearchTerm))
      );
    }

    if (operationTypeFilter !== "all") {
        filtered = filtered.filter(op => op.type === operationTypeFilter);
    }

    filtered.sort((a, b) => {
      switch (sortOption) {
        case "date_asc": return compareAsc(parseISO(a.date), parseISO(b.date));
        case "date_desc": return compareDesc(parseISO(a.date), parseISO(b.date));
        case "amount_asc": return a.totalAmount - b.totalAmount;
        case "amount_desc": return b.totalAmount - a.totalAmount;
        case "profit_asc": return a.profit - b.profit;
        case "profit_desc": return b.profit - a.profit;
        default: return compareDesc(parseISO(a.date), parseISO(b.date));
      }
    });
    return filtered;
  }, [combinedOperations, searchTerm, dateRange, sortOption, operationTypeFilter]);
  
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);

  useEffect(() => {
    const todayRange = getTodayRange();
    const currentMonthDateRange = getCurrentMonthRange(); 
    const lastMonthDateRange = getLastMonthRange(); 

    const opsToday = combinedOperations.filter(op => {
        const opDate = parseISO(op.date);
        return isValid(opDate) && isSameDay(opDate, todayRange.from);
    });
    
    const opsCurrentMonth = combinedOperations.filter(op => {
        const opDate = parseISO(op.date);
        return isValid(opDate) && isWithinInterval(opDate, { start: currentMonthDateRange.from, end: currentMonthDateRange.to });
    });
    const opsLastMonth = combinedOperations.filter(op => {
        const opDate = parseISO(op.date);
        return isValid(opDate) && isWithinInterval(opDate, { start: lastMonthDateRange.from, end: lastMonthDateRange.to });
    });

    const salesTodayCount = opsToday.filter(op => op.type === 'Venta').length;
    const servicesTodayCount = opsToday.filter(op => op.type !== 'Venta').length;
    const totalGeneratedToday = opsToday.reduce((sum, op) => sum + op.totalAmount, 0);
    const totalProfitToday = opsToday.reduce((sum, op) => sum + op.profit, 0);

    setSummaryData({
      operationsTodayCount: opsToday.length,
      salesTodayCount,
      servicesTodayCount,
      totalGeneratedToday,
      totalProfitToday,
      totalGeneratedCurrentMonth: opsCurrentMonth.reduce((sum, op) => sum + op.totalAmount, 0),
      profitCurrentMonth: opsCurrentMonth.reduce((sum, op) => sum + op.profit, 0),
      totalGeneratedLastMonth: opsLastMonth.reduce((sum, op) => sum + op.totalAmount, 0),
      profitLastMonth: opsLastMonth.reduce((sum, op) => sum + op.profit, 0),
      currentMonthFormatted: format(currentMonthDateRange.from, "MMMM yyyy", { locale: es }),
      lastMonthFormatted: format(lastMonthDateRange.from, "MMMM yyyy", { locale: es }),
    });
  }, [combinedOperations]);
  
  const setDateToToday = () => setDateRange({ from: startOfDay(new Date()), to: endOfDay(new Date()) });
  const setDateToThisWeek = () => setDateRange({ from: startOfWeek(new Date(), { weekStartsOn: 1 }), to: endOfWeek(new Date(), { weekStartsOn: 1 }) });
  const setDateToThisMonth = () => setDateRange({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) });


  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <>
      <div className="mb-6 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ops. del Día</CardTitle>
            <Activity className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">{summaryData?.operationsTodayCount ?? 0}</div>
             <p className="text-xs text-muted-foreground">
                {summaryData?.salesTodayCount ?? 0} Ventas, {summaryData?.servicesTodayCount ?? 0} Servicios
             </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Resultados del Día</CardTitle>
            <DollarSign className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">{formatCurrency(summaryData?.totalGeneratedToday ?? 0)}</div>
             <p className="text-xs text-muted-foreground">
                Ganancia: {formatCurrency(summaryData?.totalProfitToday ?? 0)}
             </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{summaryData?.currentMonthFormatted ?? "..."}</CardTitle>
            <DollarSign className="h-5 w-5 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">{formatCurrency(summaryData?.totalGeneratedCurrentMonth ?? 0)}</div>
            <p className="text-xs text-muted-foreground">Ganancia: {formatCurrency(summaryData?.profitCurrentMonth ?? 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{summaryData?.lastMonthFormatted ?? "..."}</CardTitle>
            <DollarSign className="h-5 w-5 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">{formatCurrency(summaryData?.totalGeneratedLastMonth ?? 0)}</div>
             <p className="text-xs text-muted-foreground">Ganancia: {formatCurrency(summaryData?.profitLastMonth ?? 0)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
                <CardTitle>Detalle de Operaciones</CardTitle>
            </div>
            <div className="pt-4 space-y-4">
                <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="flex items-center gap-2 flex-wrap">
                        <Button variant="secondary" onClick={setDateToToday}>Hoy</Button>
                        <Button variant="secondary" onClick={setDateToThisWeek}>Esta Semana</Button>
                        <Button variant="secondary" onClick={setDateToThisMonth}>Este Mes</Button>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                variant={"outline"}
                                className={cn(
                                    "w-full sm:w-auto justify-start text-left font-normal",
                                    !dateRange && "text-muted-foreground"
                                )}
                                >
                                <CalendarDateIcon className="mr-2 h-4 w-4" />
                                {dateRange?.from ? (
                                    dateRange.to ? (
                                    <>
                                        {format(dateRange.from, "LLL dd, y", { locale: es })} -{" "}
                                        {format(dateRange.to, "LLL dd, y", { locale: es })}
                                    </>
                                    ) : (
                                    format(dateRange.from, "LLL dd, y", { locale: es })
                                    )
                                ) : (
                                    <span>Seleccione rango</span>
                                )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                initialFocus
                                mode="range"
                                defaultMonth={dateRange?.from}
                                selected={dateRange}
                                onSelect={setDateRange}
                                numberOfMonths={2}
                                locale={es}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="relative flex-1 w-full">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="search"
                        placeholder="Buscar por ID, cliente, vehículo..."
                        className="w-full rounded-lg bg-white pl-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <Select value={operationTypeFilter} onValueChange={(value) => setOperationTypeFilter(value as OperationTypeFilter)}>
                        <SelectTrigger className="w-full sm:w-auto min-w-[180px] flex-1 sm:flex-initial bg-white">
                            <SelectValue placeholder="Filtrar por tipo" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas las Operaciones</SelectItem>
                            <SelectItem value="Venta">Solo Ventas</SelectItem>
                            <SelectItem value="Servicio">Solo Servicios</SelectItem>
                            <SelectItem value="C. Aceite">Solo Cambios de Aceite</SelectItem>
                            <SelectItem value="Pintura">Solo Pintura</SelectItem>
                        </SelectContent>
                    </Select>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="min-w-[150px] w-full sm:w-auto flex-1 sm:flex-initial bg-white">
                            <ListFilter className="mr-2 h-4 w-4" />
                            Organizar
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Ordenar por</DropdownMenuLabel>
                            <DropdownMenuRadioGroup value={sortOption} onValueChange={(value) => setSortOption(value as OperationSortOption)}>
                            <DropdownMenuRadioItem value="date_desc">Fecha (Más Reciente)</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="date_asc">Fecha (Más Antiguo)</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="amount_desc">Monto Total (Mayor a Menor)</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="amount_asc">Monto Total (Menor a Mayor)</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="profit_desc">Ganancia (Mayor a Menor)</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="profit_asc">Ganancia (Menor a Mayor)</DropdownMenuRadioItem>
                            </DropdownMenuRadioGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </CardHeader>
        <CardContent>
            {filteredAndSortedOperations.length > 0 ? (
                <div className="rounded-md border">
                    <Table>
                        <TableHeader className="bg-black">
                        <TableRow>
                            <TableHead className="font-bold text-white">Fecha</TableHead>
                            <TableHead className="font-bold text-white">Tipo</TableHead>
                            <TableHead className="font-bold text-white">ID Operación</TableHead>
                            <TableHead className="font-bold text-white">Descripción / Cliente / Vehículo</TableHead>
                            <TableHead className="text-right font-bold text-white">Monto Total (IVA Inc.)</TableHead>
                            <TableHead className="text-right font-bold text-white">Ganancia</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {filteredAndSortedOperations.map((op) => (
                            <TableRow key={`${op.type}-${op.id}`}>
                            <TableCell>{format(parseISO(op.date), "dd MMM yyyy, HH:mm", { locale: es })}</TableCell>
                            <TableCell>
                                <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                                    op.type === 'Venta' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' : 
                                    op.type === 'Servicio' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' :
                                    op.type === 'Pintura' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300' :
                                    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                                }`}>
                                    {op.type}
                                </span>
                            </TableCell>
                            <TableCell className="font-medium">{op.id}</TableCell>
                            <TableCell>
                                {op.type === 'Venta' ? (op.originalObject as SaleReceipt).customerName || 'Cliente Mostrador' : (op.originalObject as ServiceRecord).vehicleIdentifier || 'N/A'}
                                <p className="text-xs text-muted-foreground">{op.description}</p>
                            </TableCell>
                            <TableCell className="text-right">{formatCurrency(op.totalAmount)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(op.profit)}</TableCell>
                            </TableRow>
                        ))}
                        </TableBody>
                    </Table>
                </div>
            ) : (
                 <p className="text-muted-foreground text-center py-8">No hay operaciones que coincidan con los filtros.</p>
            )}
        </CardContent>
      </Card>
      
    </>
  );
}

