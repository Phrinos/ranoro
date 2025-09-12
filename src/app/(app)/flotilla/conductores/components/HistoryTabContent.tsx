// src/app/(app)/flotilla/conductores/components/HistoryTabContent.tsx
"use client";

import React, { useEffect, useState, useMemo } from 'react';
import type { Driver, Vehicle, DailyRentalCharge, RentalPayment } from '@/types';
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
import { Edit, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { EditDailyChargeDialog, type DailyChargeFormValues } from '../../components/EditDailyChargeDialog';

interface HistoryTabContentProps {
  driver: Driver;
  vehicle: Vehicle | null;
}

export function HistoryTabContent({ driver, vehicle }: HistoryTabContentProps) {
  const { toast } = useToast();
  const [dailyCharges, setDailyCharges] = useState<DailyRentalCharge[]>([]);
  const [payments, setPayments] = useState<RentalPayment[]>([]);
  const [manualDebts, setManualDebts] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(true);
  
  const [editingCharge, setEditingCharge] = useState<DailyRentalCharge | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  useEffect(() => {
    if (!driver || !vehicle) {
      setIsGenerating(false);
      return;
    }
    
    setIsGenerating(true);
    rentalService.generateMissingCharges(driver, vehicle)
      .catch(err => toast({ title: "Error", description: "No se pudieron generar los cargos diarios.", variant: "destructive"}))
      .finally(() => setIsGenerating(false));

    const unsubCharges = rentalService.onDailyChargesUpdate(driver.id, setDailyCharges);
    const unsubPayments = rentalService.onRentalPaymentsUpdate(driver.id, setPayments);
    const unsubDebts = personnelService.onManualDebtsUpdate(driver.id, setManualDebts);

    return () => {
      unsubCharges();
      unsubPayments();
      unsubDebts();
    };
  }, [driver, vehicle, toast]);

  const transactions = useMemo(() => {
    let balance = 0;
    const allTransactions = [
      ...dailyCharges.map(c => ({ ...c, type: 'charge' })),
      ...payments.map(p => ({ ...p, date: p.paymentDate, type: 'payment' })),
      ...manualDebts.map(d => ({ ...d, type: 'debt' })),
    ]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(t => {
      if (t.type === 'payment') balance += t.amount;
      else balance -= t.amount;
      return { ...t, balance };
    });
    return allTransactions.reverse();
  }, [dailyCharges, payments, manualDebts]);
  
  const handleEditCharge = (charge: DailyRentalCharge) => {
    setEditingCharge(charge);
    setIsEditDialogOpen(true);
  };

  const handleSaveCharge = async (data: DailyChargeFormValues) => {
    if (!editingCharge) return;
    await rentalService.saveDailyCharge(editingCharge.id, { ...data, date: data.date.toISOString() });
    toast({ title: "Cargo Actualizado" });
    setIsEditDialogOpen(false);
  };
  
  const handleDeleteCharge = async (id: string) => {
    await rentalService.deleteDailyCharge(id);
    toast({ title: "Cargo Eliminado", variant: "destructive" });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Historial de Movimientos</CardTitle>
          <CardDescription>Registro de todos los cargos, pagos y adeudos.</CardDescription>
        </CardHeader>
        <CardContent>
           {isGenerating && <p className="text-sm text-muted-foreground text-center">Generando cargos diarios...</p>}
          <div className="rounded-md border">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead className="text-right">Cargo</TableHead>
                <TableHead className="text-right">Abono</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {transactions.length > 0 ? (
                  transactions.map(t => (
                    <TableRow key={`${t.type}-${t.id}`}>
                      <TableCell>{format(parseISO(t.date), "dd MMM yyyy", { locale: es })}</TableCell>
                      <TableCell>
                        {t.type === 'charge' && `Renta Diaria (${t.vehicleLicensePlate})`}
                        {t.type === 'payment' && (t.note || 'Pago de Renta')}
                        {t.type === 'debt' && t.note}
                        <Badge variant="outline" className="ml-2 capitalize">{t.type}</Badge>
                      </TableCell>
                      <TableCell className="text-right text-destructive">{t.type !== 'payment' ? formatCurrency(t.amount) : '-'}</TableCell>
                      <TableCell className="text-right text-green-600">{t.type === 'payment' ? formatCurrency(t.amount) : '-'}</TableCell>
                      <TableCell className={cn("text-right font-bold", t.balance >= 0 ? 'text-green-700' : 'text-red-700')}>{formatCurrency(t.balance)}</TableCell>
                      <TableCell className="text-right">
                        {t.type === 'charge' && (
                           <>
                             <Button variant="ghost" size="icon" onClick={() => handleEditCharge(t)}><Edit className="h-4 w-4" /></Button>
                             <ConfirmDialog
                                triggerButton={<Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                                title="¿Eliminar Cargo?"
                                onConfirm={() => handleDeleteCharge(t.id)}
                              />
                           </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={6} className="h-24 text-center">No hay movimientos.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <EditDailyChargeDialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} charge={editingCharge} onSave={handleSaveCharge} />
    </>
  );
}
