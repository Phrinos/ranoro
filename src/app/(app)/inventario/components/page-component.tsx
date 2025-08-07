

"use client";

import React, { useState, useMemo, useEffect, useCallback, Suspense, useRef, lazy } from 'react';
import { Button } from "@/components/ui/button";
import { PlusCircle, Printer } from "lucide-react";
import type { InventoryItem, InventoryCategory, Supplier, SaleReceipt, ServiceRecord, PayableAccount, InventoryMovement } from '@/types'; 
import type { InventoryItemFormValues } from "@/schemas/inventory-item-form-schema";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from 'lucide-react';
import { inventoryService } from '@/lib/services/inventory.service';
import { purchaseService } from '@/lib/services/purchase.service';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { cn } from "@/lib/utils";
import { useTableManager } from '@/hooks/useTableManager';

// Lazy load components
const RegisterPurchaseDialog = lazy(() => import('./register-purchase-dialog').then(module => ({ default: module.RegisterPurchaseDialog })));
const InventoryItemDialog = lazy(() => import('./inventory-item-dialog').then(module => ({ default: module.InventoryItemDialog })));
const ProductosContent = lazy(() => import('./productos-content').then(module => ({ default: module.ProductosContent })));
const CategoriasContent = lazy(() => import('./categorias-content').then(module => ({ default: module.CategoriasContent })));
const AnalisisIaContent = lazy(() => import('./analisis-ia-content').then(module => ({ default: module.AnalisisIaContent })));
const InventoryReportContent = lazy(() => import('./inventory-report-content').then(module => ({ default: module.InventoryReportContent })));


