// src/app/(app)/inventario/page.tsx

"use client";

import React, { useState, useMemo, useEffect, useCallback, Suspense, useRef, lazy } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { PlusCircle, Printer, Car, AlertTriangle, Activity, CalendarX, DollarSign, Tags, Package, Edit, Trash2, ArrowUpDown } from "lucide-react";
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
import type { PurchaseFormValues } from './components/register-purchase-dialog';

// Lazy load dialogs that are not immediately visible
const RegisterPurchaseDialog = lazy(() => import('./components/register-purchase-dialog').then(module => ({ default: module.RegisterPurchaseDialog })));
const InventoryItemDialog = lazy(() => import('./components/inventory-item-dialog').then(module => ({ default: module.InventoryItemDialog })));
const InventoryReportContent = lazy(() => import('./components/inventory-report-content').then(module => ({ default: module.InventoryReportContent })));


// --- DashboardCards Component Logic (Integrated) ---
const DashboardCards = ({ summaryData, onNewItemClick, onNewPurchaseClick }: { summaryData: any, onNewItemClick: () => void, onNewPurchaseClick: () => void }) => {
  return (
    <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <Card className="xl:col-span-1"><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Costo Total del Inventario</CardTitle><DollarSign className="h-4 w-4 text-green-500" /></CardHeader><CardContent><div className="text-2xl font-bold">{formatCurrency(summaryData.totalInventoryCost)}</div><p className="text-xs text-muted-foreground">Valor de venta: {formatCurrency(summaryData.totalInventorySellingPrice)}</p></CardContent></Card>
        <Card className="xl:col-span-1"><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Productos con Stock Bajo</CardTitle><AlertTriangle className="h-4 w-4 text-orange-500" /></CardHeader><CardContent><div className="text-2xl font-bold">{summaryData.lowStockItemsCount}</div><p className="text-xs text-muted-foreground">Requieren atención o reposición.</p></CardContent></Card>
        <Card className="xl:col-span-1"><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Ítems Registrados</CardTitle><Package className="h-4 w-4 text-blue-500" /></CardHeader><CardContent><div className="text-2xl font-bold">{summaryData.productsCount + summaryData.servicesCount}</div><p className="text-xs text-muted-foreground">{summaryData.productsCount} Productos y {summaryData.servicesCount} Servicios.</p></CardContent></Card>
        <div className="lg:col-span-2 xl:col-span-2 flex flex-col sm:flex-row gap-2">
            <Button variant="outline" className="w-full flex-1 bg-white border-red-500 text-black hover:bg-red-50" onClick={onNewItemClick}>
                <PlusCircle className="mr-2 h-5 w-5 text-red-500" /> Registrar Ítem
            </Button>
            <Button variant="outline" className="w-full flex-1 bg-white border-red-500 text-black font-bold hover:bg-red-50" onClick={onNewPurchaseClick} >
                <PlusCircle className="mr-2 h-5 w-5 text-red-500" /> Registrar Compra
            </Button>
        </div>
    </div>
  );
};


// --- ProductosContent Component Logic (Integrated) ---
const itemSortOptions = [
    { value: 'default_order', label: 'Orden Personalizado' },
    { value: 'name_asc', label: 'Nombre (A-Z)' },
    { value: 'name_desc', label: 'Nombre (Z-A)' },
    { value: 'category_asc', label: 'Categoría (A-Z)' },
    { value: 'isService_asc', label: 'Tipo (Producto/Servicio)' },
    { value: 'quantity_asc', label: 'Stock (Menor a Mayor)' },
    { value: 'quantity_desc', label: 'Stock (Mayor a Menor)' },
    { value: 'unitPrice_asc', label: 'Costo (Menor a Mayor)' },
    { value: 'unitPrice_desc', label: 'Costo (Mayor a Menor)' },
    { value: 'sellingPrice_asc', label: 'Precio Venta (Menor a Mayor)' },
    { value: 'sellingPrice_desc', label: 'Precio Venta (Mayor a Menor)' },
];


const getSortPriority = (item: InventoryItem) => {
    if (item.isService) return 3;
    if (item.quantity <= item.lowStockThreshold) return 1;
    return 2;
};

