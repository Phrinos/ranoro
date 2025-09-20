

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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Building, ArrowUpDown } from "lucide-react";
import type { Supplier } from "@/types";
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { formatCurrency } from "@/lib/utils";
import { SortableTableHeader } from "@/components/shared/SortableTableHeader";


interface SuppliersTableProps {
  suppliers: Supplier[];
  onEdit: (supplier: Supplier) => void;
  onDelete: (supplierId: string) => void;
  onRowClick: (supplier: Supplier) => void;
  sortOption: string;
  onSortOptionChange: (value: string) => void;
}

type SortKey = 'name' | 'contactPerson' | 'phone' | 'debtAmount';


export const SuppliersTable = React.memo(({ suppliers, onEdit, onDelete, onRowClick, sortOption, onSortOptionChange }: SuppliersTableProps) => {
    
  const handleSort = (key: SortKey) => {
    const isAsc = sortOption === `${key}_asc`;
    onSortOptionChange(isAsc ? `${key}_desc` : `${key}_asc`);
  };
    
  if (!suppliers.length) {
    return (
        <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground border-2 border-dashed rounded-lg">
            <Building className="h-12 w-12 mb-2" />
            <h3 className="text-lg font-semibold text-foreground">No hay proveedores registrados</h3>
            <p className="text-sm">Cuando se agregue un nuevo proveedor, aparecerá aquí.</p>
        </div>
    );
  }

  return (
    <div className="rounded-lg border shadow-sm overflow-x-auto">
      <Table>
        <TableHeader className="bg-black">
          <TableRow>
            <SortableTableHeader sortKey="name" label="Nombre" onSort={handleSort} currentSort={sortOption} textClassName="text-white" />
            <SortableTableHeader sortKey="contactPerson" label="Contacto" onSort={handleSort} currentSort={sortOption} textClassName="text-white" />
            <SortableTableHeader sortKey="phone" label="Teléfono" onSort={handleSort} currentSort={sortOption} textClassName="text-white" />
            <SortableTableHeader sortKey="debtAmount" label="Deuda" onSort={handleSort} currentSort={sortOption} textClassName="text-white" className="justify-end" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {suppliers.map((supplier) => (
            <TableRow key={supplier.id} onClick={() => onRowClick(supplier)} className="cursor-pointer hover:bg-muted/50">
              <TableCell className="font-medium">
                  <p>{supplier.name}</p>
                  {supplier.description && <p className="text-xs text-muted-foreground">{supplier.description}</p>}
              </TableCell>
              <TableCell>{supplier.contactPerson || 'N/A'}</TableCell>
              <TableCell>{supplier.phone || 'N/A'}</TableCell>
              <TableCell className="text-right">
                {supplier.debtAmount && supplier.debtAmount > 0 ? (
                  <Badge variant="destructive">{formatCurrency(supplier.debtAmount)}</Badge>
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

SuppliersTable.displayName = 'SuppliersTable';

