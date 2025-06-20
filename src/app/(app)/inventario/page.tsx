
"use client";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PlusCircle, Printer, ShoppingCartIcon, AlertTriangle, PackageCheck, DollarSign, Search, ListFilter } from "lucide-react";
import { InventoryTable } from "./components/inventory-table";
import { InventoryItemDialog } from "./components/inventory-item-dialog";
import { placeholderInventory, placeholderCategories, placeholderSuppliers } from "@/lib/placeholder-data";
import type { InventoryItem } from "@/types";
import { useState, useMemo } from "react";
import type { InventoryItemFormValues } from "./components/inventory-item-form";
import { PurchaseItemSelectionDialog } from "./components/purchase-item-selection-dialog";
import { PurchaseDetailsEntryDialog, type PurchaseDetailsFormValues } from "./components/purchase-details-entry-dialog";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type InventorySortOption = 
  | "stock_status_name_asc"
  | "name_asc" | "name_desc"
  | "sku_asc" | "sku_desc"
  | "quantity_asc" | "quantity_desc"
  | "price_asc" | "price_desc";

export default function InventarioPage() {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>(placeholderInventory);
  const { toast } = useToast();
  const [isNewItemDialogOpen, setIsNewItemDialogOpen] = useState(false);
  
  // States for new purchase entry flow
  const [isPurchaseItemSelectionDialogOpen, setIsPurchaseItemSelectionDialogOpen] = useState(false);
  const [isPurchaseDetailsEntryDialogOpen, setIsPurchaseDetailsEntryDialogOpen] = useState(false);
  const [selectedItemForPurchase, setSelectedItemForPurchase] = useState<InventoryItem | null>(null);
  const [isCreatingItemForPurchaseFlow, setIsCreatingItemForPurchaseFlow] = useState(false);
  const [newlyCreatedItemForPurchase, setNewlyCreatedItemForPurchase] = useState<InventoryItem | null>(null);
  const [searchTermForNewItemPurchase, setSearchTermForNewItemPurchase] = useState('');


  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("all");
  const [sortOption, setSortOption] = useState<InventorySortOption>("stock_status_name_asc");

  const handleSaveNewItem = async (data: InventoryItemFormValues) => {
    const newItem: InventoryItem = {
      id: `P${String(inventoryItems.length + 1).padStart(3, '0')}${Date.now().toString().slice(-3)}`, 
      ...data,
      unitPrice: Number(data.unitPrice),
      sellingPrice: Number(data.sellingPrice),
      quantity: Number(data.quantity),
      lowStockThreshold: Number(data.lowStockThreshold),
    };
    
    const updatedInventory = [...inventoryItems, newItem];
    setInventoryItems(updatedInventory);
    placeholderInventory.push(newItem); 
    
    toast({
      title: "Producto Creado",
      description: `El producto ${newItem.name} ha sido agregado al inventario.`,
    });
    setIsNewItemDialogOpen(false);

    if (isCreatingItemForPurchaseFlow) {
      setNewlyCreatedItemForPurchase(newItem); // Store it temporarily
      setIsCreatingItemForPurchaseFlow(false); 
      // The useEffect below will pick this up and open the details dialog
    }
  };

  // Effect to open PurchaseDetailsEntryDialog after a new item is created in purchase flow
  useEffect(() => {
    if (newlyCreatedItemForPurchase) {
      setSelectedItemForPurchase(newlyCreatedItemForPurchase);
      setIsPurchaseDetailsEntryDialogOpen(true);
      setNewlyCreatedItemForPurchase(null); // Reset for next time
    }
  }, [newlyCreatedItemForPurchase]);


  const handleOpenPurchaseItemSelection = () => {
    setSelectedItemForPurchase(null);
    setIsPurchaseItemSelectionDialogOpen(true);
  };

  const handleItemSelectedForPurchase = (item: InventoryItem) => {
    setSelectedItemForPurchase(item);
    setIsPurchaseItemSelectionDialogOpen(false);
    setIsPurchaseDetailsEntryDialogOpen(true);
  };
  
  const handleCreateNewItemForPurchase = (searchTerm: string) => {
    setIsCreatingItemForPurchaseFlow(true);
    setSearchTermForNewItemPurchase(searchTerm); // Store search term to prefill
    setIsPurchaseItemSelectionDialogOpen(false);
    setIsNewItemDialogOpen(true); // This will open the standard InventoryItemDialog
  };

  const handleSavePurchaseDetails = (details: PurchaseDetailsFormValues) => {
    if (!selectedItemForPurchase) {
      toast({ title: "Error", description: "No hay un artículo seleccionado para la compra.", variant: "destructive" });
      return;
    }

    const itemIndex = placeholderInventory.findIndex(item => item.id === selectedItemForPurchase.id);
    if (itemIndex === -1) {
       toast({ title: "Error", description: `El artículo ${selectedItemForPurchase.name} no se encontró para actualizar.`, variant: "destructive" });
       return;
    }

    const updatedItem = {
      ...placeholderInventory[itemIndex],
      quantity: placeholderInventory[itemIndex].quantity + details.quantityPurchased,
      unitPrice: details.newCostPrice,
      sellingPrice: details.newSellingPrice,
    };
    placeholderInventory[itemIndex] = updatedItem;
    setInventoryItems([...placeholderInventory]); // Trigger re-render

    toast({
      title: "Compra Registrada",
      description: `Se actualizó el stock, costo y precio de venta para ${updatedItem.name}.`,
    });

    setIsPurchaseDetailsEntryDialogOpen(false);
    setSelectedItemForPurchase(null);
  };


  const handlePrintInventory = () => {
    toast({
        title: "Imprimir Productos",
        description: "La funcionalidad de impresión detallada se implementará próximamente. Actualmente, esto imprimiría la vista actual.",
    });
  };
  
  const { totalInventoryCost, totalInventorySellingPrice, lowStockItemsCount } = useMemo(() => {
    let cost = 0;
    let sellingPriceValue = 0; 
    let lowStock = 0;

    inventoryItems.forEach(item => {
      cost += item.quantity * item.unitPrice;
      sellingPriceValue += item.quantity * item.sellingPrice;
      if (item.quantity <= item.lowStockThreshold) {
        lowStock++;
      }
    });
    return { totalInventoryCost: cost, totalInventorySellingPrice: sellingPriceValue, lowStockItemsCount: lowStock };
  }, [inventoryItems]);

  const uniqueCategoriesForFilter = useMemo(() => {
    const categories = new Set(inventoryItems.map(item => item.category).filter(Boolean) as string[]);
    return ["all", ...Array.from(categories)];
  }, [inventoryItems]);

  const filteredAndSortedInventoryItems = useMemo(() => {
    let itemsToDisplay = [...inventoryItems];

    if (searchTerm) {
      itemsToDisplay = itemsToDisplay.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedCategoryFilter && selectedCategoryFilter !== "all") {
      itemsToDisplay = itemsToDisplay.filter(item => item.category === selectedCategoryFilter);
    }
    
    return itemsToDisplay.sort((a, b) => {
      const isALowStock = a.quantity <= a.lowStockThreshold;
      const isBLowStock = b.quantity <= b.lowStockThreshold;

      if (sortOption === "stock_status_name_asc") {
        if (isALowStock && !isBLowStock) return -1;
        if (!isALowStock && isBLowStock) return 1;
        return a.name.localeCompare(b.name);
      }

      if (isALowStock && !isBLowStock) return -1;
      if (!isALowStock && isBLowStock) return 1;
      

      switch (sortOption) {
        case 'name_asc': return a.name.localeCompare(b.name);
        case 'name_desc': return b.name.localeCompare(a.name);
        case 'sku_asc': return a.sku.localeCompare(b.sku);
        case 'sku_desc': return b.sku.localeCompare(a.sku);
        case 'quantity_asc': return a.quantity - b.quantity;
        case 'quantity_desc': return b.quantity - a.quantity;
        case 'price_asc': return a.sellingPrice - b.sellingPrice;
        case 'price_desc': return b.sellingPrice - a.sellingPrice;
        default: return a.name.localeCompare(b.name); 
      }
    });
  }, [inventoryItems, searchTerm, selectedCategoryFilter, sortOption]);

  return (
    <>
      <div className="mb-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Costo Total del Inventario
            </CardTitle>
            <DollarSign className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">${totalInventoryCost.toLocaleString('es-ES')}</div>
            <p className="text-xs text-muted-foreground">
              Valor de Venta Total: ${totalInventorySellingPrice.toLocaleString('es-ES')}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Productos con Stock Bajo
            </CardTitle>
            <AlertTriangle className="h-5 w-5 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">{lowStockItemsCount}</div>
            <p className="text-xs text-muted-foreground">
              Requieren atención o reposición.
            </p>
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Productos Únicos
            </CardTitle>
            <PackageCheck className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">{inventoryItems.length}</div>
            <p className="text-xs text-muted-foreground">
              Tipos de productos diferentes en stock.
            </p>
          </CardContent>
        </Card>
      </div>

      <PageHeader
        title="Productos"
        description="Administra los niveles de stock, registra compras y ventas de repuestos."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handlePrintInventory}>
              <Printer className="mr-2 h-4 w-4" />
              Imprimir Productos
            </Button>
            <Button variant="outline" onClick={handleOpenPurchaseItemSelection}>
              <ShoppingCartIcon className="mr-2 h-4 w-4" />
              Ingresar Compra
            </Button>
            <Button onClick={() => { setIsCreatingItemForPurchaseFlow(false); setIsNewItemDialogOpen(true); }}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Nuevo Producto
            </Button>
          </div>
        }
      />

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:flex-wrap">
        <div className="relative flex-1 min-w-[200px] sm:min-w-[300px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar por código o nombre..."
            className="w-full rounded-lg bg-background pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="min-w-[150px] flex-1 sm:flex-initial sm:ml-2">
              <ListFilter className="mr-2 h-4 w-4" />
              Ordenar
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Ordenar por</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={sortOption} onValueChange={(value) => setSortOption(value as InventorySortOption)}>
              <DropdownMenuRadioItem value="stock_status_name_asc">Stock Bajo (luego Nombre A-Z)</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="name_asc">Nombre (A-Z)</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="name_desc">Nombre (Z-A)</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="sku_asc">Código (A-Z)</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="sku_desc">Código (Z-A)</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="quantity_asc">Cantidad (Menor a Mayor)</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="quantity_desc">Cantidad (Mayor a Menor)</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="price_asc">Precio Venta (Menor a Mayor)</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="price_desc">Precio Venta (Mayor a Menor)</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <Select value={selectedCategoryFilter} onValueChange={setSelectedCategoryFilter}>
          <SelectTrigger className="w-full sm:w-auto min-w-[200px] flex-1 sm:flex-initial">
            <SelectValue placeholder="Filtrar por categoría" />
          </SelectTrigger>
          <SelectContent>
            {uniqueCategoriesForFilter.map(category => (
              <SelectItem key={category} value={category}>
                {category === "all" ? "Todas las categorías" : category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <InventoryTable items={filteredAndSortedInventoryItems} />

      <InventoryItemDialog
        open={isNewItemDialogOpen}
        onOpenChange={setIsNewItemDialogOpen}
        item={isCreatingItemForPurchaseFlow ? { sku: searchTermForNewItemPurchase, name: searchTermForNewItemPurchase } : null}
        onSave={handleSaveNewItem}
        categories={placeholderCategories} 
        suppliers={placeholderSuppliers}
      />

      <PurchaseItemSelectionDialog
        open={isPurchaseItemSelectionDialogOpen}
        onOpenChange={setIsPurchaseItemSelectionDialogOpen}
        inventoryItems={inventoryItems}
        onItemSelected={handleItemSelectedForPurchase}
        onCreateNew={handleCreateNewItemForPurchase}
      />

      {selectedItemForPurchase && (
        <PurchaseDetailsEntryDialog
          open={isPurchaseDetailsEntryDialogOpen}
          onOpenChange={setIsPurchaseDetailsEntryDialogOpen}
          item={selectedItemForPurchase}
          onSave={handleSavePurchaseDetails}
          onClose={() => {
            setIsPurchaseDetailsEntryDialogOpen(false);
            setSelectedItemForPurchase(null);
          }}
        />
      )}
    </>
  );
}
