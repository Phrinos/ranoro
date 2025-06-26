
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
import { Edit, Trash2 } from "lucide-react";
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
    return <p className="text-muted-foreground text-center py-8">No hay proveedores registrados.</p>;
  }

  return (
    <div className="rounded-lg border shadow-sm overflow-x-auto">
      <Table>
        <TableHeader className="bg-white">
          <TableRow>
            <TableHead className="font-bold">Nombre</TableHead>
            <TableHead className="font-bold">Contacto</TableHead>
            <TableHead className="font-bold">Teléfono</TableHead>
            <TableHead className="text-right font-bold">Deuda</TableHead>
            <TableHead className="font-bold">Nota Deuda</TableHead>
            <TableHead className="text-right font-bold">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {suppliers.map((supplier) => (
            <TableRow key={supplier.id}>
              <TableCell className="font-medium">{supplier.name}</TableCell>
              <TableCell>{supplier.contactPerson || 'N/A'}</TableCell>
              <TableCell>{supplier.phone || 'N/A'}</TableCell>
              <TableCell className="text-right">
                {supplier.debtAmount && supplier.debtAmount > 0 ? (
                  <Badge variant="destructive">${supplier.debtAmount.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Badge>
                ) : (
                  <span>$0.00</span>
                )}
              </TableCell>
              <TableCell>{supplier.debtNote || 'N/A'}</TableCell>
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
                        ¿Estás seguro de que quieres eliminar al proveedor "{supplier.name}"? Esta acción no se puede deshacer.
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
