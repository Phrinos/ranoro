
"use client";

import { useState, useMemo, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { InventoryItemDialog } from "./components/inventory-item-dialog";
import { hydrateReady } from "@/lib/placeholder-data";
import type { InventoryItem, InventoryCategory, Supplier, User, CashDrawerTransaction, PurchaseRecommendation } from "@/types";
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

import { inventoryService } from '@/lib/services/inventory.service';
import { operationsService } from '@/lib/services/operations.service';


function InventarioPageComponent() {
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'informe';

  // ======== SHARED STATE ========
  const { toast } = useToast();
  const [version, setVersion] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [activeTab, setActiveTab] = useState(defaultTab);
  
  // ======== DATA STATE ========
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  // ======== HYDRATION & SYNC ========
  useEffect(() => {
    const loadData = async () => {
        await hydrateReady;
        setInventoryItems(await inventoryService.getItems());
        setCategories(await inventoryService.getCategories());
        setSuppliers(await inventoryService.getSuppliers());
        setHydrated(true);
    };

    const handleDbUpdate = async () => {
        setVersion(v => v + 1);
        setInventoryItems(await inventoryService.getItems());
        setCategories(await inventoryService.getCategories());
        setSuppliers(await inventoryService.getSuppliers());
    };
    
    loadData();

    window.addEventListener('databaseUpdated', handleDbUpdate);
    return () => window.removeEventListener('databaseUpdated', handleDbUpdate);
  }, []);

  // ======== NEW PURCHASE FLOW ========
  const [isRegisterPurchaseOpen, setIsRegisterPurchaseOpen] = useState(false);

  const handleSavePurchase = useCallback(async (data: PurchaseFormValues) => {
    await inventoryService.registerPurchase(data);
    toast({ title: "Compra Registrada", description: `La compra al proveedor ha sido registrada con éxito.` });
    setIsRegisterPurchaseOpen(false);
  }, [toast]);
  
  const handleInventoryItemCreated = useCallback(async (itemData: InventoryItemFormValues): Promise<InventoryItem> => {
      const newItem = await inventoryService.addItem(itemData);
      toast({ title: "Producto Creado", description: `"${newItem.name}" ha sido agregado al inventario.` });
      return newItem;
  }, [toast]);


  if (!hydrated) {
    return <div className="text-center py-10">Cargando datos del inventario...</div>;
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
