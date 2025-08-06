

"use client";

import { useFormContext, useFieldArray, useWatch } from "react-hook-form";
import type { InventoryItem, SaleReceipt, InventoryCategory, Supplier } from "@/types";
import { useState, useCallback, useEffect, useMemo } from "react";
import { AddItemDialog } from "./add-item-dialog";
import { InventoryItemDialog } from "../../inventario/components/inventory-item-dialog";
import type { InventoryItemFormValues } from "../../inventario/components/inventory-item-form";
import { SaleItemsList } from './sale-items-list';
import { SaleSummary } from './sale-summary';

interface POSFormProps {
  inventoryItems: InventoryItem[];
  categories: InventoryCategory[];
  suppliers: Supplier[];
  onSaleComplete: (saleData: any) => void;
  onInventoryItemCreated?: (formData: InventoryItemFormValues) => Promise<InventoryItem>;
}

const IVA_RATE = 0.16;

export function PosForm({ inventoryItems, categories, suppliers, onSaleComplete, onInventoryItemCreated }: POSFormProps) {
  const methods = useFormContext();
  const { setValue, getValues, control } = methods;

  const watchedItems = useWatch({ control, name: 'items' });
  const watchedPayments = useWatch({ control, name: 'payments' });

  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false);
  const [isNewInventoryItemDialogOpen, setIsNewInventoryItemDialogOpen] = useState(false);
  const [newItemInitialData, setNewItemInitialData] = useState<Partial<InventoryItemFormValues> | null>(null);

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
        const hasCardPayment = watchedPayments?.some((p: any) => p.method === 'Tarjeta' || p.method === 'Tarjeta MSI');
        const commissionItemIndex = watchedItems?.findIndex((item: any) => item.inventoryItemId === 'COMMISSION_FEE');
        
        const currentTotal = watchedItems?.reduce((acc: number, item: any) => {
            if (item.inventoryItemId !== 'COMMISSION_FEE') {
                return acc + (item.totalPrice || 0);
            }
            return acc;
        }, 0) || 0;
        
        if (hasCardPayment && commissionItemIndex === -1) {
            const commissionAmount = currentTotal * 0.035;
            const newCommissionItem = {
                inventoryItemId: 'COMMISSION_FEE',
                itemName: 'Comisión de Tarjeta',
                quantity: 1,
                unitPrice: commissionAmount,
                totalPrice: 0, 
                isService: true,
            };
            const newItems = [...(watchedItems || []), newCommissionItem];
            setValue('items', newItems);

        } else if (!hasCardPayment && commissionItemIndex !== -1 && commissionItemIndex !== undefined) {
            const newItems = watchedItems.filter((_: any, index: number) => index !== commissionItemIndex);
            setValue('items', newItems);
        } else if (hasCardPayment && commissionItemIndex !== -1 && commissionItemIndex !== undefined) {
            // Recalculate commission if total changes
            const commissionAmount = currentTotal * 0.035;
            const updatedItems = [...watchedItems];
            updatedItems[commissionItemIndex].unitPrice = commissionAmount;
            setValue('items', updatedItems, { shouldDirty: true });
        }
        
    }, [watchedPayments, watchedItems, setValue]);


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
            <SaleSummary />
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
