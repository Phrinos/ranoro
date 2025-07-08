
"use client";

import { useState, useMemo, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { PlusCircle, Printer, ShoppingCart, AlertTriangle, PackageCheck, DollarSign, Server, Search, ListFilter, Shapes, Building, BrainCircuit, Package, Trash2, Edit } from "lucide-react";
import { InventoryTable } from "./components/inventory-table";
import { InventoryItemDialog } from "./components/inventory-item-dialog";
import { placeholderInventory, placeholderCategories, placeholderSuppliers, persistToFirestore, placeholderServiceRecords, hydrateReady } from "@/lib/placeholder-data";
import type { InventoryItem, InventoryCategory, Supplier } from "@/types";
import type { InventoryItemFormValues } from "./components/inventory-item-form";
import { PurchaseItemSelectionDialog } from "./components/purchase-item-selection-dialog";
import { PurchaseDetailsEntryDialog, type PurchaseDetailsFormValues } from "./components/purchase-details-entry-dialog";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Image from "next/legacy/image";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { subMonths, startOfMonth, endOfMonth, isWithinInterval, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { capitalizeWords } from '@/lib/utils';
import { SuppliersTable } from './proveedores/components/suppliers-table';
import { SupplierDialog } from './proveedores/components/supplier-dialog';
import type { SupplierFormValues } from './proveedores/components/supplier-form';
import { analyzeInventory, type InventoryRecommendation } from '@/ai/flows/inventory-analysis-flow';
import { Loader2, CheckCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";


type InventorySortOption = 
  | "stock_status_name_asc" 
  | "name_asc" | "name_desc"
  | "sku_asc" | "sku_desc"
  | "quantity_asc" | "quantity_desc"
  | "price_asc" | "price_desc"
  | "type_asc";

type SupplierSortOption = 
  | "name_asc" | "name_desc"
  | "debt_asc" | "debt_desc";


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
    hydrateReady.then(() => {
        setHydrated(true);
        // Initial data load
        setInventoryItems([...placeholderInventory]);
        setCategories([...placeholderCategories]);
        setSuppliers([...placeholderSuppliers]);
    });
    const forceUpdate = () => setVersion(v => v + 1);
    window.addEventListener('databaseUpdated', forceUpdate);
    return () => window.removeEventListener('databaseUpdated', forceUpdate);
  }, []);

  useEffect(() => {
      // If data is updated (e.g., via another tab), ensure all local states are synced
      if (hydrated) {
          setInventoryItems([...placeholderInventory]);
          setCategories([...placeholderCategories]);
          setSuppliers([...placeholderSuppliers]);
      }
  }, [version, hydrated]);

  // ======== INFORME TAB ========
  const {
    totalInventoryCost,
    totalInventorySellingPrice,
    lowStockItemsCount,
    productsCount,
    servicesCount,
    totalDebtWithSuppliers,
    topSupplierLastMonth
  } = useMemo(() => {
    if (!hydrated) return { totalInventoryCost: 0, totalInventorySellingPrice: 0, lowStockItemsCount: 0, productsCount: 0, servicesCount: 0, totalDebtWithSuppliers: 0, topSupplierLastMonth: null };

    let cost = 0, sellingPriceValue = 0, lowStock = 0, products = 0, services = 0;
    inventoryItems.forEach(item => {
      if (item.isService) services++;
      else {
        products++;
        cost += item.quantity * item.unitPrice;
        sellingPriceValue += item.quantity * item.sellingPrice;
        if (item.quantity <= item.lowStockThreshold) lowStock++;
      }
    });

    const debt = suppliers.reduce((total, s) => total + (s.debtAmount || 0), 0);

    const lastMonthStart = startOfMonth(subMonths(new Date(), 1));
    const lastMonthEnd = endOfMonth(subMonths(new Date(), 1));
    const supplierPurchaseQuantity: Record<string, { name: string, quantity: number }> = {};
    placeholderServiceRecords.forEach(service => {
        if (!service.serviceDate || !isValid(parseISO(service.serviceDate))) return;
        if (isWithinInterval(parseISO(service.serviceDate), { start: lastMonthStart, end: lastMonthEnd })) {
            service.suppliesUsed?.forEach(part => {
                const inventoryItem = placeholderInventory.find(item => item.id === part.supplyId);
                if (inventoryItem?.supplier) {
                    const supplierName = inventoryItem.supplier;
                    if (!supplierPurchaseQuantity[supplierName]) supplierPurchaseQuantity[supplierName] = { name: supplierName, quantity: 0 };
                    supplierPurchaseQuantity[supplierName].quantity += part.quantity;
                }
            });
        }
    });
    let topSupplier: { name: string, quantity: number } | null = null;
    for (const supplierInfo of Object.values(supplierPurchaseQuantity)) {
        if (!topSupplier || supplierInfo.quantity > topSupplier.quantity) topSupplier = supplierInfo;
    }

    return { totalInventoryCost: cost, totalInventorySellingPrice: sellingPriceValue, lowStockItemsCount: lowStock, productsCount: products, servicesCount: services, totalDebtWithSuppliers: debt, topSupplierLastMonth: topSupplier };
  }, [inventoryItems, suppliers, hydrated]);

  // ======== PRODUCTOS TAB STATE & LOGIC ========
  const [isNewItemDialogOpen, setIsNewItemDialogOpen] = useState(false);
  const [isPurchaseItemSelectionDialogOpen, setIsPurchaseItemSelectionDialogOpen] = useState(false);
  const [isPurchaseDetailsEntryDialogOpen, setIsPurchaseDetailsEntryDialogOpen] = useState(false);
  const [selectedItemForPurchase, setSelectedItemForPurchase] = useState<InventoryItem | null>(null);
  const [isCreatingItemForPurchaseFlow, setIsCreatingItemForPurchaseFlow] = useState(false);
  const [newlyCreatedItemForPurchase, setNewlyCreatedItemForPurchase] = useState<InventoryItem | null>(null);
  const [searchTermForNewItemPurchase, setSearchTermForNewItemPurchase] = useState('');
  const [searchTermProducts, setSearchTermProducts] = useState("");
  const [sortOptionProducts, setSortOptionProducts] = useState<InventorySortOption>("stock_status_name_asc");

  const handleSaveNewItem = useCallback(async (data: InventoryItemFormValues) => {
    const newItem: InventoryItem = { id: `PROD_${Date.now().toString(36)}`, ...data, isService: data.isService || false, quantity: data.isService ? 0 : Number(data.quantity), lowStockThreshold: data.isService ? 0 : Number(data.lowStockThreshold), unitPrice: Number(data.unitPrice) || 0, sellingPrice: Number(data.sellingPrice) || 0, };
    placeholderInventory.push(newItem);
    await persistToFirestore(['inventory']);
    toast({ title: "Producto/Servicio Creado", description: `El ítem ${newItem.name} ha sido agregado al inventario.` });
    setIsNewItemDialogOpen(false);
    if (isCreatingItemForPurchaseFlow) { setNewlyCreatedItemForPurchase(newItem); setIsCreatingItemForPurchaseFlow(false); }
  }, [isCreatingItemForPurchaseFlow, toast]);

  useEffect(() => {
    if (newlyCreatedItemForPurchase) {
      setSelectedItemForPurchase(newlyCreatedItemForPurchase);
      if (newlyCreatedItemForPurchase.isService) toast({ title: "Servicio Creado", description: `${newlyCreatedItemForPurchase.name} ha sido creado. No requiere ingreso de compra.` });
      else setIsPurchaseDetailsEntryDialogOpen(true);
      setNewlyCreatedItemForPurchase(null);
    }
  }, [newlyCreatedItemForPurchase, toast]);

  const handleOpenPurchaseItemSelection = useCallback(() => { setSelectedItemForPurchase(null); setIsPurchaseItemSelectionDialogOpen(true); }, []);
  const handleItemSelectedForPurchase = useCallback((item: InventoryItem) => {
    setSelectedItemForPurchase(item);
    setIsPurchaseItemSelectionDialogOpen(false);
    if (item.isService) { toast({ title: "Es un Servicio", description: `${item.name} es un servicio y no requiere ingreso de compra de stock.`, variant: "default" }); setSelectedItemForPurchase(null); }
    else { setIsPurchaseDetailsEntryDialogOpen(true); }
  }, [toast]);
  const handleCreateNewItemForPurchase = useCallback((searchTerm: string) => { setIsCreatingItemForPurchaseFlow(true); setSearchTermForNewItemPurchase(searchTerm); setIsPurchaseItemSelectionDialogOpen(false); setIsNewItemDialogOpen(true); }, []);
  const handleSavePurchaseDetails = useCallback(async (details: PurchaseDetailsFormValues) => {
    if (!selectedItemForPurchase || selectedItemForPurchase.isService) { toast({ title: "Error", description: "No hay un artículo de stock seleccionado para la compra o es un servicio.", variant: "destructive" }); return; }
    const itemIndex = placeholderInventory.findIndex(item => item.id === selectedItemForPurchase.id);
    if (itemIndex === -1) { toast({ title: "Error", description: `El artículo ${selectedItemForPurchase.name} no se encontró para actualizar.`, variant: "destructive" }); return; }
    const updatedItem = { ...placeholderInventory[itemIndex], quantity: placeholderInventory[itemIndex].quantity + details.quantityPurchased, unitPrice: details.newCostPrice, sellingPrice: details.newSellingPrice, };
    placeholderInventory[itemIndex] = updatedItem;
    await persistToFirestore(['inventory']);
    toast({ title: "Compra Registrada", description: `Se actualizó el stock, costo y precio de venta para ${updatedItem.name}.` });
    setIsPurchaseDetailsEntryDialogOpen(false);
    setSelectedItemForPurchase(null);
  }, [selectedItemForPurchase, toast]);

  const handlePrintInventory = () => window.print();

  const filteredAndSortedInventoryItems = useMemo(() => {
    let itemsToDisplay = [...inventoryItems];
    if (searchTermProducts) itemsToDisplay = itemsToDisplay.filter(item => item.name.toLowerCase().includes(searchTermProducts.toLowerCase()) || item.sku.toLowerCase().includes(searchTermProducts.toLowerCase()));
    itemsToDisplay.sort((a, b) => {
      const isALowStock = !a.isService && a.quantity <= a.lowStockThreshold; const isBLowStock = !b.isService && b.quantity <= b.lowStockThreshold;
      if (sortOptionProducts === "stock_status_name_asc") { if (isALowStock && !isBLowStock) return -1; if (!isALowStock && isBLowStock) return 1; return a.name.localeCompare(b.name); }
      if (sortOptionProducts === "type_asc") { if (a.isService && !b.isService) return 1; if (!a.isService && b.isService) return -1; return a.name.localeCompare(b.name); }
      if (isALowStock && !isBLowStock && sortOptionProducts !== 'quantity_asc' && sortOptionProducts !== 'quantity_desc') return -1;
      if (!isALowStock && isBLowStock && sortOptionProducts !== 'quantity_asc' && sortOptionProducts !== 'quantity_desc') return 1;
      switch (sortOptionProducts) {
        case 'name_asc': return a.name.localeCompare(b.name); case 'name_desc': return b.name.localeCompare(a.name); case 'sku_asc': return a.sku.localeCompare(b.sku); case 'sku_desc': return b.sku.localeCompare(a.sku);
        case 'quantity_asc': if(a.isService) return 1; if(b.isService) return -1; return a.quantity - b.quantity;
        case 'quantity_desc': if(a.isService) return 1; if(b.isService) return -1; return b.quantity - a.quantity;
        case 'price_asc': return a.sellingPrice - b.sellingPrice; case 'price_desc': return b.sellingPrice - a.sellingPrice;
        default: return a.name.localeCompare(b.name); 
      }
    });
    return itemsToDisplay;
  }, [inventoryItems, searchTermProducts, sortOptionProducts]);

  // ======== CATEGORÍAS TAB STATE & LOGIC ========
  const [searchTermCategories, setSearchTermCategories] = useState('');
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<InventoryCategory | null>(null);
  const [currentCategoryName, setCurrentCategoryName] = useState('');
  const [categoryToDelete, setCategoryToDelete] = useState<InventoryCategory | null>(null);

  const categoryProductCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    categories.forEach(cat => { counts[cat.id] = inventoryItems.filter(item => item.category === cat.name).length; });
    return counts;
  }, [categories, inventoryItems]);

  const filteredCategories = useMemo(() => {
    const filtered = searchTermCategories ? categories.filter(cat => cat.name.toLowerCase().includes(searchTermCategories.toLowerCase())) : categories;
    return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
  }, [categories, searchTermCategories]);

  const handleOpenAddCategoryDialog = useCallback(() => { setEditingCategory(null); setCurrentCategoryName(''); setIsCategoryDialogOpen(true); }, []);
  const handleOpenEditCategoryDialog = useCallback((category: InventoryCategory) => { setEditingCategory(category); setCurrentCategoryName(category.name); setIsCategoryDialogOpen(true); }, []);
  const handleSaveCategory = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault(); const categoryName = currentCategoryName.trim();
    if (!categoryName) { toast({ title: "Nombre Vacío", variant: "destructive" }); return; }
    const isDuplicate = categories.some(cat => cat.name.toLowerCase() === categoryName.toLowerCase() && cat.id !== editingCategory?.id);
    if (isDuplicate) { toast({ title: "Categoría Duplicada", variant: "destructive" }); return; }
    if (editingCategory) {
      const pIndex = placeholderCategories.findIndex(cat => cat.id === editingCategory.id);
      if (pIndex !== -1) placeholderCategories[pIndex].name = categoryName;
      toast({ title: "Categoría Actualizada" });
    } else {
      const newCategory: InventoryCategory = { id: `CAT${String(categories.length + 1).padStart(3, '0')}${Date.now().toString().slice(-3)}`, name: categoryName, };
      placeholderCategories.push(newCategory);
      toast({ title: "Categoría Agregada" });
    }
    await persistToFirestore(['categories']);
    setIsCategoryDialogOpen(false); setEditingCategory(null); setCurrentCategoryName('');
  }, [currentCategoryName, categories, editingCategory, toast]);
  const handleDeleteCategory = useCallback(async () => {
    if (!categoryToDelete) return;
    const pIndex = placeholderCategories.findIndex(cat => cat.id === categoryToDelete.id);
    if (pIndex !== -1) placeholderCategories.splice(pIndex, 1);
    await persistToFirestore(['categories']);
    toast({ title: "Categoría Eliminada" });
    setCategoryToDelete(null);
  }, [categoryToDelete, toast]);

  // ======== PROVEEDORES TAB STATE & LOGIC ========
  const [searchTermSuppliers, setSearchTermSuppliers] = useState('');
  const [isSupplierDialogOpen, setIsSupplierDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [sortOptionSuppliers, setSortOptionSuppliers] = useState<SupplierSortOption>("name_asc");

  const filteredAndSortedSuppliers = useMemo(() => {
    let itemsToDisplay = [...suppliers];
    if (searchTermSuppliers) itemsToDisplay = itemsToDisplay.filter(sup => sup.name.toLowerCase().includes(searchTermSuppliers.toLowerCase()) || (sup.contactPerson && sup.contactPerson.toLowerCase().includes(searchTermSuppliers.toLowerCase())));
    itemsToDisplay.sort((a, b) => {
      switch (sortOptionSuppliers) {
        case 'name_asc': return a.name.localeCompare(b.name); case 'name_desc': return b.name.localeCompare(a.name);
        case 'debt_asc': return (a.debtAmount || 0) - (b.debtAmount || 0); case 'debt_desc': return (b.debtAmount || 0) - (a.debtAmount || 0);
        default: return a.name.localeCompare(b.name);
      }
    });
    return itemsToDisplay;
  }, [suppliers, searchTermSuppliers, sortOptionSuppliers]);

  const handleOpenSupplierDialog = useCallback((supplier: Supplier | null = null) => { setEditingSupplier(supplier); setIsSupplierDialogOpen(true); }, []);
  const handleSaveSupplier = useCallback(async (formData: SupplierFormValues) => {
    if (editingSupplier) {
      const pIndex = placeholderSuppliers.findIndex(sup => sup.id === editingSupplier.id);
      if (pIndex !== -1) placeholderSuppliers[pIndex] = { ...placeholderSuppliers[pIndex], ...formData, debtAmount: Number(formData.debtAmount) || 0 };
      toast({ title: "Proveedor Actualizado" });
    } else {
      const newSupplier: Supplier = { id: `SUP_${Date.now().toString(36)}`, ...formData, debtAmount: Number(formData.debtAmount) || 0, };
      placeholderSuppliers.push(newSupplier);
      toast({ title: "Proveedor Agregado" });
    }
    await persistToFirestore(['suppliers']);
    setIsSupplierDialogOpen(false); setEditingSupplier(null);
  }, [editingSupplier, toast]);
  const handleDeleteSupplier = useCallback(async (supplierId: string) => {
    const pIndex = placeholderSuppliers.findIndex(sup => sup.id === supplierId);
    if (pIndex !== -1) { placeholderSuppliers.splice(pIndex, 1); await persistToFirestore(['suppliers']); toast({ title: "Proveedor Eliminado" }); }
  }, [toast]);

  // ======== ANÁLISIS IA TAB STATE & LOGIC ========
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<InventoryRecommendation[] | null>(null);
  
  const handleRunAnalysis = useCallback(async () => {
    setIsAnalysisLoading(true); setAnalysisError(null); setAnalysisResult(null);
    try {
      const inventoryForAI = inventoryItems.map(item => ({ id: item.id, name: item.name, quantity: item.quantity, lowStockThreshold: item.lowStockThreshold }));
      const servicesForAI = placeholderServiceRecords.map(service => ({ serviceDate: service.serviceDate, suppliesUsed: service.suppliesUsed.map(supply => ({ supplyId: supply.supplyId, quantity: supply.quantity }))}));
      const result = await analyzeInventory({ inventoryItems: inventoryForAI, serviceRecords: servicesForAI });
      setAnalysisResult(result.recommendations);
      toast({ title: "Análisis Completado", description: `La IA ha generado ${result.recommendations.length} recomendaciones.` });
    } catch (e) {
      console.error(e);
      setAnalysisError("La IA no pudo completar el análisis.");
      toast({ title: "Error de Análisis", variant: "destructive" });
    } finally {
      setIsAnalysisLoading(false);
    }
  }, [inventoryItems, toast]);

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
        
        {/* Informe Tab */}
        <TabsContent value="informe" className="space-y-6">
          <h2 className="text-2xl font-semibold tracking-tight">Resumen de Inventario</h2>
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Costo Total del Inventario</CardTitle><DollarSign className="h-4 w-4 text-green-500" /></CardHeader><CardContent><div className="text-2xl font-bold">${totalInventoryCost.toLocaleString('es-ES')}</div><p className="text-xs text-muted-foreground">Valor de venta: ${totalInventorySellingPrice.toLocaleString('es-ES')}</p></CardContent></Card>
            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Productos con Stock Bajo</CardTitle><AlertTriangle className="h-4 w-4 text-orange-500" /></CardHeader><CardContent><div className="text-2xl font-bold">{lowStockItemsCount}</div><p className="text-xs text-muted-foreground">Requieren atención o reposición.</p></CardContent></Card>
            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Ítems Registrados</CardTitle><Package className="h-4 w-4 text-blue-500" /></CardHeader><CardContent><div className="text-2xl font-bold">{productsCount + servicesCount}</div><p className="text-xs text-muted-foreground">{productsCount} Productos y {servicesCount} Servicios.</p></CardContent></Card>
          </div>
          <h2 className="text-2xl font-semibold tracking-tight pt-4">Resumen de Proveedores</h2>
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Deuda Total con Proveedores</CardTitle><DollarSign className="h-4 w-4 text-red-500" /></CardHeader><CardContent><div className="text-2xl font-bold">${totalDebtWithSuppliers.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</div><p className="text-xs text-muted-foreground">Suma de todas las deudas pendientes.</p></CardContent></Card>
            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Top Compras (Mes Pasado)</CardTitle><ShoppingCart className="h-4 w-4 text-blue-500" /></CardHeader><CardContent>{topSupplierLastMonth ? (<><div className="text-xl font-bold">{topSupplierLastMonth.name}</div><p className="text-xs text-muted-foreground">{topSupplierLastMonth.quantity} unidades suministradas.</p></>) : (<p className="text-muted-foreground">No se registraron compras.</p>)}</CardContent></Card>
          </div>
        </TabsContent>

        {/* Productos Tab */}
        <TabsContent value="productos" className="mt-6 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-semibold tracking-tight">Lista de Productos y Servicios</h2>
                    <p className="text-muted-foreground">Administra productos, servicios, niveles de stock y registra compras.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button onClick={handleOpenPurchaseItemSelection} variant="outline" className="bg-input text-foreground"><ShoppingCart className="mr-2 h-4 w-4" />Ingresar Compra</Button>
                    <Button onClick={() => { setIsCreatingItemForPurchaseFlow(false); setIsNewItemDialogOpen(true); }}><PlusCircle className="mr-2 h-4 w-4" />Nuevo</Button>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:flex-wrap gap-4">
                <div className="relative flex-1 min-w-[200px] sm:min-w-[300px]">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input type="search" placeholder="Buscar por nombre o SKU..." className="w-full rounded-lg bg-card pl-8" value={searchTermProducts} onChange={(e) => setSearchTermProducts(e.target.value)} />
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="outline" className="min-w-[150px] flex-1 sm:flex-initial bg-card"><ListFilter className="mr-2 h-4 w-4" />Ordenar por</Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end"><DropdownMenuLabel>Ordenar por</DropdownMenuLabel><DropdownMenuRadioGroup value={sortOptionProducts} onValueChange={(value) => setSortOptionProducts(value as InventorySortOption)}><DropdownMenuRadioItem value="stock_status_name_asc">Estado de Stock</DropdownMenuRadioItem><DropdownMenuRadioItem value="name_asc">Nombre (A-Z)</DropdownMenuRadioItem><DropdownMenuRadioItem value="name_desc">Nombre (Z-A)</DropdownMenuRadioItem><DropdownMenuRadioItem value="quantity_desc">Cantidad (Mayor a Menor)</DropdownMenuRadioItem><DropdownMenuRadioItem value="quantity_asc">Cantidad (Menor a Mayor)</DropdownMenuRadioItem><DropdownMenuRadioItem value="price_desc">Precio (Mayor a Menor)</DropdownMenuRadioItem><DropdownMenuRadioItem value="price_asc">Precio (Menor a Mayor)</DropdownMenuRadioItem><DropdownMenuRadioItem value="type_asc">Tipo (Producto/Servicio)</DropdownMenuRadioItem></DropdownMenuRadioGroup></DropdownMenuContent>
                </DropdownMenu>
            </div>
            
            <Card>
                <CardContent className="pt-6">
                    <InventoryTable items={filteredAndSortedInventoryItems} />
                </CardContent>
            </Card>
        </TabsContent>

        {/* Categorías Tab */}
        <TabsContent value="categorias" className="mt-6 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-semibold tracking-tight">Lista de Categorías</h2>
                    <p className="text-muted-foreground">Visualiza, edita y elimina categorías.</p>
                </div>
                <Button onClick={handleOpenAddCategoryDialog}><PlusCircle className="mr-2 h-4 w-4" />Nueva Categoría</Button>
            </div>

            <div className="relative sm:w-1/3"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input type="search" placeholder="Buscar categorías..." className="pl-8 bg-background" value={searchTermCategories} onChange={(e) => setSearchTermCategories(e.target.value)} /></div>
            
            <Card>
                <CardContent className="p-0">
                    {filteredCategories.length > 0 ? (
                        <div className="rounded-md border"><Table><TableHeader className="bg-black"><TableRow><TableHead className="text-white">Nombre de la Categoría</TableHead><TableHead className="text-right text-white">Productos</TableHead><TableHead className="text-right text-white">Acciones</TableHead></TableRow></TableHeader><TableBody>{filteredCategories.map((category) => (<TableRow key={category.id}><TableCell className="font-medium">{category.name}</TableCell><TableCell className="text-right">{categoryProductCounts[category.id] || 0}</TableCell><TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => handleOpenEditCategoryDialog(category)} className="mr-2"><Edit className="h-4 w-4" /></Button><AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon" onClick={() => setCategoryToDelete(category)}><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger>{categoryToDelete?.id === category.id && ( <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Eliminar Categoría?</AlertDialogTitle><AlertDialogDescription>¿Estás seguro de que quieres eliminar la categoría &quot;{categoryToDelete.name}&quot;? Esta acción no se puede deshacer.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel onClick={() => setCategoryToDelete(null)}>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDeleteCategory} className="bg-destructive hover:bg-destructive/90">Sí, Eliminar</AlertDialogAction></AlertDialogFooter></AlertDialogContent>)}</AlertDialog></TableCell></TableRow>))}</TableBody></Table></div>
                    ) : (<p className="text-muted-foreground text-center py-4">{searchTermCategories ? "No se encontraron categorías." : "No hay categorías registradas."}</p>)}
                </CardContent>
            </Card>
        </TabsContent>
        
        {/* Proveedores Tab */}
        <TabsContent value="proveedores" className="mt-6 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-semibold tracking-tight">Lista de Proveedores</h2>
                    <p className="text-muted-foreground">Visualiza, edita y elimina proveedores.</p>
                </div>
                <Button onClick={() => handleOpenSupplierDialog()}><PlusCircle className="mr-2 h-4 w-4" />Nuevo Proveedor</Button>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 w-full">
                <div className="relative flex-1 sm:flex-initial w-full sm:w-auto"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input type="search" placeholder="Buscar proveedores..." className="pl-8 w-full sm:w-[250px] lg:w-[300px] bg-background" value={searchTermSuppliers} onChange={(e) => setSearchTermSuppliers(e.target.value)} /></div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" className="w-full sm:w-auto bg-background"><ListFilter className="mr-2 h-4 w-4" />Ordenar</Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuLabel>Ordenar por</DropdownMenuLabel><DropdownMenuRadioGroup value={sortOptionSuppliers} onValueChange={(value) => setSortOptionSuppliers(value as SupplierSortOption)}><DropdownMenuRadioItem value="name_asc">Nombre (A-Z)</DropdownMenuRadioItem><DropdownMenuRadioItem value="name_desc">Nombre (Z-A)</DropdownMenuRadioItem><DropdownMenuRadioItem value="debt_desc">Deuda (Mayor a Menor)</DropdownMenuRadioItem><DropdownMenuRadioItem value="debt_asc">Deuda (Menor a Mayor)</DropdownMenuRadioItem></DropdownMenuRadioGroup></DropdownMenuContent></DropdownMenu>
                </div>
            </div>

            <Card>
                <CardContent className="p-0">
                    <SuppliersTable suppliers={filteredAndSortedSuppliers} onEdit={handleOpenSupplierDialog} onDelete={handleDeleteSupplier} />
                </CardContent>
            </Card>
        </TabsContent>
        
        {/* Análisis IA Tab */}
        <TabsContent value="analisis" className="mt-6 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-semibold tracking-tight">Análisis de Inventario con IA</h2>
                    <p className="text-muted-foreground">Obtén recomendaciones inteligentes sobre qué y cuándo reordenar.</p>
                </div>
                <Button onClick={handleRunAnalysis} disabled={isAnalysisLoading}>{isAnalysisLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BrainCircuit className="mr-2 h-4 w-4" />}{isAnalysisLoading ? "Analizando..." : "Analizar Inventario"}</Button>
            </div>
            
            <Card>
                <CardContent className="pt-6">
                    {!analysisResult && !isAnalysisLoading && !analysisError && (<Card className="flex flex-col items-center justify-center text-center p-12 border-dashed"><Package className="h-16 w-16 text-muted-foreground mb-4"/><CardTitle className="text-xl">Listo para analizar</CardTitle><CardDescription className="mt-2 max-w-md mx-auto">Haz clic en &quot;Analizar Inventario&quot; para que la IA revise tu stock y uso para generar recomendaciones.</CardDescription></Card>)}
                    {isAnalysisLoading && (<Card className="flex flex-col items-center justify-center text-center p-12 border-dashed"><Loader2 className="h-16 w-16 text-primary animate-spin mb-4"/><CardTitle className="text-xl">Procesando...</CardTitle><CardDescription className="mt-2 max-w-md mx-auto">La IA está calculando las tasas de consumo. Esto puede tomar un momento.</CardDescription></Card>)}
                    {analysisError && (<Card className="flex flex-col items-center justify-center text-center p-12 border-destructive bg-destructive/10 text-destructive-foreground"><AlertTriangle className="h-16 w-16 mb-4"/><CardTitle className="text-xl">Ocurrió un Error</CardTitle><CardDescription className="mt-2 text-destructive-foreground/80">{analysisError}</CardDescription></Card>)}
                    {analysisResult && (<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{analysisResult.length === 0 && (<div className="lg:col-span-3"><Card className="flex flex-col items-center justify-center text-center p-12 bg-green-50/50 border-green-200"><CheckCircle className="h-16 w-16 text-green-600 mb-4"/><CardTitle className="text-xl text-green-800">¡Todo en orden!</CardTitle><CardDescription className="mt-2 text-green-700">La IA ha revisado tu inventario y no se requieren compras inmediatas.</CardDescription></Card></div>)}{analysisResult.map((rec) => (<Card key={rec.itemId} className="shadow-lg"><CardHeader><CardTitle className="flex items-center gap-3"><AlertTriangle className="h-6 w-6 text-orange-500" />{rec.itemName}</CardTitle><CardDescription>{rec.recommendation}</CardDescription></CardHeader><CardContent className="space-y-3"><p className="text-sm text-muted-foreground">{rec.reasoning}</p><div className="flex justify-between items-center bg-muted/50 p-3 rounded-md"><span className="font-medium text-sm">Sugerencia de compra:</span><span className="font-bold text-lg text-primary flex items-center gap-2"><ShoppingCart className="h-5 w-5"/>{rec.suggestedReorderQuantity}</span></div></CardContent></Card>))}</div>)}
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
      
      {/* DIALOGS (SHARED) */}
      <InventoryItemDialog open={isNewItemDialogOpen} onOpenChange={setIsNewItemDialogOpen} item={isCreatingItemForPurchaseFlow ? { sku: searchTermForNewItemPurchase, name: searchTermForNewItemPurchase, isService: false } : null} onSave={handleSaveNewItem} categories={categories} suppliers={suppliers} />
      <PurchaseItemSelectionDialog open={isPurchaseItemSelectionDialogOpen} onOpenChange={setIsPurchaseItemSelectionDialogOpen} inventoryItems={inventoryItems} onItemSelected={handleItemSelectedForPurchase} onCreateNew={handleCreateNewItemForPurchase} />
      {selectedItemForPurchase && !selectedItemForPurchase.isService && (<PurchaseDetailsEntryDialog open={isPurchaseDetailsEntryDialogOpen} onOpenChange={setIsPurchaseDetailsEntryDialogOpen} item={selectedItemForPurchase} onSave={handleSavePurchaseDetails} onClose={() => { setIsPurchaseDetailsEntryDialogOpen(false); setSelectedItemForPurchase(null); }} /> )}
      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleSaveCategory}>
            <DialogHeader>
              <DialogTitle>{editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}</DialogTitle>
              <DialogDescription>{editingCategory ? 'Modifica el nombre de la categoría.' : 'Ingresa el nombre para la nueva categoría.'}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="category-name" className="text-right">Nombre</Label>
                <Input id="category-name" value={currentCategoryName} onChange={(e) => setCurrentCategoryName(capitalizeWords(e.target.value))} className="col-span-3" placeholder="Ej: Aceites" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCategoryDialogOpen(false)}>Cancelar</Button>
              <Button type="submit">{editingCategory ? 'Guardar Cambios' : 'Crear Categoría'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <SupplierDialog open={isSupplierDialogOpen} onOpenChange={setIsSupplierDialogOpen} supplier={editingSupplier} onSave={handleSaveSupplier} />
    </>
  );
}

// Wrapper component to use Suspense for useSearchParams
export default function InventarioPage() {
    return (
        <Suspense fallback={<div>Cargando...</div>}>
            <InventarioPageComponent />
        </Suspense>
    )
}
