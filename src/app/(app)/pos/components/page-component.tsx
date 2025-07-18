

"use client";

import { useState, useMemo, useEffect, useCallback, Suspense, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Search, ListFilter, CalendarIcon as CalendarDateIcon, Receipt, ShoppingCart, DollarSign, Wallet, ArrowUpCircle, ArrowDownCircle, Coins, Wrench, BarChart2, Printer, PlusCircle, Copy, Filter, Eye, Loader2, CheckCircle, AlertTriangle, MessageSquare, History, Pencil, Trash2 } from "lucide-react";
import { SalesTable } from "./sales-table";
import { PrintTicketDialog } from '@/components/ui/print-ticket-dialog';
import { TicketContent } from '@/components/ticket-content';
import type { SaleReceipt, PaymentMethod, User, ServiceRecord, InventoryItem, FinancialOperation, CashDrawerTransaction, InitialCashBalance, AggregatedInventoryItem, WorkshopInfo } from "@/types";
import { format, parseISO, compareDesc, isWithinInterval, isValid, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isSameDay, subDays } from "date-fns";
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
import { writeBatch, doc, collection, addDoc, getDoc, getDocs } from 'firebase/firestore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';

const cashTransactionSchema = z.object({
  concept: z.string().min(3, "El concepto debe tener al menos 3 caracteres."),
  amount: z.coerce.number().min(0.01, "El monto debe ser mayor a 0."),
});
type CashTransactionFormValues = z.infer<typeof cashTransactionSchema>;

type SaleSortOption = "date_desc" | "date_asc" | "total_desc" | "total_asc" | "customer_asc" | "customer_desc";

