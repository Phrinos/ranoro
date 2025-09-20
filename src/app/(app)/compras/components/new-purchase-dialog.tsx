"use client";

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import type { User, Supplier, PayableAccount, InventoryItem, InventoryCategory } from '@/types';
import { inventoryService, purchaseService } from '@/lib/services';
import { TabbedPageLayout } from '@/components/layout/tabbed-page-layout';
import { Button } from '@/components/ui/button';

// Lazy loading components for each tab
const ComprasContent = React.lazy(() => import('./components/compras-content'));
const ProveedoresContent = React.lazy(() => import('./components/proveedores-content').then(module => ({ default: module.ProveedoresContent })));
const CuentasPorPagarContent = React.lazy(() => import('./components/cuentas-por-pagar-content').then(module => ({ default: module.CuentasPorPagarContent })));

// Dialogs
const RegisterPurchaseDialog = React.lazy(() => import('./components/register-purchase-dialog').then(module => ({ default: module.RegisterPurchaseDialog })));
const PayableAccountDialog = React.lazy(() => import('./components/payable-account-dialog').then(module => ({ default: module.PayableAccountDialog })));
const SupplierDialog = React.lazy(() => import('./components/supplier-dialog').then(module => ({ default: module.SupplierDialog })));

import type { SupplierFormValues } from '@/schemas/supplier-form-schema';
import { AUTH_USER_LOCALSTORAGE_KEY } from '@/lib/placeholder-data';
import type { PurchaseFormValues } from '@/app/(app)/compras/components/register-purchase-dialog';
import type { InventoryItemFormValues } from '@/schemas/inventory-item-form-schema';


export default function ComprasUnificadasPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('compras');
  
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [payableAccounts, setPayableAccounts] = useState<PayableAccount[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<PayableAccount | null>(null);
  
  const [isNewPurchaseDialogOpen, setIsNewPurchaseDialogOpen] = useState(false);

  const [isSupplierDialogOpen, setIsSupplierDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  useEffect(() => {
    setIsLoading(true);
    const unsubs = [
      inventoryService.onSuppliersUpdate(setSuppliers),
      purchaseService.onPayableAccountsUpdate(setPayableAccounts),
      inventoryService.onItemsUpdate(setInventoryItems),
      inventoryService.onCategoriesUpdate(setCategories),
      inventoryService.onSuppliersUpdate((data) => {
          setSuppliers(data);
          setIsLoading(false);
      }),
    ];
    return () => unsubs.forEach(unsub => unsub());
  }, []);
  
  const handleOpenPaymentDialog = useCallback((account: PayableAccount) => {
    setSelectedAccount(account);
    setIsPaymentDialogOpen(true);
  }, []);

  const handleRegisterPayment = useCallback(async (accountId: string, amount: number, paymentMethod: any, note?: string) => {
    try {
      const userString = localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY);
      const user: User | null = userString ? JSON.parse(userString) : null;
      await purchaseService.registerPayableAccountPayment(accountId, amount, paymentMethod, note, user);
      toast({ title: "Pago Registrado" });
      setIsPaymentDialogOpen(false);
    } catch(e) {
      toast({ title: "Error", variant: "destructive" });
    }
  }, [toast]);

  const handleOpenSupplierDialog = useCallback((supplier: Supplier | null = null) => {
    setEditingSupplier(supplier);
    setIsSupplierDialogOpen(true);
  }, []);
  
  const handleSaveSupplier = useCallback(async (formData: SupplierFormValues) => {
    try {
      await inventoryService.saveSupplier(formData, editingSupplier?.id);
      toast({ title: `Proveedor ${editingSupplier ? 'Actualizado' : 'Agregado'}` });
      setIsSupplierDialogOpen(false);
    } catch (error) {
      toast({ title: "Error al guardar", variant: "destructive" });
    }
  }, [editingSupplier, toast]);

  const handleDeleteSupplier = useCallback(async (supplierId: string) => {
    try {
      await inventoryService.deleteSupplier(supplierId);
      toast({ title: "Proveedor Eliminado" });
    } catch (error) {
      toast({ title: "Error al eliminar", variant: "destructive" });
    }
  }, [toast]);
  
  const handleSupplierRowClick = useCallback((supplier: Supplier) => {
    router.push(`/proveedores/${supplier.id}`);
  }, [router]);

  const handleSavePurchase = useCallback(async (data: PurchaseFormValues) => {
    await purchaseService.registerPurchase(data);
    toast({ title: "Compra Registrada", description: `La compra de ${data.items.length} artículo(s) ha sido registrada.` });
    setIsNewPurchaseDialogOpen(false);
  }, [toast]);

  const handleInventoryItemCreatedFromPurchase = useCallback(async (formData: InventoryItemFormValues): Promise<InventoryItem> => {
      const newItem = await inventoryService.addItem(formData);
      toast({ title: "Producto Creado", description: `"${newItem.name}" ha sido agregado al inventario.` });
      return newItem;
  }, [toast]);

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  const tabs = [
    { value: 'compras', label: 'Compras', content: <ComprasContent /> },
    { value: 'proveedores', label: 'Proveedores', content: <ProveedoresContent suppliers={suppliers} onEdit={handleOpenSupplierDialog} onDelete={handleDeleteSupplier} onRowClick={handleSupplierRowClick} onAdd={() => handleOpenSupplierDialog()}/> },
    { value: 'cuentas_por_pagar', label: 'Cuentas por Pagar', content: <CuentasPorPagarContent accounts={payableAccounts} onRegisterPayment={handleOpenPaymentDialog} /> },
  ];
  
  const pageActions = (
    <Button onClick={() => setIsNewPurchaseDialogOpen(true)} className="w-full sm:w-auto">
      <PlusCircle className="mr-2 h-4 w-4" /> Registrar Nueva Compra
    </Button>
  );

  return (
    <Suspense fallback={<div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
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
            suppliers={suppliers}
            inventoryItems={inventoryItems}
            onSave={handleSavePurchase}
            onInventoryItemCreated={handleInventoryItemCreatedFromPurchase}
            categories={categories}
        />
      )}
      <SupplierDialog
        open={isSupplierDialogOpen}
        onOpenChange={setIsSupplierDialogOpen}
        supplier={editingSupplier}
        onSave={handleSaveSupplier}
      />
    </Suspense>
  );
}