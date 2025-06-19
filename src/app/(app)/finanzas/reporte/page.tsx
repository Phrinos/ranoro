
"use client";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, ListFilter, CalendarIcon as CalendarDateIcon, DollarSign, LineChart, ShoppingCart, Wrench, TrendingUp, Activity } from "lucide-react";
import { placeholderSales, placeholderServiceRecords, placeholderInventory, getCurrentMonthRange, getLastMonthRange, getTodayRange } from "@/lib/placeholder-data";
import type { SaleReceipt, ServiceRecord, FinancialOperation, InventoryItem } from "@/types";
import { useState, useEffect, useMemo } from "react";
import { format, parseISO, compareAsc, compareDesc, isWithinInterval, isValid, startOfDay, endOfDay, isSameDay } from "date-fns";
import { es } from 'date-fns/locale';
import type { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";


type OperationSortOption = 
  | "date_desc" | "date_asc"
  | "amount_desc" | "amount_asc"
  | "profit_desc" | "profit_asc";

type OperationTypeFilter = "all" | "Venta" | "Servicio";

export default function FinancialReportPage() {
  const [allSales, setAllSales] = useState<SaleReceipt[]>(placeholderSales);
  const [allServices, setAllServices] = useState<ServiceRecord[]>(placeholderServiceRecords);
  const [inventory, setInventory] = useState<InventoryItem[]>(placeholderInventory);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [sortOption, setSortOption] = useState<OperationSortOption>("date_desc");
  const [operationTypeFilter, setOperationTypeFilter] = useState<OperationTypeFilter>("all");

  const calculateSaleProfit = (sale: SaleReceipt): number => {
    return sale.items.reduce((profit, saleItem) => {
        const inventoryItem = inventory.find(inv => inv.id === saleItem.inventoryItemId);
        const costPrice = inventoryItem ? inventoryItem.unitPrice : 0; // Cost from inventory
        const sellingPrice = saleItem.unitPrice; // Selling price from sale item
        return profit + (sellingPrice - costPrice) * saleItem.quantity;
    }, 0);
  };

  const combinedOperations = useMemo((): FinancialOperation[] => {
    const salesOperations: FinancialOperation[] = allSales.map(sale => ({
      id: sale.id,
      date: sale.saleDate,
      type: 'Venta',
      description: `Venta a ${sale.customerName || 'Cliente Mostrador'} - ${sale.items.length} artículo(s)`,
      totalAmount: sale.totalAmount,
      profit: calculateSaleProfit(sale),
      originalObject: sale,
    }));

    const serviceOperations: FinancialOperation[] = allServices.map(service => ({
      id: service.id,
      date: service.serviceDate,
      type: 'Servicio',
      description: service.description,
      totalAmount: service.totalCost,
      profit: service.serviceProfit || 0,
      originalObject: service,
    }));

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
        (op.type === 'Servicio' && (op.originalObject as ServiceRecord).vehicleIdentifier?.toLowerCase().includes(lowerSearchTerm))
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

  const summaryData = useMemo(() => {
    const todayRange = getTodayRange();
    const currentMonthRange = getCurrentMonthRange();
    const lastMonthRange = getLastMonthRange();

    const opsToday = combinedOperations.filter(op => isSameDay(parseISO(op.date), todayRange.from));
    const opsCurrentMonth = combinedOperations.filter(op => isWithinInterval(parseISO(op.date), currentMonthRange));
    const opsLastMonth = combinedOperations.filter(op => isWithinInterval(parseISO(op.date), lastMonthRange));

    return {
      operationsTodayCount: opsToday.length,
      totalGeneratedCurrentMonth: opsCurrentMonth.reduce((sum, op) => sum + op.totalAmount, 0),
      profitCurrentMonth: opsCurrentMonth.reduce((sum, op) => sum + op.profit, 0),
      totalGeneratedLastMonth: opsLastMonth.reduce((sum, op) => sum + op.totalAmount, 0),
      profitLastMonth: opsLastMonth.reduce((sum, op) => sum + op.profit, 0),
      currentMonthFormatted: format(currentMonthRange.from, "MMMM yyyy", { locale: es }),
      lastMonthFormatted: format(lastMonthRange.from, "MMMM yyyy", { locale: es }),
    };
  }, [combinedOperations]);

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <>
      <PageHeader
        title="Reporte Financiero"
        description="Consolida ventas y servicios para un análisis financiero completo."
      />

      <div className="mb-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ops. del Día</CardTitle>
            <Activity className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">{summaryData.operationsTodayCount}</div>
             <p className="text-xs text-muted-foreground">Ventas y Servicios Hoy</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Generado (Mes Actual)</CardTitle>
            <DollarSign className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">{formatCurrency(summaryData.totalGeneratedCurrentMonth)}</div>
            <p className="text-xs text-muted-foreground">{summaryData.currentMonthFormatted}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ganancia (Mes Actual)</CardTitle>
            <TrendingUp className="h-5 w-5 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">{formatCurrency(summaryData.profitCurrentMonth)}</div>
            <p className="text-xs text-muted-foreground">{summaryData.currentMonthFormatted}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Generado (Mes Pasado)</CardTitle>
            <DollarSign className="h-5 w-5 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">{formatCurrency(summaryData.totalGeneratedLastMonth)}</div>
             <p className="text-xs text-muted-foreground">{summaryData.lastMonthFormatted}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ganancia (Mes Pasado)</CardTitle>
            <TrendingUp className="h-5 w-5 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">{formatCurrency(summaryData.profitLastMonth)}</div>
             <p className="text-xs text-muted-foreground">{summaryData.lastMonthFormatted}</p>
          </CardContent>
        </Card>
      </div>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:flex-wrap">
        <div className="relative flex-1 min-w-[200px] sm:min-w-[300px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar por ID, cliente, vehículo..."
            className="w-full rounded-lg bg-background pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn(
                "min-w-[240px] justify-start text-left font-normal flex-1 sm:flex-initial",
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
                <span>Seleccione rango de fechas</span>
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
         <Select value={operationTypeFilter} onValueChange={(value) => setOperationTypeFilter(value as OperationTypeFilter)}>
          <SelectTrigger className="w-full sm:w-auto min-w-[180px] flex-1 sm:flex-initial">
            <SelectValue placeholder="Filtrar por tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las Operaciones</SelectItem>
            <SelectItem value="Venta">Solo Ventas</SelectItem>
            <SelectItem value="Servicio">Solo Servicios</SelectItem>
          </SelectContent>
        </Select>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="min-w-[150px] flex-1 sm:flex-initial">
              <ListFilter className="mr-2 h-4 w-4" />
              Ordenar
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

      <Card>
        <CardHeader>
            <CardTitle>Detalle de Operaciones</CardTitle>
        </CardHeader>
        <CardContent>
            {filteredAndSortedOperations.length > 0 ? (
                <div className="rounded-md border overflow-x-auto">
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>ID Operación</TableHead>
                            <TableHead>Descripción / Cliente / Vehículo</TableHead>
                            <TableHead className="text-right">Monto Total</TableHead>
                            <TableHead className="text-right">Ganancia</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {filteredAndSortedOperations.map((op) => (
                            <TableRow key={`${op.type}-${op.id}`}>
                            <TableCell>{format(parseISO(op.date), "dd MMM yyyy, HH:mm", { locale: es })}</TableCell>
                            <TableCell>
                                <span className={`px-2 py-1 text-xs rounded-full font-medium ${op.type === 'Venta' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                    {op.type}
                                </span>
                            </TableCell>
                            <TableCell className="font-medium">{op.id}</TableCell>
                            <TableCell className="max-w-xs truncate">
                                {op.type === 'Venta' ? (op.originalObject as SaleReceipt).customerName || 'N/A' : (op.originalObject as ServiceRecord).vehicleIdentifier}
                                <p className="text-xs text-muted-foreground truncate">{op.description}</p>
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
