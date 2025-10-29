
"use client";

import { useState, useMemo } from "react";
import { Timestamp } from "firebase/firestore";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { SortableTableHeader } from "@/components/shared/SortableTableHeader";
import { formatCurrency } from "@/lib/utils";
import { TableHead } from "@/components/ui/table";

// La estructura de la compra ahora puede variar
interface Purchase {
  id: string;
  supplierName: string;
  date: Timestamp | string; // Can be Timestamp or ISO string
  totalAmount: number;
  invoiceTotal?: number;
  status: "completado" | "pendiente" | "Registrada";
}

interface PurchasesTableProps {
  purchases: Purchase[];
  isLoading?: boolean;
}

export function PurchasesTable({ purchases, isLoading }: PurchasesTableProps) {
  const [sortOption, setSortOption] = useState('date_desc');

  const sortedPurchases = useMemo(() => {
    return [...purchases].sort((a, b) => {
        const [key, direction] = sortOption.split('_');
        let valA, valB;
        if (key === 'date') {
            valA = a.date instanceof Timestamp ? a.date.toDate() : new Date(a.date);
            valB = b.date instanceof Timestamp ? b.date.toDate() : new Date(b.date);
        } else {
            valA = (a as any)[key] ?? '';
            valB = (b as any)[key] ?? '';
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
              <TableHead>Proveedor</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Monto Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(3)].map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
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
          <TableRow>
            <SortableTableHeader sortKey="supplierName" label="Proveedor" onSort={handleSort} currentSort={sortOption} textClassName="text-white" />
            <SortableTableHeader sortKey="date" label="Fecha" onSort={handleSort} currentSort={sortOption} textClassName="text-white" />
            <SortableTableHeader sortKey="status" label="Estado" onSort={handleSort} currentSort={sortOption} textClassName="text-white" />
            <SortableTableHeader sortKey="totalAmount" label="Monto Total" onSort={handleSort} currentSort={sortOption} className="text-right" textClassName="text-white" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedPurchases.length > 0 ? (
            sortedPurchases.map((purchase) => (
              <TableRow key={purchase.id}>
                <TableCell className="font-medium">{purchase.supplierName}</TableCell>
                <TableCell>
                  {purchase.date ? format(purchase.date instanceof Timestamp ? purchase.date.toDate() : new Date(purchase.date), "d 'de' MMMM, yyyy", { locale: es }) : 'N/A'}
                </TableCell>
                <TableCell>
                  <Badge variant={purchase.status === "completado" || purchase.status === "Registrada" ? "default" : "secondary"}>
                    {purchase.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(purchase.invoiceTotal ?? purchase.totalAmount)}
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={4} className="h-24 text-center">
                No hay compras registradas.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
