// src/app/(app)/pos/components/view-sale-dialog.tsx
"use client";

import React, { useState, useEffect } from "react";
import { FormProvider, useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { PosForm } from "./pos-form";
import { posFormSchema, type POSFormValues } from '@/schemas/pos-form-schema';
import type { SaleReceipt, InventoryItem, User, InventoryCategory, Supplier } from "@/types";
import { saleService } from "@/lib/services";
import { useToast } from "@/hooks/use-toast";
import type { PaymentDetailsFormValues } from "@/schemas/payment-details-form-schema";
import { Loader2 } from "lucide-react";

interface ViewSaleDialogProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  sale: SaleReceipt;
  inventory: InventoryItem[];
  users: User[];
  categories?: InventoryCategory[];
  suppliers?: Supplier[];
  onCancelSale: (saleId: string, reason: string) => void;
  onDeleteSale: (saleId: string) => void;
  onPaymentUpdate: (saleId: string, paymentDetails: PaymentDetailsFormValues) => Promise<void>;
  onSendWhatsapp: (sale: SaleReceipt) => void;
  currentUser: User | null;
}

const resolver = zodResolver(posFormSchema) as unknown as Resolver<POSFormValues>;

function EditableSaleForm({
  sale,
  inventory,
  categories,
  suppliers,
  onOpenChange,
}: {
  sale: SaleReceipt;
  inventory: InventoryItem[];
  categories?: InventoryCategory[];
  suppliers?: Supplier[];
  onOpenChange: (isOpen: boolean) => void;
}) {
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  const [validatedFolios] = useState<Record<number, boolean>>({});

  const methods = useForm<POSFormValues>({
    resolver,
    defaultValues: {
      ...sale,
      cancellationReason: sale.cancellationReason || "",
    } as any,
  });

  const handleSaleCompletion = async (data: POSFormValues) => {
    setIsUpdating(true);
    try {
      // Calculamos total igual que en la creación
      const items = data.items ?? [];
      const paymentLines = data.payments ?? [];
      
      const itemsTotal = items.reduce((acc, curr) => {
        return acc + (Number(curr.unitPrice ?? 0) * Number(curr.quantity ?? 1));
      }, 0);
      
      const paymentsTotal = paymentLines.reduce((acc, curr) => acc + (Number(curr.amount ?? 0)), 0);
      const difference = Math.abs(itemsTotal - paymentsTotal);

      // Pequeña validación
      if (difference > 0.01) {
        toast({
          title: "Los pagos no cuadran",
          description: "La suma de los pagos debe ser igual al total de la venta.",
          variant: "destructive"
        });
        setIsUpdating(false);
        return;
      }

      await saleService.updateSale(sale.id, {
        ...data,
        totalAmount: itemsTotal,
      } as unknown as Partial<SaleReceipt>);

      toast({
        title: "Venta Actualizada",
        description: `Los cambios en la venta #${sale.id.slice(-6)} han sido guardados.`,
      });

      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: "No se pudo actualizar la venta.",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="relative">
      {isUpdating && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/50 backdrop-blur-sm rounded-xl">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}
      <FormProvider {...methods}>
        <div className="p-1">
          <DialogTitle className="text-2xl font-black mb-4">
            Editando Venta #{sale.id.slice(-6)}
          </DialogTitle>
          <PosForm
            inventoryItems={inventory}
            categories={categories ?? []}
            suppliers={suppliers ?? []}
            onSaleComplete={handleSaleCompletion}
            initialData={sale}
            onOpenValidateDialog={() => {}}
            validatedFolios={validatedFolios}
          />
        </div>
      </FormProvider>
    </div>
  );
}

export function ViewSaleDialog({ ...props }: ViewSaleDialogProps) {
  if (!props.sale) return null;

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent aria-describedby={undefined} className="max-w-[95vw] sm:max-w-[85vw] lg:max-w-6xl max-h-[95vh] overflow-y-auto w-full p-6">
        <EditableSaleForm
           key={props.sale.id}
           sale={props.sale}
           inventory={props.inventory}
           categories={props.categories}
           suppliers={props.suppliers}
           onOpenChange={props.onOpenChange}
        />
      </DialogContent>
    </Dialog>
  );
}
