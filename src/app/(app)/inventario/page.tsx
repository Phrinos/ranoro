
"use client";

import { withSuspense } from "@/lib/withSuspense";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import React, { useState, useMemo, useEffect, useCallback, Suspense } from "react";
import dynamic from 'next/dynamic';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  PlusCircle, Printer, AlertTriangle, Loader2, DollarSign, Tags,
  Package, Edit, Trash2, Search, ChevronLeft, ChevronRight, X,
  TrendingUp, Layers, ShoppingCart,
} from "lucide-react";
import type { InventoryItem, InventoryCategory, Supplier } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { inventoryService, purchaseService } from "@/lib/services";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { cn, capitalizeWords, formatCurrency } from "@/lib/utils";
import type { InventoryItemFormValues } from '@/schemas/inventory-item-form-schema';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge as BadgeUI } from "@/components/ui/badge";
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Label } from '@/components/ui/label';
import { parseDate } from '@/lib/forms';
import type { PurchaseFormValues } from './compras/components/register-purchase-dialog';
import { SortableTableHeader } from "@/components/shared/SortableTableHeader";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { usePermissions } from "@/hooks/usePermissions";

const RegisterPurchaseDialog = dynamic(() => import('./compras/components/register-purchase-dialog').then(m => ({ default: m.RegisterPurchaseDialog })));
const InventoryItemDialog = dynamic(() => import('./components/inventory-item-dialog').then(m => ({ default: m.InventoryItemDialog })));
import { InventoryPrintPreview } from './components/InventoryPrintPreview';

const MIN_SEARCH = 6;

type QuickFilter = 'all' | 'bajo-stock' | 'sin-stock' | 'servicios' | 'productos';

const QUICK_FILTERS: { id: QuickFilter; label: string }[] = [
  { id: 'all',        label: 'Todos' },
  { id: 'productos',  label: 'Solo Productos' },
  { id: 'servicios',  label: 'Solo Servicios' },
  { id: 'bajo-stock', label: '⚠ Stock Bajo' },
  { id: 'sin-stock',  label: '🚫 Sin Stock' },
];

