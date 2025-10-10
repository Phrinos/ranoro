
// src/app/(app)/inventario/page.tsx
"use client";

import React, { useState, useMemo, useEffect, useCallback, Suspense, useRef, lazy } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  PlusCircle,
  Printer,
  AlertTriangle,
  DollarSign,
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
  VehiclePriceList,
} from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TableToolbar } from "@/components/shared/table-toolbar";
import { useTableManager } from "@/hooks/useTableManager";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type { InventoryItemFormValues } from "@/schemas/inventory-item-form-schema";
import type { PurchaseFormValues } from "@/app/(app)/compras/components/register-purchase-dialog";
import { SortableTableHeader } from "@/components/shared/SortableTableHeader";
import { parseDate } from "@/lib/forms";
import { format, isValid } from 'date-fns';
import { es } from 'date-fns/locale';

// ✅ Cambiamos React.lazy por next/dynamic (aislado al cliente)
const RegisterPurchaseDialog = dynamic(
  () =>
    import("../compras/components/register-purchase-dialog").then((m) => m.RegisterPurchaseDialog),
  { ssr: false }
);
const InventoryItemDialog = dynamic(
  () => import("./components/inventory-item-dialog").then((m) => m.InventoryItemDialog),
  { ssr: false }
);
const InventoryReportContent = dynamic(
  () => import("./components/inventory-report-content").then((m) => m.default),
  { ssr: false }
);

// --- DashboardCards ---
const DashboardCards = ({
  summaryData,
  onNewItemClick,
  onNewPurchaseClick,
}: {
  summaryData: any;
  onNewItemClick: () => void;
  onNewPurchaseClick: () => void;
}) => {
  return (
    <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      <Card className="xl:col-span-1">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Costo Total del Inventario
          </CardTitle>
          <DollarSign className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(summaryData.totalInventoryCost)}
          </div>
          <p className="text-xs text-muted-foreground">
            Valor de venta: {formatCurrency(summaryData.totalInventorySellingPrice)}
          </p>
        </CardContent>
      </Card>

      <Card className="xl:col-span-1">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Productos con Stock Bajo
          </CardTitle>
          <AlertTriangle className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summaryData.lowStockItemsCount}</div>
          <p className="text-xs text-muted-foreground">Requieren atención o reposición.</p>
        </CardContent>
      </Card>

      <Card className="xl:col-span-1">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Ítems Registrados</CardTitle>
          <Package className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {summaryData.productsCount + summaryData.servicesCount}
          </div>
          <p className="text-xs text-muted-foreground">
            {summaryData.productsCount} Productos y {summaryData.servicesCount} Servicios.
          </p>
        </CardContent>
      </Card>

      <div className="lg:col-span-2 xl:col-span-2 flex flex-col sm:flex-row gap-2">
        <Button
            type="button"
            variant="outline"
            onClick={onNewItemClick}
            className="w-full flex-1 bg-white border-2 border-red-500 text-black font-bold hover:bg-red-50 focus-visible:ring-red-500"
        >
            <PlusCircle className="mr-2 h-5 w-5 text-red-500" />
            Registrar Ítem
        </Button>

        {/* Botón “Registrar Compra” con estilos solicitados */}
        <Button
          type="button"
          variant="outline"
          onClick={onNewPurchaseClick}
          className="w-full flex-1 bg-white border-2 border-blue-600 text-black font-bold hover:bg-blue-50 focus-visible:ring-blue-600"
        >
          <PlusCircle className="mr-2 h-5 w-5 text-blue-600" />
          Registrar Compra
        </Button>
      </div>
    </div>
  );
};

// --- ProductosContent ---
const itemSortOptions = [
    { value: 'updatedAt_asc', label: 'Modificación (Más antiguo)' },
    { value: 'updatedAt_desc', label: 'Modificación (Más reciente)' },
    { value: 'name_asc', label: 'Nombre (A-Z)' },
    { value: 'name_desc', label: 'Nombre (Z-A)' },
    { value: 'quantity_asc', label: 'Stock (Menor a Mayor)' },
    { value: 'quantity_desc', label: 'Stock (Mayor a Menor)' },
    { value: 'sellingPrice_desc', label: 'Precio Venta (Mayor a Menor)' },
];

