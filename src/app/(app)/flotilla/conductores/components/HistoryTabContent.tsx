// src/app/(app)/flotilla/conductores/components/HistoryTabContent.tsx
"use client";

import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import type {
  Driver,
  Vehicle,
  DailyRentalCharge,
  RentalPayment,
  ManualDebtEntry,
  WorkshopInfo
} from '@/types';
import { rentalService } from '@/lib/services/rental.service';
import { personnelService } from '@/lib/services';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatCurrency, cn } from '@/lib/utils';
import { parseDate } from '@/lib/forms'; // <- FIX: aquí sí existe
import { Button } from '@/components/ui/button';
import { Edit, Trash2, PlusCircle, HandCoins, Printer, Copy, Share2 } from 'lucide-react';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { EditDailyChargeDialog, type DailyChargeFormValues } from '../../components/EditDailyChargeDialog';
import { RegisterPaymentDialog, type PaymentFormValues } from '../../components/RegisterPaymentDialog';
import { AddManualChargeDialog, type ManualChargeFormValues } from '../../components/AddManualChargeDialog';
import { UnifiedPreviewDialog } from '@/components/shared/unified-preview-dialog';
import { RentalPaymentTicket } from '../../caja/components/RentalPaymentTicket';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import html2canvas from 'html2canvas';

