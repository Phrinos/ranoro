
// src/app/(app)/proveedores/page.tsx
"use client";

import React, { useState, useEffect, useMemo, useCallback, Suspense, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import type { User, Supplier, PayableAccount, InventoryItem, InventoryCategory } from '@/types';
import { inventoryService, purchaseService } from '@/lib/services';
import { TabbedPageLayout } from '@/components/layout/tabbed-page-layout';
import { ProveedoresContent } from './components/proveedores-content';
import { CuentasPorPagarContent } from './components/cuentas-por-pagar-content';
import { PayableAccountDialog } from './components/payable-account-dialog';
import { AUTH_USER_LOCALSTORAGE_KEY } from '@/lib/placeholder-data';
import { Button } from '@/components/ui/button';
import { RegisterPurchaseDialog } from '@/app/(app)/inventario/components/register-purchase-dialog';
import type { PurchaseFormValues } from '@/app/(app)/inventario/components/register-purchase-dialog';
import type { SupplierFormValues } from '@/schemas/supplier-form-schema';
import { SupplierDialog } from './components/supplier-dialog';


export default function ProveedoresPageComponent() {
  const { toast } = useToast();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('proveedores');
  
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [payableAccounts, setPayableAccounts] = useState<PayableAccount[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<PayableAccount | null>(null);
  
  const [isRegisterPurchaseOpen, setIsRegisterPurchaseOpen] = useState(false);

  const [isSupplierDialogOpen, setIsSupplierDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  useEffect(() => {
    setIsLoading(true);
    const unsubs = [
      inventoryService.onSuppliersUpdate(setSuppliers),
      purchaseService.onPayableAccountsUpdate(setPayableAccounts),
      inventoryService.onItemsUpdate(setInventoryItems),
      inventoryService.onCategoriesUpdate((data) => {
        setCategories(data);
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
      toast({ title: "Pago Registrado", description: "El pago se ha registrado correctamente." });
      setIsPaymentDialogOpen(false);
    } catch(e) {
      toast({ title: "Error", description: `No se pudo registrar el pago. ${e instanceof Error ? e.message : ''}`, variant: "destructive" });
    }
  }, [toast]);
  
  const handleSavePurchase = useCallback(async (data: PurchaseFormValues) => {
    await purchaseService.registerPurchase(data);
    toast({ title: "Compra Registrada", description: `La compra de ${data.items.length} artículo(s) ha sido registrada.` });
    setIsRegisterPurchaseOpen(false);
  }, [toast]);

  const handleInventoryItemCreatedFromPurchase = useCallback(async (formData: any): Promise<InventoryItem> => {
      const newItem = await inventoryService.addItem(formData);
      toast({ title: "Producto Creado", description: `"${newItem.name}" ha sido agregado al inventario.` });
      return newItem;
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
      console.error("Error saving supplier:", error);
      toast({ title: "Error al guardar", description: "No se pudo guardar el proveedor.", variant: "destructive" });
    }
  }, [editingSupplier, toast]);

  const handleDeleteSupplier = useCallback(async (supplierId: string) => {
    try {
      await inventoryService.deleteSupplier(supplierId);
      toast({ title: "Proveedor Eliminado" });
    } catch (error) {
      console.error("Error deleting supplier:", error);
      toast({ title: "Error al eliminar", description: "No se pudo eliminar el proveedor.", variant: "destructive" });
    }
  }, [toast]);
  
  const handleRowClick = useCallback((supplier: Supplier) => {
    router.push(`/proveedores/${supplier.id}`);
  }, [router]);


  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  const tabs = [
    { value: 'proveedores', label: 'Proveedores', content: <ProveedoresContent suppliers={suppliers} onEdit={handleOpenSupplierDialog} onDelete={handleDeleteSupplier} onRowClick={handleRowClick} onAdd={() => handleOpenSupplierDialog()}/> },
    { value: 'cuentas_por_pagar', label: 'Cuentas por Pagar', content: <CuentasPorPagarContent accounts={payableAccounts} onRegisterPayment={handleOpenPaymentDialog} /> },
  ];
  
  const pageActions = (
    <Button onClick={() => setIsRegisterPurchaseOpen(true)} className="w-full sm:w-auto">
      <PlusCircle className="mr-2 h-4 w-4" /> Registrar Compra
    </Button>
  );

  return (
    <>
      <TabbedPageLayout
        title="Proveedores y Compras"
        description="Administra la información de tus proveedores y sus saldos pendientes."
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
       <Suspense fallback={null}>
         <RegisterPurchaseDialog
            open={isRegisterPurchaseOpen}
            onOpenChange={setIsRegisterPurchaseOpen}
            suppliers={suppliers}
            inventoryItems={inventoryItems}
            onSave={handleSavePurchase}
            onInventoryItemCreated={handleInventoryItemCreatedFromPurchase}
            categories={categories}
          />
       </Suspense>
      <SupplierDialog
        open={isSupplierDialogOpen}
        onOpenChange={setIsSupplierDialogOpen}
        supplier={editingSupplier}
        onSave={handleSaveSupplier}
      />
    </>
  );
}