const getSortPriority = (item: InventoryItem) => {
  if (item.isService) return 3;
  if (item.quantity <= item.lowStockThreshold) return 1;
  return 2;
};

const ProductosContent = ({
  inventoryItems,
  onPrint,
  onNewItemFromSearch,
}: {
  inventoryItems: InventoryItem[];
  onPrint: (items: InventoryItem[]) => void;
  onNewItemFromSearch: (name: string) => void;
}) => {
  const router = useRouter();

  const { filteredData, ...tableManager } = useTableManager<InventoryItem>({
    initialData: inventoryItems,
    searchKeys: ["name", "sku", "brand", "category"],
    dateFilterKey: "updatedAt",
    initialSortOption: "updatedAt_asc",
    itemsPerPage: 100,
  });

  const customSortedItems = useMemo(() => {
    const items = [...tableManager.fullFilteredData];
    // No default sort needed if useTableManager handles it
    return items;
  }, [tableManager.fullFilteredData]);

  const handleSort = (key: string) => {
    const isAsc = tableManager.sortOption === `${key}_asc`;
    tableManager.onSortOptionChange(`${key}_${isAsc ? "desc" : "asc"}`);
  };

  return (
    <div className="space-y-4">
      <TableToolbar
        {...tableManager}
        sortOptions={itemSortOptions}
        searchPlaceholder="Buscar por nombre, SKU, marca..."
        actions={
          <Button
            onClick={() => onPrint(customSortedItems)}
            variant="outline"
            size="sm"
            className="bg-white"
          >
            <Printer className="mr-2 h-4 w-4" />
            Imprimir Lista
          </Button>
        }
      />

      <Card>
        <CardContent className="pt-6">
          <div className="rounded-md border">
            <Table>
              <TableHeader className="bg-black text-white">
                <TableRow>
                  <SortableTableHeader
                    sortKey="name"
                    label="Nombre"
                    onSort={handleSort}
                    currentSort={tableManager.sortOption}
                    textClassName="text-white"
                  />
                  <SortableTableHeader
                    sortKey="updatedAt"
                    label="Últ. Modificación"
                    onSort={handleSort}
                    currentSort={tableManager.sortOption}
                    className="hidden lg:table-cell text-white"
                  />
                  <SortableTableHeader
                    sortKey="isService"
                    label="Tipo"
                    onSort={handleSort}
                    currentSort={tableManager.sortOption}
                    textClassName="text-white"
                  />
                  <SortableTableHeader
                    sortKey="quantity"
                    label="Stock"
                    onSort={handleSort}
                    currentSort={tableManager.sortOption}
                    className="text-right text-white"
                  />
                  <SortableTableHeader
                    sortKey="sellingPrice"
                    label="Precio de Venta"
                    onSort={handleSort}
                    currentSort={tableManager.sortOption}
                    className="text-right text-white"
                  />
                </TableRow>
              </TableHeader>
              <TableBody>
                {customSortedItems.length > 0 ? (
                  customSortedItems.map((item) => {
                    const isLowStock =
                      !item.isService && item.quantity <= item.lowStockThreshold;
                    const updatedAt = parseDate(item.updatedAt);
                    return (
                      <TableRow
                        key={item.id}
                        onClick={() => router.push(`/inventario/${item.id}`)}
                        className="cursor-pointer hover:bg-muted/50"
                      >
                        <TableCell className="font-medium">
                          <p
                            className={cn(
                              isLowStock && "text-orange-600 font-bold"
                            )}
                          >
                            {item.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.brand} ({item.sku || "N/A"})
                          </p>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {updatedAt && isValid(updatedAt) ? format(updatedAt, 'dd/MM/yy, HH:mm', { locale: es }) : 'N/A'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={item.isService ? "outline" : "secondary"}>
                            {item.isService ? "Servicio" : "Producto"}
                          </Badge>
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right font-semibold",
                            isLowStock && "text-orange-600"
                          )}
                        >
                          {item.isService ? "N/A" : item.quantity}
                        </TableCell>
                        <TableCell className="text-right font-bold text-primary">
                          {formatCurrency(item.sellingPrice)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      {tableManager.searchTerm ? (
                        <Button
                          variant="link"
                          onClick={() => onNewItemFromSearch(tableManager.searchTerm)}
                        >
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

// --- CategoriasContent (responsive tabla + lista móvil) ---
const CategoriasContent = ({
  categories,
  inventoryItems,
  onSaveCategory,
  onDeleteCategory,
}: {
  categories: InventoryCategory[];
  inventoryItems: InventoryItem[];
  onSaveCategory: (name: string, id?: string) => void;
  onDeleteCategory: (id: string) => void;
}) => {
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] =
    useState<InventoryCategory | null>(null);
  const [currentCategoryName, setCurrentCategoryName] = useState("");
  const [sortOption, setSortOption] = useState("name_asc");
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const normalize = (s?: string) =>
    (s ?? "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "");

  const itemsPerCategory = useMemo(() => {
    return categories.reduce((acc, category) => {
      acc[category.name] = inventoryItems.filter(
        (item) => item.category === category.name
      ).length;
      return acc;
    }, {} as Record<string, number>);
  }, [categories, inventoryItems]);

  const filtered = useMemo(() => {
    const n = normalize(searchTerm);
    if (!n) return categories;
    return categories.filter((c) => normalize(c.name).includes(n));
  }, [categories, searchTerm]);

  const sortedCategories = useMemo(() => {
    const arr = [...filtered];
    return arr.sort((a, b) => {
      const [key, direction] = sortOption.split("_");
      const valA = key === "items" ? itemsPerCategory[a.name] || 0 : a.name;
      const valB = key === "items" ? itemsPerCategory[b.name] || 0 : b.name;
      const cmp =
        typeof valA === "number" && typeof valB === "number"
          ? valA - valB
          : String(valA).localeCompare(String(valB));
      return direction === "asc" ? cmp : -cmp;
    });
  }, [filtered, itemsPerCategory, sortOption]);

  const handleOpenDialog = (category: InventoryCategory | null = null) => {
    setEditingCategory(category);
    setCurrentCategoryName(category ? category.name : "");
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

  const handleSort = (key: string) => {
    const isAsc = sortOption === `${key}_asc`;
    setSortOption(`${key}_${isAsc ? "desc" : "asc"}`);
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
        <div className="flex w-full sm:w-auto items-center gap-2">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar categoría…"
              className="pl-8 bg-white"
            />
          </div>
        </div>

        <Button onClick={() => handleOpenDialog()}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Nueva Categoría
        </Button>
      </div>

      {/* Lista móvil */}
      <div className="grid gap-2 sm:hidden">
        {sortedCategories.map((cat) => (
          <div
            key={cat.id}
            className="rounded-lg border bg-card p-3 flex items-center justify-between"
          >
            <div className="min-w-0">
              <p className="font-medium truncate">{cat.name}</p>
              <p className="text-xs text-muted-foreground">
                {itemsPerCategory[cat.name] || 0} producto(s)
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={() => handleOpenDialog(cat)}
                aria-label={`Editar ${cat.name}`}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <ConfirmDialog
                triggerButton={
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9"
                    aria-label={`Eliminar ${cat.name}`}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                }
                title={`¿Eliminar categoría "${cat.name}"?`}
                description="Esta acción no se puede deshacer. Los productos no se eliminan, quedarán sin categoría."
                onConfirm={() => onDeleteCategory(cat.id)}
              />
            </div>
          </div>
        ))}
        {!sortedCategories.length && (
          <div className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">
            No hay categorías que coincidan.
          </div>
        )}
      </div>

      {/* Tabla sm+ */}
      <Card className="hidden sm:block">
        <CardContent className="pt-6">
          <div className="w-full overflow-x-auto rounded-md border">
            <Table className="min-w-[560px]">
              <TableHeader>
                <TableRow>
                  <SortableTableHeader
                    sortKey="name"
                    label="Nombre de Categoría"
                    onSort={handleSort}
                    currentSort={sortOption}
                  />
                  <SortableTableHeader
                    sortKey="items"
                    label="# de Productos"
                    onSort={handleSort}
                    currentSort={sortOption}
                    className="text-right"
                  />
                  <TableHead className="text-right w-[120px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedCategories.map((cat) => (
                  <TableRow key={cat.id}>
                    <TableCell className="font-medium">{cat.name}</TableCell>
                    <TableCell className="text-right">
                      {itemsPerCategory[cat.name] || 0}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(cat)}
                          aria-label={`Editar ${cat.name}`}
                          className="h-8 w-8"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <ConfirmDialog
                          triggerButton={
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Eliminar ${cat.name}`}
                              className="h-8 w-8"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          }
                          title={`¿Eliminar categoría "${cat.name}"?`}
                          description="Esta acción no se puede deshacer. Los productos no se eliminan, quedarán sin categoría."
                          onConfirm={() => onDeleteCategory(cat.id)}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!sortedCategories.length && (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center">
                      No hay categorías que coincidan.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog crear/editar */}
      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCategory ? "Editar" : "Nueva"} Categoría</DialogTitle>
            <DialogDescription>
              Gestiona las categorías para organizar tu inventario.
            </DialogDescription>
          </DialogHeader>
          <form
            id="category-form"
            onSubmit={(e) => {
              e.preventDefault();
              handleSave();
            }}
          >
            <div className="py-4 space-y-2">
              <Label htmlFor="category-name">Nombre de la Categoría</Label>
              <Input
                id="category-name"
                value={currentCategoryName}
                onChange={(e) => setCurrentCategoryName(capitalizeWords(e.target.value))}
                autoFocus
              />
            </div>
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCategoryDialogOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="category-form">
              Guardar Categoría
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// --- Página principal ---
export default function InventarioPage() {
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<"productos" | "categorias">(() => {
    if (typeof window !== "undefined") {
      const u = new URL(window.location.href);
      const t = (u.searchParams.get("tab") as "productos" | "categorias") || "productos";
      return t;
    }
    return "productos";
  });

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


  const handleOpenItemDialog = useCallback((item: Partial<InventoryItem> | null = null) => {
    setEditingItem(item);
    setIsItemDialogOpen(true);
  }, []);
  
  const handleNewItemFromSearch = useCallback((name: string) => {
    setEditingItem({ name });
    setIsItemDialogOpen(true);
  }, []);
  
  const handleSaveItem = useCallback(
    async (itemData: InventoryItemFormValues) => {
      const isEditing = !!editingItem?.id;
      await inventoryService.saveItem(itemData, editingItem?.id);
      toast({
        title: `Ítem ${isEditing ? "Actualizado" : "Creado"}`,
        description: `"${itemData.name}" ha sido ${isEditing ? 'actualizado' : 'agregado'}.`,
      });
      setIsItemDialogOpen(false);
    },
    [toast, editingItem]
  );
  
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
  
  const handleInventoryItemCreatedFromPurchase = useCallback(
    async (formData: InventoryItemFormValues): Promise<InventoryItem> => {
      const newItem = await inventoryService.addItem(formData);
      toast({
        title: "Producto Creado",
        description: `"${newItem.name}" ha sido agregado al inventario.`,
      });
      return newItem;
    },
    [toast]
  );
  
  const handleSaveCategory = useCallback(
    async (name: string, id?: string) => {
      try {
        await inventoryService.saveCategory({ name }, id);
        toast({ title: `Categoría ${id ? "Actualizada" : "Agregada"}` });
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
          <p className="text-primary-foreground/80 mt-1">
            Gestiona productos, proveedores, categorías y obtén análisis inteligentes.
          </p>
        </div>
        
        <DashboardCards 
          summaryData={inventorySummary}
          onNewItemClick={() => handleOpenItemDialog()}
          onNewPurchaseClick={() => setIsRegisterPurchaseOpen(true)}
        />
        
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full mt-6">
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
