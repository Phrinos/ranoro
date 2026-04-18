
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
  TrendingUp, Layers, ShoppingCart, Wrench, MoreHorizontal,
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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
  onRegisterPurchase: () => void;
}> = ({ inventoryItems, categories, onPrint, onEditItem, onDeleteItem, onNewItem, onRegisterPurchase }) => {
  const router = useRouter();
  const userPermissions = usePermissions();

  const [searchTerm, setSearchTerm] = useState('');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterBrand, setFilterBrand] = useState('all');
  const [sortKey, setSortKey] = useState('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 25;

  const isSearchActive = searchTerm.trim().length >= MIN_SEARCH;

  useEffect(() => setPage(1), [searchTerm, quickFilter, filterCategory, filterBrand, sortKey, sortDir]);

  const brands = useMemo(() => Array.from(new Set(inventoryItems.map(i => i.brand).filter(Boolean))).sort(), [inventoryItems]);

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

    // Category & Brand filter
    if (filterCategory !== 'all') data = data.filter(i => i.category === filterCategory);
    if (filterBrand !== 'all') data = data.filter(i => i.brand === filterBrand);

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
  }, [inventoryItems, quickFilter, filterCategory, filterBrand, isSearchActive, searchTerm, sortKey, sortDir]);

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
          { label: 'Total en vista', value: kpis.total, icon: Package, cls: 'text-foreground', bg: 'bg-slate-50', onClick: () => setQuickFilter('all') },
          { label: 'Productos', value: kpis.productos, icon: ShoppingCart, cls: 'text-blue-600', bg: 'bg-blue-50', onClick: () => setQuickFilter('productos') },
          { label: 'Servicios', value: kpis.servicios, icon: Tags, cls: 'text-purple-600', bg: 'bg-purple-50', onClick: () => setQuickFilter('servicios') },
          { label: 'Stock bajo', value: kpis.bajoStock, icon: AlertTriangle, cls: 'text-amber-600', bg: 'bg-amber-50', onClick: () => setQuickFilter('bajo-stock') },
          { label: 'Sin stock', value: kpis.sinStock, icon: Layers, cls: 'text-red-600', bg: 'bg-red-50', onClick: () => setQuickFilter('sin-stock') },
          { label: 'Valor Costo', value: formatCurrency(kpis.valorCosto), isText: true, icon: DollarSign, cls: 'text-green-600', bg: 'bg-green-50', onClick: () => {} },
        ].map(({ label, value, isText, icon: Icon, cls, bg, onClick }) => (
          <Card key={label} className="cursor-pointer hover:border-primary/40 hover:shadow-md transition-all border border-border/60" onClick={onClick}>
            <CardContent className="p-4">
              <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center mb-2", bg)}>
                <Icon className={cn("h-4 w-4", cls)} />
              </div>
              <p className={cn("font-extrabold leading-tight truncate", isText ? "text-base" : "text-2xl", cls)}>{value}</p>
              <p className="text-[10px] text-muted-foreground leading-tight mt-0.5 uppercase tracking-wide">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters and Actions Row */}
      <div className="flex flex-col gap-4">
        {/* Top line: Selectors + Search + Actions */}
        <div className="flex flex-col xl:flex-row gap-3 items-stretch xl:items-center w-full">
          {/* Category selector */}
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="h-10 w-full sm:w-48 bg-white text-sm shrink-0 shadow-sm border-slate-200 rounded-xl">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              {categories.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>

          {/* Brand selector */}
          <Select value={filterBrand} onValueChange={setFilterBrand}>
            <SelectTrigger className="h-10 w-full sm:w-48 bg-white text-sm shrink-0 shadow-sm border-slate-200 rounded-xl">
              <SelectValue placeholder="Marca" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las Marcas</SelectItem>
              {brands.map(b => <SelectItem key={b} value={b as string}>{b}</SelectItem>)}
            </SelectContent>
          </Select>

          {/* Search */}
          <div className="relative flex-1 w-full min-w-[250px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <Input
              placeholder={`Buscar artículo, SKU, marca…`}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="h-10 pl-10 pr-8 bg-white w-full shadow-sm border-slate-200 focus-visible:ring-primary/20 transition-all rounded-xl"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0 overflow-x-auto pb-1 xl:pb-0">
            <Button onClick={() => onPrint(filteredItems)} variant="outline" className="h-10 rounded-xl bg-white border-slate-200 shadow-sm text-slate-700 hover:bg-slate-50 gap-2 font-semibold">
              <Printer className="h-4 w-4 text-slate-500" /> Imprimir
            </Button>
            {userPermissions.has('inventory:create') && (
              <Button onClick={onRegisterPurchase} variant="outline" className="h-10 rounded-xl border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 shadow-sm gap-2 font-bold">
                <ShoppingCart className="h-4 w-4" /> Registrar Compra
              </Button>
            )}
            {userPermissions.has('inventory:create') && (
              <Button onClick={onNewItem} className="h-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-sm gap-2 font-bold">
                <PlusCircle className="h-4 w-4" /> Nuevo Producto
              </Button>
            )}
          </div>
        </div>

        {/* Bottom line: Quick Filters inline */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mr-2">Vistas Rápidas:</span>
          {QUICK_FILTERS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setQuickFilter(id)}
              className={cn(
                "h-7 px-3.5 rounded-full text-[11px] font-bold transition-all whitespace-nowrap border uppercase tracking-wider",
                quickFilter === id
                  ? "bg-slate-800 text-white border-slate-800 shadow-sm"
                  : "bg-white text-slate-500 border-slate-200 hover:bg-slate-100 hover:text-slate-800"
              )}
            >
              {label}
            </button>
          ))}
          {(quickFilter !== 'all' || filterCategory !== 'all' || filterBrand !== 'all') && (
            <button
              onClick={() => { setQuickFilter('all'); setFilterCategory('all'); setFilterBrand('all'); }}
              className="h-7 px-3.5 rounded-full border border-red-200 text-[10px] font-black text-red-600 bg-red-50 hover:bg-red-100 whitespace-nowrap transition-all uppercase tracking-widest ml-1"
            >
              × Limpiar Filtros
            </button>
          )}

          {!isSearchActive && searchTerm.length > 0 && (
            <span className="text-xs text-amber-600 font-medium ml-2">Escribe al menos {MIN_SEARCH} caracteres para activar la búsqueda</span>
          )}
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {pageData.length > 0 ? <>{(page-1)*PAGE_SIZE+1}–{Math.min(page*PAGE_SIZE, filteredItems.length)} de {filteredItems.length} resultados</> : '0 resultados'}
        </p>
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <Button size="sm" onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1} variant="outline" className="h-8 w-8 p-0 bg-white">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const start = Math.max(1, Math.min(page - 2, totalPages - 4));
              const pg = start + i;
              return pg <= totalPages ? (
                <button
                  key={pg}
                  onClick={() => setPage(pg)}
                  className={cn(
                    "h-8 w-8 rounded-md text-xs font-medium border transition-all",
                    pg === page
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-white border-border text-muted-foreground hover:bg-muted"
                  )}
                >
                  {pg}
                </button>
              ) : null;
            })}
            <Button size="sm" onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page>=totalPages} variant="outline" className="h-8 w-8 p-0 bg-white">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Table */}
      <Card className="shadow-xl bg-white/50 backdrop-blur-xl border-white/60">
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-900 hover:bg-slate-900 [&>th]:text-slate-100">
                <TableHead className="w-[60px] pl-4 text-center">Tipo</TableHead>
                <SortableTableHeader sortKey="category" label="Categoría" onSort={handleSort} currentSort={`${sortKey}_${sortDir}`} className="hidden md:table-cell w-[140px]" />
                <SortableTableHeader sortKey="brand" label="Marca" onSort={handleSort} currentSort={`${sortKey}_${sortDir}`} className="hidden sm:table-cell w-[140px]" />
                <SortableTableHeader sortKey="name" label="Producto / Servicio" onSort={handleSort} currentSort={`${sortKey}_${sortDir}`} />
                <SortableTableHeader sortKey="sku" label="SKU" onSort={handleSort} currentSort={`${sortKey}_${sortDir}`} className="hidden lg:table-cell w-[100px]" />
                <SortableTableHeader sortKey="unitPrice" label="Costo" onSort={handleSort} currentSort={`${sortKey}_${sortDir}`} className="text-right w-[100px]" />
                <SortableTableHeader sortKey="sellingPrice" label="Venta" onSort={handleSort} currentSort={`${sortKey}_${sortDir}`} className="text-right w-[100px]" />
                <SortableTableHeader sortKey="quantity" label="Stock" onSort={handleSort} currentSort={`${sortKey}_${sortDir}`} className="w-[80px]" />
                <TableHead className="text-right w-[80px] px-4">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageData.length > 0 ? (
                pageData.map(item => (
                  <TableRow
                    key={item.id}
                    onClick={() => router.push(`/inventario/${item.id}`)}
                    className={cn(
                      "cursor-pointer hover:bg-slate-50/80 transition-colors group",
                      !item.isService && (item.quantity ?? 0) === 0 && "bg-red-50/60 hover:bg-red-50"
                    )}
                  >
                    <TableCell className="pl-4">
                      <div className={cn(
                        "w-8 h-8 rounded-xl flex items-center justify-center shadow-sm border",
                        item.isService ? "bg-blue-50 text-blue-600 border-blue-200" : "bg-red-50 text-red-600 border-red-200"
                      )} title={item.isService ? "Servicio" : "Producto Físico"}>
                        {item.isService ? <Wrench className="h-4 w-4" /> : <Package className="h-4 w-4" />}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs font-semibold text-slate-500 uppercase tracking-widest">{item.category || '—'}</TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-slate-600 font-medium">{item.brand || '—'}</TableCell>
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span className="text-slate-900">{item.name}</span>
                        {item.isService && <span className="text-[10px] text-blue-600 font-bold uppercase mt-0.5">Servicio</span>}
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {item.sku ? <Badge variant="outline" className="font-mono text-[10px] shadow-sm bg-white">{item.sku}</Badge> : <span className="text-muted-foreground text-xs italic">—</span>}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-slate-600 font-medium">{formatCurrency(item.unitPrice)}</TableCell>
                    <TableCell className="text-right tabular-nums font-bold text-emerald-700 bg-emerald-50/30">{formatCurrency(item.sellingPrice)}</TableCell>
                    <TableCell>{stockBadge(item)}</TableCell>
                    <TableCell className="text-right px-4" onClick={e => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 shadow-sm hover:bg-slate-50 transition-all rounded-full">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-[160px] bg-white/95 backdrop-blur-xl border-white/40 shadow-xl">
                          {userPermissions.has('inventory:edit') && (
                            <DropdownMenuItem onClick={() => onEditItem(item)} className="gap-2 focus:bg-slate-100 cursor-pointer text-sm font-medium">
                              <Edit className="h-4 w-4 text-blue-600" /> Editar {item.isService ? 'Servicio' : 'Producto'}
                            </DropdownMenuItem>
                          )}
                          {(userPermissions.has('inventory:edit') && userPermissions.has('inventory:delete')) && <DropdownMenuSeparator />}
                          {userPermissions.has('inventory:delete') && (
                            <ConfirmDialog
                              triggerButton={
                                <DropdownMenuItem onSelect={e => e.preventDefault()} className="gap-2 text-destructive focus:bg-red-50 focus:text-destructive cursor-pointer text-sm font-medium">
                                  <Trash2 className="h-4 w-4" /> Eliminar
                                </DropdownMenuItem>
                              }
                              title={`¿Eliminar "${item.name}"?`}
                              description="Esta acción es permanente y eliminará este ítem del catálogo."
                              onConfirm={() => onDeleteItem(item.id)}
                            />
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <Package className="h-8 w-8 opacity-20" />
                      <p className="text-sm">
                        {isSearchActive || quickFilter !== 'all' || filterCategory !== 'all' || filterBrand !== 'all'
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
const TYPE_CONFIGS = {
  product: { label: 'Producto', icon: Package, cls: 'text-red-700 bg-red-50 border-red-200', dot: 'bg-red-500' },
  service: { label: 'Servicio', icon: Wrench, cls: 'text-blue-700 bg-blue-50 border-blue-200', dot: 'bg-blue-500' },
} as const;

const CategoriasContent: React.FC<{
  categories: InventoryCategory[];
  inventoryItems: InventoryItem[];
  onSaveCategory: (name: string, type: 'product' | 'service', id?: string) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
}> = ({ categories, inventoryItems, onSaveCategory, onDeleteCategory }) => {
  const userPermissions = usePermissions();
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<InventoryCategory | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryType, setCategoryType] = useState<'product' | 'service'>('product');

  const itemsPerCategory = useMemo(() =>
    categories.map(cat => ({
      ...cat,
      count: inventoryItems.filter(item => item.category === cat.name).length
    })),
  [categories, inventoryItems]);

  const handleOpenDialog = (category: InventoryCategory | null = null) => {
    setEditingCategory(category);
    setCategoryName(category ? category.name : '');
    setCategoryType(category ? category.type : 'product');
    setIsCategoryDialogOpen(true);
  };

  const handleSave = async () => {
    if (!categoryName.trim()) return;
    await onSaveCategory(categoryName.trim(), categoryType, editingCategory?.id);
    setIsCategoryDialogOpen(false);
  };

  const productCats = itemsPerCategory.filter(c => c.type === 'product');
  const serviceCats = itemsPerCategory.filter(c => c.type === 'service');
  const unknownCats = itemsPerCategory.filter(c => !c.type);

  const renderRows = (cats: typeof itemsPerCategory) => cats.map(cat => {
    const cfg = TYPE_CONFIGS[cat.type as 'product' | 'service'] ?? TYPE_CONFIGS.product;
    const Icon = cfg.icon;
    return (
      <TableRow key={cat.id} className="hover:bg-slate-50/80 transition-colors">
        <TableCell className="w-[140px]">
          <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border", cfg.cls)}>
            <Icon className="w-3 h-3" />
            {cfg.label}
          </span>
        </TableCell>
        <TableCell className="font-semibold text-slate-800">{cat.name}</TableCell>
        <TableCell>
          <span className="text-sm text-slate-500">{cat.count} ítem{cat.count !== 1 ? 's' : ''}</span>
        </TableCell>
        <TableCell className="text-right w-[56px]">
          {userPermissions.has('inventory:manage_categories') && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-700">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[160px]">
                <DropdownMenuItem onClick={() => handleOpenDialog(cat)} className="gap-2">
                  <Edit className="h-3.5 w-3.5" /> Editar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <ConfirmDialog
                  triggerButton={
                    <DropdownMenuItem onSelect={e => e.preventDefault()} className="gap-2 text-destructive focus:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" /> Eliminar
                    </DropdownMenuItem>
                  }
                  title={`¿Eliminar categoría "${cat.name}"?`}
                  description="Los productos existentes con esta categoría no serán afectados."
                  onConfirm={() => onDeleteCategory(cat.id)}
                />
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </TableCell>
      </TableRow>
    );
  });

  return (
    <Card className="shadow-xl bg-white/50 backdrop-blur-xl border-white/60">
      <CardHeader className="flex flex-row items-center justify-between border-b border-white/40">
        <div className="space-y-1">
          <CardTitle>Categorías de Inventario</CardTitle>
          <CardDescription>Organiza y clasifica tus productos y servicios.</CardDescription>
        </div>
        {userPermissions.has('inventory:manage_categories') && (
          <Button onClick={() => handleOpenDialog()} className="gap-2">
            <PlusCircle className="h-4 w-4" /> Nueva Categoría
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-900 hover:bg-slate-900">
              <TableHead className="text-slate-300 text-xs uppercase tracking-widest w-[140px]" style={{color:'#cbd5e1'}}>Tipo</TableHead>
              <TableHead className="text-slate-300 text-xs uppercase tracking-widest" style={{color:'#cbd5e1'}}>Nombre</TableHead>
              <TableHead className="text-slate-300 text-xs uppercase tracking-widest" style={{color:'#cbd5e1'}}>Productos / Servicios</TableHead>
              <TableHead className="w-[56px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {itemsPerCategory.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                  <Package className="h-8 w-8 mx-auto opacity-20 mb-2" />
                  <p className="text-sm">No hay categorías creadas todavía.</p>
                </TableCell>
              </TableRow>
            ) : (
              <>
                {renderRows(productCats)}
                {serviceCats.length > 0 && productCats.length > 0 && (
                  <TableRow className="bg-slate-50/50">
                    <TableCell colSpan={4} className="py-1 text-[10px] font-bold uppercase tracking-widest text-slate-400 pl-4">Servicios</TableCell>
                  </TableRow>
                )}
                {renderRows(serviceCats)}
                {renderRows(unknownCats)}
              </>
            )}
          </TableBody>
        </Table>
      </CardContent>

      {/* Dialog creación / edición */}
      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Editar' : 'Nueva'} Categoría</DialogTitle>
            <DialogDescription>Define el nombre y el tipo de esta categoría.</DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-2">
            {/* Tipo selector */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Tipo de Categoría</Label>
              <div className="flex items-center gap-2 p-1 rounded-xl bg-slate-100 border border-slate-200">
                <button
                  type="button"
                  onClick={() => setCategoryType('product')}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all duration-200",
                    categoryType === 'product'
                      ? "bg-white text-red-700 shadow-sm border border-red-200"
                      : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  <Package className="w-4 h-4" /> Producto
                </button>
                <button
                  type="button"
                  onClick={() => setCategoryType('service')}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all duration-200",
                    categoryType === 'service'
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  <Wrench className="w-4 h-4" /> Servicio
                </button>
              </div>
            </div>
            {/* Nombre */}
            <div className="space-y-2">
              <Label htmlFor="cat-name" className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Nombre</Label>
              <Input
                id="cat-name"
                value={categoryName}
                onChange={e => setCategoryName(capitalizeWords(e.target.value))}
                placeholder={categoryType === 'service' ? 'Ej: Mantenimiento, Diagnóstico…' : 'Ej: Aceites, Filtros, Llantas…'}
                className="h-11"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCategoryDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!categoryName.trim()}>Guardar</Button>
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

  const handleSaveCategory = useCallback(async (name: string, type: 'product' | 'service', id?: string) => {
    try {
      await inventoryService.saveCategory({ name, type }, id);
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

        {/* ── Header: título izq, tabs der ────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Inventario</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Gestiona productos, servicios, stock y categorías.
            </p>
          </div>

          {/* Pill tabs a la derecha */}
          <div className="inline-flex flex-wrap gap-2 bg-muted/50 p-1.5 rounded-2xl border border-border/50 shrink-0">
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
                onRegisterPurchase={() => setIsRegisterPurchaseOpen(true)}
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