const ProductosContent = ({ inventoryItems, onPrint, onNewItemFromSearch }: { 
    inventoryItems: InventoryItem[], 
    onPrint: (items: InventoryItem[]) => void,
    onNewItemFromSearch: (name: string) => void,
}) => {
  const router = useRouter();

  const { filteredData, ...tableManager } = useTableManager<InventoryItem>({
      initialData: inventoryItems,
      searchKeys: ['name', 'sku', 'brand', 'category'],
      dateFilterKey: '', // No date filter needed for inventory items
      initialSortOption: 'default_order',
      itemsPerPage: 100
  });

  const customSortedItems = React.useMemo(() => {
    const items = [...tableManager.fullFilteredData];
    if (tableManager.sortOption === 'default_order') {
        return items.sort((a, b) => {
            const priorityA = getSortPriority(a);
            const priorityB = getSortPriority(b);
            if (priorityA !== priorityB) {
                return priorityA - priorityB;
            }
            return a.name.localeCompare(b.name);
        });
    }
    return items;
  }, [tableManager.fullFilteredData, tableManager.sortOption]);

  const handleSort = (column: keyof InventoryItem | 'default_order') => {
    if (column === 'default_order') {
      tableManager.onSortOptionChange('default_order');
      return;
    }
    const currentSort = tableManager.sortOption;
    const isAsc = currentSort === `${String(column)}_asc`;
    tableManager.onSortOptionChange(isAsc ? `${String(column)}_desc` : `${String(column)}_asc`);
  };

  const renderSortArrow = (column: keyof InventoryItem | 'default_order') => {
    const { sortOption } = tableManager;
    if (sortOption.startsWith(String(column))) {
      return sortOption.endsWith('_asc') ? '▲' : '▼';
    }
    return null;
  };


  return (
    <div className="space-y-4">
      <TableToolbar
          {...tableManager}
          onSearchTermChange={tableManager.onSearchTermChange}
          onSortOptionChange={tableManager.onSortOptionChange}
          searchPlaceholder="Buscar por nombre, SKU, marca..."
          actions={<Button onClick={() => onPrint(customSortedItems)} variant="outline" size="sm"><Printer className="mr-2 h-4 w-4" />Imprimir Lista</Button>}
      />

      <Card>
        <CardContent className="pt-6">
          <div className="rounded-md border">
            <Table>
              <TableHeader className="bg-black text-white">
                <TableRow>
                    <TableHead className="text-white hover:bg-gray-700 cursor-pointer" onClick={() => handleSort('name')}><Button variant="ghost" className="text-white p-2">Nombre {renderSortArrow('name')}</Button></TableHead>
                    <TableHead className="text-white hidden md:table-cell hover:bg-gray-700 cursor-pointer" onClick={() => handleSort('category')}><Button variant="ghost" className="text-white p-2">Categoría {renderSortArrow('category')}</Button></TableHead>
                    <TableHead className="text-white hidden lg:table-cell">Proveedor</TableHead>
                    <TableHead className="text-white hover:bg-gray-700 cursor-pointer" onClick={() => handleSort('isService')}><Button variant="ghost" className="text-white p-2">Tipo {renderSortArrow('isService')}</Button></TableHead>
                    <TableHead className="text-right text-white hover:bg-gray-700 cursor-pointer" onClick={() => handleSort('quantity')}><Button variant="ghost" className="text-white p-2">Stock {renderSortArrow('quantity')}</Button></TableHead>
                    <TableHead className="text-right text-white hover:bg-gray-700 cursor-pointer" onClick={() => handleSort('unitPrice')}><Button variant="ghost" className="text-white p-2">Costo {renderSortArrow('unitPrice')}</Button></TableHead>
                    <TableHead className="text-right text-white hover:bg-gray-700 cursor-pointer" onClick={() => handleSort('sellingPrice')}><Button variant="ghost" className="text-white p-2">Precio Venta {renderSortArrow('sellingPrice')}</Button></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customSortedItems.length > 0 ? (
                  customSortedItems.map(item => {
                    const isLowStock = !item.isService && item.quantity <= item.lowStockThreshold;
                    return (
                        <TableRow key={item.id} onClick={() => router.push(`/inventario/${item.id}`)} className="cursor-pointer hover:bg-muted/50">
                            <TableCell className="font-medium">
                                <p className={cn(isLowStock && "text-orange-600 font-bold")}>{item.name}</p>
                                <p className="text-xs text-muted-foreground">{item.brand} ({item.sku || 'N/A'})</p>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">{item.category}</TableCell>
                            <TableCell className="hidden lg:table-cell">{item.supplier}</TableCell>
                            <TableCell><Badge variant={item.isService ? "outline" : "secondary"}>{item.isService ? 'Servicio' : 'Producto'}</Badge></TableCell>
                            <TableCell className={cn("text-right font-semibold", isLowStock && "text-orange-600")}>{item.isService ? 'N/A' : item.quantity}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                            <TableCell className="text-right font-bold text-primary">{formatCurrency(item.sellingPrice)}</TableCell>
                        </TableRow>
                    )
                  })
                ) : (
                    <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center">
                          {tableManager.searchTerm ? (
                            <Button variant="link" onClick={() => onNewItemFromSearch(tableManager.searchTerm)}>
                              <PlusCircle className="mr-2 h-4 w-4" />
                              Registrar nuevo ítem: "{tableManager.searchTerm}"
                            </Button>
                          ) : (
                            "No se encontraron productos o servicios."
                          )}
                        </TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};


// --- CategoriasContent Component Logic (Integrated) ---
const CategoriasContent = ({ categories, inventoryItems, onSaveCategory, onDeleteCategory }: { categories: InventoryCategory[], inventoryItems: InventoryItem[], onSaveCategory: (name: string, id?: string) => void, onDeleteCategory: (id: string) => void }) => {
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<InventoryCategory | null>(null);
  const [currentCategoryName, setCurrentCategoryName] = useState('');
  const { toast } = useToast();

  const itemsPerCategory = useMemo(() => {
    return categories.reduce((acc, category) => {
        acc[category.name] = inventoryItems.filter(item => item.category === category.name).length;
        return acc;
    }, {} as Record<string, number>);
  }, [categories, inventoryItems]);

  const handleOpenDialog = (category: InventoryCategory | null = null) => {
    setEditingCategory(category);
    setCurrentCategoryName(category ? category.name : '');
    setIsCategoryDialogOpen(true);
  };
  
  const handleSave = () => {
    const trimmedName = currentCategoryName.trim();
    if (!trimmedName) {
      toast({ title: "Nombre inválido", variant: "destructive" });
      return;
    }
    onSaveCategory(trimmedName, editingCategory?.id);
    setIsCategoryDialogOpen(false);
  };
  
  return (
    <div className="space-y-4">
        <div className="flex justify-end">
            <Button onClick={() => handleOpenDialog()}><PlusCircle className="mr-2 h-4 w-4" />Nueva Categoría</Button>
        </div>
        <Card>
            <CardContent className="pt-6">
                <div className="rounded-md border">
                    <Table>
                        <TableHeader><TableRow><TableHead>Nombre de Categoría</TableHead><TableHead className="text-right"># de Productos</TableHead><TableHead className="text-right w-[100px]">Acciones</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {categories.map(cat => (
                                <TableRow key={cat.id}>
                                    <TableCell className="font-medium">{cat.name}</TableCell>
                                    <TableCell className="text-right">{itemsPerCategory[cat.name] || 0}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(cat)}><Edit className="h-4 w-4"/></Button>
                                        <ConfirmDialog
                                            triggerButton={<Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive"/></Button>}
                                            title={`¿Eliminar categoría "${cat.name}"?`}
                                            description="Esta acción no se puede deshacer. Los productos de esta categoría no serán eliminados pero quedarán sin categoría."
                                            onConfirm={() => onDeleteCategory(cat.id)}
                                        />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
        <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{editingCategory ? 'Editar' : 'Nueva'} Categoría</DialogTitle>
                    <DialogDescription>Gestiona las categorías para organizar tu inventario.</DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-2">
                    <Label htmlFor="category-name">Nombre de la Categoría</Label>
                    <Input id="category-name" value={currentCategoryName} onChange={e => setCurrentCategoryName(capitalizeWords(e.target.value))} />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCategoryDialogOpen(false)}>Cancelar</Button>
                    <Button onClick={handleSave}>Guardar Categoría</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  );
};


// Main Page Component
export default function InventarioPage() {
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab');
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


  const handleOpenItemDialog = useCallback((initialValues?: Partial<InventoryItem>) => {
    setEditingItem(initialValues || null);
    setIsItemDialogOpen(true);
  }, []);
  
  const handleNewItemFromSearch = useCallback((name: string) => {
    handleOpenItemDialog({ name: capitalizeWords(name) });
  }, [handleOpenItemDialog]);
  
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
    const idToSave = editingItem?.id;
    await inventoryService.saveItem(itemData, idToSave);
    toast({ title: `Ítem ${idToSave ? 'Actualizado' : 'Creado'}` });
    setIsItemDialogOpen(false);
    setEditingItem(null);
  }, [toast, editingItem]);
  
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
                      onNewItemFromSearch={handleNewItemFromSearch}
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
