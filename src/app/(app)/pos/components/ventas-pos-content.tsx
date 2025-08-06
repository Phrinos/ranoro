

"use client";

import React, { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Search, ListFilter, CalendarIcon as CalendarDateIcon, Filter, PlusCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { SalesTable } from "./sales-table";
import type { SaleReceipt, InventoryItem, PaymentMethod } from "@/types";
import { format, startOfMonth, endOfMonth, isWithinInterval, isValid, parseISO, compareDesc, startOfWeek, subDays, isSameDay } from "date-fns";
import { es } from 'date-fns/locale';
import type { DateRange } from "react-day-picker";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Input } from '@/components/ui/input';
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
    <div className="space-y-4">
        <Button asChild className="w-full">
            <Link href="/pos/nuevo"><PlusCircle className="mr-2 h-4 w-4" />Nueva Venta</Link>
        </Button>
        
        <TableToolbar
            {...tableManager}
            searchPlaceholder="Buscar por ID, cliente, artículo..."
            sortOptions={sortOptions}
            filterOptions={[{ value: 'paymentMethod', label: 'Método de Pago', options: paymentMethods }]}
        />

        <Card>
            <CardContent className="pt-6">
                <SalesTable
                  sales={filteredAndSortedSales}
                  onReprintTicket={onReprintTicket}
                  inventoryItems={allInventory}
                  onEditSale={onViewSale}
                />
            </CardContent>
        </Card>
        
        <div className="flex items-center justify-between pt-2">
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
    </div>
  );
}
