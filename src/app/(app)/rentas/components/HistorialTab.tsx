

// src/app/(app)/rentas/components/HistorialTab.tsx
"use client";

import React, { useState, useMemo, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Edit, Printer, Copy, Share2, Wallet, CreditCard, Send } from 'lucide-react';
import { UnifiedPreviewDialog } from '@/components/shared/unified-preview-dialog';
import { RentalReceiptContent } from './rental-receipt-content';
import { EditPaymentNoteDialog } from './edit-payment-note-dialog';
import type { RentalPayment, WorkshopInfo, Driver, Vehicle } from '@/types';
import { format, parseISO, compareDesc } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatCurrency, getPaymentMethodVariant } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import html2canvas from 'html2canvas';
import { useToast } from '@/hooks/use-toast';
import { fleetService } from '@/lib/services';
import { parseDate } from '@/lib/forms';
import ReactDOMServer from 'react-dom/server';
import { Icon } from '@iconify/react';

interface HistorialTabProps {
  allPayments: RentalPayment[];
  workshopInfo: Partial<WorkshopInfo>;
  drivers: Driver[];
  vehicles: Vehicle[];
}

const paymentMethodIcons: Record<RentalPayment['paymentMethod'], string> = {
  "Efectivo": "mdi:cash",
  "Tarjeta": "logos:visa-electron",
  "Transferencia": "mdi:bank-transfer",
};

export function HistorialTab({ allPayments, workshopInfo, drivers, vehicles }: HistorialTabProps) {
  const { toast } = useToast();
  const [paymentForReceipt, setPaymentForReceipt] = useState<RentalPayment | null>(null);
  const [paymentToEdit, setPaymentToEdit] = useState<RentalPayment | null>(null);
  const [isEditNoteDialogOpen, setIsEditNoteDialogOpen] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  const sortedPayments = useMemo(() => {
    return [...allPayments].sort((a, b) => compareDesc(parseDate(a.paymentDate)!, parseDate(b.paymentDate)!));
  }, [allPayments]);
  
  const handleUpdatePaymentNote = async (paymentId: string, note: string) => {
    try {
      await fleetService.updateRentalPayment(paymentId, { note });
      toast({ title: 'Concepto Actualizado' });
      setIsEditNoteDialogOpen(false);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };
  
  const handleCopyAsImage = useCallback(async (isForSharing: boolean = false) => {
    if (!receiptRef.current || !paymentForReceipt) return null;
    try {
        const canvas = await html2canvas(receiptRef.current, { scale: 2.5, backgroundColor: null });
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
        if (!blob) throw new Error("No se pudo crear el blob de la imagen.");

        if (isForSharing) {
            return new File([blob], `recibo_renta_${paymentForReceipt.id}.png`, { type: 'image/png' });
        } else {
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
            toast({ title: "Copiado", description: "La imagen del recibo ha sido copiada." });
            return null;
        }
    } catch (e) {
        console.error("Error handling image:", e);
        toast({ title: "Error", description: "No se pudo procesar la imagen del recibo.", variant: "destructive" });
        return null;
    }
  }, [paymentForReceipt, toast]);
  
  const handleShare = async () => {
    const imageFile = await handleCopyAsImage(true);
    if (imageFile && navigator.share) {
      try {
        await navigator.share({
          files: [imageFile],
          title: 'Recibo de Renta',
          text: `Recibo de pago de renta de ${workshopInfo?.name || 'nuestro taller'}.`,
        });
      } catch (error) {
        console.error('Error sharing:', error);
        toast({ title: 'Error al compartir', variant: 'destructive' });
      }
    } else if (imageFile) {
        const driver = drivers.find(d => d.id === paymentForReceipt?.driverId);
        const phone = driver?.phone;
        const message = `Recibo de tu pago en ${workshopInfo?.name || 'nuestro taller'}. ¡Gracias!`;
        const whatsappUrl = `https://wa.me/${phone ? phone.replace(/\D/g, '') : ''}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
        toast({ title: 'Copiado', description: 'Usa Ctrl+V o Cmd+V para pegar la imagen en WhatsApp.' });
    }
  };

  const handlePrint = () => {
    requestAnimationFrame(() => setTimeout(() => window.print(), 100));
  };


  return (
    <>
      <Card>
        <CardHeader><CardTitle>Historial de Pagos de Renta</CardTitle></CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader className="bg-black">
                <TableRow>
                  <TableHead className="text-white">Folio</TableHead>
                  <TableHead className="text-white">Registrado por</TableHead>
                  <TableHead className="text-white">Fecha</TableHead>
                  <TableHead className="text-white">Conductor</TableHead>
                  <TableHead className="text-white">Vehículo</TableHead>
                  <TableHead className="text-right text-white">Monto</TableHead>
                  <TableHead className="text-white">Concepto</TableHead>
                  <TableHead className="text-right text-white">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedPayments.length > 0 ? (
                  sortedPayments.map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono">{p.id.slice(-6)}</TableCell>
                      <TableCell>{p.registeredBy || 'Sistema'}</TableCell>
                      <TableCell>{format(parseISO(p.paymentDate), "dd MMM yyyy, HH:mm", { locale: es })}</TableCell>
                      <TableCell className="font-semibold">{p.driverName}</TableCell>
                      <TableCell>{p.vehicleLicensePlate}</TableCell>
                      <TableCell className="text-right font-bold">
                        <p>{formatCurrency(p.amount)}</p>
                        {p.paymentMethod && <Badge variant={getPaymentMethodVariant(p.paymentMethod)} className="mt-1 text-xs"><Icon icon={paymentMethodIcons[p.paymentMethod] || 'mdi:cash'} className="mr-1 h-3 w-3"/>{p.paymentMethod}</Badge>}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{p.note || 'N/A'}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => { setPaymentToEdit(p); setIsEditNoteDialogOpen(true); }}>
                          <Edit className="h-4 w-4"/>
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setPaymentForReceipt(p)}>
                          <Printer className="h-4 w-4"/>
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => { setPaymentForReceipt(p); handleCopyAsImage(false); }}>
                          <Copy className="h-4 w-4"/>
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => { setPaymentForReceipt(p); setTimeout(handleShare, 100); }}>
                          <Share2 className="h-4 w-4"/>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={8} className="text-center h-24">No hay pagos registrados.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
       <EditPaymentNoteDialog
        open={isEditNoteDialogOpen}
        onOpenChange={setIsEditNoteDialogOpen}
        payment={paymentToEdit}
        onSave={handleUpdatePaymentNote}
      />
      
      {paymentForReceipt && (
        <UnifiedPreviewDialog
            open={!!paymentForReceipt}
            onOpenChange={(isOpen) => !isOpen && setPaymentForReceipt(null)}
            title="Recibo de Pago de Renta"
            documentType="text"
            textContent={ReactDOMServer.renderToString(
                <RentalReceiptContent 
                  ref={receiptRef} 
                  payment={paymentForReceipt} 
                  workshopInfo={workshopInfo} 
                  driver={drivers.find(d => d.id === paymentForReceipt.driverId)}
                  allPaymentsForDriver={allPayments.filter(p => p.driverId === paymentForReceipt.driverId)}
                  vehicle={vehicles.find(v => v.licensePlate === paymentForReceipt.vehicleLicensePlate)}
                />
            )}
        >
        </UnifiedPreviewDialog>
      )}
    </>
  );
}
