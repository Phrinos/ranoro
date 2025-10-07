// src/app/(app)/pos/components/pos-form.tsx

"use client";

import { useFormContext, useFieldArray, useWatch } from "react-hook-form";
import type { InventoryItem, SaleReceipt, InventoryCategory, Supplier } from "@/types";
import { useState, useCallback, useEffect } from "react";
import { InventorySearchDialog } from "@/components/shared/InventorySearchDialog";
import { InventoryItemDialog } from "../../inventario/components/inventory-item-dialog";
import type { InventoryItemFormValues } from "@/schemas/inventory-item-form-schema";
import { SaleSummary } from './sale-summary';
import { PosItemsTable } from "./pos-items-table";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";


interface POSFormProps {
  inventoryItems: InventoryItem[];
  categories: InventoryCategory[];
  suppliers: Supplier[];
  onSaleComplete: (saleData: any) => void;
  onInventoryItemCreated?: (formData: InventoryItemFormValues) => Promise<InventoryItem>;
  initialData?: SaleReceipt | null;
  onOpenValidateDialog: (index: number) => void;
  onOpenAddItemDialog: () => void;
  validatedFolios: Record<number, boolean>;
}

const COMMISSION_ITEM_ID = 'COMMISSION_FEE';

export function PosForm({ 
  inventoryItems, 
  categories, 
  suppliers, 
  onSaleComplete, 
  onInventoryItemCreated,
  initialData,
  onOpenValidateDialog,
  onOpenAddItemDialog,
  validatedFolios,
}: POSFormProps) {
  const methods = useFormContext();
  const { control, getValues, setValue, reset } = methods;
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  
  const watchedPayments = useWatch({ control, name: 'payments' });
  const watchedItems = useWatch({ control, name: 'items' });

  useEffect(() => {
    if (initialData?.id) {
      reset(initialData);
    }
    // sólo cuando cambia el ID de la venta
  }, [initialData?.id, reset]);

    useEffect(() => {
        // Lee los items actuales una sola vez
        const items = (getValues('items') || []) as any[];

        // Calcula total EXCLUYENDO la comisión
        const baseItems = items.filter(i => i.inventoryItemId !== COMMISSION_ITEM_ID);
        const baseTotal = baseItems.reduce(
            (sum, i) => sum + (Number(i.totalPrice ?? i.unitPrice * i.quantity) || 0),
            0
        );

        const hasCard = (watchedPayments ?? []).some((p: any) => p.method === 'Tarjeta');
        const hasMSI  = (watchedPayments ?? []).some((p: any) => p.method === 'Tarjeta MSI');

        let commission = 0;
        if (hasCard) commission += baseTotal * 0.041;
        if (hasMSI)  commission += baseTotal * 0.12;

        // Redondea para evitar “flapping” por flotantes
        commission = Math.round(commission * 100) / 100;

        const idx = items.findIndex(i => i.inventoryItemId === COMMISSION_ITEM_ID);

        if (commission <= 0) {
            // Si ya no aplica comisión, elimina la línea una sola vez
            if (idx > -1) remove(idx);
            return;
        }

        if (idx > -1) {
            // Ya existe: sólo actualiza si CAMBIÓ (evita loop)
            const current = Number(items[idx]?.unitPrice || 0);
            if (Math.abs(current - commission) < 0.01) return; // sin cambios ⇒ no setValue
            setValue(`items.${idx}.unitPrice`, commission, { shouldDirty: true, shouldValidate: false });
            // Si tu total de cliente NO debe incluir comisión, asegura totalPrice 0
            const currentTotal = Number(items[idx]?.totalPrice || 0);
            if (currentTotal !== 0) setValue(`items.${idx}.totalPrice`, 0, { shouldDirty: true, shouldValidate: false });
        } else {
            // No existe: agrégala una vez
            append({
            inventoryItemId: COMMISSION_ITEM_ID,
            itemName: 'Comisión de Tarjeta',
            quantity: 1,
            unitPrice: commission, // costo interno
            totalPrice: 0,         // no suma al total del cliente
            isService: true,
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [watchedPayments, watchedItems, append, remove, setValue, getValues]);


  return (
    <>
      <form id="pos-form" onSubmit={methods.handleSubmit(onSaleComplete)} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
          {/* Columna Izquierda: Lista de Artículos */}
          <div className="lg:col-span-3">
             <section className="space-y-3">
                <h2 className="text-2xl font-bold">Artículos</h2>

                <PosItemsTable />

                <div className="flex justify-end">
                  <Button type="button" variant="outline" onClick={onOpenAddItemDialog} className="bg-white hover:bg-gray-100">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Añadir Artículo/Servicio
                  </Button>
                </div>
              </section>
          </div>

          {/* Columna Derecha: Pago y Resumen */}
          <div className="lg:col-span-2 space-y-6">
            <SaleSummary onOpenValidateDialog={onOpenValidateDialog} validatedFolios={validatedFolios} />
          </div>
        </div>
      </form>
    </>
  );
}
