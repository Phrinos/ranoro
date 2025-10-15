
// src/app/(app)/inventario/compras/components/suppliers-table.tsx
"use client";

import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Building } from "lucide-react";
import type { Supplier } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { SortableTableHeader } from "@/components/shared/SortableTableHeader";

interface SuppliersTableProps {
  suppliers: Supplier[];
  onEdit: (supplier: Supplier) => void;
  onDelete: (supplierId: string) => void;
  onRowClick: (supplierId: string) => void;
  sortOption: string;
  onSortOptionChange: (value: string) => void;
}

type SortKey = "name" | "contactPerson" | "phone" | "debtAmount";

export const SuppliersTable = React.memo(function SuppliersTable({
  suppliers,
  onRowClick,
  sortOption,
  onSortOptionChange,
}: SuppliersTableProps) {
  const handleSort = (key: SortKey) => {
    const isAsc = sortOption === `${key}_asc`;
    onSortOptionChange(isAsc ? `${key}_desc` : `${key}_asc`);
  };

  if (!suppliers.length) {
    return (
      <div className="rounded-lg border-2 border-dashed py-10 text-center text-muted-foreground">
        <Building className="mb-2 h-12 w-12 mx-auto" />
        <h3 className="text-foreground mx-auto text-lg font-semibold">
          No hay proveedores registrados
        </h3>
        <p className="text-sm">Cuando se agregue un nuevo proveedor, aparecerá aquí.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border shadow-sm">
      <Table className="min-w-[720px]">
        <TableHeader className="bg-black">
          <TableRow>
            <SortableTableHeader
              sortKey="name"
              label="Nombre"
              onSort={handleSort}
              currentSort={sortOption}
              textClassName="text-white"
            />
            <SortableTableHeader
              sortKey="contactPerson"
              label="Contacto"
              onSort={handleSort}
              currentSort={sortOption}
              textClassName="text-white"
            />
            <SortableTableHeader
              sortKey="phone"
              label="Teléfono"
              onSort={handleSort}
              currentSort={sortOption}
              textClassName="text-white"
            />
            <SortableTableHeader
              sortKey="debtAmount"
              label="Deuda"
              onSort={handleSort}
              currentSort={sortOption}
              textClassName="text-white"
              className="text-right"
            />
          </TableRow>
        </TableHeader>
        <TableBody>
          {suppliers.map((s) => (
            <TableRow
              key={s.id}
              onClick={() => onRowClick(s.id)}
              className="cursor-pointer hover:bg-muted/50"
            >
              <TableCell className="font-medium">
                <div>
                  <p>{s.name}</p>
                  {s.description && (
                    <p className="text-xs text-muted-foreground">{s.description}</p>
                  )}
                </div>
              </TableCell>
              <TableCell>{s.contactPerson || "N/A"}</TableCell>
              <TableCell>{s.phone || "N/A"}</TableCell>
              <TableCell className="text-right">
                {s.debtAmount && s.debtAmount > 0 ? (
                  <Badge variant="destructive">
                    {formatCurrency(s.debtAmount)}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">N/A</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
});