function CashTransactionForm({ type, onSubmit }: { type: 'Entrada' | 'Salida', onSubmit: (type: 'Entrada' | 'Salida', values: CashTransactionFormValues) => void }) {
  const form = useForm<CashTransactionFormValues>({ resolver: zodResolver(cashTransactionSchema) });
  const { handleSubmit, reset } = form;
  const onFormSubmit = (data: CashTransactionFormValues) => {
    onSubmit(type, data);
    reset({ concept: '', amount: 0 }); // Reset form after submission
  };
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

function TransactionsList({ transactions }: { transactions: CashDrawerTransaction[] }) {
    if (!transactions.length) {
        return <div className="text-center text-muted-foreground p-4">No hay transacciones manuales hoy.</div>;
    }
    return (
        <Table>
            <TableBody>
                {transactions.map(t => (
                    <TableRow key={t.id}>
                        <TableCell>
                            <p className={cn("font-semibold", t.type === 'Entrada' ? 'text-green-600' : 'text-red-600')}>{t.type}</p>
                            <p className="text-xs text-muted-foreground">{t.concept}</p>
                        </TableCell>
                        <TableCell className="text-right">
                            <p className="font-bold">{formatCurrency(t.amount)}</p>
                            <p className="text-xs text-muted-foreground">{t.userName}</p>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
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
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const now = new Date();
    return { from: startOfDay(now), to: endOfDay(now) };
  });
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

    return () => unsubs.forEach(unsub => unsub());
  }, []);

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
    
    list.sort((a, b) => {
        const isACancelled = a.status === 'Cancelado';
        const isBCancelled = b.status === 'Cancelado';
        if (isACancelled && !isBCancelled) return 1;
        if (!isACancelled && isBCancelled) return -1;
        return compareDesc(parseISO(a.saleDate), parseISO(b.saleDate));
    });
    return list;
  }, [dateRange, ventasSearchTerm, ventasPaymentMethodFilter, allSales]);

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
    
    const salesInRange = allSales.filter(s => s.status !== 'Cancelado' && isValid(parseISO(s.saleDate)) && isWithinInterval(parseISO(s.saleDate), { start, end }));
    const servicesInRange = allServices.filter(s => s.status === 'Entregado' && s.deliveryDateTime && isValid(parseISO(s.deliveryDateTime)) && isWithinInterval(parseISO(s.deliveryDateTime), { start, end }));
    
    const cashFromSales = salesInRange
        .filter(s => s.paymentMethod?.includes('Efectivo'))
        .reduce((sum, s) => {
            if (s.paymentMethod === 'Efectivo') return sum + s.totalAmount;
            return sum + (s.amountInCash || 0);
        }, 0);

    const cashFromServices = servicesInRange
        .filter(s => s.paymentMethod?.includes('Efectivo'))
        .reduce((sum, s) => {
            if (s.paymentMethod === 'Efectivo') return sum + (s.totalCost || 0);
            return sum + (s.amountInCash || 0);
        }, 0);

    const totalCashOperations = cashFromSales + cashFromServices;
    const totalCashIn = allCashTransactions
      .filter(t => t.type === 'Entrada' && isValid(parseISO(t.date)) && isWithinInterval(parseISO(t.date), { start, end }))
      .reduce((sum, t) => sum + t.amount, 0);
    const totalCashOut = allCashTransactions
      .filter(t => t.type === 'Salida' && isValid(parseISO(t.date)) && isWithinInterval(parseISO(t.date), { start, end }))
      .reduce((sum, t) => sum + t.amount, 0);
    const finalCashBalance = initialBalance + totalCashOperations + totalCashIn - totalCashOut;
    
    const salesByPaymentMethod: Record<string, number> = {};
    [...salesInRange, ...servicesInRange].forEach(op => {
      const method = op.paymentMethod || 'Efectivo';
      const amount = 'totalAmount' in op ? op.totalAmount : (op.totalCost || 0);
      salesByPaymentMethod[method] = (salesByPaymentMethod[method] || 0) + amount;
    });

    return { initialBalance, totalCashSales: totalCashOperations, totalCashIn, totalCashOut, finalCashBalance, salesByPaymentMethod, totalSales: salesInRange.length, totalServices: servicesInRange.length };
  }, [dateRange, allSales, allServices, allCashTransactions, initialCashBalance]);

  const cashMovementsInRange = useMemo(() => {
    if (!dateRange?.from) return [];
    const from = startOfDay(dateRange.from);
    const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);

    return allCashTransactions.filter(transaction => {
        const transactionDate = parseISO(transaction.date);
        return isValid(transactionDate) && isWithinInterval(transactionDate, { start: from, end: to });
    }).sort((a,b) => compareDesc(parseISO(a.date), parseISO(b.date)));
  }, [dateRange, allCashTransactions]);
  
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
    setInitialBalanceAmount(''); // Reset amount after saving
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

  const handleDeleteTransaction = useCallback(async (transactionId: string) => {
    await operationsService.deleteCashTransaction(transactionId);
    toast({ title: `Transacción eliminada.` });
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
  const setDateToYesterday = () => {
    const yesterday = subDays(new Date(), 1);
    setDateRange({ from: startOfDay(yesterday), to: endOfDay(yesterday) });
  };
  const setDateToThisWeek = () => setDateRange({ from: startOfWeek(new Date(), { weekStartsOn: 1 }), to: endOfWeek(new Date(), { weekStartsOn: 1 }) });
  const setDateToThisMonth = () => setDateRange({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) });
  
  const paymentMethods: (PaymentMethod | 'all')[] = ['all', 'Efectivo', 'Tarjeta', 'Transferencia', 'Efectivo+Transferencia', 'Tarjeta+Transferencia', 'Efectivo/Tarjeta'];


  const dateFilterComponent = (
    <div className="flex items-center gap-2 flex-wrap justify-start sm:justify-end">
      <Button variant="outline" size="sm" onClick={setDateToToday} className="bg-card">Hoy</Button>
      <Button variant="outline" size="sm" onClick={setDateToYesterday} className="bg-card">Ayer</Button>
      <Button variant="outline" size="sm" onClick={setDateToThisWeek} className="bg-card">Semana</Button>
      <Button variant="outline" size="sm" onClick={setDateToThisMonth} className="bg-card">Mes</Button>
      <Popover><PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full sm:w-[240px] justify-start text-left font-normal bg-card", !dateRange && "text-muted-foreground")}><CalendarDateIcon className="mr-2 h-4 w-4" />{dateRange?.from ? (dateRange.to ? (`${format(dateRange.from, "LLL dd, y", { locale: es })} - ${format(dateRange.to, "LLL dd, y", { locale: es })}`) : format(dateRange.from, "LLL dd, y", { locale: es })) : (<span>Rango</span>)}</Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="end"><Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2} locale={es} /></PopoverContent></Popover>
    </div>
  );

  const posTabs = [
    { value: "informe", label: "Informe" },
    { value: "ventas", label: "Ventas" },
    { value: "caja", label: "Caja" },
    { value: "movimientos", label: "Movimientos" },
  ];

  if (isLoading) { return <div className="flex h-[50vh] w-full items-center justify-center"><Loader2 className="mr-2 h-5 w-5 animate-spin" /><p className="text-lg ml-4">Cargando datos...</p></div>; }
  
  return (
    <>
      <div className="bg-primary text-primary-foreground rounded-lg p-6 mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Punto de Venta</h1>
        <p className="text-primary-foreground/80 mt-1">Registra ventas, gestiona tu caja y analiza el rendimiento de tus operaciones.</p>
      </div>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="w-full">
            <div className="flex flex-wrap w-full gap-2 sm:gap-4">
              {posTabs.map((tabInfo) => (
                <button
                  key={tabInfo.value}
                  onClick={() => setActiveTab(tabInfo.value)}
                  className={cn(
                    'flex-1 min-w-[30%] sm:min-w-0 text-center px-3 py-2 rounded-md transition-colors duration-200 text-sm sm:text-base',
                    'break-words whitespace-normal leading-snug',
                    activeTab === tabInfo.value
                      ? 'bg-red-700 text-white shadow'
                      : 'bg-white text-gray-700 hover:bg-gray-200 border border-gray-200'
                  )}
                >
                  {tabInfo.label}
                </button>
              ))}
            </div>
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
            <Card>
                <CardHeader className="space-y-4">
                     <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div><h2 className="text-2xl font-semibold tracking-tight">Historial de Ventas</h2><p className="text-muted-foreground">Consulta, filtra y reimprime tickets.</p></div>
                        <Button asChild className="flex-1 sm:flex-initial"><Link href="/pos/nuevo"><PlusCircle className="mr-2 h-4 w-4" />Nueva Venta</Link></Button>
                    </div>
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 flex-wrap w-full justify-start sm:justify-end">{dateFilterComponent}</div>
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
                            <div className="relative flex-1 w-full sm:max-w-xs">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input type="search" placeholder="Buscar por ID, cliente, artículo..." className="w-full rounded-lg bg-card pl-8" value={ventasSearchTerm} onChange={(e) => setVentasSearchTerm(e.target.value)} />
                            </div>
                            <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild><Button variant="outline" className="flex-1 sm:flex-initial bg-card"><ListFilter className="mr-2 h-4 w-4" />Ordenar</Button></DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>Ordenar por</DropdownMenuLabel>
                                        <DropdownMenuRadioGroup value={ventasSortOption} onValueChange={(v) => setVentasSortOption(v as SaleSortOption)}>
                                            <DropdownMenuRadioItem value="date_desc">Más Reciente</DropdownMenuRadioItem>
                                            <DropdownMenuRadioItem value="date_asc">Más Antiguo</DropdownMenuRadioItem>
                                        </DropdownMenuRadioGroup>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild><Button variant="outline" className="flex-1 sm:flex-initial bg-card"><Filter className="mr-2 h-4 w-4" />Pago</Button></DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>Método de Pago</DropdownMenuLabel>
                                        <DropdownMenuRadioGroup value={ventasPaymentMethodFilter} onValueChange={(v) => setVentasPaymentMethodFilter(v as PaymentMethod | 'all')}>
                                            {paymentMethods.map(method => (<DropdownMenuRadioItem key={method} value={method}>{method === 'all' ? 'Todos' : method}</DropdownMenuRadioItem>))}
                                        </DropdownMenuRadioGroup>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent><SalesTable sales={filteredAndSortedSales} onReprintTicket={handleReprintSale} inventoryItems={allInventory} onEditSale={(sale) => { setSelectedSale(sale); setIsViewDialogOpen(true); }}/></CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="caja" className="mt-6 space-y-6">
             <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div><h2 className="text-2xl font-semibold tracking-tight">Gestión de Caja</h2><p className="text-muted-foreground">Controla el flujo de efectivo para la fecha seleccionada.</p></div>
                <div className="flex items-center gap-2 flex-wrap w-full justify-start sm:justify-end">{dateFilterComponent}</div>
             </div>
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Wallet className="text-primary"/>Cajón de Dinero</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="p-4 rounded-lg bg-muted border text-center">
                            <p className="text-sm font-medium text-muted-foreground">SALDO FINAL ESPERADO</p>
                            <p className="text-4xl font-bold text-primary">{formatCurrency(cajaSummaryData.finalCashBalance)}</p>
                        </div>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Saldo Inicial:</span> 
                                <div className="flex items-center gap-1">
                                    <span className="font-medium">{formatCurrency(cajaSummaryData.initialBalance)}</span>
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsInitialBalanceDialogOpen(true)}><Pencil className="h-3 w-3"/></Button>
                                </div>
                            </div>
                            <div className="flex justify-between items-center text-green-600"><span>(+) Ventas Efectivo:</span> <span className="font-medium">{formatCurrency(cajaSummaryData.totalCashSales)}</span></div>
                            <div className="flex justify-between items-center text-green-600"><span>(+) Entradas Manuales:</span> <span className="font-medium">{formatCurrency(cajaSummaryData.totalCashIn)}</span></div>
                            <div className="flex justify-between items-center text-red-600"><span>(-) Salidas Manuales:</span> <span className="font-medium">{formatCurrency(cajaSummaryData.totalCashOut)}</span></div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="lg:col-span-2">
                    <CardHeader><div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"><div><CardTitle>Transacciones Manuales</CardTitle><CardDescription>Entradas y salidas de efectivo no relacionadas a ventas.</CardDescription></div><Button onClick={() => setIsCorteDialogOpen(true)}><Printer className="mr-2 h-4 w-4"/> Corte de Caja</Button></div></CardHeader>
                    <CardContent className="grid md:grid-cols-2 gap-6">
                        <Card><CardHeader><CardTitle className="flex items-center gap-2 text-green-600"><ArrowUpCircle/>Registrar Entrada</CardTitle></CardHeader><CardContent><CashTransactionForm type="Entrada" onSubmit={handleAddTransaction} /></CardContent></Card>
                        <Card><CardHeader><CardTitle className="flex items-center gap-2 text-red-600"><ArrowDownCircle/>Registrar Salida</CardTitle></CardHeader><CardContent><CashTransactionForm type="Salida" onSubmit={handleAddTransaction} /></CardContent></Card>
                    </CardContent>
                </Card>
             </div>
        </TabsContent>
        <TabsContent value="movimientos" className="mt-6 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div><h2 className="text-2xl font-semibold tracking-tight">Movimientos de Caja</h2><p className="text-muted-foreground">Registro histórico de todas las transacciones de efectivo.</p></div>
                {dateFilterComponent}
            </div>
            <Card>
                <CardContent className="pt-6">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead>Concepto</TableHead>
                                <TableHead>Usuario</TableHead>
                                <TableHead className="text-right">Monto</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {cashMovementsInRange.length > 0 ? cashMovementsInRange.map(m => (
                                <TableRow key={m.id}>
                                    <TableCell>{format(parseISO(m.date), "dd MMM yy, HH:mm", { locale: es })}</TableCell>
                                    <TableCell>
                                        <Badge variant={m.type === 'Entrada' ? 'success' : 'destructive'}>{m.type}</Badge>
                                    </TableCell>
                                    <TableCell>{m.concept}</TableCell>
                                    <TableCell>{m.userName}</TableCell>
                                    <TableCell className={cn("text-right font-bold", m.type === 'Entrada' ? 'text-green-600' : 'text-red-600')}>{formatCurrency(m.amount)}</TableCell>
                                    <TableCell className="text-right">
                                        {!m.relatedType && ( // Only show delete for manual transactions
                                            <ConfirmDialog
                                                triggerButton={<Button variant="ghost" size="icon" title="Eliminar Transacción"><Trash2 className="h-4 w-4 text-destructive"/></Button>}
                                                title="¿Eliminar Transacción?"
                                                description={`¿Seguro que quieres eliminar la ${m.type.toLowerCase()} de "${m.concept}" por ${formatCurrency(m.amount)}? Esta acción es permanente.`}
                                                onConfirm={() => handleDeleteTransaction(m.id)}
                                            />
                                        )}
                                    </TableCell>
                                </TableRow>
                            )) : <TableRow><TableCell colSpan={6} className="h-24 text-center">No hay movimientos en este período.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </CardContent>
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
        <DialogContent className="sm:max-w-md p-6 space-y-4">
          <DialogHeader className="text-left">
            <DialogTitle>Saldo Inicial de Caja</DialogTitle>
            <DialogDescription>
              Ingrese la cantidad de efectivo con la que inicia la caja para el día{" "}
              <strong>{format(dateRange?.from || new Date(), "dd/MM/yyyy", { locale: es })}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Label htmlFor="initial-balance">Monto Inicial</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="initial-balance"
                type="number"
                placeholder="500.00"
                value={initialBalanceAmount}
                onChange={(e) => setInitialBalanceAmount(e.target.value === '' ? '' : Number(e.target.value))}
                className="pl-8"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsInitialBalanceDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSetInitialBalance}>Guardar Saldo Inicial</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <PrintTicketDialog open={isCorteDialogOpen} onOpenChange={setIsCorteDialogOpen} title="Corte de Caja">
         <CorteDiaContent reportData={cajaSummaryData} date={dateRange?.from || new Date()} transactions={allCashTransactions.filter(t => isSameDay(parseISO(t.date), dateRange?.from || new Date()))}/>
      </PrintTicketDialog>
    </>
  );
}
