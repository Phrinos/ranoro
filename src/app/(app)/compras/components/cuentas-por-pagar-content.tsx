// src/app/(app)/proveedores/components/cuentas-por-pagar-content.tsx
"use client";

import React, { useMemo } from 'react';
import type { PayableAccount } from '@/types';
import { useTableManager } from '@/hooks/useTableManager';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { format, isValid, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { TableToolbar } from '@/components/shared/table-toolbar';
import { FileText } from 'lucide-react';

const sortOptions = [
    { value: 'dueDate_asc', label: 'Vencimiento (Próximos)' },
    { value: 'dueDate_desc', label: 'Vencimiento (Lejanos)' },
    { value: 'totalAmount_desc', label: 'Monto (Mayor a Menor)' },
    { value: 'totalAmount_asc', label: 'Monto (Menor a Mayor)' },
    { value: 'supplierName_asc', label: 'Proveedor (A-Z)' },
    { value: 'supplierName_desc', label: 'Proveedor (Z-A)' },
];

const statusOptions = [
    { value: 'all', label: 'Todos' },
    { value: 'Pendiente', label: 'Pendiente' },
    { value: 'Pagado Parcialmente', label: 'Pagado Parcialmente' },
    { value: 'Pagado', label: 'Pagado' },
];

interface CuentasPorPagarContentProps {
  accounts: PayableAccount[];
  onRegisterPayment: (account: PayableAccount) => void;
}

export function CuentasPorPagarContent({ accounts, onRegisterPayment }: CuentasPorPagarContentProps) {
  const { filteredData, ...tableManager } = useTableManager<PayableAccount>({
    initialData: accounts,
    searchKeys: ['supplierName', 'invoiceId'],
    dateFilterKey: 'dueDate',
    initialSortOption: 'dueDate_asc',
  });
  
  const getStatusVariant = (status: PayableAccount['status']): 'destructive' | 'secondary' | 'success' => {
      switch(status) {
          case 'Pendiente': return 'destructive';
          case 'Pagado Parcialmente': return 'secondary';
          case 'Pagado': return 'success';
          default: return 'secondary';
      }
  };

  return (
    <div className="space-y-4">
       <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight">Cuentas por Pagar</h2>
            <p className="text-muted-foreground">Revisa y gestiona todas las facturas a crédito pendientes de pago a tus proveedores.</p>
        </div>
      <TableToolbar
        {...tableManager}
        onSearchTermChange={tableManager.setSearchTerm}
        searchPlaceholder="Buscar por proveedor o folio..."
        sortOptions={sortOptions}
        filterOptions={[{ value: 'status', label: 'Estado', options: statusOptions }]}
      />
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader className="bg-black">
                <TableRow>
                  <TableHead className="text-white">Proveedor</TableHead>
                  <TableHead className="text-white">Folio Factura</TableHead>
                  <TableHead className="text-white">Fecha Factura</TableHead>
                  <TableHead className="text-white">Vencimiento</TableHead>
                  <TableHead className="text-right text-white">Total</TableHead>
                  <TableHead className="text-right text-white">Pagado</TableHead>
                  <TableHead className="text-right text-white">Saldo</TableHead>
                  <TableHead className="text-center text-white">Estado</TableHead>
                  <TableHead className="text-right text-white">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.length > 0 ? (
                  filteredData.map(account => (
                    <TableRow key={account.id}>
                      <TableCell className="font-semibold">{account.supplierName}</TableCell>
                      <TableCell>{account.invoiceId}</TableCell>
                      <TableCell>{format(parseISO(account.invoiceDate), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>{format(parseISO(account.dueDate), 'dd/MM/yyyy')}</TableCell>
                      <TableCell className="text-right">{formatCurrency(account.totalAmount)}</TableCell>
                      <TableCell className="text-right text-green-600">{formatCurrency(account.paidAmount)}</TableCell>
                      <TableCell className="text-right font-bold">{formatCurrency(account.totalAmount - account.paidAmount)}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={getStatusVariant(account.status)}>{account.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {account.status !== 'Pagado' && (
                          <Button variant="outline" size="sm" onClick={() => onRegisterPayment(account)}>Registrar Pago</Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center">
                       <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
                        <FileText className="h-12 w-12 mb-2" />
                        <h3 className="text-lg font-semibold text-foreground">No hay cuentas por pagar</h3>
                        <p className="text-sm">No se encontraron registros que coincidan con los filtros actuales.</p>
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
};
