
"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { withSuspense } from "@/lib/withSuspense";
import React, { useState, useMemo, useEffect, useCallback, Suspense, useRef, lazy } from 'react';
import { Button } from "@/components/ui/button";
import { PlusCircle, Printer, Car, AlertTriangle, Activity, CalendarX, DollarSign, Tags, Package, Edit, Trash2 } from "lucide-react";
import type { InventoryItem, InventoryCategory, Supplier, Vehicle, VehiclePriceList } from '@/types'; 
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from 'lucide-react';
import { inventoryService, purchaseService } from '@/lib/services';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { cn, capitalizeWords, formatCurrency } from "@/lib/utils";
import type { InventoryItemFormValues } from '@/schemas/inventory-item-form-schema';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TableToolbar } from '@/components/shared/table-toolbar';
import { useTableManager } from '@/hooks/useTableManager';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { differenceInMonths, isValid } from 'date-fns';
import { parseDate } from '@/lib/forms';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { PurchaseFormValues } from '@/app/(app)/inventario/components/register-purchase-dialog';


function PrintTicketDialogInner(props: any) {
  const router = useRouter();
  const sp = useSearchParams();

  const ticketId = sp.get("ticketId") ?? null;
  const tab = sp.get('tab');
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
  
  const handleItemUpdated = async (data: InventoryItemFormValues) => {
    if (!editingItem || !('id' in editingItem)) return;
    await inventoryService.saveItem(data, editingItem.id!);
    toast({ title: "Producto Actualizado" });
    setIsItemDialogOpen(false);
  };
  

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
  
  const handleSaveCategory = useCallback(async (name: string, id?: string) => {
    try {
      await inventoryService.saveCategory({ name }, id);
      toast({ title: `Categoría ${id ? 'Actualizada' : 'Agregada'}` });
    } catch (error) {
      console.error("Error saving category:", error);
      toast({ title: "Error al guardar", description: "No se pudo guardar la categoría.", variant: "destructive" });
    }
  }, [toast]);

  const handleDeleteCategory = useCallback(async (id: string) => {
    try {
      await inventoryService.deleteCategory(id);
      toast({ title: "Categoría Eliminada" });
    } catch (error) {
       console.error("Error deleting category:", error);
       toast({ title: "Error al eliminar", description: "No se pudo eliminar la categoría.", variant: "destructive" });
    }
  }, [toast]);


  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  const tabsConfig = [
    { value: "productos", label: "Productos y Servicios" },
    { value: "categorias", label: "Categorías" },
  ];

  return (
    <Suspense fallback={<div className="flex h-64 w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
        <>
        <div className="bg-primary text-primary-foreground rounded-lg p-6 mb-6">
            <h1 className="text-3xl font-bold tracking-tight">Mi Inventario</h1>
            <p className="text-primary-foreground/80 mt-1">Gestiona productos, proveedores, categorías y obtén análisis inteligentes.</p>
        </div>
        
        <DashboardCards 
          summaryData={inventorySummary}
          onNewItemClick={handleOpenItemDialog}
          onNewPurchaseClick={() => setIsRegisterPurchaseOpen(true)}
        />
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-6">
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
                      inventoryItems={inventoryItems}
                      onPrint={handlePrint}
                  />
              </Suspense>
            </TabsContent>
            <TabsContent value="categorias" className="mt-6">
              <Suspense fallback={<Loader2 className="animate-spin" />}>
                  <CategoriasContent 
                      categories={categories} 
                      inventoryItems={inventoryItems} 
                      onSaveCategory={handleSaveCategory}
                      onDeleteCategory={handleDeleteCategory}
                  />
              </Suspense>
            </TabsContent>
        </Tabs>
        
        <Suspense fallback={null}>
            {isRegisterPurchaseOpen && (
              <RegisterPurchaseDialog
                open={isRegisterPurchaseOpen}
                onOpenChange={setIsRegisterPurchaseOpen}
                suppliers={suppliers}
                inventoryItems={inventoryItems}
                onSave={handleSavePurchase}
                onInventoryItemCreated={handleInventoryItemCreatedFromPurchase}
                categories={categories}
              />
            )}

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
          <DialogContent className="max-w-4xl p-0 no-print">
            <div className="printable-content bg-white">
                <Suspense fallback={<div className="p-8 text-center"><Loader2 className="h-8 w-8 animate-spin"/></div>}>
                    <InventoryReportContent items={itemsToPrint} />
                </Suspense>
            </div>
            <DialogFooter className="p-4 border-t bg-background sm:justify-end no-print">
                <Button onClick={() => window.print()}>
                    <Printer className="mr-2 h-4 w-4" /> Imprimir
                </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </>
    </Suspense>
  );
}

export const PrintTicketDialog = withSuspense(PrintTicketDialogInner, null);
export default PrintTicketDialog;