type Transaction =
  | (DailyRentalCharge & { type: 'charge'; note: string })
  | (RentalPayment & { type: 'payment'; date: string })
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
  const [isGenerating, setIsGenerating] = useState(false);

  const [editingCharge, setEditingCharge] = useState<DailyRentalCharge | null>(null);
  const [editingDebt, setEditingDebt] = useState<ManualDebtEntry | null>(null);
  const [editingPayment, setEditingPayment] = useState<RentalPayment | null>(null);

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isChargeDialogOpen, setIsChargeDialogOpen] = useState(false);

  const [isTicketOpen, setIsTicketOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<RentalPayment | null>(null);
  const ticketContentRef = useRef<HTMLDivElement>(null);
  const [workshopInfo, setWorkshopInfo] = useState<WorkshopInfo | null>(null);

  useEffect(() => {
    const storedWorkshopInfo = localStorage.getItem('workshopTicketInfo');
    if (storedWorkshopInfo) {
      try {
        setWorkshopInfo(JSON.parse(storedWorkshopInfo));
      } catch (e) {
        console.error("Failed to parse workshop info from localStorage", e);
      }
    }
  }, []);

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
      ...dailyCharges.map(c => ({
        ...c,
        type: 'charge' as const,
        note: `Renta Diaria (${c.vehicleLicensePlate})`
      })),
      ...payments.map(p => ({
        ...p,
        type: 'payment' as const,
        date: p.paymentDate
      })),
      ...manualDebts.map(d => ({ ...d, type: 'debt' as const })),
    ];

    allTransactions.sort((a, b) => {
      const dateA = parseDate(a.date);
      const dateB = parseDate(b.date);
      if (dateA && dateB) return dateA.getTime() - dateB.getTime();
      return 0;
    });

    let balance = 0;
    const transactionsWithBalance = allTransactions.map(t => {
      if (t.type === 'payment') balance += t.amount;
      else balance -= t.amount;
      return { ...t, balance };
    });

    return {
      transactions: transactionsWithBalance.reverse(), // más reciente arriba
      totalBalance: balance,
    };
  }, [dailyCharges, payments, manualDebts]);

  const handleSavePayment = async (data: PaymentFormValues) => {
    if (!driver || !vehicle) return;
    const savedPayment = await rentalService.addRentalPayment(
      driver,
      vehicle,
      data.amount,
      data.note,
      data.paymentDate,
      data.paymentMethod as any,
      editingPayment?.id
    );
    toast({ title: "Pago Registrado" });
    setIsPaymentDialogOpen(false);

    if (!editingPayment) {
      setSelectedPayment(savedPayment);
      setIsTicketOpen(true);
    }
    setEditingPayment(null);
  };

  const handleSaveManualCharge = async (data: ManualChargeFormValues) => {
    if (!driver) return;
    await personnelService.saveManualDebt(
      driver.id,
      { ...data, date: data.date.toISOString() },
      editingDebt?.id
    );
    toast({ title: `Adeudo ${editingDebt ? 'actualizado' : 'registrado'}` });
    setIsChargeDialogOpen(false);
    setEditingDebt(null);
  };

  const handleSaveCharge = async (data: DailyChargeFormValues) => {
    if (!editingCharge) return;
    await rentalService.saveDailyCharge(
      editingCharge.id,
      { ...data, date: data.date.toISOString() }
    );
    toast({ title: "Cargo Actualizado" });
    setIsEditDialogOpen(false);
  };

  const handleShowTicket = async (payment: RentalPayment) => {
    if (!driver || !vehicle) return;
    setSelectedPayment(payment);
    setIsTicketOpen(true);
  };

  const handleCopyTicketAsImage = useCallback(async (isForSharing: boolean = false) => {
    if (!ticketContentRef.current || !selectedPayment) return null;
    try {
      const canvas = await html2canvas(ticketContentRef.current, {
        scale: 2.5,
        backgroundColor: null,
        useCORS: true,
      });
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/png')
      );
      if (!blob) throw new Error("No se pudo crear el blob de la imagen.");

      if (isForSharing) {
        return new File([blob], `ticket_pago_${selectedPayment.id}.png`, { type: 'image/png' });
      } else {
        // Guard contra navegadores sin ClipboardItem
        if (typeof window !== 'undefined' && 'ClipboardItem' in window) {
          // @ts-expect-error: Safari puede no tipar ClipboardItem
          await navigator.clipboard.write([new window.ClipboardItem({ 'image/png': blob })]);
          toast({ title: "Copiado", description: "La imagen del ticket ha sido copiada." });
        } else {
          toast({
            title: "No compatible",
            description: "Copiar imagen al portapapeles no es compatible en este navegador.",
          });
        }
        return null;
      }
    } catch (e) {
      console.error("Error al manejar la imagen:", e);
      toast({
        title: "Error",
        description: "No se pudo procesar la imagen del ticket.",
        variant: "destructive",
      });
      return null;
    }
  }, [selectedPayment, toast]);

  const handleShareTicket = async () => {
    const imageFile = await handleCopyTicketAsImage(true);
    if (imageFile && typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        // @ts-expect-error: tipos de Web Share de archivos varían por runtime
        await navigator.share({
          files: [imageFile],
          title: 'Ticket de Pago',
          text: `Recibo de pago de ${selectedPayment?.driverName}.`,
        });
      } catch (error) {
        if (!String(error).includes('AbortError')) {
          toast({
            title: 'No se pudo compartir',
            description: 'Ocurrió un error al intentar compartir.',
          });
        }
      }
    } else {
      toast({
        title: 'No disponible',
        description: 'Compartir archivos no está disponible en este navegador.',
      });
    }
  };

  const handlePrintTicket = () => {
    requestAnimationFrame(() => setTimeout(() => window.print(), 100));
  };

  return (
    <>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Balance General</CardTitle>
            <CardDescription>Saldo total actual del conductor.</CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                "text-3xl font-bold text-center",
                totalBalance >= 0 ? 'text-green-600' : 'text-destructive'
              )}
            >
              {formatCurrency(totalBalance)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Historial de Movimientos</CardTitle>
              <CardDescription>
                Registro de todos los cargos, pagos y adeudos.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => { setEditingDebt(null); setIsChargeDialogOpen(true); }}
                variant="outline"
                size="sm"
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Añadir Cargo
              </Button>
              <Button
                onClick={() => { setEditingPayment(null); setIsPaymentDialogOpen(true); }}
                size="sm"
              >
                <HandCoins className="mr-2 h-4 w-4" />
                Registrar Pago
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isGenerating && (
              <p className="text-sm text-muted-foreground text-center py-2">
                Generando cargos diarios...
              </p>
            )}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Fecha</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="text-right">Cargo</TableHead>
                    <TableHead className="text-right">Abono</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.length > 0 ? (
                    transactions.map(t => {
                      const transactionDate = parseDate(t.date);
                      return (
                        <TableRow key={`${t.type}-${t.id}`}>
                          <TableCell>
                            {transactionDate
                              ? format(transactionDate, "dd MMM yyyy", { locale: es })
                              : 'N/A'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={t.type === 'payment' ? 'success' : 'destructive'}>
                              {t.type === 'charge' ? 'Renta' : t.type === 'debt' ? 'Adeudo' : 'Pago'}
                            </Badge>
                          </TableCell>
                          <TableCell>{t.note}</TableCell>
                          <TableCell className="text-right text-destructive">
                            {t.type !== 'payment' ? formatCurrency(t.amount) : '-'}
                          </TableCell>
                          <TableCell className="text-right text-green-600">
                            {t.type === 'payment' ? formatCurrency(t.amount) : '-'}
                          </TableCell>
                          <TableCell
                            className={cn(
                              "text-right font-bold",
                              t.balance >= 0 ? 'text-green-700' : 'text-red-700'
                            )}
                          >
                            {formatCurrency(t.balance)}
                          </TableCell>
                          <TableCell className="text-right">
                            {t.type === 'payment' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleShowTicket(t as RentalPayment)}
                                aria-label="Ver/Imprimir ticket"
                              >
                                <Printer className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (t.type === 'debt') { setEditingDebt(t); setIsChargeDialogOpen(true); }
                                if (t.type === 'charge') { setEditingCharge(t); setIsEditDialogOpen(true); }
                                if (t.type === 'payment') { setEditingPayment(t); setIsPaymentDialogOpen(true); }
                              }}
                              aria-label="Editar"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <ConfirmDialog
                              triggerButton={
                                <Button variant="ghost" size="icon" aria-label="Eliminar">
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              }
                              title={`¿Eliminar ${t.type === 'payment' ? 'Pago' : 'Cargo'}?`}
                              onConfirm={() => {
                                if (t.type === 'debt') personnelService.deleteManualDebt(t.id);
                                if (t.type === 'payment') rentalService.deleteRentalPayment(t.id);
                                if (t.type === 'charge') rentalService.deleteDailyCharge(t.id);
                              }}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        No hay movimientos.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <EditDailyChargeDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        charge={editingCharge}
        onSave={handleSaveCharge}
      />
      <RegisterPaymentDialog
        open={isPaymentDialogOpen}
        onOpenChange={setIsPaymentDialogOpen}
        onSave={handleSavePayment}
        paymentToEdit={editingPayment}
      />
      <AddManualChargeDialog
        open={isChargeDialogOpen}
        onOpenChange={setIsChargeDialogOpen}
        onSave={handleSaveManualCharge}
        debtToEdit={editingDebt}
      />

      {selectedPayment && (
        <UnifiedPreviewDialog
          open={isTicketOpen}
          onOpenChange={setIsTicketOpen}
          title="Ticket de Pago"
          rentalPayment={selectedPayment}
          footerContent={
            <div className="flex w-full justify-end gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-12 w-12 bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200"
                      onClick={() => handleCopyTicketAsImage(false)}
                    >
                      <Copy className="h-6 w-6" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>Copiar Imagen</p></TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-12 w-12 bg-green-100 text-green-700 border-green-200 hover:bg-green-200"
                      onClick={handleShareTicket}
                    >
                      <Share2 className="h-6 w-6" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>Compartir</p></TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-12 w-12 bg-red-100 text-red-700 border-red-200 hover:bg-red-200"
                      onClick={handlePrintTicket}
                    >
                      <Printer className="h-6 w-6" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>Imprimir</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          }
        >
          <RentalPaymentTicket
            ref={ticketContentRef}
            payment={selectedPayment}
            driver={driver}
            vehicle={vehicle}
            driverBalance={totalBalance}
            previewWorkshopInfo={workshopInfo || undefined}
          />
        </UnifiedPreviewDialog>
      )}
    </>
  );
}
