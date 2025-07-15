

"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { SaleReceipt } from "@/types";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Ban, MessageSquare } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ViewSaleDialogProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  sale: SaleReceipt;
  onCancelSale: (saleId: string, reason: string) => void;
  onSendWhatsapp: (sale: SaleReceipt) => void;
}

export function ViewSaleDialog({ open, onOpenChange, sale, onCancelSale, onSendWhatsapp }: ViewSaleDialogProps) {
  const [reason, setReason] = useState('');

  if (!sale) return null;

  const isCancelled = sale.status === 'Cancelado';

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  
  const saleDate = parseISO(sale.saleDate);
  const formattedDate = format(saleDate, "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: es });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Detalle de Venta: {sale.id}</DialogTitle>
          <DialogDescription>
            Información detallada de la venta realizada el {formattedDate}.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Cliente:</span>
            <span className="font-medium">{sale.customerName}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Método de Pago:</span>
            <Badge variant="outline">{sale.paymentMethod}</Badge>
          </div>
          {isCancelled && (
            <div className="flex flex-col justify-center items-center text-sm p-2 bg-destructive/10 rounded-md">
                <span className="font-bold text-destructive">ESTA VENTA HA SIDO CANCELADA</span>
                 {sale.cancellationReason && <span className="text-xs text-destructive mt-1">Motivo: {sale.cancellationReason}</span>}
                 {sale.cancelledBy && <span className="text-xs text-destructive">Por: {sale.cancelledBy}</span>}
            </div>
          )}

          <Separator />
          
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted">
                  <TableHead>Artículo</TableHead>
                  <TableHead className="text-center">Cant.</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sale.items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{item.itemName}</TableCell>
                    <TableCell className="text-center">{item.quantity}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.totalPrice)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          <Separator />

          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal:</span>
                <span>{formatCurrency(sale.subTotal)}</span>
            </div>
            <div className="flex justify-between">
                <span className="text-muted-foreground">IVA:</span>
                <span>{formatCurrency(sale.tax)}</span>
            </div>
            <div className="flex justify-between font-bold text-base">
                <span>Total:</span>
                <span>{formatCurrency(sale.totalAmount)}</span>
            </div>
          </div>
        </div>
        <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-between sm:space-x-2">
            <div className="flex gap-2">
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" disabled={isCancelled}>
                            <Ban className="mr-2 h-4 w-4" />
                            Cancelar Venta
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>¿Está seguro de cancelar esta venta?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Esta acción no se puede deshacer. El stock de los artículos vendidos será restaurado al inventario. Se requiere un motivo para la cancelación.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="mt-4">
                          <Label htmlFor="cancellation-reason" className="text-left font-semibold">Motivo de la cancelación (obligatorio)</Label>
                          <Textarea id="cancellation-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ej: Error en el cobro, el cliente se arrepintió..." className="mt-2" />
                        </div>
                        <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setReason('')}>No</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onCancelSale(sale.id, reason)} disabled={!reason.trim()} className="bg-destructive hover:bg-destructive/90">
                                Sí, Cancelar Venta
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
            <div className="flex gap-2">
                <Button variant="outline" onClick={() => onSendWhatsapp(sale)} disabled={isCancelled}>
                    <MessageSquare className="mr-2 h-4 w-4" /> Copiar para WhatsApp
                </Button>
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Cerrar
                </Button>
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
