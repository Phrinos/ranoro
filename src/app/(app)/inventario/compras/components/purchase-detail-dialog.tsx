// src/app/(app)/inventario/compras/components/purchase-detail-dialog.tsx
"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { format, isValid } from "date-fns";
import { es } from "date-fns/locale";
import { parseDate } from "@/lib/forms";
import { Trash2, ShoppingBag, Calendar, User, CreditCard } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Separator } from "@/components/ui/separator";
import { usePermissions } from "@/hooks/usePermissions";

interface PurchaseDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchase: any | null;
  onDelete: (purchaseId: string) => Promise<void>;
}

export function PurchaseDetailDialog({
  open,
  onOpenChange,
  purchase,
  onDelete,
}: PurchaseDetailDialogProps) {
  const permissions = usePermissions();
  const canDelete = permissions.has("purchases:delete");

  if (!purchase) return null;

  const purchaseDate = parseDate(purchase.invoiceDate || purchase.createdAt);
  const formattedDate = purchaseDate && isValid(purchaseDate) 
    ? format(purchaseDate, "dd 'de' MMMM, yyyy HH:mm", { locale: es })
    : 'N/A';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-2">
          <div className="flex items-center gap-2 text-primary mb-1">
            <ShoppingBag className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-widest">Detalle de Compra</span>
          </div>
          <DialogTitle className="text-2xl">Factura: {purchase.invoiceId || "S/N"}</DialogTitle>
          <DialogDescription>
            Registrada el {formattedDate}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-grow overflow-y-auto px-6 py-4 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <User className="h-3 w-3" /> Proveedor
              </p>
              <p className="font-semibold">{purchase.supplierName}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <CreditCard className="h-3 w-3" /> Método de Pago
              </p>
              <Badge variant="outline">{purchase.paymentMethod || "N/A"}</Badge>
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="text-sm font-bold mb-3 uppercase tracking-wider text-muted-foreground">Artículos Adquiridos</h4>
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-center">Cant.</TableHead>
                    <TableHead className="text-right">Costo Unit.</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchase.items?.map((item: any, idx: number) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{item.itemName}</TableCell>
                      <TableCell className="text-center">{item.quantity}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.purchasePrice)}</TableCell>
                      <TableCell className="text-right font-bold">
                        {formatCurrency((item.quantity || 0) * (item.purchasePrice || 0))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <div className="w-full sm:w-64 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal:</span>
                <span>{formatCurrency(purchase.subtotal || purchase.invoiceTotal)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Total Compra:</span>
                <span className="text-primary">{formatCurrency(purchase.invoiceTotal || purchase.totalAmount)}</span>
              </div>
            </div>
          </div>

          {purchase.note && (
            <div className="p-3 rounded-md bg-muted/30 text-sm italic">
              <strong>Notas:</strong> {purchase.note}
            </div>
          )}
        </div>

        <DialogFooter className="p-6 pt-4 border-t bg-muted/5 flex flex-row justify-between items-center w-full">
          <div>
            {canDelete && (
              <ConfirmDialog
                triggerButton={
                  <Button variant="ghost" className="text-destructive hover:bg-destructive/10">
                    <Trash2 className="mr-2 h-4 w-4" /> Anular Compra
                  </Button>
                }
                title="¿Anular esta compra?"
                description="Se restará la cantidad comprada del inventario actual. Si ya se vendieron los productos, el stock podría quedar en negativo. Esta acción no se puede deshacer."
                onConfirm={() => onDelete(purchase.id)}
                confirmText="Sí, Anular y Restar Stock"
              />
            )}
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
