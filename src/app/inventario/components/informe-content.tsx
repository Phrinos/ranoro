
"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import type { InventoryMovement } from '@/types';
import { format } from "date-fns";
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, ArrowUpCircle, ArrowDownCircle, ShoppingCart, PackageSearch } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { useTableManager } from '@/hooks/useTableManager';
import { TableToolbar } from '@/components/shared/table-toolbar';
import { parseDate } from '@/lib/forms';

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
    searchKeys: ['itemName', 'relatedId', 'type'],
    dateFilterKey: 'date',
    initialSortOption: 'date_desc',
    itemsPerPage: 20,
  });

  const getMovementTypeVariant = (type: string): "success" | "destructive" | "outline" => {
    switch (type) {
        case 'Venta': case 'Servicio': return 'destructive';
        case 'Compra': return 'success';
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

  const movementTypeOptions = [
    { value: 'all', label: 'Todos los Movimientos' },
    { value: 'Compra', label: 'Entradas (Compras)' },
    { value: 'Venta', label: 'Salidas (Ventas)' },
    { value: 'Servicio', label: 'Salidas (Servicios)' },
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Acciones Rápidas de Inventario</h2>
      </div>
      <Button className="w-full h-12 text-base" onClick={onRegisterPurchaseClick}>
        <ShoppingCart className="mr-2 h-5 w-5" /> Ingresar Compra de Mercancía
      </Button>
      
      <div className="space-y-4 pt-6">
        <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight">Movimientos de Inventario</h2>
            <p className="text-muted-foreground">Registro de todas las entradas y salidas de productos.</p>
        </div>
        
        <TableToolbar
            {...tableManager}
            searchPlaceholder="Buscar por producto, tipo o ID..."
            sortOptions={sortOptions}
            filterOptions={[{ value: 'type', label: 'Tipo de Movimiento', options: movementTypeOptions }]}
        />

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
        
        <Card>
            <CardContent className="pt-0">
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
                            <TableCell>
                                <Badge variant={getMovementTypeVariant(movement.type)} className="flex items-center gap-1 w-fit">
                                    {movement.type === 'Compra' ? <ArrowUpCircle className="h-3 w-3" /> : <ArrowDownCircle className="h-3 w-3" />}
                                    {movement.type}
                                </Badge>
                            </TableCell>
                            <TableCell>{movement.relatedId}</TableCell>
                            <TableCell>{movement.itemName}</TableCell>
                            <TableCell className="text-right font-medium">{movement.quantity}</TableCell>
                            <TableCell className={cn("text-right font-semibold", movement.type === 'Compra' ? 'text-green-600' : 'text-red-600')}>
                                {movement.type === 'Compra' ? '+' : '-'} {formatCurrency(movement.totalCost)}
                            </TableCell>
                            </TableRow>
                        );
                    })
                    ) : (
                    <TableRow>
                        <TableCell colSpan={6}>
                        <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
                            <PackageSearch className="h-12 w-12 mb-2" />
                            <h3 className="text-lg font-semibold text-foreground">Sin Movimientos</h3>
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
    </div>
  );
}
