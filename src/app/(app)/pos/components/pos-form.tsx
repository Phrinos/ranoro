

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray, FormProvider } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Receipt } from "lucide-react";
import type { InventoryItem, PaymentMethod, SaleReceipt, InventoryCategory, Supplier } from "@/types";
import { useToast } from "@/hooks/use-toast";
import React, { useState, useEffect, useCallback } from "react";
import { AddItemDialog } from "./add-item-dialog";
import { InventoryItemDialog } from "../../inventario/components/inventory-item-dialog";
import type { InventoryItemFormValues } from "../../inventario/components/inventory-item-form";
import { SaleItemsList } from './sale-items-list';
import { PaymentSection } from './payment-section';
import { SaleSummary } from './sale-summary';
import { operationsService, inventoryService } from '@/lib/services';
import { db } from '@/lib/firebaseClient';
import { writeBatch, doc } from 'firebase/firestore';


const saleItemSchema = z.object({
  inventoryItemId: z.string().min(1, "Seleccione un artículo."),
  itemName: z.string(),
  quantity: z.coerce.number().min(0.001, "La cantidad debe ser mayor a 0."),
  unitPrice: z.coerce.number(),
  totalPrice: z.coerce.number(),
  isService: z.boolean().optional(),
});

const paymentMethods: [PaymentMethod, ...PaymentMethod[]] = [
  "Efectivo", "Tarjeta", "Transferencia", "Efectivo+Transferencia", "Tarjeta+Transferencia"
];

const posFormSchema = z.object({
  items: z.array(saleItemSchema).min(1, "Debe agregar al menos un artículo a la venta."),
  customerName: z.string().optional(),
  paymentMethod: z.enum(paymentMethods).default("Efectivo"),
  cardFolio: z.string().optional(),
  transferFolio: z.string().optional(),
}).refine(data => {
  if ((data.paymentMethod === "Tarjeta" || data.paymentMethod === "Tarjeta+Transferencia") && !data.cardFolio) return false;
  return true;
}, { message: "El folio de la tarjeta es obligatorio.", path: ["cardFolio"] })
.refine(data => {
  if ((data.paymentMethod === "Transferencia" || data.paymentMethod === "Efectivo+Transferencia" || data.paymentMethod === "Tarjeta+Transferencia") && !data.transferFolio) return false;
  return true;
}, { message: "El folio de la transferencia es obligatorio.", path: ["transferFolio"] });


type POSFormValues = z.infer<typeof posFormSchema>;

interface POSFormProps {
  inventoryItems: InventoryItem[];
  onSaleComplete: (saleData: SaleReceipt) => void;
  onInventoryItemCreated: (formData: InventoryItemFormValues) => Promise<InventoryItem>;
}

export function PosForm({ inventoryItems: parentInventoryItems, onSaleComplete, onInventoryItemCreated }: POSFormProps) {
  const { toast } = useToast();
  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false);
  const [isNewInventoryItemDialogOpen, setIsNewInventoryItemDialogOpen] = useState(false);
  const [newItemInitialData, setNewItemInitialData] = useState<Partial<InventoryItemFormValues> | null>(null);
  
  const [allCategories, setAllCategories] = useState<InventoryCategory[]>([]);
  const [allSuppliers, setAllSuppliers] = useState<Supplier[]>([]);

  const form = useForm<POSFormValues>({
    resolver: zodResolver(posFormSchema),
    defaultValues: {
      items: [],
      customerName: "Cliente Mostrador",
      paymentMethod: "Efectivo",
      cardFolio: "",
      transferFolio: "",
    },
  });

  const { control, watch, setValue, getValues } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const watchedItems = watch("items");

  useEffect(() => {
    inventoryService.onCategoriesUpdate(setAllCategories);
    inventoryService.onSuppliersUpdate(setAllSuppliers);
  }, []);

  useEffect(() => {
    let newTotalAmount = 0;
    watchedItems.forEach((item, index) => {
      const quantity = parseFloat(String(item.quantity || 0).replace(',', '.'));
      if (isNaN(quantity)) return;
      
      const unitPrice = item.unitPrice || 0;
      const newTotal = quantity * unitPrice;
      newTotalAmount += newTotal;

      if (item.totalPrice !== newTotal) {
          setValue(`items.${index}.totalPrice`, newTotal, { shouldDirty: true });
      }
    });
  }, [watchedItems, setValue]);


  const onSubmit = async (values: POSFormValues) => {
    if (!db) return;
    const batch = writeBatch(db);
    try {
      const saleId = await operationsService.registerSale(values, parentInventoryItems, batch);
      await batch.commit();

      const newSaleReceipt: SaleReceipt = {
        id: saleId,
        saleDate: new Date().toISOString(),
        ...values,
        subTotal: 0, // Recalculate or get from service
        tax: 0,
        totalAmount: values.items.reduce((sum, item) => sum + item.totalPrice, 0),
        status: 'Completado'
      };

      onSaleComplete(newSaleReceipt);
    } catch(e) {
      console.error(e);
      toast({ title: "Error al Registrar Venta", variant: "destructive"});
    }
  };

  const handleOpenAddItemDialog = () => setIsAddItemDialogOpen(true);
  
  const handleAddItem = (item: InventoryItem, quantity: number) => {
    append({
        inventoryItemId: item.id,
        itemName: item.name,
        quantity: quantity,
        unitPrice: item.sellingPrice,
        totalPrice: item.sellingPrice * quantity,
        isService: item.isService || false,
    });
    setIsAddItemDialogOpen(false);
  };
  
  const handleRequestNewItem = (searchTerm: string) => {
      setNewItemInitialData({
          name: searchTerm,
          category: allCategories.length > 0 ? allCategories[0].name : "",
          supplier: allSuppliers.length > 0 ? allSuppliers[0].name : "",
      });
      setIsAddItemDialogOpen(false);
      setIsNewInventoryItemDialogOpen(true);
  };
  
  const handleNewItemSaved = async (formData: InventoryItemFormValues) => {
    const newItem = await onInventoryItemCreated(formData);
    handleAddItem(newItem, 1);
    toast({ title: "Nuevo Ítem Creado y Añadido." });
    setIsNewInventoryItemDialogOpen(false);
  };


  return (
    <>
      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <SaleItemsList onAddItem={handleOpenAddItemDialog} inventoryItems={parentInventoryItems} />
            </div>
            <div className="space-y-6">
              <PaymentSection />
              <SaleSummary />
            </div>
          </div>
        </form>
      </FormProvider>

      <AddItemDialog
        open={isAddItemDialogOpen}
        onOpenChange={setIsAddItemDialogOpen}
        inventoryItems={parentInventoryItems}
        onItemSelected={handleAddItem}
        onNewItemRequest={handleRequestNewItem}
      />
      
      {isNewInventoryItemDialogOpen && (
          <InventoryItemDialog
            open={isNewInventoryItemDialogOpen}
            onOpenChange={setIsNewInventoryItemDialogOpen}
            item={newItemInitialData}
            onSave={handleNewItemSaved}
            categories={allCategories}
            suppliers={allSuppliers}
          />
      )}
    </>
  );
}
