// src/app/(app)/pos/components/ventas-pos-content.tsx
"use client";

import React, { useState, useMemo, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { TableToolbar } from '@/components/shared/table-toolbar';
import { PlusCircle, ChevronLeft, ChevronRight, ShoppingCart, Wallet, CreditCard, Send, TrendingUp, Edit, Printer, Trash2, Repeat, User as UserIcon, Landmark } from "lucide-react";
import type { SaleReceipt, InventoryItem, Payment, User } from "@/types";
import Link from "next/link";
import { useTableManager } from '@/hooks/useTableManager';
import { Receipt } from 'lucide-react';
import { startOfMonth, endOfMonth, parseISO, isValid, format as formatLocale } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, getPaymentMethodVariant, cn } from '@/lib/utils';
import { calculateSaleProfit } from '@/lib/placeholder-data';
import { Badge } from '@/components/ui/badge';
import { parseDate } from '@/lib/forms';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Input } from '@/components/ui/input';


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

const paymentMethodIcons: Record<Payment['method'], React.ElementType> = {
  "Efectivo": Wallet,
  "Tarjeta": CreditCard,
  "Tarjeta MSI": CreditCard,
  "Transferencia": Landmark,
};

interface VentasPosContentProps {
  allSales: SaleReceipt[];
  allInventory: InventoryItem[];
  allUsers: User[];
  currentUser: User | null;
  onReprintTicket: (sale: SaleReceipt) => void;
  onViewSale: (sale: SaleReceipt) => void;
  onDeleteSale: (saleId: string) => void;
  onEditPayment: (sale: SaleReceipt) => void;
  onCancelSale: (saleId: string, reason: string) => void;
}


