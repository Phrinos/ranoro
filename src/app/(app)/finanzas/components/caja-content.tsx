// src/app/(app)/finanzas/components/caja-content.tsx
"use client";

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { DateRange } from "react-day-picker";
import type { SaleReceipt, ServiceRecord, CashDrawerTransaction, Payment, WorkshopInfo, Vehicle } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency, getPaymentMethodVariant } from "@/lib/utils";
import { format, isValid, isSameDay, startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { FileText, ShoppingCart, Wrench, Wallet, CreditCard, Send, LineChart, DollarSign, ArrowDown, ArrowUp, Loader2 } from 'lucide-react';
import { parseDate } from '@/lib/forms';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { cashService, saleService, serviceService, inventoryService } from '@/lib/services';
import { useToast } from '@/hooks/use-toast';
import { AUTH_USER_LOCALSTORAGE_KEY } from '@/lib/placeholder-data';
import { cn } from '@/lib/utils';
import { UnifiedPreviewDialog } from '@/components/shared/unified-preview-dialog';
import { TicketContent } from '@/components/ticket-content';
import ReactDOMServer from 'react-dom/server';
import { DatePickerWithRange } from '@/components/ui/date-picker-with-range';

const cashTransactionSchema = z.object({
  description: z.string().min(3, "La descripción debe tener al menos 3 caracteres."),
  amount: z.coerce.number().min(0.01, "El monto debe ser mayor a 0."),
});
type CashTransactionFormValues = z.infer<typeof cashTransactionSchema>;

// Extend the existing CashDrawerTransaction type for local use
type EnhancedCashDrawerTransaction = CashDrawerTransaction & {
    fullDescription?: string;
};

export default function CajaContent() {
  const { toast } = useToast();
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'Entrada' | 'Salida'>('Entrada');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const now = new Date();
    return { from: startOfMonth(now), to: endOfMonth(now) };
  });

  const [isLoading, setIsLoading] = useState(true);
  const [cashTransactions, setCashTransactions] = useState<CashDrawerTransaction[]>([]);
  const [isLoadingDocument, setIsLoadingDocument] = useState(false);
  const [workshopInfo, setWorkshopInfo] = useState<WorkshopInfo | null>(null);

  useEffect(() => {
    setIsLoading(true);
    const unsub = cashService.onCashTransactionsUpdate((transactions) => {
        setCashTransactions(transactions);
        setIsLoading(false);
    });

    const storedWorkshopInfo = localStorage.getItem('workshopTicketInfo');
    if (storedWorkshopInfo) {
      try {
        setWorkshopInfo(JSON.parse(storedWorkshopInfo));
      } catch (e) {
        console.error("Failed to parse workshop info from localStorage", e);
      }
    }
    
    return () => unsub();
  }, []);
  
  const form = useForm<CashTransactionFormValues>({
    resolver: zodResolver(cashTransactionSchema),
  });

  const mergedCashMovements = useMemo(() => {
    return cashTransactions
      .map(t => ({
          ...t,
          // Ensure backwards compatibility for entries that used 'concept'
          fullDescription: t.fullDescription || t.description,
          description: t.description || t.concept,
      }))
      .sort((a,b) => (parseDate(b.date)?.getTime() ?? 0) - (parseDate(a.date)?.getTime() ?? 0));
  }, [cashTransactions]);


  const periodData = useMemo(() => {
    if (!dateRange?.from) {
      return { movements: [], totalIn: 0, totalOut: 0, netBalance: 0 };
    }
    const from = startOfDay(dateRange.from);
    const to = dateRange.to ? endOfDay(dateRange.to) : from;

    const movements = mergedCashMovements.filter(m => {
        const mDate = parseDate(m.date);
        return mDate && isValid(mDate) && isWithinInterval(mDate, { start: from, end: to });
    });

    let totalIn = 0;
    let totalOut = 0;

    movements.forEach(m => {
      if (m.type === 'Entrada') {
        totalIn += m.amount;
      } else if (m.type === 'Salida') {
        totalOut += m.amount;
      }
    });

    return { movements, totalIn, totalOut, netBalance: totalIn - totalOut };
  }, [mergedCashMovements, dateRange]);


  const handleOpenDialog = (type: 'Entrada' | 'Salida') => {
    setDialogType(type);
    form.reset();
    setIsDialogOpen(true);
  };
  
  const handleRowClick = async (movement: EnhancedCashDrawerTransaction) => {
    if (!movement.relatedId || !movement.relatedType) return;
    
    if (movement.relatedType === 'Venta') {
      router.push(`/pos?saleId=${movement.relatedId}`);
    } else if (movement.relatedType === 'Servicio') {
      router.push(`/servicios/${movement.relatedId}`);
    }
  };

  const handleTransactionSubmit = async (values: CashTransactionFormValues) => {
    const authUserString = localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY);
    const currentUser = authUserString ? JSON.parse(authUserString) : null;
    try {
        await cashService.addCashTransaction({
            type: dialogType,
            amount: values.amount,
            description: values.description,
            userId: currentUser?.id || 'system',
            userName: currentUser?.name || 'Sistema',
            relatedType: 'Manual',
        });
        toast({ title: `Se registró una ${dialogType.toLowerCase()} de caja.` });
        setIsDialogOpen(false);
    } catch(e) {
        toast({ title: 'Error', description: 'No se pudo registrar la transacción.', variant: 'destructive'});
    }
  }
  
  const setPresetRange = (preset: 'today' | 'yesterday' | 'week' | 'month') => {
    const now = new Date();
    switch (preset) {
        case 'today':
            setDateRange({ from: startOfDay(now), to: endOfDay(now) });
            break;
        case 'yesterday':
            const yesterday = subDays(now, 1);
            setDateRange({ from: startOfDay(yesterday), to: endOfDay(yesterday) });
            break;
        case 'week':
            setDateRange({ from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) });
            break;
        case 'month':
            setDateRange({ from: startOfMonth(now), to: endOfMonth(now) });
            break;
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-2xl font-semibold tracking-tight">Caja</h2>
             <div className="flex gap-2 items-center flex-wrap">
                <Button variant="outline" size="sm" onClick={() => setPresetRange('today')} className="bg-card">Hoy</Button>
                <Button variant="outline" size="sm" onClick={() => setPresetRange('yesterday')} className="bg-card">Ayer</Button>
                <Button variant="outline" size="sm" onClick={() => setPresetRange('week')} className="bg-card">Semana</Button>
                <Button variant="outline" size="sm" onClick={() => setPresetRange('month')} className="bg-card">Mes</Button>
              <DatePickerWithRange date={dateRange} onDateChange={setDateRange} />
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium text-green-600">Entradas Totales</CardTitle><ArrowUp className="h-4 w-4 text-green-500"/></CardHeader>
                <CardContent><div className="text-2xl font-bold text-green-600">{formatCurrency(periodData.totalIn)}</div></CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium text-red-600">Salidas Totales</CardTitle><ArrowDown className="h-4 w-4 text-red-500"/></CardHeader>
                <CardContent><div className="text-2xl font-bold text-red-600">{formatCurrency(periodData.totalOut)}</div></CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Balance del Periodo</CardTitle><DollarSign className="h-4 w-4 text-muted-foreground"/></CardHeader>
                <CardContent><div className="text-2xl font-bold">{formatCurrency(periodData.netBalance)}</div></CardContent>
            </Card>
        </div>
        <div className="flex justify-end gap-2">
            <Button onClick={() => handleOpenDialog('Entrada')} variant="outline" className="text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700 bg-card">
                <ArrowUp className="mr-2 h-4 w-4"/> Registrar Entrada
            </Button>
            <Button onClick={() => handleOpenDialog('Salida')} variant="outline" className="text-red-600 border-red-600 hover:bg-red-50 hover:text-red-700 bg-card">
                <ArrowDown className="mr-2 h-4 w-4"/> Registrar Salida
            </Button>
        </div>
        
        <Card>
            <CardHeader><CardTitle>Movimientos de Caja del Periodo</CardTitle>
            <CardDescription>
                Esta lista incluye todos los movimientos en efectivo: servicios, ventas y registros manuales.
            </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
                <div className="overflow-x-auto rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Hora</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead>Origen</TableHead>
                                <TableHead>ID Movimiento/Folio</TableHead>
                                <TableHead>Descripción</TableHead>
                                <TableHead>Usuario</TableHead>
                                <TableHead className="text-right">Monto</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoadingDocument && <TableRow><TableCell colSpan={7} className="h-24 text-center"><Loader2 className="mr-2 h-5 w-5 animate-spin inline-block" /> Cargando documento...</TableCell></TableRow>}
                            {!isLoadingDocument && periodData.movements.length > 0 ? (
                                periodData.movements.map((m: EnhancedCashDrawerTransaction) => (
                                    <TableRow 
                                        key={m.id}
                                        onClick={() => handleRowClick(m)}
                                        className={m.relatedId ? "cursor-pointer hover:bg-muted/50" : ""}
                                    >
                                        <TableCell>{m.date && isValid(parseDate(m.date)!) ? format(parseDate(m.date)!, "dd MMM, HH:mm", { locale: es }) : 'N/A'}</TableCell>
                                        <TableCell>
                                          <Badge variant={m.type === 'Entrada' ? 'success' : 'destructive'}>{m.type}</Badge>
                                        </TableCell>
                                        <TableCell>
                                          <Badge variant="outline">{m.relatedType || 'Manual'}</Badge>
                                        </TableCell>
                                        <TableCell className="font-mono text-xs">{m.relatedId ? m.relatedId.slice(-6) : m.id.slice(-6)}</TableCell>
                                        <TableCell className="max-w-[250px] truncate">{m.fullDescription}</TableCell>
                                        <TableCell>{m.userName}</TableCell>
                                        <TableCell className={cn("text-right font-semibold", m.type === 'Entrada' ? 'text-green-600' : 'text-red-600')}>
                                            {formatCurrency(m.amount)}
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                !isLoadingDocument && <TableRow><TableCell colSpan={7} className="h-24 text-center">No se encontraron movimientos de caja para este periodo.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="sm:max-w-md p-0">
                <DialogHeader className="p-6 pb-4">
                    <DialogTitle>Registrar {dialogType} de Caja</DialogTitle>
                    <DialogDescription>Añade una descripción y monto para registrar el movimiento.</DialogDescription>
                </DialogHeader>
                <div className="p-6 pt-0">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleTransactionSubmit)} id="cash-transaction-form" className="space-y-4">
                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Descripción</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder={dialogType === 'Entrada' ? 'Ej: Fondo inicial' : 'Ej: Compra de papelería'} {...field} />
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
                                        <div className="relative">
                                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value ?? ''} className="pl-8"/>
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </form>
                    </Form>
                </div>
                 <DialogFooter className="p-6 pt-4 border-t">
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                    <Button type="submit" form="cash-transaction-form" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting ? 'Guardando...' : `Registrar ${dialogType}`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  );
}
