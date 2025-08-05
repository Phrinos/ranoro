

"use client";

import React, { useState, useEffect, useMemo, useCallback, Suspense, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import type { Supplier, PayableAccount, User } from '@/types';
import { inventoryService, operationsService } from '@/lib/services';
import { TabbedPageLayout } from '@/components/layout/tabbed-page-layout';
import { ProveedoresContent } from './proveedores-content';
import { CuentasPorPagarContent } from './cuentas-por-pagar-content';
import { PayableAccountDialog } from './payable-account-dialog';
import { AUTH_USER_LOCALSTORAGE_KEY } from '@/lib/placeholder-data';

export default function ProveedoresPageComponent() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('proveedores');
  
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [payableAccounts, setPayableAccounts] = useState<PayableAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<PayableAccount | null>(null);

  useEffect(() => {
    setIsLoading(true);
    const unsubs = [
      inventoryService.onSuppliersUpdate(setSuppliers),
      inventoryService.onPayableAccountsUpdate((data) => {
        setPayableAccounts(data);
        setIsLoading(false);
      }),
    ];
    return () => unsubs.forEach(unsub => unsub());
  }, []);
  
  const handleOpenPaymentDialog = useCallback((account: PayableAccount) => {
    setSelectedAccount(account);
    setIsPaymentDialogOpen(true);
  }, []);

  const handleRegisterPayment = useCallback(async (accountId: string, amount: number, paymentMethod: string, note?: string) => {
    try {
      const userString = localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY);
      const user: User | null = userString ? JSON.parse(userString) : null;
      await operationsService.registerPayableAccountPayment(accountId, amount, paymentMethod, note, user);
      toast({ title: "Pago Registrado", description: "El pago se ha registrado correctamente." });
      setIsPaymentDialogOpen(false);
    } catch(e) {
      toast({ title: "Error", description: `No se pudo registrar el pago. ${e instanceof Error ? e.message : ''}`, variant: "destructive" });
    }
  }, [toast]);

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  const tabs = [
    { value: 'proveedores', label: 'Proveedores', content: <ProveedoresContent suppliers={suppliers} /> },
    { value: 'cuentas_por_pagar', label: 'Cuentas por Pagar', content: <CuentasPorPagarContent accounts={payableAccounts} onRegisterPayment={handleOpenPaymentDialog} /> },
  ];

  return (
    <>
      <TabbedPageLayout
        title="Proveedores y Compras"
        description="Administra la información de tus proveedores y sus saldos pendientes."
        activeTab={activeTab}
        onTabChange={setActiveTab}
        tabs={tabs}
      />
      {selectedAccount && (
        <PayableAccountDialog
            open={isPaymentDialogOpen}
            onOpenChange={setIsPaymentDialogOpen}
            account={selectedAccount}
            onSave={handleRegisterPayment}
        />
      )}
    </>
  );
}
