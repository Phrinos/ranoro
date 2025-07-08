
"use client";

import { useState, useMemo, useEffect, useCallback, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Search, ListFilter, CalendarIcon as CalendarDateIcon, Receipt, ShoppingCart, DollarSign, Wallet, ArrowUpCircle, ArrowDownCircle, Coins, Wrench, BarChart2, Printer, PlusCircle, Copy, Filter, Eye, Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import { SalesTable } from "./components/sales-table";
import { PrintTicketDialog } from '@/components/ui/print-ticket-dialog';
import { TicketContent } from '@/components/ticket-content';
import { placeholderSales, placeholderInventory, placeholderServiceRecords, calculateSaleProfit, persistToFirestore, hydrateReady, AUTH_USER_LOCALSTORAGE_KEY, placeholderCashDrawerTransactions, placeholderInitialCashBalance } from "@/lib/placeholder-data";
import type { SaleReceipt, PaymentMethod, User, ServiceRecord, InventoryItem, FinancialOperation, CashDrawerTransaction, InitialCashBalance, AggregatedInventoryItem } from "@/types";
import { format, parseISO, compareDesc, isWithinInterval, isValid, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isSameDay } from "date-fns";
import { es } from 'date-fns/locale';
import type { DateRange } from "react-day-picker";
import Link from "next/link";
import { cn, formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { ViewSaleDialog } from "./components/view-sale-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CorteDiaContent } from './caja/components/corte-caja-content';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Schemas and Types
const cashTransactionSchema = z.object({
  concept: z.string().min(3, "El concepto debe tener al menos 3 caracteres."),
  amount: z.coerce.number().min(0.01, "El monto debe ser mayor a 0."),
});
type CashTransactionFormValues = z.infer<typeof cashTransactionSchema>;

type SaleSortOption = "date_desc" | "date_asc" | "total_desc" | "total_asc" | "customer_asc" | "customer_desc";
type OperationSortOption = "date_desc" | "date_asc" | "amount_desc" | "amount_asc" | "profit_desc" | "profit_asc";
type InventoryReportSortOption = "quantity_desc" | "quantity_asc" | "revenue_desc" | "revenue_asc" | "name_asc" | "name_desc";
type OperationTypeFilter = "all" | "Venta" | "Servicio" | "C. Aceite" | "Pintura";

function CashTransactionForm({ type, onSubmit }: { type: 'Entrada' | 'Salida', onSubmit: (type: 'Entrada' | 'Salida', values: CashTransactionFormValues) => void }) {
  const form = useForm<CashTransactionFormValues>({ resolver: zodResolver(cashTransactionSchema) });
  const { handleSubmit, reset } = form;
  const onFormSubmit = (data: CashTransactionFormValues) => { onSubmit(type, data); reset(); };
  return (
    <Form {...form}>
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="concept"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Concepto</FormLabel>
              <FormControl>
                <Textarea placeholder={type === 'Entrada' ? 'Fondo de caja' : 'Compra de insumos'} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Monto</FormLabel>
              <FormControl>
                <Input type="number" placeholder="0.00" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full">Registrar {type}</Button>
      </form>
    </Form>
  )
}

function PosPageComponent() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'informe';

  const [version, setVersion] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [activeTab, setActiveTab] = useState(defaultTab);
  
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  const [ventasSearchTerm, setVentasSearchTerm] = useState("");
  const [ventasSortOption, setVentasSortOption] = useState<SaleSortOption>("date_desc");
  const [ventasPaymentMethodFilter, setVentasPaymentMethodFilter] = useState<PaymentMethod | "all">("all");
  const [isReprintDialogOpen, setIsReprintDialogOpen] = useState(false);
  const [selectedSaleForReprint, setSelectedSaleForReprint] = useState<SaleReceipt | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<SaleReceipt | null>(null);
  const ticketContentRef = useRef<HTMLDivElement>(null);
  
  const [isInitialBalanceDialogOpen, setIsInitialBalanceDialogOpen] = useState(false);
  const [initialBalanceAmount, setInitialBalanceAmount] = useState<number | ''>('');
  const [isCorteDialogOpen, setIsCorteDialogOpen] = useState(false);

  const [reporteOpSearchTerm, setReporteOpSearchTerm] = useState("");
  const [reporteOpSortOption, setReporteOpSortOption] = useState<OperationSortOption>("date_desc");
  const [reporteOpTypeFilter, setReporteOpTypeFilter] = useState<OperationTypeFilter>("all");
  const [reporteInvSearchTerm, setReporteInvSearchTerm] = useState("");
  const [reporteInvSortOption, setReporteInvSortOption] = useState<InventoryReportSortOption>("quantity_desc");

  useEffect(() => {
    hydrateReady.then(() => setHydrated(true));
    const forceUpdate = () => setVersion(v => v + 1);
    window.addEventListener('databaseUpdated', forceUpdate);
    return () => window.removeEventListener('databaseUpdated', forceUpdate);
  }, []);
  
  useEffect(() => {
    if(hydrated && !dateRange) {
        setDateRange({ from: startOfDay(new Date()), to: endOfDay(new Date()) });
    }
  }, [hydrated, dateRange]);

  const filteredAndSortedSales = useMemo(() => {
    if (!hydrated) return [];
    let list = [...placeholderSales];

    if (dateRange?.from) {
      const from = startOfDay(dateRange.from);
      const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);
      list = list.filter(sale => isValid(parseISO(sale.saleDate)) && isWithinInterval(parseISO(sale.saleDate), { start: from, end: to }));
    }
    if (ventasSearchTerm) {
      const q = ventasSearchTerm.toLowerCase();
      list = list.filter(s => s.id.toLowerCase().includes(q) || s.customerName?.toLowerCase().includes(q) || s.items.some(i => i.itemName.toLowerCase().includes(q)));
    }
    if (ventasPaymentMethodFilter !== "all") {
      list = list.filter(s => s.paymentMethod === ventasPaymentMethodFilter);
    }
    list.sort((a, b) => compareDesc(parseISO(a.saleDate), parseISO(b.saleDate)));
    return list;
  }, [dateRange, ventasSearchTerm, ventasPaymentMethodFilter, ventasSortOption, hydrated, version]);

  const ventasSummaryData = useMemo(() => {
    const totalSalesCount = filteredAndSortedSales.filter(s => s.status !== 'Cancelado').length;
    const totalRevenue = filteredAndSortedSales.filter(s => s.status !== 'Cancelado').reduce((sum, s) => sum + s.totalAmount, 0);
    const totalProfit = filteredAndSortedSales.filter(s => s.status !== 'Cancelado').reduce((sum, s) => sum + calculateSaleProfit(s, placeholderInventory), 0);
    
    const itemCounts = filteredAndSortedSales.filter(s => s.status !== 'Cancelado').flatMap(s => s.items).reduce((acc, item) => {
        acc[item.itemName] = (acc[item.itemName] || 0) + item.quantity;
        return acc;
    }, {} as Record<string, number>);

    let mostSoldItem: { name: string; quantity: number } | null = null;
    const entries = Object.entries(itemCounts);
    if (entries.length > 0) {
      const topEntry = entries.reduce((prev, curr) => (curr[1] > prev[1] ? curr : prev));
      if (topEntry) {
        mostSoldItem = { name: topEntry[0], quantity: topEntry[1] };
      }
    }
    
    return { 
        totalSalesCount, 
        totalRevenue, 
        totalProfit, 
        mostSoldItem
    };
  }, [filteredAndSortedSales]);

  const cajaSummaryData = useMemo(() => {
    if (!hydrated || !dateRange?.from) return { initialBalance: 0, totalCashSales: 0, totalCashIn: 0, totalCashOut: 0, finalCashBalance: 0, salesByPaymentMethod: {}, totalSales: 0, totalServices: 0 };
    const start = startOfDay(dateRange.from);
    const end = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);
    const initialBalanceRecord = placeholderInitialCashBalance;
    const initialBalance = (initialBalanceRecord && isSameDay(parseISO(initialBalanceRecord.date), start)) ? initialBalanceRecord.amount : 0;
    const transactionsInRange = placeholderCashDrawerTransactions.filter(t => isValid(parseISO(t.date)) && isWithinInterval(parseISO(t.date), { start, end }));
    const salesInRange = placeholderSales.filter(s => s.status !== 'Cancelado' && isValid(parseISO(s.saleDate)) && isWithinInterval(parseISO(s.saleDate), { start, end }));
    const servicesInRange = placeholderServiceRecords.filter(s => {
        const dateToParse = s.deliveryDateTime || s.serviceDate;
        if (!dateToParse) return false;
        const sDate = parseISO(dateToParse);
        return s.status === 'Completado' && isValid(sDate) && isWithinInterval(sDate, { start, end });
    });
    const totalCashSales = salesInRange.filter(s => s.paymentMethod?.includes('Efectivo')).reduce((sum, s) => sum + s.totalAmount, 0) + servicesInRange.filter(s => s.paymentMethod?.includes('Efectivo')).reduce((sum, s) => sum + s.totalCost, 0);
    const totalCashIn = transactionsInRange.filter(t => t.type === 'Entrada').reduce((sum, t) => sum + t.amount, 0);
    const totalCashOut = transactionsInRange.filter(t => t.type === 'Salida').reduce((sum, t) => sum + t.amount, 0);
    const finalCashBalance = initialBalance + totalCashSales + totalCashIn - totalCashOut;
    const salesByPaymentMethod: Record<string, number> = {};
    [...salesInRange, ...servicesInRange].forEach(op => {
      const method = op.paymentMethod || 'Efectivo';
      const amount = 'totalAmount' in op ? op.totalAmount : op.totalCost;
      salesByPaymentMethod[method] = (salesByPaymentMethod[method] || 0) + amount;
    });
    return { initialBalance, totalCashSales, totalCashIn, totalCashOut, finalCashBalance, salesByPaymentMethod, totalSales: salesInRange.length, totalServices: servicesInRange.length };
  }, [hydrated, dateRange, version]);
  
  const combinedOperations = useMemo((): FinancialOperation[] => {
    if (!hydrated) return [];
    const saleOperations: FinancialOperation[] = placeholderSales
      .filter(s => s.status !== 'Cancelado')
      .map(sale => ({
      id: sale.id,
      date: sale.saleDate,
      type: 'Venta',
      description: sale.items.map(i => i.itemName).join(', '),
      totalAmount: sale.totalAmount,
      profit: calculateSaleProfit(sale, placeholderInventory),
      originalObject: sale,
    }));
    const serviceOperations: FinancialOperation[] = placeholderServiceRecords
      .filter(s => s.status === 'Completado')
      .map(service => ({
      id: service.id,
      date: service.deliveryDateTime || service.serviceDate,
      type: service.serviceType || 'Servicio',
      description: service.description || (service.serviceItems || []).map(i => i.name).join(', '),
      totalAmount: service.totalCost,
      profit: service.serviceProfit || 0,
      originalObject: service,
    }));
    return [...saleOperations, ...serviceOperations];
  }, [hydrated, version]);

  const filteredAndSortedOperations = useMemo(() => {
    if (!hydrated || !dateRange?.from) return [];
    
    const from = startOfDay(dateRange.from);
    const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);
    
    let list = combinedOperations.filter(op => {
      if (!op.date) return false;
      const opDate = parseISO(op.date);
      return isValid(opDate) && isWithinInterval(opDate, { start: from, end: to });
    });
    
    if (reporteOpTypeFilter !== 'all') {
      if (reporteOpTypeFilter === 'C. Aceite') list = list.filter(op => op.type === 'Cambio de Aceite');
      else if (reporteOpTypeFilter === 'Pintura') list = list.filter(op => op.type === 'Pintura');
      else if (reporteOpTypeFilter === 'Venta') list = list.filter(op => op.type === 'Venta');
      else if (reporteOpTypeFilter === 'Servicio') list = list.filter(op => op.type === 'Servicio General');
    }
    
    if (reporteOpSearchTerm) {
      const q = reporteOpSearchTerm.toLowerCase();
      list = list.filter(op => op.id.toLowerCase().includes(q) || op.description.toLowerCase().includes(q));
    }
    list.sort((a,b) => compareDesc(parseISO(a.date!), parseISO(b.date!)));
    return list;
  }, [combinedOperations, dateRange, reporteOpSearchTerm, reporteOpTypeFilter, reporteOpSortOption, hydrated]);

  const aggregatedInventory = useMemo((): AggregatedInventoryItem[] => {
    if (!hydrated || !dateRange?.from) return [];
    
    const from = startOfDay(dateRange.from);
    const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);
    
    const allItemsSold = new Map<string, AggregatedInventoryItem>();
    const processItem = (itemId: string, name: string, sku: string, quantity: number, revenue: number) => {
        if (allItemsSold.has(itemId)) {
            const existing = allItemsSold.get(itemId)!;
            existing.totalQuantity += quantity;
            existing.totalRevenue += revenue;
        } else {
            allItemsSold.set(itemId, { itemId, name, sku, totalQuantity: quantity, totalRevenue: revenue });
        }
    };
    
    placeholderSales.forEach(sale => {
        if (sale.status === 'Cancelado') return;
        const saleDate = parseISO(sale.saleDate);
        if (isValid(saleDate) && isWithinInterval(saleDate, { start: from, end: to })) {
            sale.items.forEach(item => {
                const invItem = placeholderInventory.find(i => i.id === item.inventoryItemId);
                if (invItem && !invItem.isService) {
                    processItem(invItem.id, invItem.name, invItem.sku, item.quantity, item.totalPrice);
                }
            });
        }
    });

    placeholderServiceRecords.forEach(service => {
        if (service.status !== 'Completado' || !service.deliveryDateTime) return;
        const serviceDate = parseISO(service.deliveryDateTime);
        if (isValid(serviceDate) && isWithinInterval(serviceDate, { start: from, end: to })) {
            (service.serviceItems || []).forEach(sItem => {
                (sItem.suppliesUsed || []).forEach(supply => {
                     const invItem = placeholderInventory.find(i => i.id === supply.supplyId);
                     if(invItem && !invItem.isService){
                         processItem(invItem.id, invItem.name, invItem.sku, supply.quantity, supply.sellingPrice ? supply.sellingPrice * supply.quantity : 0);
                     }
                });
            });
        }
    });
    return Array.from(allItemsSold.values());
  }, [dateRange, hydrated, version]);

  const filteredAndSortedInventory = useMemo(() => {
    let list = [...aggregatedInventory];
    if (reporteInvSearchTerm) {
        const q = reporteInvSearchTerm.toLowerCase();
        list = list.filter(item => item.name.toLowerCase().includes(q) || item.sku.toLowerCase().includes(q));
    }
    list.sort((a, b) => b.totalQuantity - a.totalQuantity);
    return list;
  }, [aggregatedInventory, reporteInvSearchTerm, reporteInvSortOption]);

  const inventorySummaryData = useMemo(() => {
    return {
      distinctItemsSold: filteredAndSortedInventory.length,
      totalUnitsSold: filteredAndSortedInventory.reduce((sum, item) => sum + item.totalQuantity, 0),
      totalRevenueFromItems: filteredAndSortedInventory.reduce((sum, item) => sum + item.totalRevenue, 0),
    };
  }, [filteredAndSortedInventory]);

  const handleCancelSale = useCallback(async (saleId: string, reason: string) => {
    const saleIndex = placeholderSales.findIndex(s => s.id === saleId);
    if (saleIndex === -1) return toast({ title: 'Venta no encontrada', variant: 'destructive' });
    const saleToCancel = placeholderSales[saleIndex];
    if (saleToCancel.status === 'Cancelado') return toast({ title: 'Ya cancelada', variant: 'default' });

    const authUserString = localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY);
    const currentUser: User | null = authUserString ? JSON.parse(authUserString) : null;

    saleToCancel.items.forEach(item => {
        const invIndex = placeholderInventory.findIndex(i => i.id === item.inventoryItemId);
        if (invIndex !== -1) placeholderInventory[invIndex].quantity += item.quantity;
    });

    placeholderSales[saleIndex] = { ...saleToCancel, status: 'Cancelado', cancellationReason: reason, cancelledBy: currentUser?.name || 'Sistema' };
    
    await persistToFirestore(['sales', 'inventory']);
    setVersion(v => v + 1);
    setIsViewDialogOpen(false);
    toast({ title: 'Venta Cancelada', description: 'El stock ha sido restaurado.' });
  }, [toast]);
  
  const handleReprintSale = useCallback((sale: SaleReceipt) => { setSelectedSaleForReprint(sale); setIsReprintDialogOpen(true); }, []);
  
  const handleCopyAsImage = useCallback(async () => {
    if (!ticketContentRef.current) return;
    const html2canvas = (await import('html2canvas')).default;
    try {
        const canvas = await html2canvas(ticketContentRef.current, { scale: 2 });
        canvas.toBlob((blob) => {
            if (blob) {
                navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
                toast({ title: "Copiado", description: "La imagen ha sido copiada." });
            }
        });
    } catch (e) {
        console.error("Error copying image:", e);
        toast({ title: "Error", description: "No se pudo copiar la imagen.", variant: "destructive" });
    }
  }, [toast]);
  
  const handleSetInitialBalance = useCallback(async () => {
    if (initialBalanceAmount === '' || Number(initialBalanceAmount) < 0) return toast({ title: 'Monto inválido', variant: 'destructive' });
    const authUserString = localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY);
    const currentUser: User | null = authUserString ? JSON.parse(authUserString) : null;

    placeholderInitialCashBalance.date = startOfDay(dateRange?.from || new Date()).toISOString();
    placeholderInitialCashBalance.amount = Number(initialBalanceAmount);
    placeholderInitialCashBalance.userId = currentUser?.id || 'system';
    placeholderInitialCashBalance.userName = currentUser?.name || 'Sistema';

    await persistToFirestore(['initialCashBalance']);
    setVersion(v => v + 1);
    setIsInitialBalanceDialogOpen(false);
    toast({ title: 'Saldo Inicial Guardado' });
  }, [initialBalanceAmount, toast, dateRange]);
  
  const handleAddTransaction = useCallback(async (type: 'Entrada' | 'Salida', values: CashTransactionFormValues) => {
    const authUserString = localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY);
    const currentUser: User | null = authUserString ? JSON.parse(authUserString) : null;
    const newTransaction: CashDrawerTransaction = { id: `trx_${Date.now()}`, date: new Date().toISOString(), type, amount: values.amount, concept: values.concept, userId: currentUser?.id || 'system', userName: currentUser?.name || 'Sistema' };
    placeholderCashDrawerTransactions.push(newTransaction);
    await persistToFirestore(['cashDrawerTransactions']);
    setVersion(v => v + 1);
    toast({ title: `Se registró una ${type.toLowerCase()} de caja.` });
  }, [toast]);
  
  const setDateToToday = () => setDateRange({ from: startOfDay(new Date()), to: endOfDay(new Date()) });
  const setDateToThisWeek = () => setDateRange({ from: startOfWeek(new Date(), { weekStartsOn: 1 }), to: endOfWeek(new Date(), { weekStartsOn: 1 }) });
  const setDateToThisMonth = () => setDateRange({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) });
  
  const dateFilterComponent = (
    <div className="flex items-center gap-2 flex-wrap justify-start sm:justify-end">
      <Button variant="outline" size="sm" onClick={setDateToToday}>Hoy</Button>
      <Button variant="outline" size="sm" onClick={setDateToThisWeek}>Esta Semana</Button>
      <Button variant="outline" size="sm" onClick={setDateToThisMonth}>Este Mes</Button>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant={"outline"} className={cn("w-full sm:w-[240px] justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
            <CalendarDateIcon className="mr-2 h-4 w-4" />
            {dateRange?.from ? (dateRange.to ? (`${format(dateRange.from, "LLL dd, y", { locale: es })} - ${format(dateRange.to, "LLL dd, y", { locale: es })}`) : format(dateRange.from, "LLL dd, y", { locale: es })) : (<span>Seleccione rango</span>)}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2} locale={es} />
        </PopoverContent>
      </Popover>
    </div>
  );

  if (!hydrated) { return <div className="flex h-[50vh] w-full items-center justify-center"><p className="text-lg ml-4">Cargando datos...</p></div>; }
  
  return (
    <>
      <div className="bg-primary text-primary-foreground rounded-lg p-6 mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Punto de Venta</h1>
        <p className="text-primary-foreground/80 mt-1">Registra ventas, gestiona tu caja y analiza el rendimiento de tus operaciones.</p>
      </div>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="informe" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Informe</TabsTrigger>
          <TabsTrigger value="ventas" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Ventas</TabsTrigger>
          <TabsTrigger value="caja" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Caja</TabsTrigger>
          <TabsTrigger value="reportes" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Reportes</TabsTrigger>
        </TabsList>
        <TabsContent value="informe" className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight">Resumen de Ventas y Ganancias</h2>
              <p className="text-muted-foreground">Datos para el período seleccionado.</p>
            </div>
            {dateFilterComponent}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Ventas en Periodo</CardTitle><Receipt className="h-4 w-4 text-muted-foreground"/></CardHeader><CardContent><div className="text-2xl font-bold">{ventasSummaryData.totalSalesCount}</div><p className="text-xs text-muted-foreground">Ventas completadas en el rango</p></CardContent></Card>
                <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Ingresos y Ganancia</CardTitle><DollarSign className="h-4 w-4 text-muted-foreground"/></CardHeader><CardContent><div className="text-2xl font-bold">{formatCurrency(ventasSummaryData.totalRevenue)}</div><p className="text-xs text-muted-foreground">Ganancia: {formatCurrency(ventasSummaryData.totalProfit)}</p></CardContent></Card>
                <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Artículo Más Vendido</CardTitle><ShoppingCart className="h-4 w-4 text-muted-foreground"/></CardHeader><CardContent><div className="text-2xl font-bold truncate">{ventasSummaryData.mostSoldItem?.name || 'N/A'}</div><p className="text-xs text-muted-foreground">{ventasSummaryData.mostSoldItem ? `${ventasSummaryData.mostSoldItem.quantity} unidades` : 'En el rango seleccionado'}</p></CardContent></Card>
            </div>
        </TabsContent>
        <TabsContent value="ventas" className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-semibold tracking-tight">Historial de Ventas</h2>
                    <p className="text-muted-foreground">Consulta, filtra y reimprime tickets de venta.</p>
                </div>
                <Button asChild><Link href="/pos/nuevo"><PlusCircle className="mr-2 h-4 w-4" />Nueva Venta</Link></Button>
            </div>
            {dateFilterComponent}
            <Card>
                <CardHeader className="flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row items-center gap-4 flex-wrap">
                        <div className="relative flex-1 w-full min-w-[200px] sm:min-w-[300px]"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input type="search" placeholder="Buscar por ID, cliente, artículo..." className="w-full rounded-lg bg-white pl-8" value={ventasSearchTerm} onChange={(e) => setVentasSearchTerm(e.target.value)} /></div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" className="w-full sm:w-auto bg-white"><ListFilter className="mr-2 h-4 w-4" />Ordenar</Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuLabel>Ordenar por</DropdownMenuLabel><DropdownMenuRadioGroup value={ventasSortOption} onValueChange={(v) => setVentasSortOption(v as SaleSortOption)}><DropdownMenuRadioItem value="date_desc">Más Reciente</DropdownMenuRadioItem><DropdownMenuRadioItem value="date_asc">Más Antiguo</DropdownMenuRadioItem></DropdownMenuRadioGroup></DropdownMenuContent></DropdownMenu>
                            <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" className="w-full sm:w-auto bg-white"><Filter className="mr-2 h-4 w-4" />Pago</Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuLabel>Método de Pago</DropdownMenuLabel><DropdownMenuRadioGroup value={ventasPaymentMethodFilter} onValueChange={(v) => setVentasPaymentMethodFilter(v as PaymentMethod | 'all')}><DropdownMenuRadioItem value="all">Todos</DropdownMenuRadioItem><DropdownMenuRadioItem value="Efectivo">Efectivo</DropdownMenuRadioItem><DropdownMenuRadioItem value="Tarjeta">Tarjeta</DropdownMenuRadioItem></DropdownMenuRadioGroup></DropdownMenuContent></DropdownMenu>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <SalesTable sales={filteredAndSortedSales} onReprintTicket={handleReprintSale} inventoryItems={placeholderInventory} onEditSale={(sale) => { setSelectedSale(sale); setIsViewDialogOpen(true); }}/>
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="caja" className="space-y-6">
             <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-semibold tracking-tight">Gestión de Caja</h2>
                    <p className="text-muted-foreground">Controla el flujo de efectivo y genera cortes de caja diarios.</p>
                </div>
                {dateFilterComponent}
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card className="lg:col-span-2"><CardHeader><CardTitle className="flex items-center gap-2"><Wallet/>Cajón de Dinero</CardTitle></CardHeader><CardContent className="space-y-2 text-lg"><div className="flex justify-between"><span>Saldo Inicial:</span> <span className="font-medium">{formatCurrency(cajaSummaryData.initialBalance)}</span></div><div className="flex justify-between text-green-600"><span>(+) Ventas en Efectivo:</span> <span className="font-medium">{formatCurrency(cajaSummaryData.totalCashSales)}</span></div><div className="flex justify-between text-green-600"><span>(+) Entradas de Efectivo:</span> <span className="font-medium">{formatCurrency(cajaSummaryData.totalCashIn)}</span></div><div className="flex justify-between text-red-600"><span>(-) Salidas de Efectivo:</span> <span className="font-medium">{formatCurrency(cajaSummaryData.totalCashOut)}</span></div><div className="flex justify-between text-xl font-bold border-t pt-2 mt-2"><span>Saldo Final Esperado:</span> <span>{formatCurrency(cajaSummaryData.finalCashBalance)}</span></div></CardContent></Card>
                <Card><CardHeader><CardTitle className="flex items-center gap-2"><Coins/>Ventas por Método</CardTitle></CardHeader><CardContent className="space-y-1 text-sm">{Object.entries(cajaSummaryData.salesByPaymentMethod).map(([method, total]) => (<div key={method} className="flex justify-between"><span>{method}:</span><span className="font-medium">{formatCurrency(total)}</span></div>))}</CardContent></Card>
                <Card><CardHeader><CardTitle className="flex items-center gap-2"><BarChart2/>Ventas por Tipo</CardTitle></CardHeader><CardContent className="space-y-1 text-sm"><div className="flex justify-between"><span>Ventas de Mostrador:</span><span className="font-medium">{cajaSummaryData.totalSales}</span></div><div className="flex justify-between"><span>Servicios Completados:</span><span className="font-medium">{cajaSummaryData.totalServices}</span></div></CardContent></Card>
            </div>
             <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <CardTitle>Transacciones de Caja</CardTitle>
                            <CardDescription>Entradas y salidas manuales de efectivo.</CardDescription>
                        </div>
                        <div className="flex gap-2">
                           <Button variant="outline" onClick={() => setIsInitialBalanceDialogOpen(true)}>Saldo Inicial</Button>
                           <Button onClick={() => setIsCorteDialogOpen(true)}><Printer className="mr-2 h-4 w-4"/> Corte de Caja</Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-6">
                    <Card><CardHeader><CardTitle className="flex items-center gap-2 text-green-600"><ArrowUpCircle/>Registrar Entrada</CardTitle></CardHeader><CardContent><CashTransactionForm type="Entrada" onSubmit={handleAddTransaction} /></CardContent></Card>
                    <Card><CardHeader><CardTitle className="flex items-center gap-2 text-red-600"><ArrowDownCircle/>Registrar Salida</CardTitle></CardHeader><CardContent><CashTransactionForm type="Salida" onSubmit={handleAddTransaction} /></CardContent></Card>
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="reportes" className="space-y-6">
             <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-semibold tracking-tight">Reportes de Operaciones e Inventario</h2>
                    <p className="text-muted-foreground">Analiza el detalle de tus ventas, servicios y el movimiento de tus productos.</p>
                </div>
                {dateFilterComponent}
            </div>
            <Tabs defaultValue="operaciones" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="operaciones">Reporte de Operaciones</TabsTrigger>
                    <TabsTrigger value="inventario">Reporte de Inventario</TabsTrigger>
                </TabsList>
                <TabsContent value="operaciones" className="mt-4">
                    <Card>
                        <CardHeader><CardTitle>Detalle de Operaciones</CardTitle></CardHeader>
                        <CardContent>
                            <Table><TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Tipo</TableHead><TableHead>ID</TableHead><TableHead>Descripción</TableHead><TableHead className="text-right">Monto</TableHead><TableHead className="text-right">Ganancia</TableHead></TableRow></TableHeader><TableBody>{filteredAndSortedOperations.map(op => (<TableRow key={`${op.type}-${op.id}`}><TableCell>{op.date ? format(parseISO(op.date), "dd MMM yyyy", { locale: es }) : 'N/A'}</TableCell><TableCell>{op.type}</TableCell><TableCell>{op.id}</TableCell><TableCell>{op.description}</TableCell><TableCell className="text-right">{formatCurrency(op.totalAmount)}</TableCell><TableCell className="text-right">{formatCurrency(op.profit)}</TableCell></TableRow>))}</TableBody></Table>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="inventario" className="mt-4">
                     <Card>
                        <CardHeader><CardTitle>Detalle de Salidas de Inventario</CardTitle></CardHeader>
                        <CardContent>
                            <Table><TableHeader><TableRow><TableHead>SKU</TableHead><TableHead>Producto</TableHead><TableHead className="text-right">Unidades</TableHead><TableHead className="text-right">Ingreso</TableHead></TableRow></TableHeader><TableBody>{filteredAndSortedInventory.map(item => (<TableRow key={item.itemId}><TableCell>{item.sku}</TableCell><TableCell>{item.name}</TableCell><TableCell className="text-right">{item.totalQuantity}</TableCell><TableCell className="text-right">{formatCurrency(item.totalRevenue)}</TableCell></TableRow>))}</TableBody></Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </TabsContent>
      </Tabs>
      <PrintTicketDialog open={isReprintDialogOpen && !!selectedSaleForReprint} onOpenChange={setIsReprintDialogOpen} title="Reimprimir Ticket" footerActions={<><Button variant="outline" onClick={handleCopyAsImage}><Copy className="mr-2 h-4 w-4"/>Copiar</Button><Button onClick={() => window.print()}><Printer className="mr-2 h-4 w-4"/>Imprimir</Button></>}>
        {selectedSaleForReprint && <TicketContent ref={ticketContentRef} sale={selectedSaleForReprint} />}
      </PrintTicketDialog>
      {selectedSale && <ViewSaleDialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen} sale={selectedSale} onCancelSale={handleCancelSale} />}
      <Dialog open={isInitialBalanceDialogOpen} onOpenChange={setIsInitialBalanceDialogOpen}>
        <DialogContent>
            <DialogHeader><DialogTitle>Saldo Inicial de Caja</DialogTitle></DialogHeader>
            <div className="py-4"><Input type="number" placeholder="500.00" value={initialBalanceAmount} onChange={(e) => setInitialBalanceAmount(Number(e.target.value))}/></div>
            <DialogFooter><Button onClick={handleSetInitialBalance}>Guardar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <PrintTicketDialog open={isCorteDialogOpen} onOpenChange={setIsCorteDialogOpen} title="Corte de Caja">
         <CorteDiaContent reportData={cajaSummaryData} date={dateRange?.from || new Date()} transactions={placeholderCashDrawerTransactions.filter(t => isWithinInterval(parseISO(t.date), {start: startOfDay(dateRange?.from || new Date()), end: endOfDay(dateRange?.to || dateRange?.from || new Date())}))}/>
      </PrintTicketDialog>
    </>
  );
}

export default function POSPageWrapper() {
    return (
        <Suspense fallback={<div>Cargando...</div>}>
            <PosPageComponent />
        </Suspense>
    )
}

    