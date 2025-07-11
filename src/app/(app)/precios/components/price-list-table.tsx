
"use client";

import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Tags } from "lucide-react";
import type { VehiclePriceList } from "@/types";
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

interface PriceListTableProps {
  records: VehiclePriceList[];
  onEdit: (record: VehiclePriceList) => void;
  onDelete: (recordId: string) => void;
}

export const PriceListTable = React.memo(({ records, onEdit, onDelete }: PriceListTableProps) => {
  if (!records.length) {
    return (
        <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground border-2 border-dashed rounded-lg">
            <Tags className="h-12 w-12 mb-2" />
            <h3 className="text-lg font-semibold text-foreground">No hay listas de precios</h3>
            <p className="text-sm">Cuando se agregue una nueva lista de precios, aparecerá aquí.</p>
        </div>
    );
  }

  return (
    <div className="rounded-lg border shadow-sm overflow-x-auto">
      <Table>
        <TableHeader className="bg-black">
          <TableRow>
            <TableHead className="font-bold text-white">Marca</TableHead>
            <TableHead className="font-bold text-white">Modelo</TableHead>
            <TableHead className="font-bold text-white">Años</TableHead>
            <TableHead className="text-right font-bold text-white"># Servicios</TableHead>
            <TableHead className="text-right font-bold text-white">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((record) => (
            <TableRow key={record.id}>
              <TableCell className="font-semibold">{record.make}</TableCell>
              <TableCell>{record.model}</TableCell>
              <TableCell>{record.years.join(', ')}</TableCell>
              <TableCell className="text-right">{record.services.length}</TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="icon" onClick={() => onEdit(record)} className="mr-2">
                  <Edit className="h-4 w-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Eliminar esta lista de precios?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta acción no se puede deshacer. ¿Seguro que quieres eliminar la lista para {record.make} {record.model}?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => onDelete(record.id)}
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

PriceListTable.displayName = 'PriceListTable';
