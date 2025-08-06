
"use client";

import { useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  calculateSaleProfit,
} from "@/lib/placeholder-data";
import type { InventoryItem, FinancialOperation, PaymentMethod, ServiceTypeRecord, SaleReceipt, ServiceRecord, Technician } from "@/types";
import {
  format,
  parseISO,
  isWithinInterval,
  isValid,
  startOfDay, endOfDay, startOfWeek, endOfWeek, isSameDay, startOfMonth, endOfMonth, compareDesc, compareAsc
} from "date-fns";
import { es } from 'date-fns/locale';
import { CalendarIcon, LineChart, ListFilter, Filter, Search } from "lucide-react";
import { cn, formatCurrency, getPaymentMethodVariant } from "@/lib/utils";
import type { DateRange } from "react-day-picker";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { parseDate } from '@/lib/forms';
import { TableToolbar } from '@/components/shared/table-toolbar';
import { useTableManager } from '@/hooks/useTableManager';

interface ReporteOperacionesContentProps {
  allSales: SaleReceipt[];
  allServices: ServiceRecord[];
  allInventory: InventoryItem[];
  serviceTypes: ServiceTypeRecord[];
}

export function ReporteOperacionesContent({ allSales, allServices, allInventory, serviceTypes }: ReporteOperacionesContentProps) {
  
  const { 
    filteredData: filteredAndSortedOperations, 
    ...tableManager 
  } = useTableManager<FinancialOperation>({
    initialData: useMemo((): FinancialOperation[] => {
        const saleOperations: FinancialOperation[] = allSales.map(s => ({
            id: s.id, date: s.saleDate, type: 'Venta', 
            description: s.items.map(i => i.itemName).join(', '), 
            totalAmount: s.totalAmount, profit: calculateSaleProfit(s, allInventory), originalObject: s 
        }));
        
        const serviceOperations: FinancialOperation[] = allServices
            .filter(s => s.status === 'Entregado' || s.status === 'Completado')
            .map(s => {
                const dateToUse = s.deliveryDateTime || s.serviceDate;
                const description = s.description || (s.serviceItems || []).map(i => i.name).join(', ');
                return {
                    id: s.id, date: dateToUse, type: s.serviceType || 'Servicio General', 
                    description: description, totalAmount: s.totalCost || 0, 
                    profit: s.serviceProfit || 0, originalObject: s 
                };
            });
            
        return [...saleOperations, ...serviceOperations];
      }, [allSales, allServices, allInventory]),
    searchKeys: ['id', 'description'],
    dateFilterKey: 'date',
    initialSortOption: 'date_desc',
  });

  const getOperationTypeVariant = (type: string) => {
    switch (type) {
        case 'Venta': return 'secondary'; case 'Servicio General': return 'default'; case 'Cambio de Aceite': return 'blue';
        case 'Pintura': return 'purple'; default: return 'outline';
    }
  };
  
  const paymentMethods: { value: PaymentMethod | 'all', label: string }[] = [
    { value: 'all', label: 'Todos' }, { value: 'Efectivo', label: 'Efectivo' }, { value: 'Tarjeta', label: 'Tarjeta' },
    { value: 'Transferencia', label: 'Transferencia' }, { value: 'Efectivo+Transferencia', label: 'Efectivo+Transferencia' },
    { value: 'Tarjeta+Transferencia', label: 'Tarjeta+Transferencia' }, { value: 'Efectivo/Tarjeta', label: 'Efectivo/Tarjeta' },
  ];
  
  const operationTypes = useMemo(() => [
      { value: 'all', label: 'Todos' },
      { value: 'Venta', label: 'Venta' },
      ...serviceTypes.map(st => ({ value: st.name, label: st.name }))
  ], [serviceTypes]);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Detalle de Operaciones</h2>
        <p className="text-muted-foreground">Ventas y servicios completados en el período seleccionado.</p>
      </div>
      
      <TableToolbar
        searchTerm={tableManager.searchTerm}
        onSearchTermChange={tableManager.setSearchTerm}
        searchPlaceholder="Buscar por ID o descripción..."
        dateRange={tableManager.dateRange}
        onDateRangeChange={tableManager.setDateRange}
        sortOption={tableManager.sortOption}
        onSortOptionChange={tableManager.setSortOption}
        sortOptions={[
            { value: 'date_desc', label: 'Fecha (Más Reciente)' },
            { value: 'date_asc', label: 'Fecha (Más Antiguo)' },
            { value: 'amount_desc', label: 'Monto (Mayor a Menor)' },
            { value: 'amount_asc', label: 'Monto (Menor a Mayor)' },
            { value: 'profit_desc', label: 'Ganancia (Mayor a Menor)' },
            { value: 'profit_asc', label: 'Ganancia (Menor a Mayor)' },
        ]}
        filterOptions={[
            { value: 'type', label: 'Tipo de Operación', options: operationTypes },
            { value: 'originalObject.payments.method', label: 'Método de Pago', options: paymentMethods },
        ]}
        otherFilters={tableManager.otherFilters}
        onFilterChange={tableManager.setOtherFilters}
      />
      
      <Card>
        <CardContent className="pt-6">
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader className="bg-black">
                <TableRow>
                  <TableHead className="text-white">Fecha</TableHead>
                  <TableHead className="text-white">Tipo</TableHead>
                  <TableHead className="text-white">ID</TableHead>
                  <TableHead className="text-white">Descripción</TableHead>
                  <TableHead className="text-right text-white">Monto</TableHead>
                  <TableHead className="text-right text-white">Ganancia</TableHead>
                  <TableHead className="text-right text-white">Método Pago</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedOperations.length > 0 ? (
                  filteredAndSortedOperations.map(op => (
                    <TableRow key={`${op.type}-${op.id}`}>
                      <TableCell>{op.date ? format(parseDate(op.date)!, "dd MMM yy, HH:mm", { locale: es }) : 'N/A'}</TableCell>
                      <TableCell><Badge variant={getOperationTypeVariant(op.type)} className={cn(op.type === 'Venta' && 'bg-black text-white hover:bg-black/80')}>{op.type}</Badge></TableCell>
                      <TableCell>{op.id}</TableCell>
                      <TableCell className="max-w-xs truncate">{op.description}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(op.totalAmount)}</TableCell>
                      <TableCell className="text-right font-semibold text-green-600">{formatCurrency(op.profit)}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={getPaymentMethodVariant((op.originalObject as any).paymentMethod)}>
                            {(op.originalObject as any).paymentMethod || 'Efectivo'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
                        <LineChart className="h-12 w-12 mb-2" />
                        <h3 className="text-lg font-semibold text-foreground">Sin Operaciones</h3>
                        <p className="text-sm">No se encontraron ventas o servicios en el período seleccionado.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
