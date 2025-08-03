

"use client";

import { useState, useMemo, useEffect, useCallback, Suspense, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { PlusCircle, Printer } from "lucide-react";
import { InventoryItemDialog } from "./inventory-item-dialog";
import type { InventoryItem, InventoryCategory, Supplier, CashDrawerTransaction, PurchaseRecommendation, WorkshopInfo, SaleReceipt, ServiceRecord, PayableAccount } from '@/types'; 
import type { InventoryItemFormValues } from "./inventory-item-form";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RegisterPurchaseDialog } from './register-purchase-dialog';
import type { PurchaseFormValues } from './register-purchase-dialog';
import { InformeContent } from './informe-content';
import { ProductosContent } from './productos-content';
import { CategoriasContent } from './categorias-content';
import { ProveedoresContent } from '../../proveedores/components/proveedores-content';
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
import type { InventoryMovement } from '@/types';


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
  const [sales, setSales] = useState<SaleReceipt[]>([]);
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [payableAccounts, setPayableAccounts] = useState<PayableAccount[]>([]); 

  const [isRegisterPurchaseOpen, setIsRegisterPurchaseOpen] = useState(false);
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<InventoryItem> | null>(null);

  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const printContentRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    const unsubs: (() => void)[] = [];
    setIsLoading(true);
    
    unsubs.push(inventoryService.onItemsUpdate(setInventoryItems));
    unsubs.push(inventoryService.onCategoriesUpdate(setCategories));
    unsubs.push(operationsService.onSalesUpdate(setSales));
    unsubs.push(operationsService.onServicesUpdate(setServices));
    unsubs.push(inventoryService.onPayableAccountsUpdate(setPayableAccounts));
    unsubs.push(inventoryService.onSuppliersUpdate((data) => {
      setSuppliers(data);
      setIsLoading(false); // Mark loading as false after the last required dataset is fetched
    }));

    return () => unsubs.forEach(unsub => unsub());
  }, []);

  const inventoryMovements = useMemo((): InventoryMovement[] => {
      if (isLoading) return [];
      
      const inventoryMap = new Map(inventoryItems.map(item => [item.id, item]));

      const saleMovements: InventoryMovement[] = sales.flatMap(sale => 
        sale.items.map(item => {
          const invItem = inventoryMap.get(item.inventoryItemId);
          return {
            id: `${sale.id}-${item.inventoryItemId}`, date: sale.saleDate, type: 'Venta',
            relatedId: sale.id, itemName: item.itemName, quantity: item.quantity,
            unitCost: invItem?.unitPrice || 0, totalCost: item.quantity * (invItem?.unitPrice || 0),
          };
        })
      );
      
      const serviceMovements: InventoryMovement[] = services
        .filter(s => s.status === 'Completado' || s.status === 'Entregado')
        .flatMap(service => {
          const date = service.deliveryDateTime || service.serviceDate;
          if (!date) return [];
          return (service.serviceItems || []).flatMap(sItem => 
            (sItem.suppliesUsed || []).map(supply => {
              const invItem = inventoryMap.get(supply.supplyId);
              if (!invItem || invItem.isService) return null;
              return {
                id: `${service.id}-${supply.supplyId}-${sItem.id}`, date: date, type: 'Servicio',
                relatedId: service.id, itemName: supply.supplyName, quantity: supply.quantity,
                unitCost: invItem.unitPrice, totalCost: supply.quantity * invItem.unitPrice
              };
            }).filter(Boolean) as InventoryMovement[]
          );
      });
      
      const purchaseMovements: InventoryMovement[] = payableAccounts
        .filter(pa => pa.invoiceDate)
        .map(pa => ({
        id: pa.id, date: pa.invoiceDate, type: 'Compra',
        relatedId: pa.supplierName, itemName: `Factura ${pa.invoiceId}`, quantity: 1, // Simplified view for now
        unitCost: pa.totalAmount, totalCost: pa.totalAmount,
      }));

      return [...saleMovements, ...serviceMovements, ...purchaseMovements];
    }, [isLoading, sales, services, inventoryItems, payableAccounts]);
  
  const handlePrint = useCallback(() => {
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
    { value: "informe", label: "Entradas y Salidas" },
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
                onRegisterPurchaseClick={() => setIsRegisterPurchaseOpen(true)}
                movements={inventoryMovements}
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
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 no-print">
                <div className="flex-grow overflow-y-auto bg-muted/30 print:bg-white print:p-0">
                    <InventoryReportContent ref={printContentRef} items={inventoryItems} />
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
