// src/app/(app)/flotilla/caja/components/FlotillaCajaTab.tsx
"use client";

import React, { useMemo, useState, useRef } from 'react';
import type { RentalPayment, OwnerWithdrawal, VehicleExpense, Driver, Vehicle, WorkshopInfo } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency, cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowDown, Printer, Copy, Share2 } from 'lucide-react';
import { UnifiedPreviewDialog } from '@/components/shared/unified-preview-dialog';
import { RentalPaymentTicket } from './RentalPaymentTicket';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";


type CashBoxTransaction = 
    | (RentalPayment & { transactionType: 'income' })
    | (OwnerWithdrawal & { transactionType: 'withdrawal' })
    | (VehicleExpense & { transactionType: 'expense' });

interface FlotillaCajaTabProps {
  payments: RentalPayment[];
  withdrawals: OwnerWithdrawal[];
  expenses: VehicleExpense[];
  drivers: Driver[];
  vehicles: Vehicle[];
  onAddWithdrawal: () => void;
  onAddExpense: () => void;
}

export function FlotillaCajaTab({ payments, withdrawals, expenses, drivers, vehicles, onAddWithdrawal, onAddExpense }: FlotillaCajaTabProps) {
  const [isTicketOpen, setIsTicketOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<RentalPayment | null>(null);
  const ticketContentRef = useRef<HTMLDivElement>(null);
  const [workshopInfo, setWorkshopInfo] = useState<WorkshopInfo | null>(null);

  React.useEffect(() => {
    const storedWorkshopInfo = localStorage.getItem('workshopTicketInfo');
     if (storedWorkshopInfo) {
      try {
        setWorkshopInfo(JSON.parse(storedWorkshopInfo));
      } catch (e) {
        console.error("Failed to parse workshop info from localStorage", e);
      }
    }
  }, []);

  const { transactions, totalBalance } = useMemo(() => {
    const allTransactions: CashBoxTransaction[] = [
      ...payments.map(p => ({ ...p, transactionType: 'income' as const, date: p.paymentDate })),
      ...withdrawals.map(w => ({ ...w, transactionType: 'withdrawal' as const })),
      ...expenses.map(e => ({ ...e, transactionType: 'expense' as const })),
    ];

    allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    let balance = 0;
    payments.forEach(p => balance += p.amount);
    withdrawals.forEach(w => balance -= w.amount);
    expenses.forEach(e => balance -= e.amount);

    return {
      transactions: allTransactions,
      totalBalance: balance,
    };
  }, [payments, withdrawals, expenses]);

  const getTransactionDetails = (t: CashBoxTransaction) => {
    switch (t.transactionType) {
      case 'income':
        return { variant: 'success', label: 'Ingreso', description: `Pago de ${t.driverName}` };
      case 'withdrawal':
        return { variant: 'destructive', label: 'Retiro', description: `Retiro de ${t.ownerName}` };
      case 'expense':
        return { variant: 'secondary', label: 'Gasto', description: `${t.description} (${t.vehicleLicensePlate})` };
    }
  };

  const handleShowTicket = (payment: RentalPayment) => {
    setSelectedPayment(payment);
    setIsTicketOpen(true);
  };
  
  const handlePrintTicket = () => {
    requestAnimationFrame(() => setTimeout(() => window.print(), 100));
  };


  return (
    <>
      <div className="space-y-4">
        <div className="flex justify-end gap-2">
          <Button onClick={onAddWithdrawal} variant="outline" className="bg-white border-red-500 text-black font-bold hover:bg-red-50">
            <ArrowDown className="mr-2 h-4 w-4 text-red-500" /> Retiro
          </Button>
          <Button onClick={onAddExpense} variant="outline" className="bg-white border-red-500 text-black font-bold hover:bg-red-50">
            <ArrowDown className="mr-2 h-4 w-4 text-red-500" /> Gasto
          </Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Balance de Caja</CardTitle>
            <CardDescription>Saldo actual de la caja de la flotilla.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className={cn("text-3xl font-bold text-center", totalBalance >= 0 ? 'text-green-600' : 'text-destructive')}>
              {formatCurrency(totalBalance)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Movimientos de Caja</CardTitle>
            <CardDescription>Historial de todos los ingresos y salidas de dinero.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader className="bg-black">
                  <TableRow>
                    <TableHead className="text-white font-bold">Fecha</TableHead>
                    <TableHead className="text-white font-bold">Tipo</TableHead>
                    <TableHead className="text-white font-bold">Descripción</TableHead>
                    <TableHead className="text-right text-white font-bold">Monto</TableHead>
                    <TableHead className="text-right text-white font-bold">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.length > 0 ? (
                    transactions.map(t => {
                      const details = getTransactionDetails(t);
                      return (
                        <TableRow key={`${t.transactionType}-${t.id}`}>
                          <TableCell>{format(parseISO(t.date), "dd MMM yyyy", { locale: es })}</TableCell>
                          <TableCell>
                            <Badge variant={details.variant as any}>{details.label}</Badge>
                          </TableCell>
                          <TableCell>{details.description}</TableCell>
                          <TableCell className={cn("text-right font-semibold", details.variant === 'success' ? 'text-green-600' : 'text-destructive')}>
                            {details.variant === 'success' ? '+' : '-'} {formatCurrency(t.amount)}
                          </TableCell>
                          <TableCell className="text-right">
                            {t.transactionType === 'income' && (
                                <Button variant="ghost" size="icon" onClick={() => handleShowTicket(t as RentalPayment)}>
                                    <Printer className="h-4 w-4"/>
                                </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">No hay movimientos de caja.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
      
       {selectedPayment && (
          <UnifiedPreviewDialog
            open={isTicketOpen}
            onOpenChange={setIsTicketOpen}
            title={`Ticket de Pago`}
            footerContent={
                <div className="flex w-full justify-end gap-2">
                    <TooltipProvider>
                        <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" className="h-12 w-12 bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200"><Copy className="h-6 w-6" /></Button></TooltipTrigger><TooltipContent><p>Copiar Imagen</p></TooltipContent></Tooltip>
                        <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" className="h-12 w-12 bg-green-100 text-green-700 border-green-200 hover:bg-green-200"><Share2 className="h-6 w-6" /></Button></TooltipTrigger><TooltipContent><p>Compartir</p></TooltipContent></Tooltip>
                        <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" className="h-12 w-12 bg-red-100 text-red-700 border-red-200 hover:bg-red-200" onClick={handlePrintTicket}><Printer className="h-6 w-6" /></Button></TooltipTrigger><TooltipContent><p>Imprimir</p></TooltipContent></Tooltip>
                    </TooltipProvider>
                </div>
            }
          >
            <RentalPaymentTicket
                ref={ticketContentRef}
                payment={selectedPayment}
                driver={drivers.find(d => d.id === selectedPayment.driverId)}
                vehicle={vehicles.find(v => v.id === drivers.find(d => d.id === selectedPayment.driverId)?.assignedVehicleId)}
                previewWorkshopInfo={workshopInfo || undefined}
            />
          </UnifiedPreviewDialog>
      )}
    </>
  );
}
