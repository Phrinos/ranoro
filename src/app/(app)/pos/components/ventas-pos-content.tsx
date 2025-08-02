

"use client";

import React, { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Search, ListFilter, CalendarIcon as CalendarDateIcon, Filter, PlusCircle } from "lucide-react";
import { SalesTable } from "./sales-table";
import type { SaleReceipt, InventoryItem, PaymentMethod } from "@/types";
import { format, startOfDay, endOfDay, isWithinInterval, isValid, parseISO, compareDesc, startOfWeek, subDays, startOfMonth, isSameDay } from "date-fns";
import { es } from 'date-fns/locale';
import type { DateRange } from "react-day-picker";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

type SaleSortOption = "date_desc" | "date_asc" | "total_desc" | "total_asc" | "customer_asc" | "customer_desc";

interface VentasPosContentProps {
  allSales: SaleReceipt[];
  allInventory: InventoryItem[];
  onReprintTicket: (sale: SaleReceipt) => void;
  onViewSale: (sale: SaleReceipt) => void;
}

export function VentasPosContent({ allSales, allInventory, onReprintTicket, onViewSale }: VentasPosContentProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const now = new Date();
    return { from: startOfMonth(now), to: endOfMonth(now) };
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOption, setSortOption] = useState<SaleSortOption>("date_desc");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<PaymentMethod | "all">("all");

  const filteredAndSortedSales = useMemo(() => {
    let list = [...allSales];

    if (dateRange?.from) {
      const from = startOfDay(dateRange.from);
      const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(from);
      list = list.filter(sale => isValid(parseISO(sale.saleDate)) && isWithinInterval(parseISO(sale.saleDate), { start: from, end: to }));
    }
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(s => s.id.toLowerCase().includes(q) || s.customerName?.toLowerCase().includes(q) || s.items.some(i => i.itemName.toLowerCase().includes(q)));
    }
    if (paymentMethodFilter !== "all") {
      list = list.filter(s => s.paymentMethod === paymentMethodFilter);
    }
    
    list.sort((a, b) => {
        const isACancelled = a.status === 'Cancelado';
        const isBCancelled = b.status === 'Cancelado';
        if (isACancelled && !isBCancelled) return 1;
        if (!isACancelled && isBCancelled) return -1;
        return compareDesc(parseISO(a.saleDate), parseISO(b.saleDate));
    });
    return list;
  }, [dateRange, searchTerm, paymentMethodFilter, allSales]);

  const paymentMethods: (PaymentMethod | 'all')[] = ['all', 'Efectivo', 'Tarjeta', 'Transferencia', 'Efectivo+Transferencia', 'Tarjeta+Transferencia', 'Efectivo/Tarjeta'];

  const setDateToToday = () => setDateRange({ from: startOfDay(new Date()), to: endOfDay(new Date()) });
  const setDateToYesterday = () => {
    const yesterday = subDays(new Date(), 1);
    setDateRange({ from: startOfDay(yesterday), to: endOfDay(yesterday) });
  };
  const setDateToThisWeek = () => setDateRange({ from: startOfWeek(new Date(), { weekStartsOn: 1 }), to: endOfWeek(new Date(), { weekStartsOn: 1 }) });
  const setDateToThisMonth = () => setDateRange({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) });

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Historial de Ventas</h2>
            <p className="text-muted-foreground">Consulta, filtra y reimprime tickets.</p>
          </div>
          <Button asChild className="flex-1 sm:flex-initial">
            <Link href="/pos/nuevo"><PlusCircle className="mr-2 h-4 w-4" />Nueva Venta</Link>
          </Button>
        </div>
        <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 flex-wrap w-full justify-start sm:justify-end">
                <Button variant="outline" size="sm" onClick={setDateToToday} className="bg-card">Hoy</Button>
                <Button variant="outline" size="sm" onClick={setDateToYesterday} className="bg-card">Ayer</Button>
                <Button variant="outline" size="sm" onClick={setDateToThisWeek} className="bg-card">Semana</Button>
                <Button variant="outline" size="sm" onClick={setDateToThisMonth} className="bg-card">Mes</Button>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant={"outline"} className={cn("w-full sm:w-[240px] justify-start text-left font-normal bg-card", !dateRange && "text-muted-foreground")}>
                            <CalendarDateIcon className="mr-2 h-4 w-4" />
                            {dateRange?.from ? (dateRange.to && !isSameDay(dateRange.from, dateRange.to) ? (`${format(dateRange.from, "LLL dd, y", { locale: es })} - ${format(dateRange.to, "LLL dd, y", { locale: es })}`) : format(dateRange.from, "MMMM dd, yyyy", { locale: es })) : (<span>Seleccione rango</span>)}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                        <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2} locale={es} />
                    </PopoverContent>
                </Popover>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
                <div className="relative flex-1 w-full sm:max-w-xs">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input type="search" placeholder="Buscar por ID, cliente, artículo..." className="w-full rounded-lg bg-card pl-8" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="outline" className="flex-1 sm:flex-initial bg-card"><ListFilter className="mr-2 h-4 w-4" />Ordenar</Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Ordenar por</DropdownMenuLabel>
                            <DropdownMenuRadioGroup value={sortOption} onValueChange={(v) => setSortOption(v as SaleSortOption)}>
                                <DropdownMenuRadioItem value="date_desc">Más Reciente</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="date_asc">Más Antiguo</DropdownMenuRadioItem>
                            </DropdownMenuRadioGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="outline" className="flex-1 sm:flex-initial bg-card"><Filter className="mr-2 h-4 w-4" />Pago</Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Método de Pago</DropdownMenuLabel>
                            <DropdownMenuRadioGroup value={paymentMethodFilter} onValueChange={(v) => setPaymentMethodFilter(v as PaymentMethod | 'all')}>
                                {paymentMethods.map(method => (<DropdownMenuRadioItem key={method} value={method}>{method === 'all' ? 'Todos' : method}</DropdownMenuRadioItem>))}
                            </DropdownMenuRadioGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        <SalesTable
          sales={filteredAndSortedSales}
          onReprintTicket={onReprintTicket}
          inventoryItems={allInventory}
          onEditSale={onViewSale}
        />
      </CardContent>
    </Card>
  );
}

