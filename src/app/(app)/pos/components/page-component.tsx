

"use client";

import { useState, useMemo, useEffect, useCallback, Suspense, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Search, ListFilter, CalendarIcon as CalendarDateIcon, Receipt, ShoppingCart, DollarSign, Wallet, ArrowUpCircle, ArrowDownCircle, Coins, Wrench, BarChart2, Printer, PlusCircle, Copy, Filter, Eye, Loader2, CheckCircle, AlertTriangle, MessageSquare } from "lucide-react";
import { SalesTable } from "./sales-table";
import { PrintTicketDialog } from '@/components/ui/print-ticket-dialog';
import { TicketContent } from '@/components/ticket-content';
import type { SaleReceipt, PaymentMethod, User, ServiceRecord, InventoryItem, FinancialOperation, CashDrawerTransaction, InitialCashBalance, AggregatedInventoryItem, WorkshopInfo } from "@/types";
import { format, parseISO, compareDesc, isWithinInterval, isValid, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isSameDay } from "date-fns";
import { es } from 'date-fns/locale';
import type { DateRange } from "react-day-picker";
import Link from "next/link";
import { cn, formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { ViewSaleDialog } from "./view-sale-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CorteDiaContent } from '../caja/components/corte-caja-content';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Label } from "@/components/ui/label";
import { calculateSaleProfit, AUTH_USER_LOCALSTORAGE_KEY } from '@/lib/placeholder-data';
import { operationsService, inventoryService, messagingService } from '@/lib/services';
import { db } from '@/lib/firebaseClient';
import { writeBatch, doc, collection, addDoc, getDoc } from 'firebase/firestore';
import { ScrollArea } from '@/components/ui/scroll-area';


const cashTransactionSchema = z.object({
  concept: z.string().min(3, "El concepto debe tener al menos 3 caracteres."),
  amount: z.coerce.number().min(0.01, "El monto debe ser mayor a 0."),
});
type CashTransactionFormValues = z.infer<typeof cashTransactionSchema>;

type SaleSortOption = "date_desc" | "date_asc" | "total_desc" | "total_asc" | "customer_asc" | "customer_desc";

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

export function PosPageComponent({ tab }: { tab?: string }) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState(tab || 'informe');
  const [isLoading, setIsLoading] = useState(true);

  // States for data from Firestore
  const [allSales, setAllSales] = useState<SaleReceipt[]>([]);
  const [allInventory, setAllInventory] = useState<InventoryItem[]>([]);
  const [allServices, setAllServices] = useState<ServiceRecord[]>([]);
  const [allCashTransactions, setAllCashTransactions] = useState<CashDrawerTransaction[]>([]);
  const [initialCashBalance, setInitialCashBalance] = useState<InitialCashBalance | null>(null);
  
  // States for UI control
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [ventasSearchTerm, setVentasSearchTerm] = useState("");
  const [ventasSortOption, setVentasSortOption] = useState<SaleSortOption>("date_desc");
  const [ventasPaymentMethodFilter, setVentasPaymentMethodFilter] = useState<PaymentMethod | "all">("all");
  const [isReprintDialogOpen, setIsReprintDialogOpen] = useState(false);
  const [selectedSaleForReprint, setSelectedSaleForReprint] = useState<SaleReceipt | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<SaleReceipt | null>(null);
  const [isInitialBalanceDialogOpen, setIsInitialBalanceDialogOpen] = useState(false);
  const [initialBalanceAmount, setInitialBalanceAmount] = useState<number | ''>('');
  const [isCorteDialogOpen, setIsCorteDialogOpen] = useState(false);
  
  const ticketContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubs: (() => void)[] = [];
    setIsLoading(true);

    unsubs.push(operationsService.onSalesUpdate(setAllSales));
    unsubs.push(inventoryService.onItemsUpdate(setAllInventory));
    unsubs.push(operationsService.onServicesUpdate(setAllServices));
    unsubs.push(operationsService.onCashTransactionsUpdate(setAllCashTransactions));
    unsubs.push(operationsService.onInitialCashBalanceUpdate((data) => {
        setInitialCashBalance(data);
        setIsLoading(false);
    }));

    if (!dateRange) {
        setDateRange({ from: startOfDay(new Date()), to: endOfDay(new Date()) });
    }

    return () => unsubs.forEach(unsub => unsub());
  }, [dateRange]);

  const filteredAndSortedSales = useMemo(() => {
    let list = [...allSales];

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
  }, [dateRange, ventasSearchTerm, ventasPaymentMethodFilter, ventasSortOption, allSales]);

  const ventasSummaryData = useMemo(() => {
    const salesInRange = filteredAndSortedSales.filter(s => s.status !== 'Cancelado');
    const totalSalesCount = salesInRange.length;
    const totalRevenue = salesInRange.reduce((sum, s) => sum + s.totalAmount, 0);
    const totalProfit = salesInRange.reduce((sum, s) => sum + calculateSaleProfit(s, allInventory), 0);
    
    const itemCounts = salesInRange.flatMap(s => s.items).reduce((acc, item) => {
        acc[item.itemName] = (acc[item.itemName] || 0) + item.quantity;
        return acc;
    }, {} as Record<string, number>);

    let mostSoldItem: { name: string; quantity: number } | null = null;
    if (Object.keys(itemCounts).length > 0) {
      const topEntry = Object.entries(itemCounts).reduce((prev, curr) => (curr[1] > prev[1] ? curr : prev));
      mostSoldItem = { name: topEntry[0], quantity: topEntry[1] };
    }
    
    return { totalSalesCount, totalRevenue, totalProfit, mostSoldItem };
  }, [filteredAndSortedSales, allInventory]);

  const cajaSummaryData = useMemo(() => {
    if (!dateRange?.from) return { initialBalance: 0, totalCashSales: 0, totalCashIn: 0, totalCashOut: 0, finalCashBalance: 0, salesByPaymentMethod: {}, totalSales: 0, totalServices: 0 };
    const start = startOfDay(dateRange.from);
    const end = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);
    
    const balanceDoc = initialCashBalance;
    const initialBalance = (balanceDoc && isSameDay(parseISO(balanceDoc.date), start)) ? balanceDoc.amount : 0;
    
    const transactionsInRange = allCashTransactions.filter(t => isValid(parseISO(t.date)) && isWithinInterval(parseISO(t.date), { start, end }));
    const salesInRange = allSales.filter(s => s.status !== 'Cancelado' && isValid(parseISO(s.saleDate)) && isWithinInterval(parseISO(s.saleDate), { start, end }));
    const servicesInRange = allServices.filter(s => {
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
  }, [dateRange, allSales, allServices, allCashTransactions, initialCashBalance]);
  
  const handleCancelSale = useCallback(async (saleId: string, reason: string) => {
    if (!db) return;
    const saleToCancel = allSales.find(s => s.id === saleId);
    if (!saleToCancel || saleToCancel.status === 'Cancelado') return;
    
    const authUserString = localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY);
    const currentUser: User | null = authUserString ? JSON.parse(authUserString) : null;
    
    const batch = writeBatch(db);
    // Restore stock
    saleToCancel.items.forEach(item => {
        const invItem = allInventory.find(i => i.id === item.inventoryItemId);
        if (invItem && !invItem.isService) {
            const itemRef = doc(db, 'inventory', item.inventoryItemId);
            batch.update(itemRef, { quantity: invItem.quantity + item.quantity });
        }
    });
    
    // Update sale status
    const saleRef = doc(db, 'sales', saleId);
    batch.update(saleRef, { status: 'Cancelado', cancellationReason: reason, cancelledBy: currentUser?.name || 'Sistema' });

    await batch.commit();
    toast({ title: 'Venta Cancelada', description: 'El stock ha sido restaurado.' });
    setIsViewDialogOpen(false);
  }, [allSales, allInventory, toast]);

  const handleReprintSale = useCallback((sale: SaleReceipt) => { setSelectedSaleForReprint(sale); setIsReprintDialogOpen(true); }, []);
  
  const handleCopyAsImage = useCallback(async () => {
    if (!ticketContentRef.current) return;
    const html2canvas = (await import('html2canvas')).default;
    try {
      const canvas = await html2canvas(ticketContentRef.current, { scale: 2.5, backgroundColor: null });
      canvas.toBlob((blob) => { if (blob) navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]); });
      toast({ title: "Copiado", description: "La imagen ha sido copiada." });
    } catch (e) { toast({ title: "Error", description: "No se pudo copiar la imagen.", variant: "destructive" }); }
  }, [toast]);
  
  const handleSetInitialBalance = useCallback(async () => {
    if (initialBalanceAmount === '' || Number(initialBalanceAmount) < 0) return;
    const authUserString = localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY);
    const currentUser: User | null = authUserString ? JSON.parse(authUserString) : null;
    
    await operationsService.setInitialCashBalance({
      date: startOfDay(dateRange?.from || new Date()).toISOString(),
      amount: Number(initialBalanceAmount),
      userId: currentUser?.id || 'system',
      userName: currentUser?.name || 'Sistema',
    });
    setIsInitialBalanceDialogOpen(false);
    toast({ title: 'Saldo Inicial Guardado' });
  }, [initialBalanceAmount, toast, dateRange]);
  
  const handleAddTransaction = useCallback(async (type: 'Entrada' | 'Salida', values: CashTransactionFormValues) => {
    const authUserString = localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY);
    const currentUser: User | null = authUserString ? JSON.parse(authUserString) : null;
    
    await operationsService.addCashTransaction({
      type,
      amount: values.amount,
      concept: values.concept,
      userId: currentUser?.id || 'system',
      userName: currentUser?.name || 'Sistema',
    });
    toast({ title: `Se registró una ${type.toLowerCase()} de caja.` });
  }, [toast]);
  
  const handleCopySaleForWhatsapp = useCallback((sale: SaleReceipt) => {
    const workshopName = JSON.parse(localStorage.getItem('workshopTicketInfo') || '{}').name || 'nuestro taller';
    const message = `Hola ${sale.customerName || 'Cliente'}, aquí tienes los detalles de tu compra en ${workshopName}.
Folio de Venta: ${sale.id}
Total: ${formatCurrency(sale.totalAmount)}
¡Gracias por tu preferencia!`;

    navigator.clipboard.writeText(message).then(() => {
      toast({ title: 'Mensaje Copiado', description: 'El mensaje para WhatsApp ha sido copiado.' });
    });
  }, [toast]);
  
  const handlePrint = () => {
    requestAnimationFrame(() => setTimeout(() => window.print(), 100));
  };

  const setDateToToday = () => setDateRange({ from: startOfDay(new Date()), to: endOfDay(new Date()) });
  const setDateToThisWeek = () => setDateRange({ from: startOfWeek(new Date(), { weekStartsOn: 1 }), to: endOfWeek(new Date(), { weekStartsOn: 1 }) });
  const setDateToThisMonth = () => setDateRange({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) });
  
  const paymentMethods: (PaymentMethod | 'all')[] = ['all', 'Efectivo', 'Tarjeta', 'Transferencia', 'Efectivo+Transferencia', 'Tarjeta+Transferencia', 'Efectivo/Tarjeta'];


  const dateFilterComponent = (
    <div className="flex items-center gap-2 flex-wrap justify-start sm:justify-end">
      <Button variant="outline" size="sm" onClick={setDateToToday} className="bg-card">Hoy</Button>
      <Button variant="outline" size="sm" onClick={setDateToThisWeek} className="bg-card">Semana</Button>
      <Button variant="outline" size="sm" onClick={setDateToThisMonth} className="bg-card">Mes</Button>
      <Popover><PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full sm:w-[240px] justify-start text-left font-normal bg-card", !dateRange && "text-muted-foreground")}><CalendarDateIcon className="mr-2 h-4 w-4" />{dateRange?.from ? (dateRange.to ? (`${format(dateRange.from, "LLL dd, y", { locale: es })} - ${format(dateRange.to, "LLL dd, y", { locale: es })}`) : format(dateRange.from, "LLL dd, y", { locale: es })) : (<span>Rango</span>)}</Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="end"><Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2} locale={es} /></PopoverContent></Popover>
    </div>
  );

  if (isLoading) { return <div className="flex h-[50vh] w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /><p className="text-lg ml-4">Cargando datos...</p></div>; }
  
  return (
    <>
      <div className="bg-primary text-primary-foreground rounded-lg p-6 mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Punto de Venta</h1>
        <p className="text-primary-foreground/80 mt-1">Registra ventas, gestiona tu caja y analiza el rendimiento de tus operaciones.</p>
      </div>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="relative border-b">
          <ScrollArea className="w-full whitespace-nowrap">
            <TabsList className="inline-flex h-auto">
              <TabsTrigger value="informe" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Informe</TabsTrigger>
              <TabsTrigger value="ventas" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Ventas</TabsTrigger>
              <TabsTrigger value="caja" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Caja</TabsTrigger>
            </TabsList>
          </ScrollArea>
        </div>
        <TabsContent value="informe" className="mt-6 space-y-6">
            <div className="space-y-2"><h2 className="text-2xl font-semibold tracking-tight">Resumen de Ventas y Ganancias</h2><p className="text-muted-foreground">Datos para el período seleccionado.</p></div>
            {dateFilterComponent}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Ventas en Periodo</CardTitle><Receipt className="h-4 w-4 text-muted-foreground"/></CardHeader><CardContent><div className="text-2xl font-bold">{ventasSummaryData.totalSalesCount}</div><p className="text-xs text-muted-foreground">Ventas completadas</p></CardContent></Card>
                <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Ingresos y Ganancia</CardTitle><DollarSign className="h-4 w-4 text-muted-foreground"/></CardHeader><CardContent><div className="text-2xl font-bold">{formatCurrency(ventasSummaryData.totalRevenue)}</div><p className="text-xs text-muted-foreground">Ganancia: {formatCurrency(ventasSummaryData.totalProfit)}</p></CardContent></Card>
                <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Artículo Más Vendido</CardTitle><ShoppingCart className="h-4 w-4 text-muted-foreground"/></CardHeader><CardContent><div className="text-2xl font-bold truncate">{ventasSummaryData.mostSoldItem?.name || 'N/A'}</div><p className="text-xs text-muted-foreground">{ventasSummaryData.mostSoldItem ? `${ventasSummaryData.mostSoldItem.quantity} unidades` : ''}</p></CardContent></Card>
            </div>
        </TabsContent>
        <TabsContent value="ventas" className="mt-6 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div><h2 className="text-2xl font-semibold tracking-tight">Historial de Ventas</h2><p className="text-muted-foreground">Consulta, filtra y reimprime tickets.</p></div>
                <Button asChild><Link href="/pos/nuevo"><PlusCircle className="mr-2 h-4 w-4" />Nueva Venta</Link></Button>
            </div>
            {dateFilterComponent}
            <Card>
                <CardHeader className="flex flex-col gap-4"><div className="flex flex-col sm:flex-row items-center gap-4 flex-wrap"><div className="relative flex-1 w-full min-w-[200px] sm:min-w-[300px]"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input type="search" placeholder="Buscar por ID, cliente, artículo..." className="w-full rounded-lg bg-card pl-8" value={ventasSearchTerm} onChange={(e) => setVentasSearchTerm(e.target.value)} /></div><div className="flex items-center gap-2 w-full sm:w-auto"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" className="w-full sm:w-auto bg-card"><ListFilter className="mr-2 h-4 w-4" />Ordenar</Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuLabel>Ordenar por</DropdownMenuLabel><DropdownMenuRadioGroup value={ventasSortOption} onValueChange={(v) => setVentasSortOption(v as SaleSortOption)}><DropdownMenuRadioItem value="date_desc">Más Reciente</DropdownMenuRadioItem><DropdownMenuRadioItem value="date_asc">Más Antiguo</DropdownMenuRadioItem></DropdownMenuRadioGroup></DropdownMenuContent></DropdownMenu><DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" className="w-full sm:w-auto bg-card"><Filter className="mr-2 h-4 w-4" />Pago</Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuLabel>Método de Pago</DropdownMenuLabel><DropdownMenuRadioGroup value={ventasPaymentMethodFilter} onValueChange={(v) => setVentasPaymentMethodFilter(v as PaymentMethod | 'all')}>
                    {paymentMethods.map(method => (
                      <DropdownMenuRadioItem key={method} value={method}>{method === 'all' ? 'Todos' : method}</DropdownMenuRadioItem>
                    ))}
                </DropdownMenuRadioGroup></DropdownMenuContent></DropdownMenu></div></div></CardHeader>
                <CardContent><SalesTable sales={filteredAndSortedSales} onReprintTicket={handleReprintSale} inventoryItems={allInventory} onEditSale={(sale) => { setSelectedSale(sale); setIsViewDialogOpen(true); }}/></CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="caja" className="mt-6 space-y-6">
             <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"><div><h2 className="text-2xl font-semibold tracking-tight">Gestión de Caja</h2><p className="text-muted-foreground">Controla el flujo de efectivo.</p></div>{dateFilterComponent}</div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"><Card className="lg:col-span-2"><CardHeader><CardTitle className="flex items-center gap-2"><Wallet/>Cajón de Dinero</CardTitle></CardHeader><CardContent className="space-y-2 text-lg"><div className="flex justify-between"><span>Saldo Inicial:</span> <span className="font-medium">{formatCurrency(cajaSummaryData.initialBalance)}</span></div><div className="flex justify-between text-green-600"><span>(+) Ventas en Efectivo:</span> <span className="font-medium">{formatCurrency(cajaSummaryData.totalCashSales)}</span></div><div className="flex justify-between text-green-600"><span>(+) Entradas de Efectivo:</span> <span className="font-medium">{formatCurrency(cajaSummaryData.totalCashIn)}</span></div><div className="flex justify-between text-red-600"><span>(-) Salidas de Efectivo:</span> <span className="font-medium">{formatCurrency(cajaSummaryData.totalCashOut)}</span></div><div className="flex justify-between text-xl font-bold border-t pt-2 mt-2"><span>Saldo Final Esperado:</span> <span>{formatCurrency(cajaSummaryData.finalCashBalance)}</span></div></CardContent></Card><Card><CardHeader><CardTitle className="flex items-center gap-2"><Coins/>Ventas por Método</CardTitle></CardHeader><CardContent className="space-y-1 text-sm">{Object.entries(cajaSummaryData.salesByPaymentMethod).map(([method, total]) => (<div key={method} className="flex justify-between"><span>{method}:</span><span className="font-medium">{formatCurrency(total)}</span></div>))}</CardContent></Card><Card><CardHeader><CardTitle className="flex items-center gap-2"><BarChart2/>Ventas por Tipo</CardTitle></CardHeader><CardContent className="space-y-1 text-sm"><div className="flex justify-between"><span>Ventas de Mostrador:</span><span className="font-medium">{cajaSummaryData.totalSales}</span></div><div className="flex justify-between"><span>Servicios Completados:</span><span className="font-medium">{cajaSummaryData.totalServices}</span></div></CardContent></Card></div>
             <Card>
                <CardHeader><div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"><div><CardTitle>Transacciones de Caja</CardTitle><CardDescription>Entradas y salidas manuales de efectivo.</CardDescription></div><div className="flex gap-2"><Button variant="outline" onClick={() => setIsInitialBalanceDialogOpen(true)}>Saldo Inicial</Button><Button onClick={() => setIsCorteDialogOpen(true)}><Printer className="mr-2 h-4 w-4"/> Corte de Caja</Button></div></div></CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-6"><Card><CardHeader><CardTitle className="flex items-center gap-2 text-green-600"><ArrowUpCircle/>Registrar Entrada</CardTitle></CardHeader><CardContent><CashTransactionForm type="Entrada" onSubmit={handleAddTransaction} /></CardContent></Card><Card><CardHeader><CardTitle className="flex items-center gap-2 text-red-600"><ArrowDownCircle/>Registrar Salida</CardTitle></CardHeader><CardContent><CashTransactionForm type="Salida" onSubmit={handleAddTransaction} /></CardContent></Card></CardContent>
            </Card>
        </TabsContent>
      </Tabs>
      <PrintTicketDialog
        open={isReprintDialogOpen && !!selectedSaleForReprint}
        onOpenChange={setIsReprintDialogOpen}
        title="Reimprimir Ticket"
        footerActions={<>
          <Button onClick={handleCopyAsImage} className="w-full bg-white hover:bg-gray-100 text-black border"><Copy className="mr-2 h-4 w-4"/>Copiar</Button>
          <Button onClick={() => handleCopySaleForWhatsapp(selectedSaleForReprint!)} className="w-full bg-green-100 hover:bg-green-200 text-green-800"><MessageSquare className="mr-2 h-4 w-4" /> WhatsApp</Button>
          <Button onClick={handlePrint} className="w-full"><Printer className="mr-2 h-4 w-4"/>Imprimir</Button>
        </>}
      >
        <div id="printable-ticket">
          {selectedSaleForReprint && <TicketContent ref={ticketContentRef} sale={selectedSaleForReprint} />}
        </div>
      </PrintTicketDialog>
      {selectedSale && <ViewSaleDialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen} sale={selectedSale} onCancelSale={handleCancelSale} onSendWhatsapp={handleCopySaleForWhatsapp} />}
      <Dialog open={isInitialBalanceDialogOpen} onOpenChange={setIsInitialBalanceDialogOpen}>
        <DialogContent><DialogHeader><DialogTitle>Saldo Inicial de Caja</DialogTitle></DialogHeader><div className="py-4"><Input type="number" placeholder="500.00" value={initialBalanceAmount} onChange={(e) => setInitialBalanceAmount(e.target.value === '' ? '' : Number(e.target.value))}/></div><DialogFooter><Button onClick={handleSetInitialBalance}>Guardar</Button></DialogFooter></DialogContent>
      </Dialog>
      <PrintTicketDialog open={isCorteDialogOpen} onOpenChange={setIsCorteDialogOpen} title="Corte de Caja">
         <CorteDiaContent reportData={cajaSummaryData} date={dateRange?.from || new Date()} transactions={allCashTransactions.filter(t => isWithinInterval(parseISO(t.date), {start: startOfDay(dateRange?.from || new Date()), end: endOfDay(dateRange?.to || dateRange?.from || new Date())}))}/>
      </PrintTicketDialog>
    </>
  );
}
