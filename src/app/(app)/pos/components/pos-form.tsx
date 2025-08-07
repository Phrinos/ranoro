

"use client";

import { useFormContext, useFieldArray, useWatch } from "react-hook-form";
import type { InventoryItem, SaleReceipt, InventoryCategory, Supplier } from "@/types";
import { useState, useCallback, useEffect, useMemo, useRef } from "react";
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
  initialData?: SaleReceipt | null; // Added to support editing
}

const IVA_RATE = 0.16;

export function PosForm({ 
  inventoryItems, 
  categories, 
  suppliers, 
  onSaleComplete, 
  onInventoryItemCreated,
  initialData, // Added prop
}: POSFormProps) {
  const methods = useFormContext();
  const { setValue, getValues, control } = methods;
  
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
        const currentItems = getValues('items') || [];
        const totalWithoutCommission = currentItems.reduce((acc: number, item: any) => {
            if (item.inventoryItemId !== 'COMMISSION_FEE') {
                return acc + (item.totalPrice || 0);
            }
            return acc;
        }, 0) || 0;
        
        let commissionAmount = 0;
        const hasCardPayment = watchedPayments?.some((p: any) => p.method === 'Tarjeta');
        const hasMSIPayment = watchedPayments?.some((p: any) => p.method === 'Tarjeta MSI');
        
        if (hasCardPayment) commissionAmount += totalWithoutCommission * 0.041;
        if (hasMSIPayment) commissionAmount += totalWithoutCommission * 0.12;
        
        // Remove existing commission to recalculate
        let newItems = currentItems.filter((item: any) => item.inventoryItemId !== 'COMMISSION_FEE');

        if (hasCardPayment || hasMSIPayment) {
            newItems.push({
                inventoryItemId: 'COMMISSION_FEE',
                itemName: 'Comisión de Tarjeta',
                quantity: 1,
                unitPrice: commissionAmount,
                totalPrice: 0,
                isService: true,
            });
        }
        
        // Use a simple JSON comparison to avoid infinite loops
        if (JSON.stringify(newItems) !== JSON.stringify(currentItems)) {
            setValue('items', newItems, { shouldDirty: true });
        }
    }, [watchedPayments, getValues, setValue]);


  return (
    <>
      <div id="pos-form" className="space-y-6">
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
      </div>

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
