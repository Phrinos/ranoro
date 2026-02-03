
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
import { Wallet, ArrowUpRight, ArrowDownRight, Search, PlusCircle, DollarSign, Truck, User as UserIcon, Landmark } from 'lucide-react';
import { parseDate } from '@/lib/forms';
import { DatePickerWithRange } from '@/components/ui/date-picker-with-range';
import { useTableManager } from '@/hooks/useTableManager';
import { SortableTableHeader } from '@/components/shared/SortableTableHeader';
import type { RentalPayment, VehicleExpense, OwnerWithdrawal, CashDrawerTransaction } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { cashService } from '@/lib/services';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { AUTH_USER_LOCALSTORAGE_KEY } from '@/lib/placeholder-data';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

const transactionSchema = z.object({
  concept: z.string().min(3, "El concepto debe tener al menos 3 caracteres."),
  amount: z.coerce.number().min(0.01, "El monto debe ser mayor a 0."),
});

type TransactionFormValues = z.infer<typeof transactionSchema>;

interface DetallesFlotillaProps {
  payments: RentalPayment[];
  expenses: VehicleExpense[];
  withdrawals: OwnerWithdrawal[];
  cashTransactions: CashDrawerTransaction[];
}

type FlotillaReportRow = {
  id: string;
  date: Date | null;
  type: 'Ingreso' | 'Egreso';
  source: 'Pago Renta' | 'Gasto Vehículo' | 'Retiro Socio' | 'Manual';
  concept: string;
  method: string;
  amount: number;
  clientUser: string;
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
];

