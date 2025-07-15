

"use client";

import { useState, useMemo, useEffect, useCallback, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { PlusCircle, Printer } from "lucide-react";
import { InventoryItemDialog } from "./components/inventory-item-dialog";
import type { InventoryItem, InventoryCategory, Supplier, CashDrawerTransaction, PurchaseRecommendation, WorkshopInfo } from "@/types";
import type { InventoryItemFormValues } from "./components/inventory-item-form";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RegisterPurchaseDialog } from './components/register-purchase-dialog';
import type { PurchaseFormValues } from './components/register-purchase-dialog';
import { InformeContent } from './components/informe-content';
import { ProductosContent } from './components/productos-content';
import { CategoriasContent } from './components/categorias-content';
import { ProveedoresContent } from './components/proveedores-content';
import { AnalisisIaContent } from './components/analisis-ia-content';
import { AUTH_USER_LOCALSTORAGE_KEY } from '@/lib/placeholder-data';
import { Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { inventoryService } from '@/lib/services/inventory.service';
import { operationsService } from '@/lib/services/operations.service';
import { adminService } from '@/lib/services/admin.service';
import { addDoc, collection, doc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';
import { PrintTicketDialog } from '@/components/ui/print-ticket-dialog';
import { InventoryReportContent } from './components/inventory-report-content';


function InventarioPageComponent() {
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'informe';

  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState(defaultTab);
  
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isRegisterPurchaseOpen, setIsRegisterPurchaseOpen] = useState(false);
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<InventoryItem> | null>(null);

  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [itemsToPrint, setItemsToPrint] = useState<InventoryItem[]>([]);
  const printRef = useRef<HTMLDivElement>(null);
  const [workshopInfo, setWorkshopInfo] = useState<WorkshopInfo | null>(null);

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
      setItemsToPrint(items);
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

  return (
    <>
      <div className="bg-primary text-primary-foreground rounded-lg p-6 mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Mi Inventario</h1>
        <p className="text-primary-foreground/80 mt-1">Gestiona productos, proveedores, categorías y obtén análisis inteligentes.</p>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 mb-6">
          <TabsTrigger value="informe" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Informe</TabsTrigger>
          <TabsTrigger value="productos" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Productos y Servicios</TabsTrigger>
          <TabsTrigger value="categorias" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Categorías</TabsTrigger>
          <TabsTrigger value="proveedores" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Proveedores</TabsTrigger>
          <TabsTrigger value="analisis" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Análisis IA</TabsTrigger>
        </TabsList>
        
        <TabsContent value="informe">
            <InformeContent 
                inventoryItems={inventoryItems} 
                suppliers={suppliers}
                onRegisterPurchaseClick={() => setIsRegisterPurchaseOpen(true)}
            />
        </TabsContent>
        <TabsContent value="productos">
            <ProductosContent 
                inventoryItems={inventoryItems} 
                onNewItem={handleOpenItemDialog}
                onPrint={handlePrint}
            />
        </TabsContent>
        <TabsContent value="categorias">
            <CategoriasContent categories={categories} inventoryItems={inventoryItems} />
        </TabsContent>
        <TabsContent value="proveedores">
            <ProveedoresContent suppliers={suppliers} />
        </TabsContent>
        <TabsContent value="analisis">
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

      <PrintTicketDialog
          open={isPrintDialogOpen}
          onOpenChange={setIsPrintDialogOpen}
          title="Vista Previa de Reporte de Inventario"
          dialogContentClassName="printable-quote-dialog max-w-4xl"
          footerActions={
            <Button onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" /> Imprimir Reporte
            </Button>
          }
          contentRef={printRef}
      >
        <InventoryReportContent ref={printRef} items={itemsToPrint} workshopInfo={workshopInfo}/>
      </PrintTicketDialog>
    </>
  );
}

export default function InventarioPageWrapper() {
    return (
        <Suspense fallback={<div>Cargando...</div>}>
            <InventarioPageComponent />
        </Suspense>
    )
}
