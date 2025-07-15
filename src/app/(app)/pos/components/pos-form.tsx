

"use client";

import { useFormContext } from "react-hook-form";
import type { InventoryItem, SaleReceipt, InventoryCategory, Supplier } from "@/types";
import { useState, useCallback } from "react";
import { AddItemDialog } from "./add-item-dialog";
import { InventoryItemDialog } from "../../inventario/components/inventory-item-dialog";
import type { InventoryItemFormValues } from "../../inventario/components/inventory-item-form";
import { SaleItemsList } from './sale-items-list';
import { PaymentSection } from './payment-section';
import { SaleSummary } from './sale-summary';

interface POSFormProps {
  inventoryItems: InventoryItem[];
  categories: InventoryCategory[];
  suppliers: Supplier[];
  onSaleComplete: (saleData: any) => void;
  onInventoryItemCreated?: (formData: InventoryItemFormValues) => Promise<InventoryItem>;
}

export function PosForm({ inventoryItems, categories, suppliers, onSaleComplete, onInventoryItemCreated }: POSFormProps) {
  const methods = useFormContext();

  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false);
  const [isNewInventoryItemDialogOpen, setIsNewInventoryItemDialogOpen] = useState(false);
  const [newItemInitialData, setNewItemInitialData] = useState<Partial<InventoryItemFormValues> | null>(null);

  const handleOpenAddItemDialog = () => setIsAddItemDialogOpen(true);
  
  const handleAddItem = useCallback((item: InventoryItem, quantity: number) => {
    const currentItems = methods.getValues('items') || [];
    methods.setValue('items', [...currentItems, {
        inventoryItemId: item.id,
        itemName: item.name,
        quantity: quantity,
        unitPrice: item.sellingPrice,
        totalPrice: item.sellingPrice * quantity,
        isService: item.isService || false,
        unitType: item.unitType,
    }]);
    setIsAddItemDialogOpen(false);
  }, [methods]);
  
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

  return (
    <>
      <form onSubmit={methods.handleSubmit(onSaleComplete)} className="space-y-6">
        <SaleItemsList onAddItem={handleOpenAddItemDialog} inventoryItems={inventoryItems} />
        
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3">
            <PaymentSection />
          </div>
          <div className="lg:col-span-2">
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
