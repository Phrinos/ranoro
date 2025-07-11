


"use client";

import { useState, useMemo, useEffect, useCallback, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  placeholderSales,
  placeholderServiceRecords,
  placeholderInventory, 
  placeholderServiceTypes,
} from "@/lib/placeholder-data";
import type { InventoryItem, FinancialOperation, AggregatedInventoryItem, PaymentMethod, ServiceTypeRecord, SaleReceipt, ServiceRecord } from "@/types";
import {
  format,
  parseISO,
  isWithinInterval,
  isValid,
  startOfDay, endOfDay, startOfWeek, endOfWeek, compareDesc, startOfMonth, endOfMonth, compareAsc
} from "date-fns";
import { es } from 'date-fns/locale';
import { CalendarIcon, Search, LineChart, PackageSearch, ListFilter, Filter } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { DateRange } from "react-day-picker";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { operationsService, inventoryService } from '@/lib/services';
import { Loader2 } from 'lucide-react';


type OperationTypeFilter = "all" | string;

function ReportesPageComponent() {
    const searchParams = useSearchParams();
    const defaultTab = searchParams.get('tab') || 'operaciones';
    const [activeTab, setActiveTab] = useState(defaultTab);
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
    const [isLoading, setIsLoading] = useState(true);
    
    const [allSales, setAllSales] = useState<SaleReceipt[]>([]);
    const [allServices, setAllServices] = useState<ServiceRecord[]>([]);
    const [allInventory, setAllInventory] = useState<InventoryItem[]>([]);
    const [serviceTypes, setServiceTypes] = useState<ServiceTypeRecord[]>([]);


    const [reporteOpSearchTerm, setReporteOpSearchTerm] = useState("");
    const [reporteOpTypeFilter, setReporteOpTypeFilter] = useState<OperationTypeFilter>("all");
    const [reporteOpSortOption, setReporteOpSortOption] = useState<string>("date_desc");
    const [reporteOpPaymentMethodFilter, setReporteOpPaymentMethodFilter] = useState<PaymentMethod | 'all'>("all");
    
    const [reporteInvSearchTerm, setReporteInvSearchTerm] = useState("");
    const [reporteInvSortOption, setReporteInvSortOption] = useState<string>("quantity_desc");

    useEffect(() => {
        const unsubs: (() => void)[] = [];
        setIsLoading(true);

        unsubs.push(operationsService.onSalesUpdate(setAllSales));
        unsubs.push(operationsService.onServicesUpdate(setAllServices));
        unsubs.push(inventoryService.onItemsUpdate(setAllInventory));
        unsubs.push(inventoryService.onServiceTypesUpdate((data) => {
            setServiceTypes(data);
            setIsLoading(false);
        }));

        const now = new Date();
        setDateRange({ from: startOfMonth(now), to: endOfMonth(now) });

        return () => unsubs.forEach(unsub => unsub());
    }, []);

    const combinedOperations = useMemo((): FinancialOperation[] => {
        if (isLoading) return [];
        const saleOperations: FinancialOperation[] = allSales.filter(s => s.status !== 'Cancelado').map(sale => ({ id: sale.id, date: sale.saleDate, type: 'Venta', description: sale.items.map(i => i.itemName).join(', '), totalAmount: sale.totalAmount, profit: 0, originalObject: sale }));
        const serviceOperations: FinancialOperation[] = allServices.filter(s => s.status === 'Completado').map(service => ({ id: service.id, date: service.deliveryDateTime || service.serviceDate, type: service.serviceType || 'Servicio General', description: service.description || (service.serviceItems || []).map(i => i.name).join(', '), totalAmount: service.totalCost, profit: service.serviceProfit || 0, originalObject: service }));
        return [...saleOperations, ...serviceOperations];
    }, [isLoading, allSales, allServices]);
    
    const filteredAndSortedOperations = useMemo(() => {
        if (isLoading || !dateRange?.from) return [];
        const from = startOfDay(dateRange.from);
        const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);
        let list = combinedOperations.filter(op => op.date && isValid(parseISO(op.date)) && isWithinInterval(parseISO(op.date), { start: from, end: to }));
        
        if (reporteOpTypeFilter !== 'all') {
             list = list.filter(op => op.type === reporteOpTypeFilter);
        }
        
        if (reporteOpPaymentMethodFilter !== 'all') {
            list = list.filter(op => {
                const opPaymentMethod = (op.originalObject as SaleReceipt | ServiceRecord).paymentMethod;
                return (opPaymentMethod || 'Efectivo') === reporteOpPaymentMethodFilter;
            });
        }

        if (reporteOpSearchTerm) { list = list.filter(op => op.id.toLowerCase().includes(reporteOpSearchTerm.toLowerCase()) || op.description.toLowerCase().includes(reporteOpSearchTerm.toLowerCase())); }
        
        list.sort((a,b) => {
            switch (reporteOpSortOption) {
                case 'date_asc':
                    return compareAsc(parseISO(a.date!), parseISO(b.date!));
                case 'amount_desc':
                    return b.totalAmount - a.totalAmount;
                case 'amount_asc':
                    return a.totalAmount - b.totalAmount;
                case 'profit_desc':
                    return b.profit - a.profit;
                case 'profit_asc':
                    return a.profit - b.profit;
                case 'date_desc':
                default:
                    return compareDesc(parseISO(a.date!), parseISO(b.date!));
            }
        });
        return list;
    }, [combinedOperations, dateRange, reporteOpSearchTerm, reporteOpTypeFilter, reporteOpPaymentMethodFilter, isLoading, reporteOpSortOption]);

    const aggregatedInventory = useMemo((): AggregatedInventoryItem[] => {
        if (isLoading || !dateRange?.from) return [];
        const from = startOfDay(dateRange.from);
        const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);
        const allItemsSold = new Map<string, AggregatedInventoryItem>();
        const processItem = (itemId: string, name: string, sku: string, quantity: number, revenue: number) => {
            const existing = allItemsSold.get(itemId);
            if (existing) { existing.totalQuantity += quantity; existing.totalRevenue += revenue; }
            else { allItemsSold.set(itemId, { itemId, name, sku, totalQuantity: quantity, totalRevenue: revenue }); }
        };
        allSales.forEach(sale => { if (sale.status !== 'Cancelado' && isValid(parseISO(sale.saleDate)) && isWithinInterval(parseISO(sale.saleDate), { start: from, end: to })) { sale.items.forEach(item => { const invItem = allInventory.find(i => i.id === item.inventoryItemId); if (invItem && !invItem.isService) { processItem(invItem.id, invItem.name, invItem.sku, item.quantity, item.totalPrice); } }); } });
        allServices.forEach(service => { if (service.status === 'Completado' && service.deliveryDateTime && isValid(parseISO(service.deliveryDateTime)) && isWithinInterval(parseISO(service.deliveryDateTime), { start: from, end: to })) { (service.serviceItems || []).forEach(sItem => { (sItem.suppliesUsed || []).forEach(supply => { const invItem = allInventory.find(i => i.id === supply.supplyId); if(invItem && !invItem.isService){ processItem(invItem.id, invItem.name, invItem.sku, supply.quantity, supply.sellingPrice ? supply.sellingPrice * supply.quantity : 0); } }); }); } });
        return Array.from(allItemsSold.values());
    }, [dateRange, isLoading, allSales, allServices, allInventory]);

    const filteredAndSortedInventory = useMemo(() => {
        let list = [...aggregatedInventory];
        if (reporteInvSearchTerm) { list = list.filter(item => item.name.toLowerCase().includes(reporteInvSearchTerm.toLowerCase()) || item.sku.toLowerCase().includes(reporteInvSearchTerm.toLowerCase())); }
        
        list.sort((a, b) => {
            switch (reporteInvSortOption) {
                case 'quantity_asc':
                    return a.totalQuantity - b.totalQuantity;
                case 'revenue_desc':
                    return b.totalRevenue - a.totalRevenue;
                case 'revenue_asc':
                    return a.totalRevenue - b.totalRevenue;
                case 'name_asc':
                    return a.name.localeCompare(b.name);
                case 'name_desc':
                    return b.name.localeCompare(a.name);
                case 'quantity_desc':
                default:
                    return b.totalQuantity - a.totalQuantity;
            }
        });
        
        return list;
    }, [aggregatedInventory, reporteInvSearchTerm, reporteInvSortOption]);

    const getOperationTypeVariant = (type: string) => {
        switch (type) {
            case 'Venta': return 'secondary';
            case 'Servicio General': return 'default';
            case 'Cambio de Aceite': return 'blue';
            case 'Pintura': return 'purple';
            default: return 'outline';
        }
    };
    
    const paymentMethods: PaymentMethod[] = [
      'Efectivo',
      'Tarjeta',
      'Transferencia',
      'Efectivo+Transferencia',
      'Tarjeta+Transferencia',
    ];


    if (isLoading) { return <div className="text-center py-10">Cargando reportes...</div>; }
    
    return (
        <>
            <div className="bg-primary text-primary-foreground rounded-lg p-6 mb-6">
                <h1 className="text-3xl font-bold tracking-tight">Reportes Operativos</h1>
                <p className="text-primary-foreground/80 mt-1">Analiza el detalle de tus operaciones y el movimiento de inventario.</p>
            </div>
             <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="font-semibold text-lg">Filtrar por Fecha</p>
                <div className="flex items-center gap-2 flex-wrap justify-start sm:justify-end">
                    <Button variant="outline" size="sm" onClick={() => setDateRange({ from: startOfDay(new Date()), to: endOfDay(new Date()) })} className="bg-card">Hoy</Button>
                    <Button variant="outline" size="sm" onClick={() => setDateRange({ from: startOfWeek(new Date(), { weekStartsOn: 1 }), to: endOfWeek(new Date(), { weekStartsOn: 1 }) })} className="bg-card">Esta Semana</Button>
                    <Button variant="outline" size="sm" onClick={() => setDateRange({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) })} className="bg-card">Este Mes</Button>
                    <Popover><PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full sm:w-[240px] justify-start text-left font-normal bg-card", !dateRange && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{dateRange?.from ? (dateRange.to ? (`${format(dateRange.from, "LLL dd, y", { locale: es })} - ${format(dateRange.to, "LLL dd, y", { locale: es })}`) : format(dateRange.from, "LLL dd, y", { locale: es })) : (<span>Seleccione rango</span>)}</Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="end"><Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2} locale={es} /></PopoverContent></Popover>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="operaciones" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Reporte de Operaciones</TabsTrigger>
                    <TabsTrigger value="inventario" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Reporte de Inventario</TabsTrigger>
                </TabsList>
                <TabsContent value="operaciones" className="mt-6 space-y-4">
                    <div>
                        <h2 className="text-2xl font-semibold tracking-tight">Detalle de Operaciones</h2>
                        <p className="text-muted-foreground">Ventas y servicios completados en el período seleccionado.</p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                        <div className="relative flex-1 w-full">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input type="search" placeholder="Buscar por ID o descripción..." className="w-full rounded-lg bg-card pl-8" value={reporteOpSearchTerm} onChange={(e) => setReporteOpSearchTerm(e.target.value)} />
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="flex-1 sm:flex-initial bg-card">
                                        <Filter className="mr-2 h-4 w-4" />
                                        <span>Tipo: {reporteOpTypeFilter === 'all' ? 'Todos' : reporteOpTypeFilter}</span>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Filtrar por Tipo</DropdownMenuLabel>
                                    <DropdownMenuRadioGroup value={reporteOpTypeFilter} onValueChange={(v) => setReporteOpTypeFilter(v as OperationTypeFilter)}>
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
                                        <DropdownMenuRadioItem value="all">Todos</DropdownMenuRadioItem>
                                        {paymentMethods.map(method => (
                                            <DropdownMenuRadioItem key={method} value={method}>{method}</DropdownMenuRadioItem>
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
                                                    <TableCell>{op.date ? format(parseISO(op.date), "dd MMM yy, HH:mm", { locale: es }) : 'N/A'}</TableCell>
                                                    <TableCell><Badge variant={getOperationTypeVariant(op.type)}>{op.type}</Badge></TableCell>
                                                    <TableCell>{op.id}</TableCell>
                                                    <TableCell className="max-w-xs truncate">{op.description}</TableCell>
                                                    <TableCell className="text-right font-semibold">{formatCurrency(op.totalAmount)}</TableCell>
                                                    <TableCell className="text-right font-semibold">{formatCurrency(op.profit)}</TableCell>
                                                    <TableCell className="text-right">{(op.originalObject as any).paymentMethod || 'Efectivo'}</TableCell>
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
                </TabsContent>
                <TabsContent value="inventario" className="mt-6 space-y-4">
                     <div>
                        <h2 className="text-2xl font-semibold tracking-tight">Detalle de Salidas de Inventario</h2>
                        <p className="text-muted-foreground">Productos y refacciones vendidos o utilizados en servicios en el período seleccionado.</p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                        <div className="relative flex-1 w-full">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input type="search" placeholder="Buscar por nombre o SKU..." className="w-full rounded-lg bg-card pl-8" value={reporteInvSearchTerm} onChange={(e) => setReporteInvSearchTerm(e.target.value)} />
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="flex-1 sm:flex-initial bg-card">
                                        <ListFilter className="mr-2 h-4 w-4" />
                                        <span>Ordenar por</span>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Ordenar por</DropdownMenuLabel>
                                    <DropdownMenuRadioGroup value={reporteInvSortOption} onValueChange={setReporteInvSortOption}>
                                        <DropdownMenuRadioItem value="quantity_desc">Unidades (Mayor a Menor)</DropdownMenuRadioItem>
                                        <DropdownMenuRadioItem value="quantity_asc">Unidades (Menor a Mayor)</DropdownMenuRadioItem>
                                        <DropdownMenuRadioItem value="revenue_desc">Ingreso (Mayor a Menor)</DropdownMenuRadioItem>
                                        <DropdownMenuRadioItem value="revenue_asc">Ingreso (Menor a Mayor)</DropdownMenuRadioItem>
                                        <DropdownMenuRadioItem value="name_asc">Nombre (A-Z)</DropdownMenuRadioItem>
                                        <DropdownMenuRadioItem value="name_desc">Nombre (Z-A)</DropdownMenuRadioItem>
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
                                            <TableHead className="text-white">SKU</TableHead>
                                            <TableHead className="text-white">Producto</TableHead>
                                            <TableHead className="text-right text-white">Unidades</TableHead>
                                            <TableHead className="text-right text-white">Ingreso Generado</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredAndSortedInventory.length > 0 ? (
                                            filteredAndSortedInventory.map(item => (
                                                <TableRow key={item.itemId}>
                                                    <TableCell>{item.sku}</TableCell>
                                                    <TableCell>{item.name}</TableCell>
                                                    <TableCell className="text-right">{item.totalQuantity}</TableCell>
                                                    <TableCell className="text-right">{formatCurrency(item.totalRevenue)}</TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={4}>
                                                    <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
                                                        <PackageSearch className="h-12 w-12 mb-2" />
                                                        <h3 className="text-lg font-semibold text-foreground">Sin Movimientos de Inventario</h3>
                                                        <p className="text-sm">No se vendieron productos en el período seleccionado.</p>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </>
    );
}

export default function ReportesPageWrapper() {
    return (
        <Suspense fallback={<div>Cargando...</div>}>
            <ReportesPageComponent />
        </Suspense>
    );
}

    