export default function InventarioPageComponent({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const tab = searchParams?.tab as string | undefined;
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState(tab || 'productos');
  
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isRegisterPurchaseOpen, setIsRegisterPurchaseOpen] = useState(false);
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<InventoryItem> | null>(null);

  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [itemsToPrint, setItemsToPrint] = useState<InventoryItem[]>([]);
  
  const { 
    filteredData, 
    ...tableManager 
  } = useTableManager<InventoryItem>({
    initialData: inventoryItems,
    searchKeys: ['name', 'sku', 'brand', 'category'],
    dateFilterKey: '', 
    initialSortOption: 'default_order',
    itemsPerPage: 100,
  });

  useEffect(() => {
    const unsubs: (() => void)[] = [];
    setIsLoading(true);
    
    unsubs.push(inventoryService.onItemsUpdate(setInventoryItems));
    unsubs.push(inventoryService.onCategoriesUpdate(setCategories));
    unsubs.push(inventoryService.onSuppliersUpdate((data) => {
      setSuppliers(data);
      setIsLoading(false); 
    }));

    return () => unsubs.forEach(unsub => unsub());
  }, []);

  const inventorySummary = useMemo(() => {
    let cost = 0, sellingPriceValue = 0, lowStock = 0, products = 0, services = 0;
    inventoryItems.forEach(item => {
      if (item.isService) services++;
      else {
        products++;
        cost += (item.quantity || 0) * (item.unitPrice || 0);
        sellingPriceValue += (item.quantity || 0) * (item.sellingPrice || 0);
        if ((item.quantity || 0) <= (item.lowStockThreshold || 0)) lowStock++;
      }
    });
    return { 
        totalInventoryCost: cost, 
        totalInventorySellingPrice: sellingPriceValue, 
        lowStockItemsCount: lowStock, 
        productsCount: products, 
        servicesCount: services, 
    };
  }, [inventoryItems]);

  const handlePrint = useCallback((items: InventoryItem[]) => {
      setItemsToPrint(items);
      setIsPrintDialogOpen(true);
  }, []);


  const handleOpenItemDialog = useCallback(() => {
    setEditingItem(null);
    setIsItemDialogOpen(true);
  }, []);

  const handleSavePurchase = useCallback(async (data: PurchaseFormValues) => {
    await purchaseService.registerPurchase(data);
    toast({ title: "Compra Registrada", description: `La compra de ${data.items.length} artículo(s) ha sido registrada.` });
    setIsRegisterPurchaseOpen(false);
  }, [toast]);
  
  const handleSaveItem = useCallback(async (itemData: InventoryItemFormValues) => {
    await inventoryService.addItem(itemData);
    toast({ title: "Producto Creado", description: `"${itemData.name}" ha sido agregado al inventario.` });
    setIsItemDialogOpen(false);
  }, [toast]);
  
  const handleInventoryItemCreatedFromPurchase = useCallback(async (formData: InventoryItemFormValues): Promise<InventoryItem> => {
      const newItem = await inventoryService.addItem(formData);
      toast({ title: "Producto Creado", description: `"${newItem.name}" ha sido agregado al inventario.` });
      return newItem;
  }, [toast]);

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  const tabsConfig = [
    { value: "productos", label: "Productos y Servicios" },
    { value: "categorias", label: "Categorías" },
    { value: "analisis", label: "Análisis IA" },
  ];

  return (
    <>
      <div className="bg-primary text-primary-foreground rounded-lg p-6 mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Mi Inventario</h1>
        <p className="text-primary-foreground/80 mt-1">Gestiona productos, proveedores, categorías y obtén análisis inteligentes.</p>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="w-full">
            <div className="flex flex-wrap w-full gap-2 sm:gap-4">
              {tabsConfig.map(tabInfo => (
                <button
                  key={tabInfo.value}
                  onClick={() => setActiveTab(tabInfo.value)}
                  className={cn(
                    'flex-1 min-w-[30%] sm:min-w-0 text-center px-3 py-2 rounded-md transition-colors duration-200 text-sm sm:text-base',
                    'break-words whitespace-normal leading-snug',
                    activeTab === tabInfo.value
                      ? 'bg-primary text-primary-foreground shadow'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  )}
                >
                  {tabInfo.label}
                </button>
              ))}
            </div>
        </div>
        
        <TabsContent value="productos" className="mt-6">
          <Suspense fallback={<Loader2 className="animate-spin" />}>
            <ProductosContent 
                summaryData={inventorySummary}
                onNewItem={handleOpenItemDialog}
                onPrint={handlePrint}
                tableManager={tableManager}
                filteredItems={filteredData}
                onRegisterPurchaseClick={() => setIsRegisterPurchaseOpen(true)}
            />
          </Suspense>
        </TabsContent>
        <TabsContent value="categorias" className="mt-6">
          <Suspense fallback={<Loader2 className="animate-spin" />}>
            <CategoriasContent categories={categories} inventoryItems={inventoryItems} />
          </Suspense>
        </TabsContent>
        <TabsContent value="analisis" className="mt-6">
          <Suspense fallback={<Loader2 className="animate-spin" />}>
            <AnalisisIaContent inventoryItems={inventoryItems} />
          </Suspense>
        </TabsContent>
      </Tabs>
      
      <Suspense fallback={null}>
        <RegisterPurchaseDialog
          open={isRegisterPurchaseOpen}
          onOpenChange={setIsRegisterPurchaseOpen}
          suppliers={suppliers}
          inventoryItems={inventoryItems}
          onSave={handleSavePurchase}
          onInventoryItemCreated={handleInventoryItemCreatedFromPurchase}
          categories={categories}
        />

        <InventoryItemDialog
          open={isItemDialogOpen}
          onOpenChange={setIsItemDialogOpen}
          onSave={handleSaveItem}
          item={editingItem}
          categories={categories}
          suppliers={suppliers}
        />
      </Suspense>

       <Dialog open={isPrintDialogOpen} onOpenChange={setIsPrintDialogOpen}>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 no-print">
                <DialogHeader className="p-6 pb-2 border-b">
                  <DialogTitle>Reporte de Inventario</DialogTitle>
                  <DialogDescription>Vista previa del reporte para imprimir.</DialogDescription>
                </DialogHeader>
                <div className="flex-grow overflow-y-auto bg-muted/30 print:bg-white print:p-0">
                  <Suspense fallback={<Loader2 className="animate-spin" />}>
                    <InventoryReportContent items={itemsToPrint} />
                  </Suspense>
                </div>
                 <DialogFooter className="p-6 pt-4 border-t flex-shrink-0 bg-background sm:justify-end no-print">
                    <Button onClick={() => window.print()}>
                        <Printer className="mr-2 h-4 w-4" /> Imprimir
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </>
  );
}
