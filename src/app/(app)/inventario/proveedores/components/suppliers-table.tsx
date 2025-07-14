
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
import { Edit, Trash2, Building } from "lucide-react";
import type { Supplier } from "@/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface SuppliersTableProps {
  suppliers: Supplier[];
  onEdit: (supplier: Supplier) => void;
  onDelete: (supplierId: string) => void;
}

export const SuppliersTable = React.memo(({ suppliers, onEdit, onDelete }: SuppliersTableProps) => {
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
            <TableHead className="text-right font-bold text-white">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {suppliers.map((supplier) => (
            <TableRow key={supplier.id}>
              <TableCell className="font-medium">
                  <p>{supplier.name}</p>
                  {supplier.description && <p className="text-xs text-muted-foreground">{supplier.description}</p>}
              </TableCell>
              <TableCell>{supplier.contactPerson || 'N/A'}</TableCell>
              <TableCell>{supplier.phone || 'N/A'}</TableCell>
              <TableCell className="text-right">
                {supplier.debtAmount && supplier.debtAmount > 0 ? (
                  <Badge variant="destructive">${supplier.debtAmount.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Badge>
                ) : (
                  <span className="text-muted-foreground">N/A</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="icon" onClick={() => onEdit(supplier)} className="mr-2">
                  <Edit className="h-4 w-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Eliminar Proveedor?</AlertDialogTitle>
                      <AlertDialogDescription>
                        ¿Estás seguro de que quieres eliminar al proveedor &quot;{supplier.name}&quot;? Esta acción no se puede deshacer.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => onDelete(supplier.id)}
                        className="bg-destructive hover:bg-destructive/90"
                      >
                        Sí, Eliminar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
});

SuppliersTable.displayName = 'SuppliersTable';
