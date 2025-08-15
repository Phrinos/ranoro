// src/app/(app)/pos/components/pos-form.tsx

"use client";

import { useFormContext, useFieldArray, useWatch } from "react-hook-form";
import type { InventoryItem, SaleReceipt, InventoryCategory, Supplier } from "@/types";
import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { AddItemDialog } from "./add-item-dialog";
import { InventoryItemDialog } from "../../inventario/components/inventory-item-dialog";
import type { InventoryItemFormValues } from "@/schemas/inventory-item-form-schema";
import { SaleItemsList } from './sale-items-list';
import { SaleSummary } from './sale-summary';

interface POSFormProps {
  inventoryItems: InventoryItem[];
  categories: InventoryCategory[];
  suppliers: Supplier[];
  onSaleComplete: (saleData: any) => void;
  onInventoryItemCreated?: (formData: InventoryItemFormValues) => Promise<InventoryItem>;
  initialData?: SaleReceipt | null;
  onOpenValidateDialog: (index: number) => void;
  validatedFolios: Record<number, boolean>;
}

const IVA_RATE = 0.16;
const COMMISSION_ITEM_ID = 'COMMISSION_FEE';

export function PosForm({ 
  inventoryItems, 
  categories, 
  suppliers, 
  onSaleComplete, 
  onInventoryItemCreated,
  initialData,
  onOpenValidateDialog,
  validatedFolios,
}: POSFormProps) {
  const methods = useFormContext();
  const { control, getValues, setValue, reset } = methods;
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  
  const watchedPayments = useWatch({ control, name: 'payments' });
  const watchedItems = useWatch({ control, name: 'items' });

  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false);
  const [isNewInventoryItemDialogOpen, setIsNewInventoryItemDialogOpen] = useState(false);
  const [newItemInitialData, setNewItemInitialData] = useState<Partial<InventoryItemFormValues> | null>(null);
  
  useEffect(() => {
    if (initialData) {
      reset(initialData);
    }
  }, [initialData, reset]);

  const handleOpenAddItemDialog = () => setIsAddItemDialogOpen(true);
  
  const handleAddItem = useCallback((item: InventoryItem, quantity: number) => {
    const currentItems = getValues('items') || [];
    setValue('items', [...currentItems, {
        inventoryItemId: item.id,
        itemName: item.name,
        quantity: quantity,
        unitPrice: item.sellingPrice,
        totalPrice: item.sellingPrice * quantity,
        isService: item.isService || false,
        unitType: item.unitType,
    }]);
    setIsAddItemDialogOpen(false);
  }, [setValue, getValues]);
  
  const handleRequestNewItem = useCallback((searchTerm: string) => {
      setNewItemInitialData({
          name: searchTerm,
          category: categories.length > 0 ? categories[0].name : "",
          supplier: suppliers.length > 0 ? suppliers[0].name : "",
      });
      setIsAddItemDialogOpen(false);
      setIsNewInventoryItemDialogOpen(true);
  }, [categories, suppliers]);
  
  const handleNewItemSaved = async (formData: InventoryItemFormValues) => {
    if (!onInventoryItemCreated) return;
    const newItem = await onInventoryItemCreated(formData);
    handleAddItem(newItem, 1);
    setIsNewInventoryItemDialogOpen(false);
  };
  
    useEffect(() => {
        const allItems = getValues('items') || [];
        // Exclude commission from total calculation to prevent feedback loop
        const totalAmount = allItems
            .filter((item: any) => item.inventoryItemId !== COMMISSION_ITEM_ID)
            .reduce((sum: number, item: any) => sum + (item.totalPrice || 0), 0) || 0;

        const hasCardPayment = watchedPayments?.some((p: any) => p.method === 'Tarjeta');
        const hasMSIPayment = watchedPayments?.some((p: any) => p.method === 'Tarjeta MSI');
        
        let commissionAmount = 0;
        if (hasCardPayment) commissionAmount += totalAmount * 0.041;
        if (hasMSIPayment) commissionAmount += totalAmount * 0.12;

        const commissionIndex = allItems.findIndex((item: any) => item.inventoryItemId === COMMISSION_ITEM_ID);

        if (commissionAmount > 0) {
            const commissionItem = {
                inventoryItemId: COMMISSION_ITEM_ID,
                itemName: 'Comisión de Tarjeta',
                quantity: 1,
                unitPrice: commissionAmount, // Costo para el taller
                totalPrice: 0, // No se suma al total del cliente
                isService: true,
            };
            if (commissionIndex > -1) {
                // Update existing commission
                setValue(`items.${commissionIndex}`, commissionItem, { shouldDirty: true });
            } else {
                // Add new commission item
                append(commissionItem);
            }
        } else if (commissionIndex > -1) {
            // Remove commission if no card payment
            remove(commissionIndex);
        }

    }, [watchedPayments, watchedItems, setValue, getValues, append, remove]);


  return (
    <>
      <form id="pos-form" onSubmit={methods.handleSubmit(onSaleComplete)} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
          {/* Columna Izquierda: Lista de Artículos */}
          <div className="lg:col-span-3">
            <SaleItemsList onAddItem={handleOpenAddItemDialog} inventoryItems={inventoryItems} />
          </div>

          {/* Columna Derecha: Pago y Resumen */}
          <div className="lg:col-span-2 space-y-6">
            <SaleSummary onOpenValidateDialog={onOpenValidateDialog} validatedFolios={validatedFolios} />
          </div>
        </div>
      </form>

      <AddItemDialog
        open={isAddItemDialogOpen}
        onOpenChange={setIsAddItemDialogOpen}
        inventoryItems={inventoryItems}
        onItemSelected={handleAddItem}
        onNewItemRequest={handleRequestNewItem}
      />
      
      {isNewInventoryItemDialogOpen && onInventoryItemCreated && (
          <InventoryItemDialog
            open={isNewInventoryItemDialogOpen}
            onOpenChange={setIsNewInventoryItemDialogOpen}
            item={newItemInitialData}
            onSave={handleNewItemSaved}
            categories={categories}
            suppliers={suppliers}
          />
      )}
    </>
  );
}
