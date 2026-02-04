// src/app/(app)/inventario/compras/page.tsx
"use client";

import React, { useState, useEffect, useCallback, Suspense, useMemo } from "react";
import { PlusCircle, Filter, Check, Loader2, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type {
  User,
  Supplier,
  PayableAccount,
  InventoryItem,
  InventoryCategory,
} from "@/types";
import { inventoryService, purchaseService } from "@/lib/services";
import { TabbedPageLayout } from "@/components/layout/tabbed-page-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AUTH_USER_LOCALSTORAGE_KEY } from "@/lib/placeholder-data";
import type { PurchaseFormValues } from './components/register-purchase-dialog';
import type { InventoryItemFormValues } from '@/schemas/inventory-item-form-schema';
import type { SupplierFormValues } from '@/schemas/supplier-form-schema';
import { SuppliersTable } from "./components/suppliers-table";
import { TableToolbar } from "@/components/shared/table-toolbar";
import { useTableManager } from "@/hooks/useTableManager";
import dynamic from "next/dynamic";
import { PurchaseDetailDialog } from "./components/purchase-detail-dialog";
import { PurchasesTable } from "./components/purchases-table";
import { startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { parseDate } from "@/lib/forms";

const CuentasPorPagarContent = dynamic(
  () =>
    import("./components/cuentas-por-pagar-content").then((m) => ({
      default: m.CuentasPorPagarContent,
    })),
  { ssr: false }
);

const RegisterPurchaseDialog = dynamic(
  () =>
    import("./components/register-purchase-dialog").then((m) => ({
      default: m.RegisterPurchaseDialog,
    })),
  { ssr: false }
);

const PayableAccountDialog = dynamic(() =>
    import("./components/payable-account-dialog").then((m) => ({ default: m.PayableAccountDialog })),
    { ssr: false }
);
const SupplierDialog = dynamic(() =>
    import("./components/supplier-dialog").then((m) => ({ default: m.SupplierDialog })),
    { ssr: false }
);

const sortOptionsProveedores = [
  { value: "name_asc", label: "Nombre (A-Z)" },
  { value: "name_desc", label: "Nombre (Z-A)" },
  { value: "contactPerson_asc", label: "Contacto (A-Z)" },
  { value: "contactPerson_desc", label: "Contacto (Z-A)" },
  { value: "debtAmount_desc", label: "Deuda (Mayor a Menor)" },
  { value: "debtAmount_asc", label: "Deuda (Menor a Mayor)" },
];

function MultiSelectFilter({ 
  label, 
  options, 
  selected, 
  onToggle, 
  onClear,
  searchPlaceholder = "Buscar..."
}: { 
  label: string, 
  options: { value: string, label: string }[], 
  selected: string[], 
  onToggle: (val: string) => void,
  onClear: () => void,
  searchPlaceholder?: string
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-10 bg-card border-dashed">
          <Filter className="mr-2 h-4 w-4" />
          {label}
          {selected.length > 0 && (
            <Badge variant="secondary" className="ml-2 px-1 font-normal">
              {selected.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>No se encontraron resultados.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  onSelect={() => onToggle(option.value)}
                >
                  <Checkbox 
                    checked={selected.includes(option.value)}
                    className="mr-2"
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
          {selected.length > 0 && (
            <>
              <Separator />
              <div className="p-1">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full text-xs" 
                  onClick={onClear}
                >
                  Limpiar filtros
                </Button>
              </div>
            </>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function ComprasTabContent({ 
  purchases, 
  suppliers, 
  onRowClick 
}: { 
  purchases: any[], 
  suppliers: Supplier[], 
  onRowClick: (p: any) => void 
}) {
  const { filteredData, ...tableManager } = useTableManager<any>({
    initialData: purchases,
    searchKeys: ['invoiceId', 'supplierName', 'items.itemName'],
    dateFilterKey: (item) => parseDate(item.invoiceDate || item.createdAt),
    initialSortOption: 'invoiceDate_desc',
  });

  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);
  const [selectedMethods, setSelectedMethods] = useState<string[]>([]);

  const supplierOptions = useMemo(() => 
    suppliers.map(s => ({ value: s.id, label: s.name })).sort((a,b) => a.label.localeCompare(b.label)), 
  [suppliers]);

  const methodOptions = [
    { value: 'Efectivo', label: 'Efectivo' },
    { value: 'Tarjeta', label: 'Tarjeta' },
    { value: 'Tarjeta MSI', label: 'Tarjeta MSI' },
    { value: 'Transferencia', label: 'Transferencia' },
    { value: 'Crédito', label: 'Crédito' },
  ];

  const handleToggleSupplier = (id: string) => {
    const next = selectedSuppliers.includes(id) 
      ? selectedSuppliers.filter(s => s !== id) 
      : [...selectedSuppliers, id];
    setSelectedSuppliers(next);
    tableManager.setOtherFilters(prev => ({ ...prev, supplierId: next.length ? next : "all" }));
  };

  const handleToggleMethod = (method: string) => {
    const next = selectedMethods.includes(method) 
      ? selectedMethods.filter(m => m !== method) 
      : [...selectedMethods, method];
    setSelectedMethods(next);
    tableManager.setOtherFilters(prev => ({ ...prev, paymentMethod: next.length ? next : "all" }));
  };

  const setThisMonth = () => {
    const now = new Date();
    tableManager.onDateRangeChange({ from: startOfMonth(now), to: endOfMonth(now) });
  };

  const setLastMonth = () => {
    const last = subMonths(new Date(), 1);
    tableManager.onDateRangeChange({ from: startOfMonth(last), to: endOfMonth(last) });
  };

  return (
    <div className="space-y-4 pt-4">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row gap-2 items-center">
          <div className="relative flex-grow w-full">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por folio, proveedor o artículo..."
              value={tableManager.searchTerm}
              onChange={(e) => tableManager.onSearchTermChange(e.target.value)}
              className="pl-8 bg-card h-10"
            />
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-2 items-center justify-end">
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" size="sm" onClick={setThisMonth} className="flex-1 sm:flex-none bg-card">
              Este Mes
            </Button>
            <Button variant="outline" size="sm" onClick={setLastMonth} className="flex-1 sm:flex-none bg-card">
              Mes Pasado
            </Button>
          </div>
          <TableToolbar
            dateRange={tableManager.dateRange}
            onDateRangeChange={tableManager.onDateRangeChange}
          />
          <div className="flex gap-2 w-full md:w-auto">
            <MultiSelectFilter 
              label="Proveedores"
              options={supplierOptions}
              selected={selectedSuppliers}
              onToggle={handleToggleSupplier}
              onClear={() => { setSelectedSuppliers([]); tableManager.setOtherFilters(prev => ({ ...prev, supplierId: "all" })); }}
            />
            <MultiSelectFilter 
              label="Métodos Pago"
              options={methodOptions}
              selected={selectedMethods}
              onToggle={handleToggleMethod}
              onClear={() => { setSelectedMethods([]); tableManager.setOtherFilters(prev => ({ ...prev, paymentMethod: "all" })); }}
            />
          </div>
        </div>
      </div>

      <PurchasesTable 
        purchases={filteredData} 
        onRowClick={onRowClick}
        sortOption={tableManager.sortOption}
        onSortOptionChange={tableManager.onSortOptionChange}
      />
    </div>
  );
}

function ProveedoresTabContent({ suppliers }: { suppliers: Supplier[] }) {
  const { filteredData, ...tableManager } = useTableManager<Supplier>({
    initialData: suppliers,
    searchKeys: ["name", "contactPerson", "phone"],
    dateFilterKey: "",
    initialSortOption: "name_asc",
  });

  const [isSupplierDialogOpen, setIsSupplierDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const { toast } = useToast();

  const handleOpenSupplierDialog = useCallback((supplier: Supplier | null = null) => {
    setEditingSupplier(supplier);
    setIsSupplierDialogOpen(true);
  }, []);

  const handleSaveSupplier = useCallback(
    async (formData: SupplierFormValues) => {
      try {
        await inventoryService.saveSupplier(formData as any, editingSupplier?.id);
        toast({
          title: `Proveedor ${editingSupplier ? "Actualizado" : "Agregado"}`,
        });
        setIsSupplierDialogOpen(false);
      } catch {
        toast({ title: "Error al guardar", variant: "destructive" });
      }
    },
    [editingSupplier, toast]
  );

  const handleDeleteSupplier = useCallback(
    async (supplierId: string) => {
      try {
        await inventoryService.deleteSupplier(supplierId);
        toast({ title: "Proveedor Eliminar" });
      } catch {
        toast({ title: "Error al eliminar", variant: "destructive" });
      }
    },
    [toast]
  );

  const handleRowClick = (supplierId: string) => {
    window.location.href = `/inventario/proveedores/${supplierId}`;
  };

  return (
    <div className="space-y-4">
      <TableToolbar
        {...tableManager}
        searchPlaceholder="Buscar por nombre o contacto..."
        sortOptions={sortOptionsProveedores}
        actions={
          <Button
            onClick={() => handleOpenSupplierDialog()}
            className="w-full sm:w-auto"
          >
            <PlusCircle className="mr-2 h-4 w-4" /> Nuevo Proveedor
          </Button>
        }
      />
      <SuppliersTable
        suppliers={filteredData}
        onEdit={handleOpenSupplierDialog}
        onDelete={handleDeleteSupplier}
        onRowClick={handleRowClick}
        sortOption={tableManager.sortOption}
        onSortOptionChange={tableManager.onSortOptionChange}
      />

      <SupplierDialog
        open={isSupplierDialogOpen}
        onOpenChange={setIsSupplierDialogOpen}
        supplier={editingSupplier}
        onSave={handleSaveSupplier}
      />
    </div>
  );
}

export default function ComprasUnificadasPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("compras");

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [payableAccounts, setPayableAccounts] = useState<PayableAccount[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<PayableAccount | null>(
    null
  );
  const [isNewPurchaseDialogOpen, setIsNewPurchaseDialogOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<any | null>(null);
  const [isPurchaseDetailOpen, setIsPurchaseDetailOpen] = useState(false);
  
  const sortedSuppliers = React.useMemo(() => 
    [...suppliers].sort((a, b) => a.name.localeCompare(b.name)),
  [suppliers]);

  useEffect(() => {
    let alive = true;
    setIsLoading(true);

    const u1 = inventoryService.onSuppliersUpdate((d) => {
      if (!alive) return;
      setSuppliers(d);
    });
    const u2 = purchaseService.onPayableAccountsUpdate((d) => {
      if (!alive) return;
      setPayableAccounts(d);
    });
    const u3 = inventoryService.onItemsUpdate((d) => {
      if (!alive) return;
      setInventoryItems(d);
    });
    const u4 = inventoryService.onCategoriesUpdate((d) => {
      if (!alive) return;
      setCategories(d);
    });
    const u5 = purchaseService.onPurchasesUpdate((d) => {
        if (!alive) return;
        setPurchases(d);
        setIsLoading(false);
    })

    return () => {
      alive = false;
      [u1, u2, u3, u4, u5].forEach((u) => u && u());
    };
  }, []);

  const handleOpenPaymentDialog = useCallback((account: PayableAccount) => {
    setSelectedAccount(account);
    setIsPaymentDialogOpen(true);
  }, []);

  const handleRegisterPayment = useCallback(
    async (
      accountId: string,
      amount: number,
      paymentMethod: any,
      note?: string
    ) => {
      try {
        const userString = localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY);
        const user: User | null = userString ? JSON.parse(userString) : null;
        await purchaseService.registerPayableAccountPayment(
          accountId,
          amount,
          paymentMethod,
          note,
          user
        );
        toast({ title: "Pago Registrado" });
        setIsPaymentDialogOpen(false);
      } catch {
        toast({ title: "Error", variant: "destructive" });
      }
    },
    [toast]
  );

  const handleSavePurchase = useCallback(
    async (data: PurchaseFormValues) => {
      await purchaseService.registerPurchase(data);
      toast({
        title: "Compra Registrada",
        description: `La compra de ${data.items.length} artículo(s) ha sido registrada.`,
      });
      setIsNewPurchaseDialogOpen(false);
    },
    [toast]
  );

  const handleInventoryItemCreatedFromPurchase = useCallback(async (formData: InventoryItemFormValues): Promise<InventoryItem> => {
      const newItem = await inventoryService.addItem(formData);
      toast({ title: "Producto Creado", description: `"${newItem.name}" ha sido agregado al inventario.` });
      return newItem;
  }, [toast]);

  const handleRowClick = (purchase: any) => {
    setSelectedPurchase(purchase);
    setIsPurchaseDetailOpen(true);
  };

  const handleDeletePurchase = async (purchaseId: string) => {
    try {
      const authUserString = localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY);
      const currentUser = authUserString ? JSON.parse(authUserString) : null;
      await purchaseService.deletePurchase(purchaseId, currentUser);
      toast({ title: "Compra Anulada", description: "El stock y las deudas han sido restaurados." });
      setIsPurchaseDetailOpen(false);
    } catch (e: any) {
      toast({ title: "Error al anular compra", description: e.message, variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const tabs = [
    { 
      value: "compras", 
      label: "Compras", 
      content: <ComprasTabContent purchases={purchases} suppliers={suppliers} onRowClick={handleRowClick} />
    },
    {
      value: "proveedores",
      label: "Proveedores",
      content: <ProveedoresTabContent suppliers={suppliers} />,
    },
    {
      value: "cuentas_por_pagar",
      label: "Cuentas por Pagar",
      content: (
        <CuentasPorPagarContent
          accounts={payableAccounts}
          onRegisterPayment={handleOpenPaymentDialog}
        />
      ),
    },
  ];

  const pageActions = (
    <Button
      onClick={() => setIsNewPurchaseDialogOpen(true)}
      className="w-full sm:w-auto"
    >
      <PlusCircle className="mr-2 h-4 w-4" /> Registrar Nueva Compra
    </Button>
  );

  return (
    <>
      <TabbedPageLayout
        title="Compras y Proveedores"
        description="Gestiona tus compras, proveedores y cuentas por pagar desde un solo lugar."
        activeTab={activeTab}
        onTabChange={setActiveTab}
        tabs={tabs}
        actions={pageActions}
      />
      
      {selectedAccount && (
        <PayableAccountDialog
          open={isPaymentDialogOpen}
          onOpenChange={setIsPaymentDialogOpen}
          account={selectedAccount}
          onSave={handleRegisterPayment}
        />
      )}

      {isNewPurchaseDialogOpen && (
        <RegisterPurchaseDialog
          open={isNewPurchaseDialogOpen}
          onOpenChange={setIsNewPurchaseDialogOpen}
          suppliers={sortedSuppliers}
          inventoryItems={inventoryItems}
          onSave={handleSavePurchase}
          onInventoryItemCreated={handleInventoryItemCreatedFromPurchase}
          categories={categories}
        />
      )}

      {selectedPurchase && (
        <PurchaseDetailDialog
          open={isPurchaseDetailOpen}
          onOpenChange={setIsPurchaseDetailOpen}
          purchase={selectedPurchase}
          onDelete={handleDeletePurchase}
        />
      )}
    </>
  );
}
