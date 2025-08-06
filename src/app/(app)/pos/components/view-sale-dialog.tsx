
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
import type { SaleReceipt, InventoryItem, User } from "@/types";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Ban, Share2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { PosFormView } from "./pos-form-view";

interface ViewSaleDialogProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  sale: SaleReceipt;
  inventory: InventoryItem[];
  users: User[];
  onCancelSale: (saleId: string, reason: string) => void;
  onSendWhatsapp: (sale: SaleReceipt) => void;
}

export function ViewSaleDialog({ open, onOpenChange, sale, inventory, users, onCancelSale, onSendWhatsapp }: ViewSaleDialogProps) {
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!sale) return null;

  const isCancelled = sale.status === 'Cancelado';
  const saleDate = parseISO(sale.saleDate);
  const formattedDate = format(saleDate, "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: es });

  const handleConfirmCancel = async () => {
    setIsLoading(true);
    await onCancelSale(sale.id, reason);
    setIsLoading(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>Detalle de Venta: {sale.id}</DialogTitle>
          <DialogDescription>
            Información detallada de la venta realizada el {formattedDate}.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-grow overflow-y-auto px-6 py-4">
            <PosFormView sale={sale} inventory={inventory} users={users} />
        </div>

        <DialogFooter className="p-6 pt-4 border-t flex-shrink-0 bg-background flex flex-row justify-between items-center w-full gap-2">
            <div>
                <ConfirmDialog
                    triggerButton={
                        <Button variant="destructive" disabled={isCancelled}>
                            <Ban className="mr-2 h-4 w-4" />
                            Cancelar Venta
                        </Button>
                    }
                    title="¿Está seguro de cancelar esta venta?"
                    description="Esta acción no se puede deshacer. El stock de los artículos vendidos será restaurado al inventario. Se requiere un motivo para la cancelación."
                    onConfirm={handleConfirmCancel}
                    confirmText="Sí, Cancelar Venta"
                    isLoading={isLoading}
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
