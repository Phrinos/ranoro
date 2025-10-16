

"use client";

import { withSuspense } from "@/lib/withSuspense";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import React, { useState, useMemo, useEffect, useCallback, Suspense, useRef, lazy } from "react";
import dynamic from 'next/dynamic'

import { Button } from "@/components/ui/button";
import {
  PlusCircle,
  Printer,
  Car,
  AlertTriangle,
  Activity,
  CalendarX,
  Loader2,
  DollarSign,
  Tags,
  Package,
  Edit,
  Trash2,
  Search,
} from "lucide-react";
import type {
  InventoryItem,
  InventoryCategory,
  Supplier,
  Vehicle,
} from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { inventoryService, purchaseService } from "@/lib/services";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn, capitalizeWords, formatCurrency } from "@/lib/utils";
import type { InventoryItemFormValues } from '@/schemas/inventory-item-form-schema';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import type { PurchaseFormValues } from './compras/components/register-purchase-dialog';
import { SortableTableHeader } from "@/components/shared/SortableTableHeader";

const RegisterPurchaseDialog = dynamic(() => import('./compras/components/register-purchase-dialog').then(module => ({ default: module.RegisterPurchaseDialog })));
const InventoryItemDialog = dynamic(() => import('./components/inventory-item-dialog').then(module => ({ default: module.InventoryItemDialog })));
const InventoryReportContent = dynamic(() => import('./components/inventory-report-content').then(module => ({ default: module.default })));

// ----- Sub-componente para Resumen -----
const DashboardCards: React.FC<{
  summaryData: any;
  onNewItemClick: () => void;
}> = ({ summaryData, onNewItemClick }) => (
  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-6">
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Valor del Inventario (Costo)</CardTitle><DollarSign className="h-4 w-4 text-muted-foreground"/></CardHeader>
      <CardContent><div className="text-2xl font-bold">{formatCurrency(summaryData.totalInventoryCost)}</div></CardContent>
    </Card>
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Productos / Servicios</CardTitle><Package className="h-4 w-4 text-muted-foreground"/></CardHeader>
      <CardContent><div className="text-2xl font-bold">{summaryData.productsCount} / {summaryData.servicesCount}</div></CardContent>
    </Card>
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Alertas de Stock Bajo</CardTitle><AlertTriangle className="h-4 w-4 text-orange-500"/></CardHeader>
      <CardContent><div className="text-2xl font-bold text-orange-600">{summaryData.lowStockItemsCount}</div></CardContent>
    </Card>
    <Card>
        <CardContent className="pt-6">
            <Button onClick={onNewItemClick} className="w-full">
                <PlusCircle className="mr-2 h-4 w-4" /> Nuevo Producto/Servicio
            </Button>
        </CardContent>
    </Card>
  </div>
);