// ── Productos Tab ──────────────────────────────────────────────────────────────
const ProductosContent: React.FC<{
  inventoryItems: InventoryItem[];
  categories: InventoryCategory[];
  onPrint: (items: InventoryItem[]) => void;
  onEditItem: (item: InventoryItem) => void;
  onDeleteItem: (id: string) => void;
  onNewItem: () => void;
}> = ({ inventoryItems, categories, onPrint, onEditItem, onDeleteItem, onNewItem }) => {
  const router = useRouter();
  const userPermissions = usePermissions();

  const [searchTerm, setSearchTerm] = useState('');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [sortKey, setSortKey] = useState('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 25;

  const isSearchActive = searchTerm.trim().length >= MIN_SEARCH;

  useEffect(() => setPage(1), [searchTerm, quickFilter, filterCategory, sortKey, sortDir]);

  const filteredItems = useMemo(() => {
    let data = [...inventoryItems];

    // Quick filter
    if (quickFilter !== 'all') {
      data = data.filter(item => {
        switch (quickFilter) {
          case 'productos':  return !item.isService;
          case 'servicios':  return item.isService;
          case 'bajo-stock': return !item.isService && (item.quantity ?? 0) > 0 && (item.quantity ?? 0) <= (item.lowStockThreshold ?? 5);
          case 'sin-stock':  return !item.isService && (item.quantity ?? 0) === 0;
        }
        return true;
      });
    }

    // Category filter
    if (filterCategory !== 'all') data = data.filter(i => i.category === filterCategory);

    // Text search (6 chars min)
    if (isSearchActive) {
      const q = searchTerm.trim().toLowerCase();
      data = data.filter(i =>
        [i.name, i.sku, i.brand, i.category].some(f => (f ?? '').toLowerCase().includes(q))
      );
    }

    // Sort
    return data.sort((a, b) => {
      let va: any = (a as any)[sortKey] ?? '';
      let vb: any = (b as any)[sortKey] ?? '';
      if (typeof va === 'number') return sortDir === 'asc' ? va - vb : vb - va;
      return sortDir === 'asc'
        ? String(va).localeCompare(String(vb), 'es', { sensitivity: 'base' })
        : String(vb).localeCompare(String(va), 'es', { sensitivity: 'base' });
    });
  }, [inventoryItems, quickFilter, filterCategory, isSearchActive, searchTerm, sortKey, sortDir]);

  const totalPages = Math.ceil(filteredItems.length / PAGE_SIZE);
  const pageData = filteredItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // KPIs — reactive to ACTIVE filters
  const kpis = useMemo(() => {
    const total = filteredItems.length;
    const productos = filteredItems.filter(i => !i.isService).length;
    const servicios = filteredItems.filter(i => i.isService).length;
    const bajoStock = filteredItems.filter(i => !i.isService && (i.quantity ?? 0) > 0 && (i.quantity ?? 0) <= (i.lowStockThreshold ?? 5)).length;
    const sinStock = filteredItems.filter(i => !i.isService && (i.quantity ?? 0) === 0).length;
    const valorCosto = filteredItems.filter(i => !i.isService).reduce((s, i) => s + (i.quantity ?? 0) * (i.unitPrice ?? 0), 0);
    return { total, productos, servicios, bajoStock, sinStock, valorCosto };
  }, [filteredItems]);

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const stockBadge = (item: InventoryItem) => {
    if (item.isService) return <Badge variant="secondary" className="text-[10px]">Servicio</Badge>;
    const qty = item.quantity ?? 0;
    const threshold = item.lowStockThreshold ?? 5;
    if (qty === 0) return <span className="text-[11px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">Sin stock</span>;
    if (qty <= threshold) return <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">{qty} ⚠</span>;
    return <span className="text-sm font-semibold text-green-700">{qty}</span>;
  };

  return (
    <div className="space-y-5">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total en vista', value: kpis.total, icon: Package, cls: 'text-foreground', onClick: () => setQuickFilter('all') },
          { label: 'Productos', value: kpis.productos, icon: ShoppingCart, cls: 'text-blue-600', onClick: () => setQuickFilter('productos') },
          { label: 'Servicios', value: kpis.servicios, icon: Tags, cls: 'text-purple-600', onClick: () => setQuickFilter('servicios') },
          { label: 'Stock bajo', value: kpis.bajoStock, icon: AlertTriangle, cls: 'text-amber-600', onClick: () => setQuickFilter('bajo-stock') },
          { label: 'Sin stock', value: kpis.sinStock, icon: Layers, cls: 'text-red-600', onClick: () => setQuickFilter('sin-stock') },
          { label: 'Valor Costo', value: formatCurrency(kpis.valorCosto), isText: true, icon: DollarSign, cls: 'text-green-600', onClick: () => {} },
        ].map(({ label, value, isText, icon: Icon, cls, onClick }) => (
          <Card key={label} className="cursor-pointer hover:border-primary/40 hover:shadow-md transition-all" onClick={onClick}>
            <CardContent className="p-3 flex items-center gap-2">
              <Icon className={cn("h-5 w-5 shrink-0", cls)} />
              <div className="min-w-0">
                <p className={cn("font-extrabold leading-tight truncate", isText ? "text-base" : "text-xl", cls)}>{value}</p>
                <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search + Filters */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder={`Buscar nombre, SKU, marca… (mín. ${MIN_SEARCH} chars)`}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="h-10 pl-9 pr-8 bg-white"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {!isSearchActive && searchTerm.length > 0 && (
            <p className="text-xs text-amber-600 font-medium">Escribe al menos {MIN_SEARCH} caracteres</p>
          )}

          <div className="flex gap-2 ml-auto items-center">
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="h-10 w-[160px] bg-white text-sm">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {categories.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={() => onPrint(filteredItems)} variant="outline" className="h-10 bg-white shrink-0 gap-2">
              <Printer className="h-4 w-4" /> Imprimir
            </Button>
            {userPermissions.has('inventory:create') && (
              <Button className="h-10 shrink-0" onClick={onNewItem}>
                <PlusCircle className="mr-2 h-4 w-4" /> Nuevo
              </Button>
            )}
          </div>
        </div>

        {/* Quick filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide shrink-0">Vista rápida:</span>
          {QUICK_FILTERS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setQuickFilter(id)}
              className={cn(
                "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-all",
                quickFilter === id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "text-muted-foreground border-border bg-card hover:bg-muted"
              )}
            >
              {label}
            </button>
          ))}
          {(quickFilter !== 'all' || filterCategory !== 'all') && (
            <button
              onClick={() => { setQuickFilter('all'); setFilterCategory('all'); }}
              className="text-xs text-primary underline hover:no-underline ml-1"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Pagination summary */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
          Mostrando {pageData.length > 0 ? (page - 1) * PAGE_SIZE + 1 : 0}–{Math.min(page * PAGE_SIZE, filteredItems.length)} de {filteredItems.length}
        </p>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} variant="outline" className="bg-card">
            <ChevronLeft className="h-4 w-4" /> Anterior
          </Button>
          <span className="text-xs text-muted-foreground">{page}/{Math.max(1, totalPages)}</span>
          <Button size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} variant="outline" className="bg-card">
            Siguiente <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-black hover:bg-black">
                <SortableTableHeader sortKey="name" label="Nombre" onSort={handleSort} currentSort={`${sortKey}_${sortDir}`} textClassName="text-white" />
                <SortableTableHeader sortKey="sku" label="SKU / Marca" onSort={handleSort} currentSort={`${sortKey}_${sortDir}`} textClassName="text-white" className="hidden sm:table-cell" />
                <SortableTableHeader sortKey="quantity" label="Stock" onSort={handleSort} currentSort={`${sortKey}_${sortDir}`} textClassName="text-white" />
                <SortableTableHeader sortKey="unitPrice" label="Costo" onSort={handleSort} currentSort={`${sortKey}_${sortDir}`} className="text-right" textClassName="text-white" />
                <SortableTableHeader sortKey="sellingPrice" label="P. Venta" onSort={handleSort} currentSort={`${sortKey}_${sortDir}`} className="text-right" textClassName="text-white" />
                <SortableTableHeader sortKey="category" label="Categoría" onSort={handleSort} currentSort={`${sortKey}_${sortDir}`} textClassName="text-white" className="hidden md:table-cell" />
                <TableHead className="text-white text-center w-[80px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageData.length > 0 ? (
                pageData.map(item => (
                  <TableRow
                    key={item.id}
                    onClick={() => router.push(`/inventario/${item.id}`)}
                    className={cn(
                      "cursor-pointer hover:bg-muted/40 transition-colors",
                      !item.isService && (item.quantity ?? 0) === 0 && "bg-red-50/60 dark:bg-red-950/20"
                    )}
                  >
                    <TableCell className="font-medium">
                      <div>
                        <span>{item.name}</span>
                        {item.isService && <Badge variant="secondary" className="ml-2 text-[10px]">Servicio</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                      {item.sku && <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{item.sku}</span>}
                      {item.brand && <span className="ml-1">{item.brand}</span>}
                      {!item.sku && !item.brand && '—'}
                    </TableCell>
                    <TableCell>{stockBadge(item)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(item.unitPrice)}</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold text-green-700">{formatCurrency(item.sellingPrice)}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground text-sm">{item.category || '—'}</TableCell>
                    <TableCell className="text-center" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-0.5">
                        {userPermissions.has('inventory:edit') && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={e => { e.stopPropagation(); onEditItem(item); }}>
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {userPermissions.has('inventory:delete') && (
                          <ConfirmDialog
                            triggerButton={
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                              </Button>
                            }
                            title={`¿Eliminar "${item.name}"?`}
                            description="Esta acción es permanente y no se puede deshacer."
                            onConfirm={() => onDeleteItem(item.id)}
                          />
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <Package className="h-8 w-8 opacity-20" />
                      <p className="text-sm">
                        {isSearchActive || quickFilter !== 'all' || filterCategory !== 'all'
                          ? 'No hay productos con los filtros aplicados'
                          : 'No hay productos en el inventario'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

// ── Categorías Tab ─────────────────────────────────────────────────────────────
const CategoriasContent: React.FC<{
  categories: InventoryCategory[];
  inventoryItems: InventoryItem[];
  onSaveCategory: (name: string, id?: string) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
}> = ({ categories, inventoryItems, onSaveCategory, onDeleteCategory }) => {
  const userPermissions = usePermissions();
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<InventoryCategory | null>(null);
  const [categoryName, setCategoryName] = useState('');

  const itemsPerCategory = useMemo(() =>
    categories.map(cat => ({
      ...cat,
      count: inventoryItems.filter(item => item.category === cat.name).length
    })),
  [categories, inventoryItems]);

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
        {userPermissions.has('inventory:manage_categories') && (
          <Button onClick={() => handleOpenDialog()}>
            <PlusCircle className="mr-2 h-4 w-4" /> Nueva Categoría
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-black hover:bg-black">
                <TableHead className="text-white">Nombre</TableHead>
                <TableHead className="text-white">Productos / Servicios</TableHead>
                <TableHead className="text-right w-[100px] text-white">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {itemsPerCategory.map(cat => (
                <TableRow key={cat.id}>
                  <TableCell className="font-medium">{cat.name}</TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">{cat.count} ítem{cat.count !== 1 ? 's' : ''}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    {userPermissions.has('inventory:manage_categories') && (
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(cat)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <ConfirmDialog
                          triggerButton={
                            <Button variant="ghost" size="icon">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          }
                          title={`¿Eliminar categoría "${cat.name}"?`}
                          description="Los productos existentes con esta categoría no serán afectados."
                          onConfirm={() => onDeleteCategory(cat.id)}
                        />
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {itemsPerCategory.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">No hay categorías creadas.</TableCell>
                </TableRow>
              )}
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
            <Label htmlFor="cat-name">Nombre</Label>
            <Input id="cat-name" value={categoryName} onChange={e => setCategoryName(capitalizeWords(e.target.value))} className="mt-1" />
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

// ── Page ───────────────────────────────────────────────────────────────────────
function PageInner() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const { toast } = useToast();
  const userPermissions = usePermissions();

  const [activeTab, setActiveTab] = useState(sp.get('tab') || 'productos');
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegisterPurchaseOpen, setIsRegisterPurchaseOpen] = useState(false);
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<InventoryItem> | null>(null);
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [itemsToPrint, setItemsToPrint] = useState<InventoryItem[]>([]);

  const sortedSuppliers = useMemo(() =>
    [...suppliers].sort((a, b) => a.name.localeCompare(b.name)),
  [suppliers]);

  useEffect(() => {
    const unsubs: (() => void)[] = [];
    setIsLoading(true);
    unsubs.push(inventoryService.onItemsUpdate(setInventoryItems));
    unsubs.push(inventoryService.onCategoriesUpdate(setCategories));
    unsubs.push(inventoryService.onSuppliersUpdate(data => { setSuppliers(data); setIsLoading(false); }));
    return () => unsubs.forEach(u => u());
  }, []);

  const handleOpenItemDialog = useCallback((item?: Partial<InventoryItem> | null) => {
    setEditingItem(item || null);
    setIsItemDialogOpen(true);
  }, []);

  // Remove old hack — using prop now

  const handlePrint = useCallback((items: InventoryItem[]) => {
    setItemsToPrint(items);
    setIsPrintDialogOpen(true);
  }, []);

  const handleItemUpdated = async (data: InventoryItemFormValues) => {
    if (!editingItem?.id) return;
    await inventoryService.saveItem(data, editingItem.id!);
    toast({ title: "Producto Actualizado" });
    setIsItemDialogOpen(false);
  };

  const handleDeleteItem = async (id: string) => {
    await inventoryService.deleteItem(id);
    toast({ title: "Producto Eliminado", variant: "destructive" });
    setIsItemDialogOpen(false);
  };

  const handleSavePurchase = useCallback(async (data: PurchaseFormValues) => {
    await purchaseService.registerPurchase(data);
    toast({ title: "Compra Registrada", description: `${data.items.length} artículo(s) registrados.` });
    setIsRegisterPurchaseOpen(false);
  }, [toast]);

  const handleSaveItem = useCallback(async (itemData: InventoryItemFormValues) => {
    try {
      await inventoryService.addItem(itemData);
      toast({ title: "Producto Creado", description: `"${itemData.name}" agregado al inventario.` });
      setIsItemDialogOpen(false);
    } catch (e) {
      toast({ title: "Error al guardar", variant: 'destructive' });
    }
  }, [toast]);

  const handleInventoryItemCreatedFromPurchase = useCallback(async (formData: InventoryItemFormValues): Promise<InventoryItem> => {
    const newItem = await inventoryService.addItem(formData);
    toast({ title: "Producto Creado" });
    return newItem;
  }, [toast]);

  const handleSaveCategory = useCallback(async (name: string, id?: string) => {
    try {
      await inventoryService.saveCategory({ name }, id);
      toast({ title: `Categoría ${id ? 'Actualizada' : 'Agregada'}` });
    } catch {
      toast({ title: "Error", description: "No se pudo guardar la categoría.", variant: "destructive" });
    }
  }, [toast]);

  const handleDeleteCategory = useCallback(async (id: string) => {
    try {
      await inventoryService.deleteCategory(id);
      toast({ title: "Categoría Eliminada" });
    } catch {
      toast({ title: "Error", description: "No se pudo eliminar.", variant: "destructive" });
    }
  }, [toast]);

  const onTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
    router.push(`/inventario?tab=${tab}`);
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const TABS = [
    { value: 'productos', label: 'Productos y Servicios' },
    { value: 'categorias', label: 'Categorías' },
  ];

  return (
    <Suspense fallback={<div className="flex h-64 w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <div className="space-y-6">

        {/* ── Header limpio ───────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Inventario</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Gestiona productos, servicios, stock y categorías.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            {userPermissions.has('inventory:create') && (
              <Button onClick={() => setIsRegisterPurchaseOpen(true)} variant="outline">
                <ShoppingCart className="mr-2 h-4 w-4" /> Registrar Compra
              </Button>
            )}
            {userPermissions.has('inventory:create') && (
              <Button onClick={() => handleOpenItemDialog()}>
                <PlusCircle className="mr-2 h-4 w-4" /> Nuevo Producto
              </Button>
            )}
          </div>
        </div>

        {/* ── Pill tabs ────────────────────────────────────────────── */}
        <div className="inline-flex flex-wrap gap-2 bg-muted/50 p-1.5 rounded-2xl border border-border/50">
          {TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => onTabChange(tab.value)}
              className={cn(
                'inline-flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap',
                activeTab === tab.value
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Tab content ──────────────────────────────────────────── */}
        <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
          <TabsContent value="productos" className="mt-0">
            <Suspense fallback={<Loader2 className="animate-spin" />}>
              <ProductosContent
                inventoryItems={inventoryItems}
                categories={categories}
                onPrint={handlePrint}
                onEditItem={handleOpenItemDialog}
                onDeleteItem={handleDeleteItem}
                onNewItem={() => handleOpenItemDialog()}
              />
            </Suspense>
          </TabsContent>
          <TabsContent value="categorias" className="mt-0">
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

        {/* ── Dialogs ──────────────────────────────────────────────── */}
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
            onDelete={editingItem?.id ? () => handleDeleteItem(editingItem!.id!) : undefined}
            item={editingItem}
            categories={categories}
            suppliers={suppliers}
          />
        </Suspense>

        {/* ── Print preview modal ────────────────────────────── */}
        <InventoryPrintPreview
          open={isPrintDialogOpen}
          onOpenChange={setIsPrintDialogOpen}
          items={itemsToPrint}
        />

      </div>
    </Suspense>
  );
}

export default withSuspense(PageInner, null);
