

"use client";

import { useState, useMemo, useEffect, useCallback, Suspense, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { PlusCircle, Printer } from "lucide-react";
import { InventoryItemDialog } from "./inventory-item-dialog";
import type { InventoryItem, InventoryCategory, Supplier, CashDrawerTransaction, PurchaseRecommendation, WorkshopInfo } from "@/types";
import type { InventoryItemFormValues } from "./inventory-item-form";
import { useToast } from "@/hooks/use-toast";
import { RegisterPurchaseDialog } from './register-purchase-dialog';
import type { PurchaseFormValues } from './register-purchase-dialog';
import { InformeContent } from './informe-content';
import { ProductosContent } from './productos-content';
import { CategoriasContent } from './categorias-content';
import { AnalisisIaContent } from './analisis-ia-content';
import { AUTH_USER_LOCALSTORAGE_KEY } from '@/lib/placeholder-data';
import { Loader2 } from 'lucide-react';
import { inventoryService } from '@/lib/services/inventory.service';
import { operationsService } from '@/lib/services/operations.service';
import { adminService } from '@/lib/services/admin.service';
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { InventoryReportContent } from './inventory-report-content';
import { TabbedPageLayout } from '@/components/layout/tabbed-page-layout';
import { ProveedoresContent } from '../../proveedores/components/page-component';


export function InventarioPageComponent({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const tab = searchParams?.tab as string | undefined;
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState(tab || 'informe');
  
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isRegisterPurchaseOpen, setIsRegisterPurchaseOpen] = useState(false);
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<InventoryItem> | null>(null);

  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [itemsToPrint, setItemsToPrint] = useState<InventoryItem[]>([]);
  const [workshopInfo, setWorkshopInfo] = useState<WorkshopInfo | null>(null);
  const printContentRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    const unsubs: (() => void)[] = [];
    setIsLoading(true);
    
    unsubs.push(inventoryService.onItemsUpdate(setInventoryItems));
    unsubs.push(inventoryService.onCategoriesUpdate(setCategories));
    unsubs.push(inventoryService.onSuppliersUpdate((data) => {
      setSuppliers(data);
      setIsLoading(false); // Mark loading as false after the last required dataset is fetched
    }));
    
    const storedInfo = localStorage.getItem('workshopTicketInfo');
    if (storedInfo) {
      try { setWorkshopInfo(JSON.parse(storedInfo)); } catch {}
    }

    return () => unsubs.forEach(unsub => unsub());
  }, []);
  
  const handlePrint = useCallback((items: InventoryItem[]) => {
      const itemsToPrintWithCategory = items.map(item => ({
        ...item,
        category: item.category || 'Sin Categoría'
      })).sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
      
      setItemsToPrint(itemsToPrintWithCategory);
      setIsPrintDialogOpen(true);
  }, []);


  const handleOpenItemDialog = useCallback(() => {
    setEditingItem(null); // Ensure we're creating a new item
    setIsItemDialogOpen(true);
  }, []);

  const handleSavePurchase = useCallback(async (data: PurchaseFormValues) => {
    await operationsService.registerPurchase(data);
    toast({ title: "Compra Registrada", description: `La compra de ${data.items.length} artículo(s) ha sido registrada.` });
    setIsRegisterPurchaseOpen(false);
  }, [toast]);
  
  const handleSaveItem = useCallback(async (itemData: InventoryItemFormValues) => {
    // This is for new items from the "Productos" tab
    await inventoryService.addItem(itemData);
    toast({ title: "Producto Creado", description: `"${itemData.name}" ha sido agregado al inventario.` });
    setIsItemDialogOpen(false); // Close dialog on success
  }, [toast]);
  
  const handleInventoryItemCreatedFromPurchase = useCallback(async (formData: InventoryItemFormValues): Promise<InventoryItem> => {
      // This is for items created during a purchase registration
      const newItem = await inventoryService.addItem(formData);
      toast({ title: "Producto Creado", description: `"${newItem.name}" ha sido agregado al inventario.` });
      return newItem;
  }, [toast]);

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  const tabsConfig = [
    { value: "informe", label: "Informe", content: <InformeContent inventoryItems={inventoryItems} suppliers={suppliers} onRegisterPurchaseClick={() => setIsRegisterPurchaseOpen(true)} /> },
    { value: "productos", label: "Productos y Servicios", content: <ProductosContent inventoryItems={inventoryItems} onNewItem={handleOpenItemDialog} onPrint={handlePrint} /> },
    { value: "categorias", label: "Categorías", content: <CategoriasContent categories={categories} inventoryItems={inventoryItems} /> },
    { value: "analisis", label: "Análisis IA", content: <AnalisisIaContent inventoryItems={inventoryItems} /> },
  ];

  return (
    <>
      <TabbedPageLayout
        title="Mi Inventario"
        description="Gestiona productos, proveedores, categorías y obtén análisis inteligentes."
        activeTab={activeTab}
        onTabChange={setActiveTab}
        tabs={tabsConfig}
      />
      
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

       <Dialog open={isPrintDialogOpen} onOpenChange={setIsPrintDialogOpen}>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 no-print">
                <div className="flex-grow overflow-y-auto bg-muted/30 print:bg-white print:p-0">
                  <InventoryReportContent ref={printContentRef} items={itemsToPrint} />
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