// ----- Sub-componente para Tabla de Productos -----
const ProductosContent: React.FC<{
  inventoryItems: InventoryItem[];
  onPrint: (items: InventoryItem[]) => void;
  onEditItem: (item: InventoryItem) => void;
}> = ({ inventoryItems, onPrint, onEditItem }) => {
  const router = useRouter();

  const { paginatedData, fullFilteredData, ...tableManager } = useTableManager<InventoryItem>({
    initialData: inventoryItems,
    searchKeys: ['name', 'sku', 'brand', 'category'],
    initialSortOption: 'name_asc',
  });

  const handleSort = (key: string) => {
    const isAsc = tableManager.sortOption === `${key}_asc`;
    tableManager.onSortOptionChange(`${key}_${isAsc ? 'desc' : 'asc'}`);
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <TableToolbar
          {...tableManager}
          searchPlaceholder="Buscar por nombre, SKU, marca..."
          sortOptions={[
            { value: 'name_asc', label: 'Nombre (A-Z)' },
            { value: 'name_desc', label: 'Nombre (Z-A)' },
            { value: 'quantity_desc', label: 'Stock (Mayor a Menor)' },
            { value: 'quantity_asc', label: 'Stock (Menor a Mayor)' },
            { value: 'sellingPrice_desc', label: 'Precio (Mayor a Menor)' },
            { value: 'sellingPrice_asc', label: 'Precio (Menor a Mayor)' },
          ]}
          actions={
            <Button onClick={() => onPrint(fullFilteredData)} variant="outline" className="bg-white">
              <Printer className="mr-2 h-4 w-4" /> Exportar / Imprimir
            </Button>
          }
        />
        <div className="rounded-md border mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableTableHeader sortKey="name" label="Nombre" onSort={handleSort} currentSort={tableManager.sortOption} />
                <SortableTableHeader sortKey="quantity" label="Stock" onSort={handleSort} currentSort={tableManager.sortOption} />
                <SortableTableHeader sortKey="unitPrice" label="Costo" onSort={handleSort} currentSort={tableManager.sortOption} className="text-right" />
                <SortableTableHeader sortKey="sellingPrice" label="Precio Venta" onSort={handleSort} currentSort={tableManager.sortOption} className="text-right" />
                <SortableTableHeader sortKey="category" label="Categoría" onSort={handleSort} currentSort={tableManager.sortOption} />
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map(item => (
                <TableRow key={item.id} onClick={() => onEditItem(item)} className="cursor-pointer">
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>
                    {item.isService ? (
                      <Badge variant="secondary">Servicio</Badge>
                    ) : (
                      <span className={cn(
                        (item.quantity || 0) <= (item.lowStockThreshold || 0) && "text-destructive font-bold"
                      )}>
                        {item.quantity}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.sellingPrice)}</TableCell>
                  <TableCell>{item.category}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-between pt-4">
            <p className="text-sm text-muted-foreground">{tableManager.paginationSummary}</p>
            <div className="flex items-center space-x-2">
                <Button size="sm" onClick={tableManager.goToPreviousPage} disabled={!tableManager.canGoPrevious} variant="outline" className="bg-card">
                    <ChevronLeft className="h-4 w-4" /> Anterior
                </Button>
                <Button size="sm" onClick={tableManager.goToNextPage} disabled={!tableManager.canGoNext} variant="outline" className="bg-card">
                    Siguiente <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ----- Sub-componente para Categorías -----
const CategoriasContent: React.FC<{ 
  categories: InventoryCategory[], 
  inventoryItems: InventoryItem[],
  onSaveCategory: (name: string, id?: string) => Promise<void>,
  onDeleteCategory: (id: string) => Promise<void>,
}> = ({ categories, inventoryItems, onSaveCategory, onDeleteCategory }) => {
    const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<InventoryCategory | null>(null);
    const [categoryName, setCategoryName] = useState('');

    const itemsPerCategory = useMemo(() => {
        return categories.map(cat => ({
            ...cat,
            count: inventoryItems.filter(item => item.category === cat.name).length
        }));
    }, [categories, inventoryItems]);

    const handleOpenDialog = (category: InventoryCategory | null = null) => {
        setEditingCategory(category);
        setCategoryName(category ? category.name : '');
        setIsCategoryDialogOpen(true);
    };

    const handleSave = async () => {
        await onSaveCategory(categoryName, editingCategory?.id);
        setIsCategoryDialogOpen(false);
    };

    return (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
              <div className="space-y-1.5">
                 <CardTitle>Categorías de Inventario</CardTitle>
                 <CardDescription>Organiza tus productos y servicios en categorías.</CardDescription>
              </div>
              <Button onClick={() => handleOpenDialog()}><PlusCircle className="mr-2 h-4 w-4"/>Nueva Categoría</Button>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Productos/Servicios</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {itemsPerCategory.map(cat => (
                        <TableRow key={cat.id}>
                            <TableCell className="font-medium">{cat.name}</TableCell>
                            <TableCell>{cat.count}</TableCell>
                            <TableCell className="text-right">
                                <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(cat)}><Edit className="h-4 w-4"/></Button>
                                <ConfirmDialog
                                    triggerButton={<Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive"/></Button>}
                                    title={`¿Eliminar categoría "${cat.name}"?`}
                                    description="Esta acción no se puede deshacer."
                                    onConfirm={() => onDeleteCategory(cat.id)}
                                />
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
          <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingCategory ? 'Editar' : 'Nueva'} Categoría</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                  <Label htmlFor="category-name">Nombre</Label>
                  <Input id="category-name" value={categoryName} onChange={e => setCategoryName(capitalizeWords(e.target.value))} />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCategoryDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleSave}>Guardar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </Card>
    );
};


function PageInner() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const tab = sp.get('tab');
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState(tab || 'productos');

  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isRegisterPurchaseOpen, setIsRegisterPurchaseOpen] = useState(false);
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] =
    useState<Partial<InventoryItem> | null>(null);

  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [itemsToPrint, setItemsToPrint] = useState<InventoryItem[]>([]);
  
  const sortedSuppliers = React.useMemo(() => 
    [...suppliers].sort((a, b) => a.name.localeCompare(b.name)),
  [suppliers]);
  

  useEffect(() => {
    const unsubs: (() => void)[] = [];
    setIsLoading(true);
    
    unsubs.push(inventoryService.onItemsUpdate(setInventoryItems));
    unsubs.push(inventoryService.onCategoriesUpdate(setCategories));
    unsubs.push(
      inventoryService.onSuppliersUpdate((data) => {
        setSuppliers(data);
        setIsLoading(false); 
      })
    );

    return () => unsubs.forEach((unsub) => unsub());
  }, []);

  const inventorySummary = useMemo(() => {
    let cost = 0, sellingPriceValue = 0, lowStock = 0, products = 0, services = 0;
    inventoryItems.forEach((item) => {
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


  const handleOpenItemDialog = useCallback((item: InventoryItem | null = null) => {
    setEditingItem(item);
    setIsItemDialogOpen(true);
  }, []);
  
  const handleItemUpdated = async (data: InventoryItemFormValues) => {
    if (!editingItem || !('id' in editingItem)) return;
    await inventoryService.saveItem(data, editingItem.id!);
    toast({ title: "Producto Actualizado" });
    setIsItemDialogOpen(false);
  };
  

  const handleSavePurchase = useCallback(
    async (data: PurchaseFormValues) => {
      await purchaseService.registerPurchase(data);
      toast({
        title: "Compra Registrada",
        description: `La compra de ${data.items.length} artículo(s) ha sido registrada.`,
      });
      setIsRegisterPurchaseOpen(false);
    },
    [toast]
  );
  
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
  
  const handleSaveCategory = useCallback(
    async (name: string, id?: string) => {
      try {
        await inventoryService.saveCategory({ name }, id);
        toast({ title: `Categoría ${id ? 'Actualizada' : 'Agregada'}` });
      } catch (error) {
        console.error("Error saving category:", error);
        toast({
          title: "Error al guardar",
          description: "No se pudo guardar la categoría.",
          variant: "destructive",
        });
      }
    },
    [toast]
  );

  const handleDeleteCategory = useCallback(
    async (id: string) => {
      try {
        await inventoryService.deleteCategory(id);
        toast({ title: "Categoría Eliminada" });
      } catch (error) {
       console.error("Error deleting category:", error);
       toast({
         title: "Error al eliminar",
         description: "No se pudo eliminar la categoría.",
         variant: "destructive",
       });
      }
    },
    [toast]
  );


  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
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
          onNewItemClick={() => handleOpenItemDialog()}
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
                      onEditItem={handleOpenItemDialog}
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
              suppliers={sortedSuppliers}
              inventoryItems={inventoryItems}
              onSave={handleSavePurchase}
              onInventoryItemCreated={handleInventoryItemCreatedFromPurchase}
              categories={categories}
            />
          )}

          <InventoryItemDialog
            open={isItemDialogOpen}
            onOpenChange={setIsItemDialogOpen}
            onSave={editingItem ? handleItemUpdated : handleSaveItem}
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

export default withSuspense(PageInner, null);
