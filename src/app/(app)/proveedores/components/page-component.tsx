

"use client";

import React, { useState, useEffect, useMemo, useCallback, Suspense, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import type { Supplier, PayableAccount } from '@/types';
import { inventoryService } from '@/lib/services';
import { TabbedPageLayout } from '@/components/layout/tabbed-page-layout';
import { ProveedoresContent } from './proveedores-content';
import { CuentasPorPagarContent } from './cuentas-por-pagar-content';

export default function ProveedoresPageComponent() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('proveedores');
  
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [payableAccounts, setPayableAccounts] = useState<PayableAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  const tabs = [
    { value: 'proveedores', label: 'Proveedores', content: <ProveedoresContent suppliers={suppliers} /> },
    { value: 'cuentas_por_pagar', label: 'Cuentas por Pagar', content: <CuentasPorPagarContent accounts={payableAccounts} /> },
  ];

  return (
    <TabbedPageLayout
      title="Proveedores y Compras"
      description="Administra la información de tus proveedores y sus saldos pendientes."
      activeTab={activeTab}
      onTabChange={setActiveTab}
      tabs={tabs}
    />
  );
}
