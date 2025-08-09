// src/app/(app)/finanzas/components/caja-content.tsx
"use client";

import React, { useState, useMemo, useCallback } from 'react';
import type { DateRange } from "react-day-picker";
import type { SaleReceipt, ServiceRecord, CashDrawerTransaction } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency, getPaymentMethodVariant } from "@/lib/utils";
import { format, isValid, isSameDay, startOfDay, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { FileText, ShoppingCart, Wrench, Wallet, CreditCard, Send, LineChart, DollarSign, ArrowDown, ArrowUp, Calendar as CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { parseDate } from '@/lib/forms';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { cashService } from '@/lib/services';
import { useToast } from '@/hooks/use-toast';
import { AUTH_USER_LOCALSTORAGE_KEY } from '@/lib/placeholder-data';
import { cn } from '@/lib/utils';


const cashTransactionSchema = z.object({
  concept: z.string().min(3, "El concepto debe tener al menos 3 caracteres."),
  amount: z.coerce.number().min(0.01, "El monto debe ser mayor a 0."),
});
type CashTransactionFormValues = z.infer<typeof cashTransactionSchema>;


interface CajaContentProps {
  allSales: SaleReceipt[];
  allServices: ServiceRecord[];
  cashTransactions: CashDrawerTransaction[];
}

export default function CajaContent({ allSales, allServices, cashTransactions }: CajaContentProps) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'Entrada' | 'Salida'>('Entrada');
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const form = useForm<CashTransactionFormValues>({
    resolver: zodResolver(cashTransactionSchema),
  });

  const mergedCashMovements = useMemo(() => {
    const saleMovements: CashDrawerTransaction[] = allSales
        .filter(s => s.status !== 'Cancelado' && s.paymentMethod?.includes('Efectivo'))
        .map(s => ({
            id: `sale-${s.id}`,
            date: s.saleDate,
            type: 'Entrada',
            amount: s.amountInCash || s.totalAmount, // Fallback for single payment
            concept: `Venta POS #${s.id.slice(-6)}`,
            userId: s.registeredById || 'system',
            userName: s.registeredByName || 'Sistema'
        }));
        
    const serviceMovements: CashDrawerTransaction[] = allServices
        .filter(s => s.status === 'Entregado' && s.paymentMethod?.includes('Efectivo'))
        .map(s => ({
            id: `service-${s.id}`,
            date: s.deliveryDateTime!,
            type: 'Entrada',
            amount: s.amountInCash || s.totalCost, // Fallback
            concept: `Servicio #${s.id.slice(-6)}`,
            userId: s.serviceAdvisorId || 'system',
            userName: s.serviceAdvisorName || 'Sistema'
        }));
        
    return [...saleMovements, ...serviceMovements, ...cashTransactions]
      .sort((a,b) => (parseDate(b.date)?.getTime() ?? 0) - (parseDate(a.date)?.getTime() ?? 0));
  }, [allSales, allServices, cashTransactions]);


  const dailyData = useMemo(() => {
    const dayStart = startOfDay(selectedDate);
    
    const movementsToday = mergedCashMovements.filter(m => {
        const mDate = parseDate(m.date);
        return mDate && isValid(mDate) && isSameDay(mDate, dayStart);
    });

    let totalIn = 0;
    let totalOut = 0;

    movementsToday.forEach(m => {
      if (m.type === 'Entrada') {
        totalIn += m.amount;
      } else if (m.type === 'Salida') {
        totalOut += m.amount;
      }
    });

    return { movementsToday, totalIn, totalOut, netBalance: totalIn - totalOut };
  }, [mergedCashMovements, selectedDate]);


  const handleOpenDialog = (type: 'Entrada' | 'Salida') => {
    setDialogType(type);
    form.reset();
    setIsDialogOpen(true);
  };

  const handleTransactionSubmit = async (values: CashTransactionFormValues) => {
    const authUserString = localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY);
    const currentUser = authUserString ? JSON.parse(authUserString) : null;
    try {
        await cashService.addCashTransaction({
            type: dialogType,
            amount: values.amount,
            concept: values.concept,
            userId: currentUser?.id || 'system',
            userName: currentUser?.name || 'Sistema',
        });
        toast({ title: `Se registró una ${dialogType.toLowerCase()} de caja.` });
        setIsDialogOpen(false);
    } catch(e) {
        toast({ title: 'Error', description: 'No se pudo registrar la transacción.', variant: 'destructive'});
    }
  }

  return (
    <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-2xl font-semibold tracking-tight">Caja del Día</h2>
            <div className="flex gap-2 items-center">
              <Button variant="outline" size="sm" onClick={() => setSelectedDate(startOfDay(new Date()))}>Hoy</Button>
              <Button variant="outline" size="sm" onClick={() => setSelectedDate(startOfDay(subDays(new Date(), 1)))}>Ayer</Button>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn("w-[240px] justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP", { locale: es }) : <span>Seleccione fecha</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar mode="single" selected={selectedDate} onSelect={(d) => setSelectedDate(d || new Date())} initialFocus locale={es}/>
                </PopoverContent>
              </Popover>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium text-green-600">Entradas Totales</CardTitle><ArrowUp className="h-4 w-4 text-green-500"/></CardHeader>
                <CardContent><div className="text-2xl font-bold text-green-600">{formatCurrency(dailyData.totalIn)}</div></CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium text-red-600">Salidas Totales</CardTitle><ArrowDown className="h-4 w-4 text-red-500"/></CardHeader>
                <CardContent><div className="text-2xl font-bold text-red-600">{formatCurrency(dailyData.totalOut)}</div></CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Balance del Día</CardTitle><DollarSign className="h-4 w-4 text-muted-foreground"/></CardHeader>
                <CardContent><div className="text-2xl font-bold">{formatCurrency(dailyData.netBalance)}</div></CardContent>
            </Card>
        </div>
        <div className="flex justify-end gap-2">
            <Button onClick={() => handleOpenDialog('Entrada')} variant="outline" className="text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700">
                <ArrowUp className="mr-2 h-4 w-4"/> Registrar Entrada
            </Button>
            <Button onClick={() => handleOpenDialog('Salida')} variant="outline" className="text-red-600 border-red-600 hover:bg-red-50 hover:text-red-700">
                <ArrowDown className="mr-2 h-4 w-4"/> Registrar Salida
            </Button>
        </div>
        
        <Card>
            <CardHeader><CardTitle>Movimientos de Caja del Día</CardTitle></CardHeader>
            <CardContent className="p-0">
                <div className="overflow-x-auto rounded-md border">
                    <Table>
                        <TableHeader><TableRow><TableHead>Hora</TableHead><TableHead>Tipo</TableHead><TableHead>Concepto</TableHead><TableHead>Usuario</TableHead><TableHead className="text-right">Monto</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {dailyData.movementsToday.length > 0 ? (
                                dailyData.movementsToday.map(m => (
                                    <TableRow key={m.id}>
                                        <TableCell>{m.date && isValid(parseDate(m.date)!) ? format(parseDate(m.date)!, "HH:mm", { locale: es }) : 'N/A'}</TableCell>
                                        <TableCell>
                                          <Badge variant={m.type === 'Entrada' ? 'success' : 'destructive'}>{m.type}</Badge>
                                        </TableCell>
                                        <TableCell>{m.concept}</TableCell>
                                        <TableCell>{m.userName}</TableCell>
                                        <TableCell className="text-right font-semibold">{formatCurrency(m.amount)}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow><TableCell colSpan={5} className="h-24 text-center">No se encontraron movimientos de caja para este día.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Registrar {dialogType} de Caja</DialogTitle>
                    <DialogDescription>Añade un concepto y monto para registrar el movimiento.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleTransactionSubmit)} id="cash-transaction-form" className="space-y-4 py-4">
                        <FormField
                            control={form.control}
                            name="concept"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Concepto</FormLabel>
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
                 <DialogFooter>
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
  
