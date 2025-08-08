
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
  initialData?: SaleReceipt | null;
  onOpenValidateDialog: (index: number) => void;
  validatedFolios: Record<number, boolean>;
}

const IVA_RATE = 0.16;

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
        
        let newItems = currentItems.filter((item: any) => item.inventoryItemId !== 'COMMISSION_FEE');
        
        const totalWithoutCommission = newItems.reduce((acc: number, item: any) => acc + (item.totalPrice || 0), 0);

        let commissionAmount = 0;
        const hasCardPayment = watchedPayments?.some((p: any) => p.method === 'Tarjeta');
        const hasMSIPayment = watchedPayments?.some((p: any) => p.method === 'Tarjeta MSI');
        
        if (hasCardPayment) {
          commissionAmount += totalWithoutCommission * 0.041;
        }
        if (hasMSIPayment) {
          commissionAmount += totalWithoutCommission * 0.12;
        }
        
        if (commissionAmount > 0) {
            newItems.push({
                inventoryItemId: 'COMMISSION_FEE',
                itemName: 'Comisión de Tarjeta',
                quantity: 1,
                unitPrice: commissionAmount,
                totalPrice: commissionAmount, // Commission is added to the total
                isService: true,
            });
        }
        
        if (JSON.stringify(newItems) !== JSON.stringify(currentItems)) {
            setValue('items', newItems, { shouldDirty: true });
        }
    }, [watchedPayments, getValues, setValue]);


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
            <SaleSummary onOpenValidateDialog={onOpenValidateDialog} validatedFolios={validatedFolios}/>
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
