// src/app/(app)/inventario/compras/components/purchases-table.tsx
"use client";

import { useState, useMemo } from "react";
import { Timestamp } from "firebase/firestore";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
  TableHead,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format, isValid } from "date-fns";
import { es } from 'date-fns/locale';
import { Skeleton } from "@/components/ui/skeleton";
import { SortableTableHeader } from "@/components/shared/SortableTableHeader";
import { formatCurrency } from "@/lib/utils";
import { parseDate } from "@/lib/forms"; // Importar el helper robusto

interface Purchase {
  id: string;
  invoiceId?: string;
  supplierName: string;
  invoiceDate: Timestamp | string; // Campo principal de fecha
  totalAmount?: number;
  invoiceTotal?: number;
  status: "Completado" | "Registrada" | "Pendiente";
  paymentMethod?: string;
  items: { itemName: string; quantity: number }[];
}

interface PurchasesTableProps {
  purchases: Purchase[];
  isLoading?: boolean;
}

export function PurchasesTable({ purchases, isLoading }: PurchasesTableProps) {
  const [sortOption, setSortOption] = useState('invoiceDate_desc');

  const sortedPurchases = useMemo(() => {
    return [...purchases].sort((a, b) => {
        const [key, direction] = sortOption.split('_');
        let valA, valB;
        if (key === 'invoiceDate') {
            valA = parseDate(a.invoiceDate);
            valB = parseDate(b.invoiceDate);
            if (!valA) return 1;
            if (!valB) return -1;
        } else {
            valA = (a as any)[key] ?? '';
            valB = (b as any)[key] ?? '';
        }
        
        if (valA instanceof Date && valB instanceof Date) {
            return direction === 'asc' ? valA.getTime() - valB.getTime() : valB.getTime() - valA.getTime();
        }

        const comparison = String(valA).localeCompare(String(valB), 'es', { numeric: true });
        return direction === 'asc' ? comparison : -comparison;
    });
  }, [purchases, sortOption]);
  
  const handleSort = (key: string) => {
    const isAsc = sortOption === `${key}_asc`;
    setSortOption(`${key}_${isAsc ? 'desc' : 'asc'}`);
  };

  if (isLoading) {
    return (
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Folio/Factura</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead>Productos</TableHead>
              <TableHead>Cantidad</TableHead>
              <TableHead>Monto</TableHead>
              <TableHead>Método</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(3)].map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader className="bg-black">
          <TableRow className="hover:bg-transparent">
            <SortableTableHeader sortKey="invoiceDate" label="Fecha" onSort={handleSort} currentSort={sortOption} textClassName="text-white" />
            <SortableTableHeader sortKey="invoiceId" label="Folio/Factura" onSort={handleSort} currentSort={sortOption} textClassName="text-white" />
            <SortableTableHeader sortKey="supplierName" label="Proveedor" onSort={handleSort} currentSort={sortOption} textClassName="text-white" />
            <TableHead className="text-white">Productos</TableHead>
            <TableHead className="text-white">Artículos</TableHead>
            <SortableTableHeader sortKey="invoiceTotal" label="Monto Total" onSort={handleSort} currentSort={sortOption} className="text-right" textClassName="text-white" />
            <SortableTableHeader sortKey="paymentMethod" label="Método de Pago" onSort={handleSort} currentSort={sortOption} textClassName="text-white" />
            <SortableTableHeader sortKey="status" label="Estado" onSort={handleSort} currentSort={sortOption} textClassName="text-white" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedPurchases.length > 0 ? (
            sortedPurchases.map((purchase) => {
              const purchaseDate = parseDate(purchase.invoiceDate); // Usar el helper robusto
              const productNames = purchase.items.map(i => i.itemName).join(', ');
              const totalItems = purchase.items.reduce((sum, i) => sum + i.quantity, 0);

              return (
              <TableRow key={purchase.id}>
                <TableCell>
                  {purchaseDate && isValid(purchaseDate) ? format(purchaseDate, "dd/MM/yy, HH:mm", { locale: es }) : 'N/A'}
                </TableCell>
                <TableCell>{purchase.invoiceId}</TableCell>
                <TableCell className="font-medium">{purchase.supplierName}</TableCell>
                <TableCell className="truncate max-w-xs" title={productNames}>{productNames}</TableCell>
                <TableCell>{totalItems}</TableCell>
                <TableCell className="text-right font-semibold">
                  {formatCurrency(purchase.invoiceTotal ?? purchase.totalAmount ?? 0)}
                </TableCell>
                 <TableCell>{purchase.paymentMethod || 'N/A'}</TableCell>
                <TableCell>
                  <Badge variant={purchase.status === "Completado" || purchase.status === "Registrada" ? "success" : "secondary"}>
                    {purchase.status}
                  </Badge>
                </TableCell>
              </TableRow>
            )})
          ) : (
            <TableRow>
              <TableCell colSpan={8} className="h-24 text-center">
                No hay compras registradas.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
