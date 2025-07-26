

"use client";

import { useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  calculateSaleProfit,
} from "@/lib/placeholder-data";
import type { InventoryItem, FinancialOperation, PaymentMethod, ServiceTypeRecord, SaleReceipt, ServiceRecord, Technician } from "@/types";
import {
  format,
  parseISO,
  isWithinInterval,
  isValid,
  startOfDay, endOfDay, startOfWeek, endOfWeek, isSameDay, startOfMonth, endOfMonth, compareDesc, compareAsc
} from "date-fns";
import { es } from 'date-fns/locale';
import { CalendarIcon, LineChart, ListFilter, Filter, Search } from "lucide-react";
import { cn, formatCurrency, getPaymentMethodVariant } from "@/lib/utils";
import type { DateRange } from "react-day-picker";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { parseDate } from '@/lib/forms';

interface ReporteOperacionesContentProps {
  allSales: SaleReceipt[];
  allServices: ServiceRecord[];
  allInventory: InventoryItem[];
  serviceTypes: ServiceTypeRecord[];
}

export function ReporteOperacionesContent({ allSales, allServices, allInventory, serviceTypes }: ReporteOperacionesContentProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const now = new Date();
    return { from: startOfMonth(now), to: endOfMonth(now) };
  });
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>(dateRange);

  const [reporteOpSearchTerm, setReporteOpSearchTerm] = useState("");
  const [reporteOpTypeFilter, setReporteOpTypeFilter] = useState<string>("all");
  const [reporteOpSortOption, setReporteOpSortOption] = useState<string>("date_desc");
  const [reporteOpPaymentMethodFilter, setReporteOpPaymentMethodFilter] = useState<PaymentMethod | 'all'>("all");

  const combinedOperations = useMemo((): FinancialOperation[] => {
    const saleOperations: FinancialOperation[] = allSales.map(s => ({
        id: s.id, date: s.saleDate, type: 'Venta', 
        description: s.items.map(i => i.itemName).join(', '), 
        totalAmount: s.totalAmount, profit: calculateSaleProfit(s, allInventory), originalObject: s 
    }));
    
    const serviceOperations: FinancialOperation[] = allServices
        .filter(s => s.status === 'Entregado' || s.status === 'Completado')
        .map(s => {
            // Prioritize delivery date for financials, but use service date as fallback (for migrated data)
            const dateToUse = s.deliveryDateTime || s.serviceDate;
            const description = s.description || (s.serviceItems || []).map(i => i.name).join(', ');
            return {
                id: s.id, date: dateToUse, type: s.serviceType || 'Servicio General', 
                description: description, totalAmount: s.totalCost, 
                profit: s.serviceProfit || 0, originalObject: s 
            };
        });
        
    return [...saleOperations, ...serviceOperations];
  }, [allSales, allServices, allInventory]);

  const filteredAndSortedOperations = useMemo(() => {
    if (!dateRange?.from) return [];
    const from = startOfDay(dateRange.from);
    const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);
    
    let list = combinedOperations.filter(op => {
      if (!op.date) return false;
      const parsedDate = parseDate(op.date);
      return isValid(parsedDate) && isWithinInterval(parsedDate, { start: from, end: to });
    });
    
    if (reporteOpTypeFilter !== 'all') { list = list.filter(op => op.type === reporteOpTypeFilter); }
    if (reporteOpPaymentMethodFilter !== 'all') { list = list.filter(op => (op.originalObject as SaleReceipt | ServiceRecord).paymentMethod === reporteOpPaymentMethodFilter); }
    if (reporteOpSearchTerm) { list = list.filter(op => op.id.toLowerCase().includes(reporteOpSearchTerm.toLowerCase()) || op.description.toLowerCase().includes(reporteOpSearchTerm.toLowerCase())); }
    
    list.sort((a, b) => {
        switch (reporteOpSortOption) {
            case 'date_asc': return compareAsc(parseDate(a.date!)!, parseDate(b.date!)!);
            case 'amount_desc': return b.totalAmount - a.totalAmount;
            case 'amount_asc': return a.totalAmount - b.totalAmount;
            case 'profit_desc': return b.profit - a.profit;
            case 'profit_asc': return a.profit - b.profit;
            case 'date_desc': default: return compareDesc(parseDate(a.date!)!, parseDate(b.date!)!);
        }
    });
    return list;
  }, [combinedOperations, dateRange, reporteOpSearchTerm, reporteOpTypeFilter, reporteOpPaymentMethodFilter, reporteOpSortOption]);

  const handleApplyDateFilter = () => {
    setDateRange(tempDateRange);
    setIsCalendarOpen(false);
  };

  const getOperationTypeVariant = (type: string) => {
    switch (type) {
        case 'Venta': return 'secondary'; case 'Servicio General': return 'default'; case 'Cambio de Aceite': return 'blue';
        case 'Pintura': return 'purple'; default: return 'outline';
    }
  };
  
  const paymentMethods: (PaymentMethod | 'all')[] = ['all', 'Efectivo', 'Tarjeta', 'Transferencia', 'Efectivo+Transferencia', 'Tarjeta+Transferencia', 'Efectivo/Tarjeta'];

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Detalle de Operaciones</h2>
        <p className="text-muted-foreground">Ventas y servicios completados en el período seleccionado.</p>
      </div>
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex-1 w-full">
            <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input type="search" placeholder="Buscar por ID o descripción..." className="w-full rounded-lg bg-card pl-8" value={reporteOpSearchTerm} onChange={(e) => setReporteOpSearchTerm(e.target.value)} />
            </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto sm:justify-end">
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex-1 sm:flex-initial bg-card">
                <Filter className="mr-2 h-4 w-4" />
                <span>Tipo: {reporteOpTypeFilter === 'all' ? 'Todos' : reporteOpTypeFilter}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Filtrar por Tipo</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={reporteOpTypeFilter} onValueChange={setReporteOpTypeFilter}>
                <DropdownMenuRadioItem value="all">Todos</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="Venta">Venta</DropdownMenuRadioItem>
                {serviceTypes.map((type) => (
                  <DropdownMenuRadioItem key={type.id} value={type.name}>{type.name}</DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex-1 sm:flex-initial bg-card">
                <Filter className="mr-2 h-4 w-4" />
                <span>Pago: {reporteOpPaymentMethodFilter === 'all' ? 'Todos' : reporteOpPaymentMethodFilter}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Filtrar por Método de Pago</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={reporteOpPaymentMethodFilter} onValueChange={(v) => setReporteOpPaymentMethodFilter(v as PaymentMethod | 'all')}>
                {paymentMethods.map(method => (
                  <DropdownMenuRadioItem key={method} value={method}>{method === 'all' ? 'Todos' : method}</DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex-1 sm:flex-initial bg-card">
                <ListFilter className="mr-2 h-4 w-4" />
                <span>Ordenar por</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Ordenar por</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={reporteOpSortOption} onValueChange={setReporteOpSortOption}>
                <DropdownMenuRadioItem value="date_desc">Fecha (Más Reciente)</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="date_asc">Fecha (Más Antiguo)</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="amount_desc">Monto (Mayor a Menor)</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="amount_asc">Monto (Menor a Mayor)</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="profit_desc">Ganancia (Mayor a Menor)</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="profit_asc">Ganancia (Menor a Mayor)</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <Card>
        <CardContent className="pt-6">
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader className="bg-black">
                <TableRow>
                  <TableHead className="text-white">Fecha</TableHead>
                  <TableHead className="text-white">Tipo</TableHead>
                  <TableHead className="text-white">ID</TableHead>
                  <TableHead className="text-white">Descripción</TableHead>
                  <TableHead className="text-right text-white">Monto</TableHead>
                  <TableHead className="text-right text-white">Ganancia</TableHead>
                  <TableHead className="text-right text-white">Método Pago</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedOperations.length > 0 ? (
                  filteredAndSortedOperations.map(op => (
                    <TableRow key={`${op.type}-${op.id}`}>
                      <TableCell>{op.date ? format(parseDate(op.date)!, "dd MMM yy, HH:mm", { locale: es }) : 'N/A'}</TableCell>
                      <TableCell><Badge variant={getOperationTypeVariant(op.type)} className={cn(op.type === 'Venta' && 'bg-black text-white hover:bg-black/80')}>{op.type}</Badge></TableCell>
                      <TableCell>{op.id}</TableCell>
                      <TableCell className="max-w-xs truncate">{op.description}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(op.totalAmount)}</TableCell>
                      <TableCell className="text-right font-semibold text-green-600">{formatCurrency(op.profit)}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={getPaymentMethodVariant((op.originalObject as any).paymentMethod)}>
                            {(op.originalObject as any).paymentMethod || 'Efectivo'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
                        <LineChart className="h-12 w-12 mb-2" />
                        <h3 className="text-lg font-semibold text-foreground">Sin Operaciones</h3>
                        <p className="text-sm">No se encontraron ventas o servicios en el período seleccionado.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
