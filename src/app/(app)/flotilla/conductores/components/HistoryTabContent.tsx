// src/app/(app)/flotilla/conductores/components/HistoryTabContent.tsx
"use client";

import React, { useEffect, useState, useMemo } from 'react';
import type { Driver, Vehicle, DailyRentalCharge, RentalPayment, ManualDebtEntry } from '@/types';
import { rentalService } from '@/lib/services/rental.service';
import { personnelService } from '@/lib/services';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatCurrency, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, PlusCircle, HandCoins } from 'lucide-react';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { EditDailyChargeDialog, type DailyChargeFormValues } from '../../components/EditDailyChargeDialog';
import { RegisterPaymentDialog, type PaymentFormValues } from '../../components/RegisterPaymentDialog';
import { AddManualChargeDialog, type ManualChargeFormValues } from '../../components/AddManualChargeDialog';

type Transaction = 
    | (DailyRentalCharge & { type: 'charge'; note: string; })
    | (RentalPayment & { type: 'payment'; date: string; })
    | (ManualDebtEntry & { type: 'debt' });

interface HistoryTabContentProps {
  driver: Driver;
  vehicle: Vehicle | null;
}

export function HistoryTabContent({ driver, vehicle }: HistoryTabContentProps) {
  const { toast } = useToast();
  const [dailyCharges, setDailyCharges] = useState<DailyRentalCharge[]>([]);
  const [payments, setPayments] = useState<RentalPayment[]>([]);
  const [manualDebts, setManualDebts] = useState<ManualDebtEntry[]>([]);
  const [isGenerating, setIsGenerating] = useState(true);
  const [chargesGenerated, setChargesGenerated] = useState(false);
  
  const [editingCharge, setEditingCharge] = useState<DailyRentalCharge | null>(null);
  const [editingDebt, setEditingDebt] = useState<ManualDebtEntry | null>(null);

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isChargeDialogOpen, setIsChargeDialogOpen] = useState(false);

  useEffect(() => {
    if (!driver || !vehicle || chargesGenerated) {
      setIsGenerating(false);
      return;
    }
    
    setIsGenerating(true);
    rentalService.generateMissingCharges(driver, vehicle)
      .then(() => setChargesGenerated(true))
      .catch(err => toast({ title: "Error", description: "No se pudieron generar los cargos diarios.", variant: "destructive"}))
      .finally(() => setIsGenerating(false));

  }, [driver, vehicle, chargesGenerated, toast]);

  useEffect(() => {
    if (!driver?.id) return;

    const driverId = String(driver.id);

    const unsubCharges = rentalService.onDailyChargesUpdate(
      (items) => setDailyCharges(items),
      driverId
    );

    const unsubPayments = rentalService.onRentalPaymentsUpdate(
      (items) => setPayments(items),
      driverId
    );

    const unsubDebts = personnelService.onManualDebtsUpdate(
      (items) => setManualDebts(items),
      driverId
    );

    return () => {
      unsubCharges?.();
      unsubPayments?.();
      unsubDebts?.();
    };
  }, [driver?.id]);

  const { transactions, totalBalance } = useMemo(() => {
    const allTransactions: Transaction[] = [
      ...dailyCharges.map(c => ({ ...c, type: 'charge' as const, note: `Renta Diaria (${c.vehicleLicensePlate})`})),
      ...payments.map(p => ({ ...p, type: 'payment' as const, date: p.paymentDate })),
      ...manualDebts.map(d => ({ ...d, type: 'debt' as const })),
    ];

    allTransactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let balance = 0;
    const transactionsWithBalance = allTransactions.map(t => {
      if (t.type === 'payment') balance += t.amount;
      else balance -= t.amount;
      return { ...t, balance };
    });
    
    return {
      transactions: transactionsWithBalance.reverse(),
      totalBalance: balance,
    };
  }, [dailyCharges, payments, manualDebts]);
  
  const handleSavePayment = async (data: PaymentFormValues) => {
    if (!driver || !vehicle) return;
    await rentalService.addRentalPayment(driver, vehicle, data.amount, data.note, data.paymentDate);
    toast({ title: "Pago Registrado" });
    setIsPaymentDialogOpen(false);
  };
  
  const handleSaveManualCharge = async (data: ManualChargeFormValues) => {
    if (!driver) return;
    await personnelService.saveManualDebt(driver.id, { ...data, date: data.date.toISOString() }, editingDebt?.id);
    toast({ title: `Adeudo ${editingDebt ? 'actualizado' : 'registrado'}` });
    setIsChargeDialogOpen(false);
    setEditingDebt(null);
  };

  const handleSaveCharge = async (data: DailyChargeFormValues) => {
    if (!editingCharge) return;
    await rentalService.saveDailyCharge(editingCharge.id, { ...data, date: data.date.toISOString() });
    toast({ title: "Cargo Actualizado" });
    setIsEditDialogOpen(false);
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Balance General</CardTitle><CardDescription>Saldo total actual del conductor.</CardDescription></CardHeader>
        <CardContent><div className={cn("text-3xl font-bold text-center", totalBalance >= 0 ? 'text-green-600' : 'text-destructive')}>{formatCurrency(totalBalance)}</div></CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
            <div><CardTitle>Historial de Movimientos</CardTitle><CardDescription>Registro de todos los cargos, pagos y adeudos.</CardDescription></div>
            <div className="flex gap-2">
                <Button onClick={() => { setEditingDebt(null); setIsChargeDialogOpen(true); }} variant="outline" size="sm"><PlusCircle className="mr-2 h-4 w-4" />Añadir Cargo</Button>
                <Button onClick={() => setIsPaymentDialogOpen(true)} size="sm"><HandCoins className="mr-2 h-4 w-4" />Registrar Pago</Button>
            </div>
        </CardHeader>
        <CardContent>
           {isGenerating && <p className="text-sm text-muted-foreground text-center py-2">Generando cargos diarios...</p>}
          <div className="rounded-md border">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Fecha</TableHead><TableHead>Tipo</TableHead><TableHead>Descripción</TableHead>
                <TableHead className="text-right">Cargo</TableHead><TableHead className="text-right">Abono</TableHead>
                <TableHead className="text-right">Balance</TableHead><TableHead className="text-right">Acciones</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {transactions.length > 0 ? (
                  transactions.map(t => (
                    <TableRow key={`${t.type}-${t.id}`}>
                      <TableCell>{format(parseISO(t.date), "dd MMM yyyy", { locale: es })}</TableCell>
                      <TableCell>
                        <Badge variant={t.type === 'payment' ? 'success' : 'destructive'}>
                          {t.type === 'charge' ? 'Renta' : t.type === 'debt' ? 'Adeudo' : 'Pago'}
                        </Badge>
                      </TableCell>
                      <TableCell>{t.note}</TableCell>
                      <TableCell className="text-right text-destructive">{t.type !== 'payment' ? formatCurrency(t.amount) : '-'}</TableCell>
                      <TableCell className="text-right text-green-600">{t.type === 'payment' ? formatCurrency(t.amount) : '-'}</TableCell>
                      <TableCell className={cn("text-right font-bold", t.balance >= 0 ? 'text-green-700' : 'text-red-700')}>{formatCurrency(t.balance)}</TableCell>
                      <TableCell className="text-right">
                         <Button variant="ghost" size="icon" onClick={() => {
                            if (t.type === 'debt') { setEditingDebt(t); setIsChargeDialogOpen(true); }
                            if (t.type === 'charge') { setEditingCharge(t); setIsEditDialogOpen(true); }
                         }} disabled={t.type === 'payment'}><Edit className="h-4 w-4" /></Button>
                         <ConfirmDialog
                           triggerButton={<Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                           title={`¿Eliminar ${t.type === 'payment' ? 'Pago' : 'Cargo'}?`}
                           onConfirm={() => {
                             if (t.type === 'debt') personnelService.deleteManualDebt(t.id);
                             if (t.type === 'payment') rentalService.deleteRentalPayment(t.id);
                             if (t.type === 'charge') rentalService.deleteDailyCharge(t.id);
                           }} />
                      </TableCell>
                    </TableRow>
                  ))
                ) : <TableRow><TableCell colSpan={7} className="h-24 text-center">No hay movimientos.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <EditDailyChargeDialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} charge={editingCharge} onSave={handleSaveCharge} />
      <RegisterPaymentDialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen} onSave={handleSavePayment} />
      <AddManualChargeDialog open={isChargeDialogOpen} onOpenChange={setIsChargeDialogOpen} onSave={handleSaveManualCharge} />
    </div>
  );
}
