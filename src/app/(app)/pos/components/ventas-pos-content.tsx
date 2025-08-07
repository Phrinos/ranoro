

"use client";

import React, { useState, useMemo, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { TableToolbar } from '@/components/shared/table-toolbar';
import { PlusCircle, ChevronLeft, ChevronRight, ShoppingCart, Wallet, CreditCard, Send, TrendingUp } from "lucide-react";
import type { SaleReceipt, InventoryItem, Payment, User } from "@/types";
import Link from "next/link";
import { useTableManager } from '@/hooks/useTableManager';
import { SaleCard } from './SaleCard';
import { Receipt } from 'lucide-react';
import { startOfMonth, endOfMonth } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { calculateSaleProfit } from '@/lib/placeholder-data';

const sortOptions = [
    { value: 'date_desc', label: 'Más Reciente' },
    { value: 'date_asc', label: 'Más Antiguo' },
];

const paymentMethodOptions: { value: Payment['method'] | 'all', label: string }[] = [
    { value: 'all', label: 'Todos' },
    { value: 'Efectivo', label: 'Efectivo' },
    { value: 'Tarjeta', label: 'Tarjeta' },
    { value: 'Tarjeta MSI', label: 'Tarjeta MSI' },
    { value: 'Transferencia', label: 'Transferencia' },
];

const paymentMethodIcons = {
  Efectivo: Wallet,
  Tarjeta: CreditCard,
  'Tarjeta MSI': CreditCard,
  Transferencia: Send,
};

interface VentasPosContentProps {
  allSales: SaleReceipt[];
  allInventory: InventoryItem[];
  allUsers: User[];
  currentUser: User | null;
  onReprintTicket: (sale: SaleReceipt) => void;
  onViewSale: (sale: SaleReceipt) => void;
  onDeleteSale: (saleId: string) => void;
}


export function VentasPosContent({ 
  allSales, 
  allInventory, 
  allUsers, 
  currentUser,
  onReprintTicket,
  onViewSale,
  onDeleteSale,
}: VentasPosContentProps) {

  const { 
    filteredData, 
    ...tableManager 
  } = useTableManager<SaleReceipt>({
    initialData: allSales,
    searchKeys: ['id', 'customerName', 'items.itemName', 'payments.method', 'paymentMethod'],
    dateFilterKey: 'saleDate',
    initialSortOption: 'date_desc',
    itemsPerPage: 10,
    initialDateRange: { from: startOfMonth(new Date()), to: endOfMonth(new Date()) },
  });

  const summaryData = useMemo(() => {
    const salesCount = filteredData.length;
    const paymentsSummary = new Map<Payment['method'], { count: number; total: number }>();
    let totalProfit = 0;

    filteredData.forEach(sale => {
      totalProfit += calculateSaleProfit(sale, allInventory);
      if (sale.payments && sale.payments.length > 0) {
        sale.payments.forEach(p => {
          const current = paymentsSummary.get(p.method) || { count: 0, total: 0 };
          current.count += 1;
          current.total += p.amount || 0;
          paymentsSummary.set(p.method, current);
        });
      } else if (sale.paymentMethod) { // Fallback for older records
        const methods = sale.paymentMethod.split(/[+\/]/).map(m => m.trim()) as Payment['method'][];
        const totalAmount = sale.totalAmount || 0;
        
        let paymentBreakdown: { method: Payment['method']; amount: number }[] = [];
        
        if (methods.length > 1 && (sale.amountInCash !== undefined || sale.amountInCard !== undefined || sale.amountInTransfer !== undefined)) {
            if (sale.amountInCash) paymentBreakdown.push({ method: 'Efectivo', amount: sale.amountInCash });
            if (sale.amountInCard) paymentBreakdown.push({ method: 'Tarjeta', amount: sale.amountInCard });
            if (sale.amountInTransfer) paymentBreakdown.push({ method: 'Transferencia', amount: sale.amountInTransfer });
        } else if (methods.length === 1) {
            paymentBreakdown.push({ method: methods[0], amount: totalAmount });
        } else {
             // Fallback for cases like "Efectivo/Tarjeta" without specific amounts
            const amountPerMethod = totalAmount / methods.length;
            methods.forEach(method => paymentBreakdown.push({method, amount: amountPerMethod}));
        }

        paymentBreakdown.forEach(({ method, amount }) => {
            const current = paymentsSummary.get(method) || { count: 0, total: 0 };
            current.count += 1; // This might double count, but it's a fallback
            current.total += amount;
            paymentsSummary.set(method, current);
        });
      }
    });
    return { salesCount, paymentsSummary, totalProfit };
  }, [filteredData, allInventory]);
  
  const handleEditPayment = () => {
    // This function will likely be handled by a dialog in the parent component now.
    // For now, it's a placeholder.
    console.log("Edit payment logic needs to be connected here.");
  };

  return (
    <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ventas en Periodo</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summaryData.salesCount}</div>
            </CardContent>
          </Card>
           <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ganancia Bruta (Periodo)</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(summaryData.totalProfit)}</div>
            </CardContent>
          </Card>
          <Card className="md:col-span-2">
             <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Ventas por Método de Pago</CardTitle>
            </CardHeader>
            <CardContent>
                {Array.from(summaryData.paymentsSummary.entries()).length > 0 ? (
                  <div className="flex flex-wrap gap-x-4 gap-y-2">
                    {Array.from(summaryData.paymentsSummary.entries()).map(([method, data]) => {
                      const Icon = paymentMethodIcons[method as keyof typeof paymentMethodIcons] || Wallet;
                      return (
                        <div key={method} className="flex items-center gap-2 text-sm">
                           <Icon className="h-4 w-4 text-muted-foreground" />
                           <span className="font-semibold">{method}:</span>
                           <span className="text-foreground">{formatCurrency(data.total)}</span>
                           <span className="text-muted-foreground text-xs">({data.count})</span>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No hay pagos registrados en este periodo.</p>
                )}
            </CardContent>
          </Card>
        </div>
        
        <Button asChild className="w-full">
            <Link href="/pos/nuevo"><PlusCircle className="mr-2 h-4 w-4" />Nueva Venta</Link>
        </Button>
        
        <TableToolbar
            {...tableManager}
            onFilterChange={tableManager.setOtherFilters}
            onSearchTermChange={tableManager.setSearchTerm}
            onSortOptionChange={tableManager.onSortOptionChange}
            onDateRangeChange={tableManager.setDateRange}
            sortOptions={sortOptions}
            filterOptions={[{ value: 'payments.method', label: 'Método de Pago', options: paymentMethodOptions }]}
            searchPlaceholder="Buscar por ID, cliente, artículo..."
        />

        <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{tableManager.paginationSummary}</p>
            <div className="flex items-center space-x-2">
                <Button size="sm" onClick={tableManager.goToPreviousPage} disabled={!tableManager.canGoPrevious} variant="outline" className="bg-card">
                    <ChevronLeft className="h-4 w-4" />
                    Anterior
                </Button>
                <Button size="sm" onClick={tableManager.goToNextPage} disabled={!tableManager.canGoNext} variant="outline" className="bg-card">
                    Siguiente
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
        
        {filteredData.length > 0 ? (
          <div className="space-y-4">
              {filteredData.map(sale => {
                  return (
                      <SaleCard
                          key={sale.id}
                          sale={sale}
                          inventoryItems={allInventory}
                          users={allUsers}
                          currentUser={currentUser}
                          onReprintTicket={() => onReprintTicket(sale)}
                          onViewSale={() => onViewSale(sale)}
                          onEditPayment={handleEditPayment}
                          onDeleteSale={() => onDeleteSale(sale.id)}
                      />
                  );
              })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground border-2 border-dashed rounded-lg">
              <Receipt className="h-12 w-12 mb-2" />
              <h3 className="text-lg font-semibold text-foreground">No se encontraron ventas</h3>
              <p className="text-sm">Intente cambiar su búsqueda o el rango de fechas.</p>
          </div>
        )}
    </div>
  );
}