export default function DetallesFlotillaContent({ payments, expenses, withdrawals, cashTransactions }: DetallesFlotillaProps) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'Ingreso' | 'Egreso'>('Ingreso');

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: { concept: "", amount: undefined },
  });

  const mergedMovements = useMemo(() => {
    const rows: FlotillaReportRow[] = [];

    // 1. Pagos de Renta (Ingresos)
    payments.forEach(p => {
      const d = parseDate(p.paymentDate || p.date);
      rows.push({
        id: `pay-${p.id}`,
        date: d,
        type: 'Ingreso',
        source: 'Pago Renta',
        concept: `Pago de Renta - ${p.driverName || 'Conductor'} (${p.vehicleLicensePlate || 'S/P'})`,
        method: p.paymentMethod || 'Efectivo',
        amount: p.amount,
        clientUser: p.driverName || 'Conductor',
      });
    });

    // 2. Gastos de Vehículos (Egresos)
    expenses.forEach(e => {
      const d = parseDate(e.date);
      rows.push({
        id: `exp-${e.id}`,
        date: d,
        type: 'Egreso',
        source: 'Gasto Vehículo',
        concept: `${e.description} - ${e.vehicleLicensePlate || 'Vehículo'}`,
        method: 'Efectivo', // Los gastos suelen salir de caja
        amount: e.amount,
        clientUser: e.vehicleLicensePlate || 'Vehículo',
      });
    });

    // 3. Retiros de Socios (Egresos)
    withdrawals.forEach(w => {
      const d = parseDate(w.date);
      rows.push({
        id: `with-${w.id}`,
        date: d,
        type: 'Egreso',
        source: 'Retiro Socio',
        concept: `Retiro de Socio: ${w.ownerName}`,
        method: 'Efectivo',
        amount: w.amount,
        clientUser: w.ownerName,
      });
    });

    // 4. Movimientos Manuales de Caja etiquetados como Flotilla
    cashTransactions.forEach(t => {
      // Evitar duplicar lo que ya viene de las colecciones específicas
      if (t.relatedType === 'RetiroSocio' || t.relatedType === 'GastoVehiculo' || t.relatedType === 'Flotilla') return;
      if (t.concept?.toLowerCase().includes('flotilla') || t.description?.toLowerCase().includes('flotilla')) {
        const d = parseDate(t.date);
        const isIncome = t.type === 'in' || t.type === 'Entrada';
        rows.push({
          id: `ledger-${t.id}`,
          date: d,
          type: isIncome ? 'Ingreso' : 'Egreso',
          source: 'Manual',
          concept: t.concept || t.description || 'Movimiento Flotilla',
          method: t.paymentMethod || 'Efectivo',
          amount: Math.abs(t.amount),
          clientUser: t.userName || 'Sistema',
        });
      }
    });

    return rows;
  }, [payments, expenses, withdrawals, cashTransactions]);

  const { fullFilteredData, ...tableManager } = useTableManager<FlotillaReportRow>({
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

  const handleTransactionSubmit = async (values: TransactionFormValues) => {
    const authUserString = localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY);
    const currentUser = authUserString ? JSON.parse(authUserString) : null;
    try {
      await cashService.addCashTransaction({
        type: dialogType === 'Ingreso' ? 'in' : 'out',
        amount: values.amount,
        concept: `[FLOTILLA] ${values.concept}`,
        userId: currentUser?.id || 'system',
        userName: currentUser?.name || 'Sistema',
        relatedType: 'Flotilla',
        paymentMethod: 'Efectivo',
      });
      toast({ title: `Movimiento de Flotilla registrado con éxito.` });
      setIsDialogOpen(false);
      form.reset();
    } catch (e) {
      toast({ title: 'Error', description: 'No se pudo registrar el movimiento.', variant: 'destructive' });
    }
  };

  const handleSort = (key: string) => {
    const isAsc = tableManager.sortOption === `${key}_asc`;
    tableManager.onSortOptionChange(`${key}_${isAsc ? 'desc' : 'asc'}`);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-green-200 bg-green-50/30">
          <CardHeader className="pb-2"><CardTitle className="text-xs font-medium uppercase text-muted-foreground">Rentas Efectivo</CardTitle></CardHeader>
          <CardContent><div className="text-xl font-bold text-green-600">{formatCurrency(kpis.efectivoIngreso)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs font-medium uppercase text-muted-foreground">Ingreso Flotilla</CardTitle></CardHeader>
          <CardContent><div className="text-xl font-bold flex items-center gap-2"><ArrowUpRight className="h-4 w-4 text-green-500"/>{formatCurrency(kpis.ingresoTotal)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs font-medium uppercase text-muted-foreground">Gastos Flotilla</CardTitle></CardHeader>
          <CardContent><div className="text-xl font-bold flex items-center gap-2"><ArrowDownRight className="h-4 w-4 text-red-500"/>{formatCurrency(kpis.egresoTotal)}</div></CardContent>
        </Card>
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2"><CardTitle className="text-xs font-medium uppercase text-muted-foreground">Utilidad Flotilla</CardTitle></CardHeader>
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
                  placeholder="Buscar por concepto, unidad o conductor..."
                  value={tableManager.searchTerm}
                  onChange={(e) => tableManager.onSearchTermChange(e.target.value)}
                  className="pl-8 bg-background"
                />
              </div>
              <div className="flex gap-2 w-full md:w-auto shrink-0">
                <Button onClick={() => { setDialogType('Ingreso'); setIsDialogOpen(true); }} variant="outline" size="sm" className="flex-1 md:flex-none text-green-600 border-green-600 hover:bg-green-50 bg-card">
                  <PlusCircle className="mr-2 h-4 w-4" /> Ingreso Manual
                </Button>
                <Button onClick={() => { setDialogType('Egreso'); setIsDialogOpen(true); }} variant="outline" size="sm" className="flex-1 md:flex-none text-red-600 border-red-600 hover:bg-red-50 bg-card">
                  <PlusCircle className="mr-2 h-4 w-4" /> Egreso Manual
                </Button>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-2 items-center justify-end border-t pt-4">
              <div className="flex gap-2 w-full sm:w-auto">
                <Button variant="outline" size="sm" onClick={() => tableManager.onDateRangeChange({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) })} className="flex-1 sm:flex-none bg-card">Este Mes</Button>
                <Button variant="outline" size="sm" onClick={() => { const last = subMonths(new Date(), 1); tableManager.onDateRangeChange({ from: startOfMonth(last), to: endOfMonth(last) }); }} className="flex-1 sm:flex-none bg-card">Mes Pasado</Button>
              </div>
              <DatePickerWithRange date={tableManager.dateRange} onDateChange={tableManager.onDateRangeChange} />
              
              <div className="flex gap-2 w-full md:w-auto">
                <Select 
                  value={tableManager.otherFilters["type"] || "all"} 
                  onValueChange={(val) => tableManager.setOtherFilters(prev => ({ ...prev, type: val }))}
                >
                  <SelectTrigger className="w-full md:w-[150px] bg-card"><SelectValue placeholder="Tipo" /></SelectTrigger>
                  <SelectContent>{tipoOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                </Select>

                <Select 
                  value={tableManager.otherFilters["method"] || "all"} 
                  onValueChange={(val) => tableManager.setOtherFilters(prev => ({ ...prev, method: val }))}
                >
                  <SelectTrigger className="w-full md:w-[180px] bg-card"><SelectValue placeholder="Método Pago" /></SelectTrigger>
                  <SelectContent>{metodoOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                </Select>
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
                  <SortableTableHeader sortKey="clientUser" label="Responsable" onSort={handleSort} currentSort={tableManager.sortOption} textClassName="text-white" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {fullFilteredData.length > 0 ? (
                  fullFilteredData.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs">{r.date ? format(r.date, 'dd/MM/yy HH:mm', { locale: es }) : '—'}</TableCell>
                      <TableCell><Badge variant={r.type === 'Ingreso' ? 'success' : 'destructive'}>{r.type}</Badge></TableCell>
                      <TableCell><Badge variant="outline" className="font-normal">{r.source}</Badge></TableCell>
                      <TableCell className="max-w-[250px] truncate font-medium" title={r.concept}>{r.concept}</TableCell>
                      <TableCell className="text-xs">{r.method}</TableCell>
                      <TableCell className={cn("text-right font-bold", r.type === 'Ingreso' ? "text-green-600" : "text-red-600")}>
                        {r.type === 'Ingreso' ? '+' : '-'} {formatCurrency(r.amount)}
                      </TableCell>
                      <TableCell className="text-xs truncate max-w-[150px]">{r.clientUser}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={7} className="h-32 text-center text-muted-foreground">No se encontraron movimientos de flotilla.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Registrar {dialogType} de Flotilla</DialogTitle><DialogDescription>Añade un movimiento directo a la caja de la flotilla.</DialogDescription></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleTransactionSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="concept"
                render={({ field }) => (
                  <FormItem><FormLabel>Concepto</FormLabel><FormControl><Textarea placeholder="Motivo del movimiento..." {...field} /></FormControl><FormMessage /></FormItem>
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
              <DialogFooter><Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button><Button type="submit">Registrar {dialogType}</Button></DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
