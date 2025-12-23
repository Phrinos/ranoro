// src/app/(app)/pos/components/view-sale-dialog.tsx

"use client";

import React, { useState, useEffect } from "react";
import { FormProvider, useForm, type Resolver } from 'react-hook-form';
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
import type { SaleReceipt, InventoryItem, User, InventoryCategory, Supplier, Payment } from "@/types";
import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { Ban, Save, Trash2, MessageSquare, Repeat } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { PosForm } from "./pos-form";
import { posFormSchema, type POSFormValues } from '@/schemas/pos-form-schema';
import { useToast } from "@/hooks/use-toast";
import { saleService } from "@/lib/services";
import { PaymentDetailsDialog } from "@/components/shared/PaymentDetailsDialog";
import { PaymentDetailsFormValues } from "@/schemas/payment-details-form-schema";
import { Textarea } from "@/components/ui/textarea";
import { z } from "zod";


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
  onPaymentUpdate: (saleId: string, paymentDetails: PaymentDetailsFormValues) => Promise<void>;
  onSendWhatsapp: (sale: SaleReceipt) => void;
}

type FormInput = z.input<typeof posFormSchema>;

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
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [cancellationReason, setCancellationReason] = useState("");
  const [validatedFolios, setValidatedFolios] = useState<Record<number, boolean>>({});

  const resolver = zodResolver(posFormSchema) as unknown as Resolver<POSFormValues>;
  const methods = useForm<FormInput, any, POSFormValues>({
    resolver,
    defaultValues: sale as any,
  });

  useEffect(() => {
      if (sale?.id) {
          methods.reset(sale as any);
      }
  }, [sale, methods]);

  if (!sale) return null;

  const isCancelled = sale.status === 'Cancelado';
  const saleDate = typeof sale.saleDate === 'string' ? parseISO(sale.saleDate) : sale.saleDate;
  const formattedDate = saleDate && isValid(saleDate) ? format(saleDate as Date, "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: es }) : '';
  
  const handleOpenValidateDialog = (index: number) => {
    console.log("Validation requested for payment index:", index);
  };
  
  const handleConfirmCancellation = () => {
    if (!cancellationReason.trim()) {
        toast({ title: 'Motivo Requerido', description: 'Por favor, ingrese un motivo para la cancelación.', variant: 'destructive' });
        return;
    }
    onCancelSale(sale.id, cancellationReason);
    setCancellationReason("");
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>Detalle de Venta: {sale.id}</DialogTitle>
          <DialogDescription>
            Información detallada de la venta realizada el {formattedDate}.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-grow overflow-y-auto px-6 py-4">
          <FormProvider key={sale.id} {...methods}>
            <PosForm
              inventoryItems={inventory}
              categories={categories}
              suppliers={suppliers}
              onSaleComplete={() => {}}
              initialData={sale}
              onOpenValidateDialog={handleOpenValidateDialog}
              validatedFolios={validatedFolios}
            />
          </FormProvider>
        </div>

        <DialogFooter className="p-6 pt-4 border-t flex-shrink-0 bg-background flex flex-row justify-between items-center w-full gap-2">
          <div>
              <ConfirmDialog
                triggerButton={<Button variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10" disabled={isCancelled}><Ban className="mr-2 h-4 w-4" />Cancelar Venta</Button>}
                title="¿Está seguro de cancelar esta venta?"
                description="El stock de los artículos será restaurado. Esta acción no se puede deshacer. Por favor, especifique un motivo."
                onConfirm={handleConfirmCancellation}
                confirmText="Sí, Cancelar Venta"
              >
                  <Textarea
                    placeholder="Motivo de la cancelación..."
                    value={cancellationReason}
                    onChange={(e) => setCancellationReason(e.target.value)}
                    className="mt-4"
                  />
              </ConfirmDialog>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onSendWhatsapp(sale)} className="bg-green-100 text-green-800 border-green-200 hover:bg-green-200">
                <MessageSquare className="mr-2 h-4 w-4"/> Enviar por WhatsApp
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    {isPaymentDialogOpen && (
       <PaymentDetailsDialog
          open={isPaymentDialogOpen}
          onOpenChange={setIsPaymentDialogOpen}
          record={sale}
          onConfirm={onPaymentUpdate as any}
          recordType="sale"
        />
    )}
    </>
  );
}