export function VentasPosContent({ 
  allSales, 
  allInventory, 
  allUsers, 
  currentUser,
  onReprintTicket,
  onViewSale,
  onDeleteSale,
  onEditPayment,
  onCancelSale,
}: VentasPosContentProps) {

  const { 
    paginatedData, 
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
    const salesCount = paginatedData.length;
    const paymentsSummary = new Map<Payment['method'], { count: number; total: number }>();
    let totalProfit = 0;

    paginatedData.forEach(sale => {
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
        
        let paymentBreakdown: { method: Payment['method']; amount: number }[] = [];
        const totalAmount = sale.totalAmount || 0;
        
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
  }, [paginatedData, allInventory]);

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
        
        <div className="space-y-2">
            <div className="flex flex-col sm:flex-row items-center gap-2">
                <Input
                    placeholder="Buscar por ID, cliente, artículo..."
                    value={tableManager.searchTerm}
                    onChange={(event) => tableManager.onSearchTermChange(event.target.value)}
                    className="h-10 w-full lg:w-[250px] bg-white"
                />
                <Button asChild className="w-full sm:w-auto flex-grow sm:flex-grow-0">
                    <Link href="/pos/nuevo"><PlusCircle className="mr-2 h-4 w-4" />Nueva Venta</Link>
                </Button>
            </div>
            <TableToolbar
                {...tableManager}
                filterOptions={[{ value: 'payments.method', label: 'Método de Pago', options: paymentMethodOptions }]}
                dateRange={tableManager.dateRange}
                onDateRangeChange={tableManager.onDateRangeChange}
            />
        </div>
        
        {paginatedData.length > 0 ? (
          <div className="space-y-4">
              {paginatedData.map(sale => {
                  const saleDate = parseDate(sale.saleDate);
                  const isCancelled = sale.status === 'Cancelado';
                  const profit = calculateSaleProfit(sale, allInventory);
                  const itemsDescription = sale.items
                      .filter(item => item.inventoryItemId !== 'COMMISSION_FEE')
                      .map(item => `${item.quantity}x ${item.itemName}`)
                      .join(', ');
                  const paymentBadges = (isCancelled
                      ? [<Badge key="cancelled" variant="destructive" className="font-bold">CANCELADO</Badge>]
                      : (sale.payments && sale.payments.length > 0)
                          ? sale.payments.map((p, index) => {
                              const Icon = paymentMethodIcons[p.method] || Wallet;
                              return (
                                <Badge key={index} variant={getPaymentMethodVariant(p.method)} className="text-xs">
                                  <Icon className="h-3 w-3 mr-1"/>{p.method} <span className="font-normal ml-1 opacity-80">{formatCurrency(p.amount)}</span>
                                </Badge>
                              )
                            })
                          : sale.paymentMethod // Fallback for older records
                              ? [<Badge key={sale.paymentMethod} variant={getPaymentMethodVariant(sale.paymentMethod as any)} className="text-xs">{sale.paymentMethod}</Badge>]
                              : [<Badge key="no-payment" variant="outline">Sin Pago</Badge>]
                  );
                  const sellerName = sale.registeredByName || allUsers.find(u => u.id === sale.registeredById)?.name || 'N/A';
                  const cancelDialogDescription = `Esta acción no se puede deshacer. El stock se restaurará y los movimientos de caja asociados se eliminarán.`;

                  return (
                      <Card key={sale.id} className={cn("shadow-sm overflow-hidden", isCancelled && "bg-muted/60 opacity-80")}>
                          <CardContent className="p-0">
                              <div className="flex flex-col md:flex-row text-sm">
                                  <div className="p-4 flex flex-col justify-center items-center text-center w-full md:w-40 flex-shrink-0 bg-card border-b md:border-b-0 md:border-r">
                                      <p className="text-muted-foreground text-sm">{saleDate && isValid(saleDate) ? formatLocale(saleDate, "HH:mm 'hrs'", { locale: es }) : 'N/A'}</p>
                                      <p className="font-bold text-lg text-foreground">{saleDate && isValid(saleDate) ? formatLocale(saleDate, "dd MMM yyyy", { locale: es }) : "N/A"}</p>
                                      <p className="text-muted-foreground text-xs mt-1">{sale.id}</p>
                                  </div>
                                  <div className="p-4 flex flex-col justify-center flex-grow space-y-2 border-b md:border-b-0 md:border-r">
                                     <TooltipProvider><Tooltip><TooltipTrigger asChild><p className="font-bold text-base leading-tight">{itemsDescription}</p></TooltipTrigger><TooltipContent><p>{itemsDescription}</p></TooltipContent></Tooltip></TooltipProvider>
                                     <div className="flex items-center gap-2 text-muted-foreground text-xs"><UserIcon className="h-3 w-3" /><span>{sale.customerName || 'Cliente Mostrador'}</span></div>
                                  </div>
                                  <div className="p-4 flex flex-col items-center md:items-end justify-center text-center md:text-right w-full md:w-48 flex-shrink-0 space-y-1 border-b md:border-b-0 md:border-r">
                                       <div><p className="text-xs text-muted-foreground mb-1 text-right">Costo Cliente</p><p className="font-bold text-xl text-primary text-right">{formatCurrency(sale.totalAmount)}</p></div>
                                       <div><p className="text-xs text-muted-foreground">Ganancia</p><p className="font-semibold text-base text-green-600 flex items-center gap-1 justify-end"><TrendingUp className="h-4 w-4" /> {formatCurrency(profit)}</p></div>
                                       <div className="flex flex-wrap gap-1 justify-end pt-1">{paymentBadges}</div>
                                  </div>
                                  <div className="p-4 flex flex-col justify-center items-center text-center border-t md:border-t-0 md:border-l w-full md:w-auto flex-shrink-0 space-y-2">
                                      <div className="text-center"><p className="text-xs text-muted-foreground">Atendió</p><p className="text-xs">{sellerName}</p></div>
                                      <div className="flex justify-center items-center gap-1 flex-wrap">
                                          <Button variant="ghost" size="icon" onClick={() => onViewSale(sale)} title="Ver / Editar Venta"><Edit className="h-4 w-4" /></Button>
                                          <Button variant="ghost" size="icon" onClick={() => onReprintTicket(sale)} title="Reimprimir Ticket" disabled={isCancelled}><Printer className="h-4 w-4" /></Button>
                                           <ConfirmDialog
                                              triggerButton={
                                                  <Button variant="ghost" size="icon" title={isCancelled ? "Venta ya cancelada" : "Cancelar Venta"} disabled={isCancelled}>
                                                      <Trash2 className="h-4 w-4 text-destructive" />
                                                  </Button>
                                              }
                                              title={`¿Cancelar Venta #${sale.id.slice(-6)}?`}
                                              description={cancelDialogDescription}
                                              onConfirm={() => onCancelSale(sale.id, prompt('Motivo de cancelación:') || 'Sin motivo especificado.')}
                                          />
                                      </div>
                                  </div>
                              </div>
                          </CardContent>
                      </Card>
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
        <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-muted-foreground">{tableManager.paginationSummary}</p>
            <div className="flex items-center space-x-2">
                <Button size="sm" onClick={tableManager.goToPreviousPage} disabled={!tableManager.canGoPrevious} variant="outline" className="bg-card">
                    <ChevronLeft className="h-4 w-4" /> Anterior
                </Button>
                <Button size="sm" onClick={tableManager.goToNextPage} disabled={!tableManager.canGoNext} variant="outline" className="bg-card">
                    Siguiente <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    </div>
  );
}
