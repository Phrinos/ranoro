
"use client";

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from "@/components/ui/button";
import { DollarSign, AlertTriangle, Package, ShoppingCart, Building, TrendingUp, PackageSearch, ChevronLeft, ChevronRight } from 'lucide-react';
import type { InventoryItem, Supplier, InventoryMovement } from '@/types';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { placeholderServiceRecords } from '@/lib/placeholder-data';
import { useTableManager } from '@/hooks/useTableManager';
import { TableToolbar } from '@/components/shared/table-toolbar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { cn, formatCurrency } from '@/lib/utils';
import { parseDate } from '@/lib/forms';
import { LineChart } from 'lucide-react';


interface InformeContentProps {
  onRegisterPurchaseClick: () => void;
  movements: InventoryMovement[];
}

export function InformeContent({ onRegisterPurchaseClick, movements }: InformeContentProps) {

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
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Acciones Rápidas</h2>
      </div>
      <Button className="w-full h-12 text-base" onClick={onRegisterPurchaseClick}>
        <ShoppingCart className="mr-2 h-5 w-5" /> Ingresar Compra de Mercancía
      </Button>
      
       <div className="space-y-4 pt-6">
        <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight">Salidas de Inventario</h2>
            <p className="text-muted-foreground">Registro de todas las salidas de productos, ya sea por ventas en mostrador o uso en servicios.</p>
        </div>
        
        <TableToolbar
            {...tableManager}
            searchPlaceholder="Buscar por producto o ID relacionado..."
            sortOptions={sortOptions}
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
    </div>
  );
}
