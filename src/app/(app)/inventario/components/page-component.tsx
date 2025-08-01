

"use client";

import { useState, useMemo, useEffect, useCallback, Suspense, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { PlusCircle, Printer } from "lucide-react";
import { InventoryItemDialog } from "./inventory-item-dialog";
import type { InventoryItem, InventoryCategory, Supplier, CashDrawerTransaction, PurchaseRecommendation, WorkshopInfo } from "@/types";
import type { InventoryItemFormValues } from "./inventory-item-form";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RegisterPurchaseDialog } from './register-purchase-dialog';
import type { PurchaseFormValues } from './register-purchase-dialog';
import { InformeContent } from './informe-content';
import { ProductosContent } from './productos-content';
import { CategoriasContent } from './categorias-content';
import { ProveedoresContent } from './proveedores-content';
import { AnalisisIaContent } from './analisis-ia-content';
import { AUTH_USER_LOCALSTORAGE_KEY } from '@/lib/placeholder-data';
import { Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { inventoryService } from '@/lib/services/inventory.service';
import { operationsService } from '@/lib/services/operations.service';
import { adminService } from '@/lib/services/admin.service';
import { addDoc, collection, doc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { InventoryReportContent } from './inventory-report-content';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from "@/lib/utils";


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
    if (!db) return;
    const batch = writeBatch(db);

    // 1. Update supplier debt if payment method is 'Credito'
    if (data.paymentMethod === 'Crédito') {
      const supplierRef = doc(db, "suppliers", data.supplierId);
      const supplier = suppliers.find(s => s.id === data.supplierId);
      if (supplier) {
        batch.update(supplierRef, { debtAmount: (supplier.debtAmount || 0) + data.invoiceTotal });
      }
    } else if (data.paymentMethod === 'Efectivo') {
        const supplierName = suppliers.find(s => s.id === data.supplierId)?.name || 'desconocido';
        const newTransaction = {
          date: new Date().toISOString(),
          type: 'Salida',
          amount: data.invoiceTotal,
          concept: `Compra a ${supplierName} (Factura)`,
          userId: 'system', // TODO: Get current user
          userName: 'Sistema',
        };
        batch.set(doc(collection(db, "cashDrawerTransactions")), newTransaction);
    }
    
    // 2. Update inventory items stock and cost
    data.items.forEach(purchasedItem => {
      const itemRef = doc(db, "inventory", purchasedItem.inventoryItemId);
      const inventoryItem = inventoryItems.find(i => i.id === purchasedItem.inventoryItemId);
      if (inventoryItem) {
        batch.update(itemRef, {
          quantity: inventoryItem.quantity + purchasedItem.quantity,
          unitPrice: purchasedItem.unitPrice
        });
      }
    });
    
    // 3. Log audit
    const supplierName = suppliers.find(s => s.id === data.supplierId)?.name || 'desconocido';
    const userString = typeof window !== 'undefined' ? localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY) : null;
    const user = userString ? JSON.parse(userString) : { id: 'system', name: 'Sistema' };
    const auditLog = {
      actionType: 'Registrar',
      description: `Registró una compra al proveedor "${supplierName}" por ${formatCurrency(data.invoiceTotal)}.`,
      entityType: 'Compra',
      entityId: data.supplierId,
      userId: user.id,
      userName: user.name,
      date: new Date().toISOString(),
    };
    batch.set(doc(collection(db, 'auditLogs')), auditLog);
    
    // 4. Commit batch
    await batch.commit();
    
    toast({ title: "Compra Registrada", description: `La compra de ${data.items.length} artículo(s) ha sido registrada.` });
    setIsRegisterPurchaseOpen(false);
  }, [toast, suppliers, inventoryItems]);
  
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
    { value: "informe", label: "Informe" },
    { value: "productos", label: "Productos y Servicios" },
    { value: "categorias", label: "Categorías" },
    { value: "proveedores", label: "Proveedores" },
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
        
        <TabsContent value="informe" className="mt-6">
            <InformeContent 
                inventoryItems={inventoryItems} 
                suppliers={suppliers}
                onRegisterPurchaseClick={() => setIsRegisterPurchaseOpen(true)}
            />
        </TabsContent>
        <TabsContent value="productos" className="mt-6">
            <ProductosContent 
                inventoryItems={inventoryItems} 
                onNewItem={handleOpenItemDialog}
                onPrint={handlePrint}
            />
        </TabsContent>
        <TabsContent value="categorias" className="mt-6">
            <CategoriasContent categories={categories} inventoryItems={inventoryItems} />
        </TabsContent>
        <TabsContent value="proveedores" className="mt-6">
            <ProveedoresContent suppliers={suppliers} />
        </TabsContent>
        <TabsContent value="analisis" className="mt-6">
            <AnalisisIaContent inventoryItems={inventoryItems} />
        </TabsContent>
      </Tabs>
      
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
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 print-content">
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
