
// src/app/(app)/inventario/compras/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { PlusCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
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
import { AUTH_USER_LOCALSTORAGE_KEY } from "@/lib/placeholder-data";
import type { PurchaseFormValues } from "./components/register-purchase-dialog";
import type { InventoryItemFormValues } from "@/schemas/inventory-item-form-schema";
import type { SupplierFormValues } from "@/schemas/supplier-form-schema";
import { SuppliersTable } from "./components/suppliers-table";
import { TableToolbar } from "@/components/shared/table-toolbar";
import { useTableManager } from "@/hooks/useTableManager";

const ComprasContent = dynamic(() => import("./components/compras-content"), {
  ssr: false,
  loading: () => (
    <div className="flex h-64 items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>
  ),
});
const CuentasPorPagarContent = dynamic(
  () =>
    import("./components/cuentas-por-pagar-content").then(
      (m) => m.CuentasPorPagarContent
    ),
  { ssr: false, loading: () => <div className="p-6"><Loader2 className="h-5 w-5 animate-spin" /></div> }
);
const RegisterPurchaseDialog = dynamic(
  () =>
    import("./components/register-purchase-dialog").then(
      (m) => m.RegisterPurchaseDialog
    ),
  { ssr: false }
);
const PayableAccountDialog = dynamic(
  () =>
    import("./components/payable-account-dialog").then(
      (m) => m.PayableAccountDialog
    ),
  { ssr: false }
);
const SupplierDialog = dynamic(
  () =>
    import("./components/supplier-dialog").then((m) => m.SupplierDialog),
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
        await inventoryService.saveSupplier(formData, editingSupplier?.id);
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
        toast({ title: "Proveedor Eliminado" });
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
  const [isLoading, setIsLoading] = useState(true);

  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<PayableAccount | null>(
    null
  );
  const [isNewPurchaseDialogOpen, setIsNewPurchaseDialogOpen] = useState(false);
  
  const sortedSuppliers = React.useMemo(() => 
    [...suppliers].sort((a, b) => a.name.localeCompare(b.name)),
  [suppliers]);

  useEffect(() => {
    let alive = true;
    setIsLoading(true);

    const u1 = inventoryService.onSuppliersUpdate((d) => {
      if (!alive) return;
      setSuppliers(d);
      setIsLoading(false);
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

    return () => {
      alive = false;
      [u1, u2, u3, u4].forEach((u) => u && u());
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
        const userString =
          typeof window !== "undefined"
            ? localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY)
            : null;
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

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const tabs = [
    { value: "compras", label: "Compras", content: <ComprasContent /> },
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
    </>
  );
}
