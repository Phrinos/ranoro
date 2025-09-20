// src/app/(app)/proveedores/components/proveedores-content.tsx
"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { PlusCircle } from 'lucide-react';
import type { Supplier } from '@/types';
import { useTableManager } from '@/hooks/useTableManager';
import { TableToolbar } from '@/components/shared/table-toolbar';
import { Card, CardContent } from '@/components/ui/card';
import { SuppliersTable } from './suppliers-table';

const sortOptions = [
    { value: 'name_asc', label: 'Nombre (A-Z)' },
    { value: 'name_desc', label: 'Nombre (Z-A)' },
    { value: 'contactPerson_asc', label: 'Contacto (A-Z)' },
    { value: 'contactPerson_desc', label: 'Contacto (Z-A)' },
    { value: 'phone_asc', label: 'Teléfono (A-Z)' },
    { value: 'phone_desc', label: 'Teléfono (Z-A)' },
    { value: 'debtAmount_desc', label: 'Deuda (Mayor a Menor)' },
    { value: 'debtAmount_asc', label: 'Deuda (Menor a Mayor)' },
];

interface ProveedoresContentProps {
  suppliers: Supplier[];
  onAdd: () => void;
  onEdit: (supplier: Supplier) => void;
  onDelete: (supplierId: string) => void;
  onRowClick: (supplier: Supplier) => void;
}

export function ProveedoresContent({ 
  suppliers, 
  onAdd, 
  onEdit, 
  onDelete,
  onRowClick 
}: ProveedoresContentProps) {

  const {
      filteredData: filteredAndSortedSuppliers,
      ...tableManager
  } = useTableManager<Supplier>({
      initialData: suppliers,
      searchKeys: ['name', 'contactPerson', 'phone'],
      dateFilterKey: '',
      initialSortOption: 'name_asc',
  });

  return (
    <div className="space-y-4">
        <div className="flex justify-between items-center">
            <div>
                <h2 className="text-2xl font-semibold tracking-tight">Lista de Proveedores</h2>
                <p className="text-muted-foreground">Administra la información de tus proveedores y sus saldos.</p>
            </div>
        </div>
        
        <TableToolbar 
            searchTerm={tableManager.searchTerm}
            onSearchTermChange={tableManager.onSearchTermChange}
            searchPlaceholder="Buscar por nombre o contacto..."
            actions={
              <Button onClick={onAdd} className="w-full sm:w-auto">
                <PlusCircle className="mr-2 h-4 w-4" /> Nuevo Proveedor
              </Button>
            }
        />
        <Card>
            <CardContent className="p-0">
                <SuppliersTable 
                    suppliers={filteredAndSortedSuppliers} 
                    onEdit={onEdit} 
                    onDelete={onDelete}
                    onRowClick={onRowClick}
                    sortOption={tableManager.sortOption}
                    onSortOptionChange={tableManager.onSortOptionChange}
                />
            </CardContent>
        </Card>
    </div>
  );
}
