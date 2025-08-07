

"use client";

import React, { useState, useEffect } from "react";
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { SaleReceipt, InventoryItem, User, InventoryCategory, Supplier } from "@/types";
import { format, parseISO } from "date-fns";
import { es } from 'date-fns/locale';
import { Ban, Save, Trash2, MessageSquare, Repeat } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { PosForm } from "./pos-form";
import { posFormSchema, type POSFormValues } from '@/schemas/pos-form-schema';
import { useToast } from "@/hooks/use-toast";
import { saleService } from "@/lib/services";

interface ViewSaleDialogProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  sale: SaleReceipt;
  inventory: InventoryItem[];
  users: User[];
  categories: InventoryCategory[];
  suppliers: Supplier[];
  onCancelSale: (saleId: string, reason: string) => void;
  onDeleteSale: (saleId: string) => void;
  onPaymentUpdate: (saleId: string, paymentDetails: any) => Promise<void>;
  onSendWhatsapp: (sale: SaleReceipt) => void;
}

export function ViewSaleDialog({ 
  open, 
  onOpenChange, 
  sale, 
  inventory,
  categories,
  suppliers,
  onCancelSale,
  onDeleteSale,
  onPaymentUpdate,
  onSendWhatsapp,
}: ViewSaleDialogProps) {
  const { toast } = useToast();
  const methods = useForm<POSFormValues>({
    resolver: zodResolver(posFormSchema),
    defaultValues: sale,
  });

  useEffect(() => {
    if (open && sale) {
      methods.reset(sale);
    }
  }, [open, sale, methods]);

  const handleUpdateSale = async (data: POSFormValues) => {
    await onPaymentUpdate(sale.id, data);
    onOpenChange(false);
  };
  
  if (!sale) return null;

  const isCancelled = sale.status === 'Cancelado';
  const saleDate = parseISO(sale.saleDate);
  const formattedDate = format(saleDate, "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: es });

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
          <FormProvider {...methods}>
            <PosForm 
              inventoryItems={inventory} 
              categories={categories}
              suppliers={suppliers}
              onSaleComplete={handleUpdateSale} 
              initialData={sale}
            />
          </FormProvider>
        </div>

        <DialogFooter className="p-6 pt-4 border-t flex-shrink-0 bg-background flex flex-row justify-between items-center w-full gap-2">
          <div>
            <ConfirmDialog
              triggerButton={<Button variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10" disabled={isCancelled}><Ban className="mr-2 h-4 w-4" />Cancelar Venta</Button>}
              title="¿Está seguro de cancelar esta venta?"
              description="Esta acción no se puede deshacer. El stock de los artículos vendidos será restaurado al inventario. Se requiere un motivo para la cancelación."
              onConfirm={() => onCancelSale(sale.id, prompt("Motivo de la cancelación:") || "Sin motivo especificado")}
              confirmText="Sí, Cancelar Venta"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onSendWhatsapp(sale)} className="bg-green-100 text-green-800 border-green-200 hover:bg-green-200">
                <MessageSquare className="mr-2 h-4 w-4"/> Enviar por WhatsApp
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
            <Button type="submit" form="pos-form" disabled={isCancelled}>
              <Save className="mr-2 h-4 w-4"/> Guardar Cambios
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
