
"use client";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PlusCircle, Printer, ShoppingCartIcon, AlertTriangle, PackageCheck, DollarSign, Search, ListFilter, Server } from "lucide-react";
import { InventoryTable } from "./components/inventory-table";
import { InventoryItemDialog } from "./components/inventory-item-dialog";
import { placeholderInventory, placeholderCategories, placeholderSuppliers } from "@/lib/placeholder-data";
import type { InventoryItem } from "@/types";
import { useState, useMemo, useEffect } from "react";
import type { InventoryItemFormValues } from "./components/inventory-item-form";
import { PurchaseItemSelectionDialog } from "./components/purchase-item-selection-dialog";
import { PurchaseDetailsEntryDialog, type PurchaseDetailsFormValues } from "./components/purchase-details-entry-dialog";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type InventorySortOption = 
  | "stock_status_name_asc" // Default: Low stock first, then by name A-Z
  | "name_asc" | "name_desc"
  | "sku_asc" | "sku_desc"
  | "quantity_asc" | "quantity_desc" // Will only apply to non-service items
  | "price_asc" | "price_desc"
  | "type_asc"; // New: Products first, then Services, then by name

export default function InventarioPage() {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>(placeholderInventory);
  const { toast } = useToast();
  const [isNewItemDialogOpen, setIsNewItemDialogOpen] = useState(false);
  
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
      isService: data.isService || false,
      quantity: data.isService ? 0 : Number(data.quantity),
      lowStockThreshold: data.isService ? 0 : Number(data.lowStockThreshold),
      unitPrice: Number(data.unitPrice),
      sellingPrice: Number(data.sellingPrice),
    };
    
    const updatedInventory = [...inventoryItems, newItem];
    setInventoryItems(updatedInventory);
    placeholderInventory.push(newItem); 
    
    toast({
      title: "Producto/Servicio Creado",
      description: `El ítem ${newItem.name} ha sido agregado al inventario.`,
    });
    setIsNewItemDialogOpen(false);

    if (isCreatingItemForPurchaseFlow) {
      setNewlyCreatedItemForPurchase(newItem); 
      setIsCreatingItemForPurchaseFlow(false); 
    }
  };

  useEffect(() => {
    if (newlyCreatedItemForPurchase) {
      setSelectedItemForPurchase(newlyCreatedItemForPurchase);
      if (newlyCreatedItemForPurchase.isService) {
         toast({ title: "Servicio Creado", description: `${newlyCreatedItemForPurchase.name} ha sido creado. No requiere ingreso de compra.`});
      } else {
        setIsPurchaseDetailsEntryDialogOpen(true);
      }
      setNewlyCreatedItemForPurchase(null); // Clear it after processing
    }
  }, [newlyCreatedItemForPurchase, toast]);


  const handleOpenPurchaseItemSelection = () => {
    setSelectedItemForPurchase(null);
    setIsPurchaseItemSelectionDialogOpen(true);
  };

  const handleItemSelectedForPurchase = (item: InventoryItem) => {
    setSelectedItemForPurchase(item);
    setIsPurchaseItemSelectionDialogOpen(false);
    if (item.isService) {
        toast({ title: "Es un Servicio", description: `${item.name} es un servicio y no requiere ingreso de compra de stock.`, variant: "default" });
        setSelectedItemForPurchase(null);
    } else {
        setIsPurchaseDetailsEntryDialogOpen(true);
    }
  };
  
  const handleCreateNewItemForPurchase = (searchTerm: string) => {
    setIsCreatingItemForPurchaseFlow(true);
    setSearchTermForNewItemPurchase(searchTerm); 
    setIsPurchaseItemSelectionDialogOpen(false);
    setIsNewItemDialogOpen(true); 
  };

  const handleSavePurchaseDetails = (details: PurchaseDetailsFormValues) => {
    if (!selectedItemForPurchase || selectedItemForPurchase.isService) {
      toast({ title: "Error", description: "No hay un artículo de stock seleccionado para la compra o es un servicio.", variant: "destructive" });
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
    setInventoryItems([...placeholderInventory]); 

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
  
  const { 
    totalInventoryCost, 
    totalInventorySellingPrice, 
    lowStockItemsCount,
    productsCount,
    servicesCount
  } = useMemo(() => {
    let cost = 0;
    let sellingPriceValue = 0; 
    let lowStock = 0;
    let products = 0;
    let services = 0;

    inventoryItems.forEach(item => {
      if (item.isService) {
        services++;
      } else {
        products++;
        cost += item.quantity * item.unitPrice;
        sellingPriceValue += item.quantity * item.sellingPrice;
        if (item.quantity <= item.lowStockThreshold) {
          lowStock++;
        }
      }
    });
    return { 
      totalInventoryCost: cost, 
      totalInventorySellingPrice: sellingPriceValue, 
      lowStockItemsCount: lowStock,
      productsCount: products,
      servicesCount: services
    };
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
      const isALowStock = !a.isService && a.quantity <= a.lowStockThreshold;
      const isBLowStock = !b.isService && b.quantity <= b.lowStockThreshold;

      if (sortOption === "stock_status_name_asc") {
        if (isALowStock && !isBLowStock) return -1;
        if (!isALowStock && isBLowStock) return 1;
        return a.name.localeCompare(b.name);
      }
      
      if (sortOption === "type_asc") {
        if (a.isService && !b.isService) return 1;
        if (!a.isService && b.isService) return -1;
        return a.name.localeCompare(b.name);
      }
      
      // For other sort options, low stock items might still appear first if not sorting by type
      if (isALowStock && !isBLowStock && sortOption !== 'quantity_asc' && sortOption !== 'quantity_desc') return -1;
      if (!isALowStock && isBLowStock && sortOption !== 'quantity_asc' && sortOption !== 'quantity_desc') return 1;
      

      switch (sortOption) {
        case 'name_asc': return a.name.localeCompare(b.name);
        case 'name_desc': return b.name.localeCompare(a.name);
        case 'sku_asc': return a.sku.localeCompare(b.sku);
        case 'sku_desc': return b.sku.localeCompare(a.sku);
        case 'quantity_asc': 
          if(a.isService) return 1; // services last
          if(b.isService) return -1; // services last
          return a.quantity - b.quantity;
        case 'quantity_desc': 
          if(a.isService) return 1;
          if(b.isService) return -1;
          return b.quantity - a.quantity;
        case 'price_asc': return a.sellingPrice - b.sellingPrice;
        case 'price_desc': return b.sellingPrice - a.sellingPrice;
        default: return a.name.localeCompare(b.name); 
      }
    });
  }, [inventoryItems, searchTerm, selectedCategoryFilter, sortOption]);

  return (
    <>
      <div className="mb-6 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Productos en Stock
            </CardTitle>
            <PackageCheck className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">{productsCount}</div>
            <p className="text-xs text-muted-foreground">
              Ítems únicos que no son servicios.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Servicios Registrados
            </CardTitle>
            <Server className="h-5 w-5 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">{servicesCount}</div>
            <p className="text-xs text-muted-foreground">
              Servicios ofrecidos como ítems.
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
              Costo Total del Inventario
            </CardTitle>
            <DollarSign className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">${totalInventoryCost.toLocaleString('es-ES')}</div>
            <p className="text-xs text-muted-foreground">
              Valor de venta: ${totalInventorySellingPrice.toLocaleString('es-ES')}
            </p>
          </CardContent>
        </Card>
      </div>

      <PageHeader
        title="Productos y Servicios"
        description="Administra productos, servicios, niveles de stock y registra compras."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button onClick={handlePrintInventory} className="bg-blue-200 text-blue-800 hover:bg-blue-300 dark:bg-blue-800 dark:text-blue-200 dark:hover:bg-blue-700">
              <Printer className="mr-2 h-4 w-4" />
              Imprimir Lista
            </Button>
            <Button onClick={handleOpenPurchaseItemSelection} className="bg-green-200 text-green-800 hover:bg-green-300 dark:bg-green-800 dark:text-green-200 dark:hover:bg-green-700">
              <ShoppingCartIcon className="mr-2 h-4 w-4" />
              Ingresar Compra
            </Button>
            <Button onClick={() => { setIsCreatingItemForPurchaseFlow(false); setIsNewItemDialogOpen(true); }}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Nuevo Producto/Servicio
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
            className="w-full rounded-lg bg-white pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="min-w-[150px] flex-1 sm:flex-initial sm:ml-2 bg-white">
              <ListFilter className="mr-2 h-4 w-4" />
              Ordenar
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Ordenar por</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={sortOption} onValueChange={(value) => setSortOption(value as InventorySortOption)}>
              <DropdownMenuRadioItem value="stock_status_name_asc">Stock Bajo (luego Nombre A-Z)</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="type_asc">Tipo (Producto, luego Servicio)</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="name_asc">Nombre (A-Z)</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="name_desc">Nombre (Z-A)</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="sku_asc">Código (A-Z)</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="sku_desc">Código (Z-A)</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="quantity_asc">Cantidad (Menor a Mayor, solo productos)</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="quantity_desc">Cantidad (Mayor a Menor, solo productos)</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="price_asc">Precio Venta (Menor a Mayor)</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="price_desc">Precio Venta (Mayor a Menor)</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <Select value={selectedCategoryFilter} onValueChange={setSelectedCategoryFilter}>
          <SelectTrigger className="w-full sm:w-auto min-w-[200px] flex-1 sm:flex-initial bg-white">
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
        item={isCreatingItemForPurchaseFlow ? { sku: searchTermForNewItemPurchase, name: searchTermForNewItemPurchase, isService: false } : null}
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

      {selectedItemForPurchase && !selectedItemForPurchase.isService && (
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
