

"use client";

import { useState, useMemo, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { InventoryItemDialog } from "./components/inventory-item-dialog";
import type { InventoryItem, InventoryCategory, Supplier, CashDrawerTransaction, PurchaseRecommendation } from "@/types";
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
import {
  placeholderInventory,
  placeholderCategories,
  placeholderSuppliers,
  placeholderCashDrawerTransactions,
  persistToFirestore,
  hydrateReady,
  logAudit
} from '@/lib/placeholder-data';
import { Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';


function InventarioPageComponent() {
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'informe';

  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState(defaultTab);
  
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = () => {
        setIsLoading(true);
        setInventoryItems([...placeholderInventory]);
        setCategories([...placeholderCategories]);
        setSuppliers([...placeholderSuppliers]);
        setIsLoading(false);
    };

    hydrateReady.then(() => {
        loadData(); // Initial load
        window.addEventListener('databaseUpdated', loadData); // Listen for updates
    });

    return () => {
        window.removeEventListener('databaseUpdated', loadData); // Cleanup
    };
  }, []);

  const [isRegisterPurchaseOpen, setIsRegisterPurchaseOpen] = useState(false);

  const handleSavePurchase = useCallback(async (data: PurchaseFormValues) => {
    // 1. Update supplier debt if payment method is 'Credito'
    if (data.paymentMethod === 'Crédito') {
      const supplierIndex = placeholderSuppliers.findIndex(s => s.id === data.supplierId);
      if (supplierIndex > -1) {
        placeholderSuppliers[supplierIndex].debtAmount = (placeholderSuppliers[supplierIndex].debtAmount || 0) + data.invoiceTotal;
      }
    } else if (data.paymentMethod === 'Efectivo') {
        // Create a cash drawer transaction for cash payments
        const supplierName = placeholderSuppliers.find(s => s.id === data.supplierId)?.name || 'desconocido';
        const newTransaction: CashDrawerTransaction = {
          id: `trx_${Date.now()}`,
          date: new Date().toISOString(),
          type: 'Salida',
          amount: data.invoiceTotal,
          concept: `Compra a ${supplierName} (Factura)`,
          userId: 'system', // TODO: Get current user
          userName: 'Sistema',
        };
        placeholderCashDrawerTransactions.push(newTransaction);
    }
    
    // 2. Update inventory items stock and cost
    data.items.forEach(purchasedItem => {
      const itemIndex = placeholderInventory.findIndex(i => i.id === purchasedItem.inventoryItemId);
      if (itemIndex > -1) {
        placeholderInventory[itemIndex].quantity += purchasedItem.quantity;
        // Optionally update the purchase price
        placeholderInventory[itemIndex].unitPrice = purchasedItem.unitPrice;
      }
    });

    const supplierName = placeholderSuppliers.find(s => s.id === data.supplierId)?.name || 'desconocido';
    await logAudit('Registrar', `Registró una compra al proveedor "${supplierName}" por ${formatCurrency(data.invoiceTotal)}.`, {entityType: 'Compra', entityId: data.supplierId});

    // 3. Persist changes
    await persistToFirestore(['suppliers', 'inventory', 'cashDrawerTransactions', 'auditLogs']);
    
    toast({ title: "Compra Registrada", description: `La compra de ${data.items.length} artículo(s) ha sido registrada.` });
    setIsRegisterPurchaseOpen(false);
  }, [toast]);
  
  const handleInventoryItemCreated = useCallback(async (itemData: InventoryItemFormValues): Promise<InventoryItem> => {
      const newId = `prod_${Date.now()}`;
      const newItem: InventoryItem = {
          id: newId,
          ...itemData,
          isService: itemData.isService || false,
          quantity: itemData.isService ? 0 : Number(itemData.quantity),
          lowStockThreshold: itemData.isService ? 0 : Number(itemData.lowStockThreshold),
          unitPrice: Number(itemData.unitPrice) || 0,
          sellingPrice: Number(itemData.sellingPrice) || 0,
      };
      
      placeholderInventory.push(newItem);
      await logAudit('Crear', `Creó el producto "${newItem.name}" (SKU: ${newItem.sku})`, {entityType: 'Producto', entityId: newId});
      await persistToFirestore(['inventory', 'auditLogs']);
      
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
            <ProductosContent inventoryItems={inventoryItems} />
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
        onInventoryItemCreated={handleInventoryItemCreated}
        categories={categories}
      />
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
