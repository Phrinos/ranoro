
"use client";

import React from "react";
import { useRouter } from "next/navigation";
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
import { Edit, Trash2, Building } from "lucide-react";
import type { Supplier } from "@/types";
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { formatCurrency } from "@/lib/utils";


interface SuppliersTableProps {
  suppliers: Supplier[];
  onEdit: (supplier: Supplier) => void;
  onDelete: (supplierId: string) => void;
}

export const SuppliersTable = React.memo(({ suppliers, onEdit, onDelete }: SuppliersTableProps) => {
    const router = useRouter();
    
    const handleRowClick = (supplier: Supplier) => {
        router.push(`/proveedores/${supplier.id}`);
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
            <TableHead className="font-bold text-white">Nombre</TableHead>
            <TableHead className="font-bold text-white">Contacto</TableHead>
            <TableHead className="font-bold text-white">Teléfono</TableHead>
            <TableHead className="text-right font-bold text-white">Deuda</TableHead>
            <TableHead className="text-right font-bold text-white print:hidden">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {suppliers.map((supplier) => (
            <TableRow key={supplier.id} onClick={() => handleRowClick(supplier)} className="cursor-pointer hover:bg-muted/50">
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
              <TableCell className="text-right print:hidden">
                <ConfirmDialog
                    triggerButton={<Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                    title={`¿Eliminar a ${supplier.name}?`}
                    description="Esta acción no se puede deshacer. Se eliminará el proveedor y su historial asociado."
                    onConfirm={() => onDelete(supplier.id)}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
});

SuppliersTable.displayName = 'SuppliersTable';
