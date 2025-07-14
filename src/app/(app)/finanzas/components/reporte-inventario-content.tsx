

"use client";

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import type { InventoryMovement } from '@/types';
import { format, parseISO, compareAsc, compareDesc } from "date-fns";
import { es } from 'date-fns/locale';
import { formatCurrency, cn } from "@/lib/utils";
import { TableToolbar } from '@/components/shared/table-toolbar';
import { useTableManager } from '@/hooks/useTableManager';
import { PackageSearch } from 'lucide-react';
import { parseDate } from '@/lib/forms';

interface ReporteInventarioContentProps {
  movements: InventoryMovement[];
}

export function ReporteInventarioContent({ movements }: ReporteInventarioContentProps) {
    const {
        filteredData: filteredMovements,
        ...tableManager
    } = useTableManager<InventoryMovement>({
        initialData: movements,
        searchKeys: ['itemName', 'relatedId'],
        dateFilterKey: 'date',
        initialSortOption: 'date_desc',
    });

  const getMovementTypeVariant = (type: string) => {
    switch (type) {
        case 'Venta': return 'default';
        case 'Servicio': return 'secondary';
        default: return 'outline';
    }
  };

  const sortOptions = [
    { value: 'date_desc', label: 'Fecha (Más Reciente)' },
    { value: 'date_asc', label: 'Fecha (Más Antiguo)' },
    { value: 'itemName_asc', label: 'Producto (A-Z)' },
    { value: 'itemName_desc', label: 'Producto (Z-A)' },
    { value: 'quantity_desc', label: 'Cantidad (Mayor a Menor)' },
    { value: 'quantity_asc', label: 'Cantidad (Menor a Mayor)' },
  ];

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Reporte de Salidas de Inventario</h2>
        <p className="text-muted-foreground">Salidas de inventario por ventas y servicios en el período seleccionado.</p>
      </div>
      <TableToolbar
        searchTerm={tableManager.searchTerm}
        onSearchTermChange={tableManager.setSearchTerm}
        dateRange={tableManager.dateRange}
        onDateRangeChange={tableManager.setDateRange}
        sortOption={tableManager.sortOption}
        onSortOptionChange={tableManager.setSortOption}
        sortOptions={sortOptions}
        searchPlaceholder="Buscar por producto o ID relacionado..."
      />
      <Card>
        <CardContent className="pt-6">
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader className="bg-black">
                <TableRow>
                  <TableHead className="text-white">Fecha</TableHead>
                  <TableHead className="text-white">Tipo</TableHead>
                  <TableHead className="text-white">ID Relacionado</TableHead>
                  <TableHead className="text-white">Producto</TableHead>
                  <TableHead className="text-right text-white">Cantidad</TableHead>
                  <TableHead className="text-right text-white">Costo Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMovements.length > 0 ? (
                  filteredMovements.map(movement => {
                    const movementDate = parseDate(movement.date);
                    return (
                        <TableRow key={movement.id}>
                          <TableCell>{movementDate ? format(movementDate, "dd MMM yy, HH:mm", { locale: es }) : "Fecha no disponible"}</TableCell>
                          <TableCell><Badge variant={getMovementTypeVariant(movement.type)}>{movement.type}</Badge></TableCell>
                          <TableCell>{movement.relatedId}</TableCell>
                          <TableCell>{movement.itemName}</TableCell>
                          <TableCell className="text-right font-medium">{movement.quantity}</TableCell>
                          <TableCell className="text-right font-semibold text-red-600">{formatCurrency(movement.totalCost)}</TableCell>
                        </TableRow>
                    );
                  })
                ) : (
                   <TableRow>
                    <TableCell colSpan={6}>
                      <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
                        <PackageSearch className="h-12 w-12 mb-2" />
                        <h3 className="text-lg font-semibold text-foreground">Sin Salidas de Inventario</h3>
                        <p className="text-sm">No se encontraron movimientos de inventario en el período seleccionado.</p>
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
