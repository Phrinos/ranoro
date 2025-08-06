
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
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { SaleReceipt } from "@/types";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Ban, Share2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { formatCurrency, getPaymentMethodVariant } from "@/lib/utils";

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
  const saleDate = parseISO(sale.saleDate);
  const formattedDate = format(saleDate, "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: es });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-6 space-y-4">
        <DialogHeader>
          <DialogTitle>Detalle de Venta: {sale.id}</DialogTitle>
          <DialogDescription>
            Información detallada de la venta realizada el {formattedDate}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Cliente:</span>
            <span className="font-medium">{sale.customerName}</span>
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground">Métodos de Pago:</span>
            <div className="flex flex-wrap gap-1 mt-1">
                 {sale.payments?.map((p, index) => (
                    <Badge key={index} variant={getPaymentMethodVariant(p.method)}>
                        {p.method}: {formatCurrency(p.amount)} {p.folio && `(Folio: ${p.folio})`}
                    </Badge>
                ))}
            </div>
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
                 <ConfirmDialog
                    triggerButton={
                        <Button variant="destructive" disabled={isCancelled}>
                            <Ban className="mr-2 h-4 w-4" />
                            Cancelar Venta
                        </Button>
                    }
                    title="¿Está seguro de cancelar esta venta?"
                    description="Esta acción no se puede deshacer. El stock de los artículos vendidos será restaurado al inventario. Se requiere un motivo para la cancelación."
                    onConfirm={() => onCancelSale(sale.id, reason)}
                    confirmText="Sí, Cancelar Venta"
                >
                    <div className="mt-4">
                        <Label htmlFor="cancellation-reason" className="text-left font-semibold">Motivo de la cancelación (obligatorio)</Label>
                        <Textarea id="cancellation-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ej: Error en el cobro, el cliente se arrepintió..." className="mt-2" />
                    </div>
                </ConfirmDialog>
            </div>
            <div className="flex gap-2">
                <Button variant="outline" onClick={() => onSendWhatsapp(sale)} disabled={isCancelled} className="bg-green-100 text-green-800 border-green-200 hover:bg-green-200">
                    <Share2 className="mr-2 h-4 w-4" /> Compartir
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

    