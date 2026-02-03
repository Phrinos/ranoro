// src/app/(app)/reportes/components/detalles-reporte-content.tsx
"use client";

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency, cn } from "@/lib/utils";
import { format, isValid, startOfMonth, endOfMonth, isWithinInterval, startOfDay, endOfDay, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { Wallet, ArrowUpRight, ArrowDownRight, Search, PlusCircle, DollarSign, Receipt, Wrench, ShoppingCart, CalendarIcon, Info, Trash2, Tag, CreditCard, User as UserIcon, StickyNote, Download, Filter } from 'lucide-react';
import { parseDate } from '@/lib/forms';
import { DatePickerWithRange } from '@/components/ui/date-picker-with-range';
import { useTableManager } from '@/hooks/useTableManager';
import { SortableTableHeader } from '@/components/shared/SortableTableHeader';
import type { ServiceRecord, SaleReceipt, CashDrawerTransaction, User } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { cashService, serviceService, saleService } from '@/lib/services';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { AUTH_USER_LOCALSTORAGE_KEY } from '@/lib/placeholder-data';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { NewCalendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { exportToCsv } from '@/lib/services/export.service';
import { Checkbox } from "@/components/ui/checkbox";
import { usePermissions } from '@/hooks/usePermissions';

const transactionSchema = z.object({
  concept: z.string().min(3, "El concepto debe tener al menos 3 caracteres."),
  amount: z.coerce.number().min(0.01, "El monto debe ser mayor a 0."),
  date: z.date({ required_error: "La fecha es obligatoria." }),
  paymentMethod: z.enum(["Efectivo", "Tarjeta", "Transferencia", "Transferencia/Contadora"], { required_error: "El método de pago es obligatorio." }),
});

type TransactionFormValues = z.infer<typeof transactionSchema>;

interface DetallesReporteProps {
  services: ServiceRecord[];
  sales: SaleReceipt[];
  cashTransactions: CashDrawerTransaction[];
  users: User[];
}

type ReportRow = {
  id: string;
  realId: string;
  date: Date | null;
  type: 'Ingreso' | 'Egreso';
  source: 'Compra' | 'Venta (PDV)' | 'Servicio' | 'Manual' | 'Flotilla';
  concept: string;
  method: string;
  amount: number;
  clientUser: string;
  note?: string;
  registeredBy?: string;
};

const tipoOptions = [
  { value: 'all', label: 'Todos los Tipos' },
  { value: 'Ingreso', label: 'Ingresos' },
  { value: 'Egreso', label: 'Egresos' },
];

const metodoOptions = [
  { value: 'all', label: 'Todos los Métodos' },
  { value: 'Efectivo', label: 'Efectivo' },
  { value: 'Tarjeta', label: 'Tarjeta' },
  { value: 'Transferencia', label: 'Transferencia' },
  { value: 'Transferencia/Contadora', label: 'Transferencia/Contadora' },
];

export default function DetallesReporteContent({ services, sales, cashTransactions, users }: DetallesReporteProps) {
  const { toast } = useToast();
  const permissions = usePermissions();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'Ingreso' | 'Egreso'>('Ingreso');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [selectedMovement, setSelectedMovement] = useState<ReportRow | null>(null);
  const [selectedMethods, setSelectedMethods] = useState<string[]>([]);

  const canManageManual = permissions.has('finances:manage_manual_entries') || permissions.has('workshop:manage');
  const canDeleteEntries = permissions.has('finances:delete_entries') || permissions.has('workshop:manage');

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: { 
      concept: "", 
      amount: undefined, 
      date: new Date(),
      paymentMethod: "Efectivo"
    },
  });

  const mergedMovements = useMemo(() => {
    const rows: ReportRow[] = [];

    services.forEach(s => {
      if (s.status !== 'Entregado') return;
      const d = parseDate(s.deliveryDateTime || s.serviceDate);
      const amount = Number(s.totalCost) || 0;
      if (amount <= 0) return;
      
      const methods = s.payments?.map(p => p.method).join(' / ') || (s as any).paymentMethod || 'Efectivo';
      
      rows.push({
        id: `svc-${s.id}`,
        realId: s.id,
        date: d,
        type: 'Ingreso',
        source: 'Servicio',
        concept: `Servicio #${s.folio || s.id.slice(-6)} - ${s.vehicleIdentifier || 'Vehículo'}`,
        method: methods,
        amount: amount,
        clientUser: s.customerName || 'Cliente',
        note: s.notes,
        registeredBy: s.serviceAdvisorName || 'Sistema',
      });
    });

    sales.forEach(s => {
      if (s.status !== 'Completado') return;
      const d = parseDate(s.saleDate);
      const amount = Number(s.totalAmount) || 0;
      if (amount <= 0) return;

      const methods = s.payments?.map(p => p.method).join(' / ') || (s as any).paymentMethod || 'Efectivo';

      rows.push({
        id: `sale-${s.id}`,
        realId: s.id,
        date: d,
        type: 'Ingreso',
        source: 'Venta (PDV)',
        concept: `Venta Mostrador #${s.id.slice(-6)}`,
        method: methods,
        amount: amount,
        clientUser: s.customerName || 'Cliente Mostrador',
        note: (s as any).note || (s as any).description,
        registeredBy: (s as any).registeredByName || 'Sistema',
      });
    });

    cashTransactions.forEach(t => {
      if (t.relatedType === 'Servicio' || t.relatedType === 'Venta') return;
      
      const d = parseDate(t.date);
      const isIncome = t.type === 'in' || t.type === 'Entrada';
      
      let source: ReportRow['source'] = 'Manual';
      if (t.relatedType === 'Compra') source = 'Compra';
      if (t.relatedType === 'Flotilla') source = 'Flotilla';

      rows.push({
        id: `ledger-${t.id}`,
        realId: t.id,
        date: d,
        type: isIncome ? 'Ingreso' : 'Egreso',
        source: source,
        concept: t.concept || t.description || 'Movimiento de Caja',
        method: t.paymentMethod || 'Efectivo',
        amount: Math.abs(t.amount),
        clientUser: t.userName || 'Sistema',
        note: t.note || t.description,
        registeredBy: t.userName || 'Sistema',
      });
    });

    return rows;
  }, [services, sales, cashTransactions]);

  const { fullFilteredData, ...tableManager } = useTableManager<ReportRow>({
    initialData: mergedMovements,
    searchKeys: ['concept', 'clientUser', 'method', 'source'],
    dateFilterKey: 'date',
    initialSortOption: 'date_desc',
    initialDateRange: { from: startOfMonth(new Date()), to: endOfMonth(new Date()) },
    itemsPerPage: 10000,
  });

  const kpis = useMemo(() => {
    const data = fullFilteredData;
    
    const ingresoTotal = data.filter(r => r.type === 'Ingreso').reduce((s, r) => s + r.amount, 0);
    const egresoTotal = data.filter(r => r.type === 'Egreso').reduce((s, r) => s + r.amount, 0);
    
    const efectivoIngresoPeriodo = data
      .filter(r => r.type === 'Ingreso' && r.method.toLowerCase().includes('efectivo'))
      .reduce((s, r) => s + r.amount, 0);
      
    const efectivoEgresoPeriodo = data
      .filter(r => r.type === 'Egreso' && r.method.toLowerCase().includes('efectivo'))
      .reduce((s, r) => s + r.amount, 0);

    return {
      ingresoTotal,
      egresoTotal,
      efectivoIngreso: efectivoIngresoPeriodo,
      balanceNeto: ingresoTotal - egresoTotal,
      efectivoDelPeriodo: efectivoIngresoPeriodo - efectivoEgresoPeriodo
    };
  }, [fullFilteredData]);

  const handleToggleMethod = (method: string) => {
    const next = selectedMethods.includes(method)
      ? selectedMethods.filter(m => m !== method)
      : [...selectedMethods, method];
    
    setSelectedMethods(next);
    tableManager.setOtherFilters(prev => ({ 
      ...prev, 
      method: next.length > 0 ? next : "all" 
    }));
  };

  const handleTransactionSubmit = async (values: TransactionFormValues) => {
    const authUserString = localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY);
    const currentUser = authUserString ? JSON.parse(authUserString) : null;
    try {
      await cashService.addCashTransaction({
        type: dialogType === 'Ingreso' ? 'in' : 'out',
        amount: values.amount,
        concept: values.concept,
        date: values.date.toISOString(),
        userId: currentUser?.id || 'system',
        userName: currentUser?.name || 'Sistema',
        relatedType: 'Manual',
        paymentMethod: values.paymentMethod,
      });
      toast({ title: `${dialogType} registrado con éxito.` });
      setIsDialogOpen(false);
      form.reset();
    } catch (e) {
      toast({ title: 'Error', description: 'No se pudo registrar el movimiento.', variant: 'destructive' });
    }
  };

  const handleDeleteMovement = async (row: ReportRow) => {
    try {
      if (row.id.startsWith('ledger-')) {
        await cashService.deleteCashTransaction(row.realId);
      } else if (row.id.startsWith('svc-')) {
        await serviceService.deleteService(row.realId);
      } else if (row.id.startsWith('sale-')) {
        await saleService.deleteSale(row.realId, null);
      }
      
      toast({ title: "Movimiento eliminado", description: "El registro ha sido removido del sistema." });
      setSelectedMovement(null);
    } catch (error) {
      toast({ title: "Error al eliminar", description: "No se pudo completar la acción.", variant: "destructive" });
    }
  };

  const handleExportCsv = () => {
    if (fullFilteredData.length === 0) {
      toast({ title: "No hay datos para exportar", variant: "destructive" });
      return;
    }

    const dataToExport = fullFilteredData.map(row => ({
      fecha: row.date ? format(row.date, 'dd/MM/yyyy HH:mm', { locale: es }) : 'N/A',
      tipo: row.type,
      origen: row.source,
      concepto: row.concept,
      metodo_pago: row.method,
      monto: row.amount,
      cliente_usuario: row.clientUser,
      registrado_por: row.registeredBy || 'N/A',
      notas: row.note || ''
    }));

    exportToCsv({
      data: dataToExport,
      headers: [
        { key: 'fecha', label: 'Fecha' },
        { key: 'tipo', label: 'Tipo' },
        { key: 'origen', label: 'Origen' },
        { key: 'concepto', label: 'Concepto' },
        { key: 'metodo_pago', label: 'Método de Pago' },
        { key: 'monto', label: 'Monto' },
        { key: 'cliente_usuario', label: 'Cliente/Usuario' },
        { key: 'registrado_por', label: 'Registrado Por' },
        { key: 'notas', label: 'Notas' },
      ],
      fileName: `reporte_detallado_taller_${format(new Date(), 'yyyy-MM-dd')}`
    });
  };

  const handleSort = (key: string) => {
    const isAsc = tableManager.sortOption === `${key}_asc`;
    tableManager.onSortOptionChange(`${key}_${isAsc ? 'desc' : 'asc'}`);
  };

  const setThisMonth = () => {
    const now = new Date();
    tableManager.onDateRangeChange({ from: startOfMonth(now), to: endOfMonth(now) });
  };

  const setLastMonth = () => {
    const last = subMonths(new Date(), 1);
    tableManager.onDateRangeChange({ from: startOfMonth(last), to: endOfMonth(last) });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-green-200 bg-green-50/30">
          <CardHeader className="pb-2"><CardTitle className="text-xs font-medium uppercase text-muted-foreground">Ingreso Efectivo</CardTitle></CardHeader>
          <CardContent><div className="text-xl font-bold text-green-600">{formatCurrency(kpis.efectivoIngreso)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs font-medium uppercase text-muted-foreground">Ingreso Total</CardTitle></CardHeader>
          <CardContent><div className="text-xl font-bold flex items-center gap-2"><ArrowUpRight className="h-4 w-4 text-green-500"/>{formatCurrency(kpis.ingresoTotal)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs font-medium uppercase text-muted-foreground">Egreso Total</CardTitle></CardHeader>
          <CardContent><div className="text-xl font-bold flex items-center gap-2"><ArrowDownRight className="h-4 w-4 text-red-500"/>{formatCurrency(kpis.egresoTotal)}</div></CardContent>
        </Card>
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2"><CardTitle className="text-xs font-medium uppercase text-muted-foreground">Balance Neto</CardTitle></CardHeader>
          <CardContent><div className={cn("text-xl font-bold", kpis.balanceNeto >= 0 ? "text-primary" : "text-destructive")}>{formatCurrency(kpis.balanceNeto)}</div></CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader className="pb-2"><CardTitle className="text-xs font-medium uppercase text-muted-foreground">Efectivo Periodo</CardTitle></CardHeader>
          <CardContent><div className={cn("text-xl font-bold flex items-center gap-2", kpis.efectivoDelPeriodo >= 0 ? "text-blue-700" : "text-destructive")}><Wallet className="h-4 w-4"/>{formatCurrency(kpis.efectivoDelPeriodo)}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="relative w-full md:flex-grow">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por concepto, cliente, origen o método..."
                  value={tableManager.searchTerm}
                  onChange={(e) => tableManager.onSearchTermChange(e.target.value)}
                  className="pl-8 bg-background"
                />
              </div>
              <div className="flex gap-2 w-full md:w-auto shrink-0">
                {canManageManual && (
                  <>
                    <Button onClick={() => { setDialogType('Ingreso'); setIsDialogOpen(true); }} variant="outline" size="sm" className="flex-1 md:flex-none text-green-600 border-green-600 hover:bg-green-50 bg-card">
                      <PlusCircle className="mr-2 h-4 w-4" /> Registrar Ingreso
                    </Button>
                    <Button onClick={() => { setDialogType('Egreso'); setIsDialogOpen(true); }} variant="outline" size="sm" className="flex-1 md:flex-none text-red-600 border-red-600 hover:bg-red-50 bg-card">
                      <PlusCircle className="mr-2 h-4 w-4" /> Registrar Egreso
                    </Button>
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-2 items-center justify-end border-t pt-4">
              <div className="flex gap-2 w-full sm:w-auto">
                <Button variant="outline" size="sm" onClick={setThisMonth} className="flex-1 sm:flex-none bg-card">
                  Este Mes
                </Button>
                <Button variant="outline" size="sm" onClick={setLastMonth} className="flex-1 sm:flex-none bg-card">
                  Mes Pasado
                </Button>
              </div>
              <DatePickerWithRange date={tableManager.dateRange} onDateChange={tableManager.onDateRangeChange} />
              
              <div className="flex gap-2 w-full md:w-auto">
                <Select 
                  value={tableManager.otherFilters["type"] || "all"} 
                  onValueChange={(val) => tableManager.setOtherFilters(prev => ({ ...prev, type: val }))}
                >
                  <SelectTrigger className="w-full md:w-[150px] bg-card h-10">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {tipoOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                  </SelectContent>
                </Select>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full md:w-[180px] justify-between bg-card h-10">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <Filter className="h-4 w-4 shrink-0 opacity-50" />
                        <span className="truncate">
                          {selectedMethods.length === 0 ? "Todos los Métodos" : 
                           selectedMethods.length === 1 ? selectedMethods[0] : 
                           `${selectedMethods.length} Métodos`}
                        </span>
                      </div>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[200px] p-2" align="end">
                    <div className="space-y-2">
                      {metodoOptions.filter(o => o.value !== 'all').map(opt => (
                        <div 
                          key={opt.value} 
                          className="flex items-center space-x-2 p-2 hover:bg-muted rounded-md cursor-pointer"
                          onClick={() => handleToggleMethod(opt.value)}
                        >
                          <Checkbox 
                            checked={selectedMethods.includes(opt.value)}
                            onCheckedChange={() => {}} 
                          />
                          <span className="text-sm font-medium">{opt.label}</span>
                        </div>
                      ))}
                      {selectedMethods.length > 0 && (
                        <div className="border-t pt-2 mt-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="w-full text-xs h-8"
                            onClick={() => {
                              setSelectedMethods([]);
                              tableManager.setOtherFilters(prev => ({ ...prev, method: "all" }));
                            }}
                          >
                            Limpiar Filtros
                          </Button>
                        </div>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>

                <Button onClick={handleExportCsv} variant="outline" size="icon" className="h-10 w-10 shrink-0 bg-white" title="Descargar CSV">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader className="bg-black">
                <TableRow>
                  <SortableTableHeader sortKey="date" label="Fecha" onSort={handleSort} currentSort={tableManager.sortOption} textClassName="text-white" />
                  <SortableTableHeader sortKey="type" label="Tipo" onSort={handleSort} currentSort={tableManager.sortOption} textClassName="text-white" />
                  <SortableTableHeader sortKey="source" label="Origen" onSort={handleSort} currentSort={tableManager.sortOption} textClassName="text-white" />
                  <SortableTableHeader sortKey="concept" label="Concepto" onSort={handleSort} currentSort={tableManager.sortOption} textClassName="text-white" />
                  <SortableTableHeader sortKey="method" label="Método Pago" onSort={handleSort} currentSort={tableManager.sortOption} textClassName="text-white" />
                  <SortableTableHeader sortKey="amount" label="Monto" onSort={handleSort} currentSort={tableManager.sortOption} className="text-right" textClassName="text-white" />
                  <SortableTableHeader sortKey="clientUser" label="Cliente/Usuario" onSort={handleSort} currentSort={tableManager.sortOption} textClassName="text-white" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {fullFilteredData.length > 0 ? (
                  fullFilteredData.map(r => (
                    <TableRow 
                      key={r.id} 
                      className="cursor-pointer hover:bg-muted/50" 
                      onClick={() => setSelectedMovement(r)}
                    >
                      <TableCell className="text-xs">{r.date ? format(r.date, 'dd/MM/yy HH:mm', { locale: es }) : '—'}</TableCell>
                      <TableCell><Badge variant={r.type === 'Ingreso' ? 'success' : 'destructive'}>{r.type}</Badge></TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal flex items-center gap-1.5 w-fit">
                          {r.source === 'Servicio' && <Wrench className="h-3 w-3" />}
                          {r.source === 'Venta (PDV)' && <ShoppingCart className="h-3 w-3" />}
                          {r.source === 'Compra' && <Receipt className="h-3 w-3" />}
                          {r.source}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[250px] truncate font-medium" title={r.concept}>{r.concept}</TableCell>
                      <TableCell className="text-xs">{r.method}</TableCell>
                      <TableCell className={cn("text-right font-bold", r.type === 'Ingreso' ? "text-green-600" : "text-red-600")}>
                        {r.type === 'Ingreso' ? '+' : '-'} {formatCurrency(r.amount)}
                      </TableCell>
                      <TableCell className="text-xs truncate max-w-[150px]">{r.clientUser}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                      No se encontraron movimientos en este periodo.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal de Registro Manual */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar {dialogType} Manual</DialogTitle>
            <DialogDescription>Añade un movimiento directo al reporte financiero y caja.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleTransactionSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Fecha del Movimiento</FormLabel>
                      <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP", { locale: es })
                              ) : (
                                <span>Seleccionar fecha</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <NewCalendar
                            onChange={(date: any) => {
                              field.onChange(date);
                              setIsCalendarOpen(false);
                            }}
                            value={field.value}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="paymentMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Método de Pago</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione método" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Efectivo">Efectivo</SelectItem>
                          <SelectItem value="Tarjeta">Tarjeta</SelectItem>
                          <SelectItem value="Transferencia">Transferencia</SelectItem>
                          <SelectItem value="Transferencia/Contadora">Transferencia/Contadora</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="concept"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Concepto</FormLabel>
                    <FormControl><Textarea placeholder="Motivo del movimiento..." {...field} /></FormControl>
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
                      <div className="relative">
                        <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input type="number" step="0.01" className="pl-8" {...field} value={field.value ?? ""} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                <Button type="submit">Registrar {dialogType}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Modal de Detalles del Movimiento */}
      <Dialog open={!!selectedMovement} onOpenChange={(open) => !open && setSelectedMovement(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-primary" />
              Detalle del Movimiento
            </DialogTitle>
            <DialogDescription>Información completa registrada en el sistema.</DialogDescription>
          </DialogHeader>
          
          {selectedMovement && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1"><CalendarIcon className="h-3 w-3"/> Fecha y Hora</Label>
                  <p className="text-sm font-medium">{selectedMovement.date ? format(selectedMovement.date, "dd 'de' MMMM, yyyy HH:mm", { locale: es }) : 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1"><Tag className="h-3 w-3"/> Origen</Label>
                  <p className="text-sm font-medium">{selectedMovement.source}</p>
                </div>
              </div>

              <Separator />

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Concepto</Label>
                <p className="text-sm font-semibold">{selectedMovement.concept}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1"><CreditCard className="h-3 w-3"/> Método de Pago</Label>
                  <p className="text-sm font-medium">{selectedMovement.method}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1"><DollarSign className="h-3 w-3"/> Monto</Label>
                  <p className={cn("text-lg font-bold", selectedMovement.type === 'Ingreso' ? "text-green-600" : "text-red-600")}>
                    {selectedMovement.type === 'Ingreso' ? '+' : '-'} {formatCurrency(selectedMovement.amount)}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Cliente / Usuario</Label>
                  <p className="text-sm font-medium">{selectedMovement.clientUser}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Registrado por</Label>
                  <p className="text-sm font-medium">{selectedMovement.registeredBy}</p>
                </div>
              </div>

              {selectedMovement.note && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1"><StickyNote className="h-3 w-3"/> Notas Adicionales</Label>
                  <div className="p-2 bg-muted rounded-md text-sm italic">
                    {selectedMovement.note}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {selectedMovement && canDeleteEntries && (
              <ConfirmDialog
                triggerButton={
                  <Button variant="destructive" className="w-full sm:w-auto">
                    <Trash2 className="mr-2 h-4 w-4" /> Eliminar Registro
                  </Button>
                }
                title="¿Eliminar este movimiento?"
                description="Esta acción es permanente. Si el movimiento proviene de una venta o servicio entregado, se recomienda cancelarlo desde su módulo correspondiente para mantener la consistencia del inventario y caja."
                onConfirm={() => handleDeleteMovement(selectedMovement)}
                confirmText="Sí, Eliminar"
              />
            )}
            <Button variant="outline" onClick={() => setSelectedMovement(null)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
