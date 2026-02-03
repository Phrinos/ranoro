"use client";

import React, { useState } from 'react';
import type { CashDrawerTransaction } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency, cn } from "@/lib/utils";
import { format, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { DollarSign, ArrowDown, ArrowUp, PlusCircle } from 'lucide-react';
import { parseDate } from '@/lib/forms';
import { cashService } from '@/lib/services';
import { useToast } from '@/hooks/use-toast';
import { AUTH_USER_LOCALSTORAGE_KEY } from '@/lib/placeholder-data';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from "zod";

const withdrawalSchema = z.object({
  description: z.string().min(3, "La descripción debe tener al menos 3 caracteres."),
  amount: z.coerce.number().min(0.01, "El monto debe ser mayor a 0."),
});

type WithdrawalFormValues = z.infer<typeof withdrawalSchema>;

interface CierreEfectivoContentProps {
  transactions: CashDrawerTransaction[];
  summary: { cashIn: number; cashOut: number; cashNet: number };
}

export default function CierreEfectivoContent({ transactions, summary }: CierreEfectivoContentProps) {
  const { toast } = useToast();
  const [isWithdrawalDialogOpen, setIsWithdrawalDialogOpen] = useState(false);

  const form = useForm<WithdrawalFormValues>({
    resolver: zodResolver(withdrawalSchema) as Resolver<WithdrawalFormValues>,
    defaultValues: { description: "", amount: undefined },
  });

  const handleWithdrawalSubmit = async (values: WithdrawalFormValues) => {
    const authUserString = localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY);
    const currentUser = authUserString ? JSON.parse(authUserString) : null;
    try {
      await cashService.addCashTransaction({
        type: 'out',
        amount: values.amount,
        concept: values.description,
        userId: currentUser?.id || 'system',
        userName: currentUser?.name || 'Sistema',
        relatedType: 'Manual',
        paymentMethod: 'Efectivo',
      });
      toast({ title: 'Retiro registrado con éxito.' });
      setIsWithdrawalDialogOpen(false);
      form.reset();
    } catch (e) {
      console.error(e);
      toast({ title: 'Error', description: 'No se pudo registrar el retiro.', variant: 'destructive' });
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Flujo de Efectivo del Mes</CardTitle>
              <CardDescription>Detalle de todas las entradas y salidas de efectivo.</CardDescription>
            </div>
            <Button onClick={() => setIsWithdrawalDialogOpen(true)} variant="outline" className="text-red-600 border-red-500 hover:bg-red-50 hover:text-red-700 bg-card">
              <PlusCircle className="mr-2 h-4 w-4" /> Registrar Retiro
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-green-600">Entradas</CardTitle>
                <ArrowUp className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold text-green-600">{formatCurrency(summary.cashIn)}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-red-600">Salidas</CardTitle>
                <ArrowDown className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold text-red-600">{formatCurrency(summary.cashOut)}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Flujo Neto</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent><div className={cn("text-2xl font-bold", summary.cashNet >= 0 ? 'text-foreground' : 'text-destructive')}>{formatCurrency(summary.cashNet)}</div></CardContent>
            </Card>
          </div>

          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Concepto</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.filter(t => t.paymentMethod === 'Efectivo').length > 0 ? (
                  transactions.filter(t => t.paymentMethod === 'Efectivo').map(t => {
                    const transactionDate = parseDate(t.date);
                    const isIncome = t.type === 'in' || t.type === 'Entrada';
                    return (
                      <TableRow key={t.id}>
                        <TableCell className="font-mono text-xs whitespace-nowrap">
                            {transactionDate && isValid(transactionDate) ? format(transactionDate, 'dd/MM/yy, HH:mm', { locale: es }) : 'N/A'}
                        </TableCell>
                        <TableCell><Badge variant={isIncome ? 'success' : 'destructive'}>{t.type}</Badge></TableCell>
                        <TableCell>{(t as any).concept || (t as any).description}</TableCell>
                        <TableCell className={cn("text-right font-semibold", isIncome ? 'text-green-600' : 'text-red-600')}>{formatCurrency(t.amount)}</TableCell>
                      </TableRow>
                    );
                })
                ) : (
                  <TableRow><TableCell colSpan={4} className="h-24 text-center">No hay movimientos de efectivo en este mes.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isWithdrawalDialogOpen} onOpenChange={setIsWithdrawalDialogOpen}>
        <DialogContent className="sm:max-w-md p-0">
          <DialogHeader className="p-6 pb-4">
            <DialogTitle>Registrar Retiro de Efectivo</DialogTitle>
            <DialogDescription>Crea un registro de salida de efectivo de la caja.</DialogDescription>
          </DialogHeader>
          <div className="p-6 pt-0">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleWithdrawalSubmit)} id="withdrawal-form" className="space-y-4">
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Concepto del Retiro</FormLabel>
                      <FormControl><Textarea placeholder="Ej: Pago a proveedor, compra de material, etc." {...field} /></FormControl>
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
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            className="pl-8"
                            {...field}
                            value={field.value ?? ""}
                          />
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
            <Button variant="outline" onClick={() => setIsWithdrawalDialogOpen(false)}>Cancelar</Button>
            <Button type="submit" form="withdrawal-form" disabled={form.formState.isSubmitting}>
              Registrar Retiro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}