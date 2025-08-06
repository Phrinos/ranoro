
"use client";

import React, { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { TableToolbar } from '@/components/shared/table-toolbar';
import { PlusCircle, ChevronLeft, ChevronRight } from "lucide-react";
import type { SaleReceipt, InventoryItem, Payment, User } from "@/types";
import Link from "next/link";
import { useTableManager } from '@/hooks/useTableManager';
import { SaleCard } from './SaleCard';
import { Receipt } from 'lucide-react';
import { startOfMonth, endOfMonth } from 'date-fns';

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


interface VentasPosContentProps {
  allSales: SaleReceipt[];
  allInventory: InventoryItem[];
  allUsers: User[];
  onReprintTicket: (sale: SaleReceipt) => void;
  onViewSale: (sale: SaleReceipt) => void;
  onEditPayment: (sale: SaleReceipt) => void;
}


export function VentasPosContent({ allSales, allInventory, allUsers, onReprintTicket, onViewSale, onEditPayment }: VentasPosContentProps) {
  
  const { 
    filteredData: filteredAndSortedSales,
    ...tableManager 
  } = useTableManager<SaleReceipt>({
    initialData: allSales,
    searchKeys: ['id', 'customerName', 'items.itemName', 'payments.method'],
    dateFilterKey: 'saleDate',
    initialSortOption: 'date_desc',
    itemsPerPage: 10,
    initialDateRange: { from: startOfMonth(new Date()), to: endOfMonth(new Date()) },
  });

  return (
    <div className="space-y-4">
        <Button asChild className="w-full">
            <Link href="/pos/nuevo"><PlusCircle className="mr-2 h-4 w-4" />Nueva Venta</Link>
        </Button>
        
        <TableToolbar
            onFilterChange={tableManager.setOtherFilters}
            onSearchTermChange={tableManager.setSearchTerm}
            onSortOptionChange={tableManager.setSortOption}
            onDateRangeChange={tableManager.setDateRange}
            sortOptions={sortOptions}
            filterOptions={[{ value: 'payments.method', label: 'Método de Pago', options: paymentMethodOptions }]}
            searchPlaceholder="Buscar por ID, cliente, artículo..."
            {...tableManager}
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
        
        {filteredAndSortedSales.length > 0 ? (
          <div className="space-y-4">
              {filteredAndSortedSales.map(sale => (
                  <SaleCard
                      key={sale.id}
                      sale={sale}
                      inventoryItems={allInventory}
                      users={allUsers}
                      onReprintTicket={() => onReprintTicket(sale)}
                      onViewSale={() => onViewSale(sale)}
                      onEditPayment={() => onEditPayment(sale)}
                  />
              ))}
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
