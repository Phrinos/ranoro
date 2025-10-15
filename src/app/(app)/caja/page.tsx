// src/app/(app)/caja/page.tsx
"use client";

import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { useSearchParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { SaleReceipt, ServiceRecord, InventoryItem, User, CashDrawerTransaction, InitialCashBalance, WorkshopInfo, PaymentMethod } from '@/types';
import { saleService, serviceService, inventoryService, cashService, adminService } from '@/lib/services';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import Link from 'next/link';
import { ViewSaleDialog } from '@/app/(app)/pos/components/view-sale-dialog';
import { PaymentDetailsDialog } from '@/components/shared/PaymentDetailsDialog';
import dynamic from 'next/dynamic';

const CorteCajaContent = dynamic(() => import('@/app/(app)/caja/components/corte-caja-content'), { ssr: false, loading: () => <Loader2 className="animate-spin" /> });
const MovimientosCajaContent = dynamic(() => import('@/app/(app)/caja/components/movimientos-caja-content'), { ssr: false, loading: () => <Loader2 className="animate-spin" /> });
const VentasPosContent = dynamic(() => import('@/app/(app)/pos/components/ventas-pos-content').then(m => m.VentasPosContent), { ssr: false, loading: () => <Loader2 className="animate-spin" /> });


function CajaPage() {
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const defaultTab = searchParams.get('tab') || 'corte';
    const [activeTab, setActiveTab] = useState(defaultTab);
    const [allSales, setAllSales] = useState<SaleReceipt[]>([]);
    const [allServices, setAllServices] = useState<ServiceRecord[]>([]);
    const [allInventory, setAllInventory] = useState<InventoryItem[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [cashTransactions, setCashTransactions] = useState<CashDrawerTransaction[]>([]);
    const [initialBalance, setInitialBalance] = useState<InitialCashBalance | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
    const [viewingSale, setViewingSale] = useState<SaleReceipt | null>(null);

    useEffect(() => {
        setIsLoading(true);
        const authUserString = localStorage.getItem('authUser');
        if (authUserString) setCurrentUser(JSON.parse(authUserString));

        const unsubs = [
            saleService.onSalesUpdate(setAllSales),
            serviceService.onServicesUpdate(setAllServices),
            inventoryService.onItemsUpdate(setAllInventory),
            cashService.onCashTransactionsUpdate(setCashTransactions),
            adminService.onUsersUpdate(setAllUsers),
        ];
        
        cashService.getInitialBalance().then(balance => {
            setInitialBalance(balance);
            setIsLoading(false);
        });

        return () => unsubs.forEach(unsub => unsub());
    }, []);
    
    const handlePaymentUpdate = async (saleId: string, paymentDetails: any) => {
        try {
            type PartialSaleUpdate = Partial<SaleReceipt> & { payments?: any; paymentDetails?: any };
            await saleService.updateSale(saleId, { payments: paymentDetails.payments } as PartialSaleUpdate);
            toast({ title: 'Pago Actualizado' });
            setIsPaymentDialogOpen(false);
        } catch (e) {
            console.error(e);
            toast({ title: 'Error', description: 'No se pudo actualizar el pago.', variant: 'destructive'});
        }
    };
    
    const tabs = [
        { value: "corte", label: "Corte de Caja", content: <CorteCajaContent allSales={allSales} allServices={allServices} cashTransactions={cashTransactions} initialBalance={initialBalance} onSetInitialBalance={setInitialBalance} /> },
        { value: "movimientos", label: "Movimientos Manuales", content: <MovimientosCajaContent cashTransactions={cashTransactions} /> },
    ];
    
    return (
        <div className="space-y-6">
            <div className="bg-primary text-primary-foreground rounded-lg p-6">
                <h1 className="text-3xl font-bold tracking-tight">Caja</h1>
                <p className="text-primary-foreground/80 mt-1">Realiza tu corte de caja, consulta movimientos y gestiona el efectivo.</p>
            </div>
             <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    {tabs.map((tab) => <TabsTrigger key={tab.value} value={tab.value}>{tab.label}</TabsTrigger>)}
                </TabsList>
                {tabs.map((tab) => <TabsContent key={tab.value} value={tab.value} className="mt-6">{tab.content}</TabsContent>)}
            </Tabs>
        </div>
    );
}

export default function CajaPageWrapper() {
    return (
        <Suspense fallback={<div className="flex h-64 w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <CajaPage />
        </Suspense>
    );
}
