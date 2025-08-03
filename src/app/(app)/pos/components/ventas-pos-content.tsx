

"use client";

import React, { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Search, ListFilter, CalendarIcon as CalendarDateIcon, Filter, PlusCircle } from "lucide-react";
import { SalesTable } from "./sales-table";
import type { SaleReceipt, InventoryItem, PaymentMethod } from "@/types";
import { format, startOfDay, endOfDay, isWithinInterval, isValid, parseISO, compareDesc, startOfWeek, subDays, startOfMonth, isSameDay } from "date-fns";
import { es } from 'date-fns/locale';
import type { DateRange } from "react-day-picker";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { useTableManager } from '@/hooks/useTableManager';
import { TableToolbar } from '@/components/shared/table-toolbar';

type SaleSortOption = "date_desc" | "date_asc" | "total_desc" | "total_asc" | "customer_asc" | "customer_desc";

interface VentasPosContentProps {
  allSales: SaleReceipt[];
  allInventory: InventoryItem[];
  onReprintTicket: (sale: SaleReceipt) => void;
  onViewSale: (sale: SaleReceipt) => void;
}

const sortOptions = [
    { value: 'date_desc', label: 'Más Reciente' },
    { value: 'date_asc', label: 'Más Antiguo' },
];

const paymentMethods: { value: PaymentMethod | 'all', label: string }[] = [
    { value: 'all', label: 'Todos' },
    { value: 'Efectivo', label: 'Efectivo' },
    { value: 'Tarjeta', label: 'Tarjeta' },
    { value: 'Transferencia', label: 'Transferencia' },
    { value: 'Efectivo+Transferencia', label: 'Efectivo+Transferencia' },
    { value: 'Tarjeta+Transferencia', label: 'Tarjeta+Transferencia' },
    { value: 'Efectivo/Tarjeta', label: 'Efectivo/Tarjeta' },
];


export function VentasPosContent({ allSales, allInventory, onReprintTicket, onViewSale }: VentasPosContentProps) {
  
  const { 
    filteredData: filteredAndSortedSales, 
    ...tableManager 
  } = useTableManager<SaleReceipt>({
    initialData: allSales,
    searchKeys: ['id', 'customerName', 'items.itemName'],
    dateFilterKey: 'saleDate',
    initialSortOption: 'date_desc',
    initialDateRange: { from: startOfMonth(new Date()), to: endOfMonth(new Date()) },
    itemsPerPage: 10,
  });

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Historial de Ventas</h2>
            <p className="text-muted-foreground">Consulta, filtra y reimprime tickets.</p>
          </div>
          <Button asChild className="flex-1 sm:flex-initial">
            <Link href="/pos/nuevo"><PlusCircle className="mr-2 h-4 w-4" />Nueva Venta</Link>
          </Button>
        </div>
        <TableToolbar
            {...tableManager}
            searchPlaceholder="Buscar por ID, cliente, artículo..."
            sortOptions={sortOptions}
            otherFilters={{ paymentMethod: tableManager.otherFilters['paymentMethod'] || 'all' }}
            onFilterChange={tableManager.setOtherFilters}
            filterOptions={[{ value: 'paymentMethod', label: 'Método de Pago', options: paymentMethods }]}
            onPreviousPage={tableManager.goToPreviousPage}
            onNextPage={tableManager.goToNextPage}
            canGoPrevious={tableManager.canGoPrevious}
            canGoNext={tableManager.canGoNext}
            paginationSummary={tableManager.paginationSummary}
        />
      </CardHeader>
      <CardContent>
        <SalesTable
          sales={filteredAndSortedSales}
          onReprintTicket={onReprintTicket}
          inventoryItems={allInventory}
          onEditSale={onViewSale}
        />
      </CardContent>
    </Card>
  );
}

