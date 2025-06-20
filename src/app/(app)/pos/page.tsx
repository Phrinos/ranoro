
"use client";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, ListFilter, CalendarIcon as CalendarDateIcon, Receipt, ShoppingCart, CreditCard, DollarSign, Filter as FilterIcon, Printer } from "lucide-react";
import { SalesTable } from "./components/sales-table"; 
import { PrintTicketDialog } from '@/components/ui/print-ticket-dialog';
import { TicketContent } from '@/components/ticket-content';
import { placeholderSales, placeholderInventory } from "@/lib/placeholder-data";
import type { SaleReceipt, InventoryItem, SaleItem, PaymentMethod } from "@/types";
import { useState, useEffect, useMemo } from "react";
import { format, parseISO, compareAsc, compareDesc, isWithinInterval, isValid, startOfDay, endOfDay } from "date-fns";
import { es } from 'date-fns/locale';
import type { DateRange } from "react-day-picker";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";

type SaleSortOption = 
  | "date_desc" | "date_asc"
  | "total_desc" | "total_asc"
  | "customer_asc" | "customer_desc";

export default function POSPage() {
  const router = useRouter();
  const [allSales, setAllSales] = useState<SaleReceipt[]>(placeholderSales);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [sortOption, setSortOption] = useState<SaleSortOption>("date_desc");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<PaymentMethod | "all">("all");

  const [isReprintDialogOpen, setIsReprintDialogOpen] = useState(false);
  const [selectedSaleForReprint, setSelectedSaleForReprint] = useState<SaleReceipt | null>(null);


  useEffect(() => {
    setAllSales(placeholderSales);
  }, []);

  const filteredAndSortedSales = useMemo(() => {
    let filtered = [...allSales];

    if (dateRange?.from) {
      filtered = filtered.filter(sale => {
        const saleDate = parseISO(sale.saleDate);
        if (!isValid(saleDate)) return false;
        const from = startOfDay(dateRange.from!);
        const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from!);
        return isWithinInterval(saleDate, { start: from, end: to });
      });
    }

    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(sale => 
        sale.id.toLowerCase().includes(lowerSearchTerm) ||
        (sale.customerName && sale.customerName.toLowerCase().includes(lowerSearchTerm)) ||
        sale.items.some(item => item.itemName.toLowerCase().includes(lowerSearchTerm))
      );
    }
    
    if (paymentMethodFilter !== "all") {
        filtered = filtered.filter(sale => sale.paymentMethod === paymentMethodFilter);
    }


    filtered.sort((a, b) => {
      switch (sortOption) {
        case "date_asc": return compareAsc(parseISO(a.saleDate), parseISO(b.saleDate));
        case "date_desc": return compareDesc(parseISO(a.saleDate), parseISO(b.saleDate));
        case "total_asc": return a.totalAmount - b.totalAmount;
        case "total_desc": return b.totalAmount - a.totalAmount;
        case "customer_asc": return (a.customerName || '').localeCompare(b.customerName || '');
        case "customer_desc": return (b.customerName || '').localeCompare(a.customerName || '');
        default: return compareDesc(parseISO(a.saleDate), parseISO(b.saleDate));
      }
    });
    return filtered;
  }, [allSales, searchTerm, dateRange, sortOption, paymentMethodFilter]);

  const summaryData = useMemo(() => {
    const totalSalesCount = filteredAndSortedSales.length;
    const totalRevenue = filteredAndSortedSales.reduce((sum, s) => sum + s.totalAmount, 0);
    
    let mostSoldItem: { name: string; quantity: number } | null = null;
    if (totalSalesCount > 0) {
      const itemCounts: Record<string, number> = {};
      filteredAndSortedSales.forEach(sale => {
        sale.items.forEach(item => {
          itemCounts[item.itemName] = (itemCounts[item.itemName] || 0) + item.quantity;
        });
      });
      let maxQty = 0;
      for (const itemName in itemCounts) {
        if (itemCounts[itemName] > maxQty) {
          maxQty = itemCounts[itemName];
          mostSoldItem = { name: itemName, quantity: maxQty };
        }
      }
    }

    let mostUsedPaymentMethod: string = "N/A";
    if (totalSalesCount > 0) {
        const paymentMethodCounts: Record<string, number> = {};
        filteredAndSortedSales.forEach(sale => {
            if(sale.paymentMethod) {
                paymentMethodCounts[sale.paymentMethod] = (paymentMethodCounts[sale.paymentMethod] || 0) + 1;
            }
        });
        let maxCount = 0;
        for (const method in paymentMethodCounts) {
            if (paymentMethodCounts[method] > maxCount) {
                maxCount = paymentMethodCounts[method];
                mostUsedPaymentMethod = method;
            }
        }
    }

    return { totalSalesCount, totalRevenue, mostSoldItem, mostUsedPaymentMethod };
  }, [filteredAndSortedSales]);

  const paymentMethodsForFilter: (PaymentMethod | "all")[] = ["all", "Efectivo", "Tarjeta", "Transferencia", "Efectivo+Transferencia", "Tarjeta+Transferencia"];

  const handleReprintSale = (sale: SaleReceipt) => {
    setSelectedSaleForReprint(sale);
    setIsReprintDialogOpen(true);
  };

  const handleReprintDialogClose = () => {
    setIsReprintDialogOpen(false);
    setSelectedSaleForReprint(null);
  };


  return (
    <>
      <PageHeader
        title="Registro de Ventas"
        description="Consulta, filtra y ordena todas las ventas de mostrador."
      />

      <div className="mb-6 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Ventas</CardTitle>
            <Receipt className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">{summaryData.totalSalesCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ingresos Totales</CardTitle>
            <DollarSign className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">${summaryData.totalRevenue.toLocaleString('es-ES')}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Artículo Más Vendido</CardTitle>
            <ShoppingCart className="h-5 w-5 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold font-headline truncate" title={summaryData.mostSoldItem?.name}>
                {summaryData.mostSoldItem ? `${summaryData.mostSoldItem.name} (${summaryData.mostSoldItem.quantity} uds.)` : "N/A"}
            </div>
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pago Más Usado</CardTitle>
            <CreditCard className="h-5 w-5 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold font-headline">{summaryData.mostUsedPaymentMethod}</div>
          </CardContent>
        </Card>
      </div>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:flex-wrap">
        <div className="relative flex-1 min-w-[200px] sm:min-w-[300px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar por ID, cliente, artículo..."
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="min-w-[150px] flex-1 sm:flex-initial">
              <ListFilter className="mr-2 h-4 w-4" />
              Ordenar
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Ordenar por</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={sortOption} onValueChange={(value) => setSortOption(value as SaleSortOption)}>
              <DropdownMenuRadioItem value="date_desc">Fecha (Más Reciente)</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="date_asc">Fecha (Más Antiguo)</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="total_desc">Monto Total (Mayor a Menor)</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="total_asc">Monto Total (Menor a Mayor)</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="customer_asc">Cliente (A-Z)</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="customer_desc">Cliente (Z-A)</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="min-w-[180px] flex-1 sm:flex-initial">
              <FilterIcon className="mr-2 h-4 w-4" />
              Filtrar Pago
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Método de Pago</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={paymentMethodFilter} onValueChange={(value) => setPaymentMethodFilter(value as PaymentMethod | "all")}>
              {paymentMethodsForFilter.map(method => (
                <DropdownMenuRadioItem key={method} value={method}>
                  {method === "all" ? "Todos" : method}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <SalesTable sales={filteredAndSortedSales} onReprintTicket={handleReprintSale} />

      {isReprintDialogOpen && selectedSaleForReprint && (
        <PrintTicketDialog
          open={isReprintDialogOpen}
          onOpenChange={setIsReprintDialogOpen}
          title="Reimprimir Ticket de Venta"
          onDialogClose={handleReprintDialogClose}
        >
          <TicketContent sale={selectedSaleForReprint} />
        </PrintTicketDialog>
      )}
    </>
  );
}
