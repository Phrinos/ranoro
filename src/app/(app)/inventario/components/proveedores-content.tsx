

"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Supplier } from '@/types';
import { PlusCircle, Search, ListFilter } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SuppliersTable } from '../proveedores/components/suppliers-table';
import { SupplierDialog } from '../proveedores/components/supplier-dialog';
import type { SupplierFormValues } from '@/schemas/supplier-form-schema';
import { inventoryService } from '@/lib/services';
import { useRouter } from 'next/navigation';
import { TableToolbar } from '@/components/shared/table-toolbar';
import { useTableManager } from '@/hooks/useTableManager';

type SupplierSortOption = | "name_asc" | "name_desc" | "debt_asc" | "debt_desc";

interface ProveedoresContentProps {
  suppliers: Supplier[];
}

export function ProveedoresContent({ suppliers: initialSuppliers }: ProveedoresContentProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [suppliers, setSuppliers] = useState(initialSuppliers);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  useEffect(() => {
    setSuppliers(initialSuppliers);
  }, [initialSuppliers]);

  const {
    filteredData: filteredAndSortedSuppliers,
    ...tableManager
  } = useTableManager<Supplier>({
    initialData: suppliers,
    searchKeys: ['name', 'contactPerson', 'phone'],
    dateFilterKey: '', // no date filter
    initialSortOption: 'name_asc'
  });

  const handleOpenDialog = useCallback((supplier: Supplier | null = null) => {
    if(supplier) {
        router.push(`/inventario/proveedores/${supplier.id}`);
    } else {
        setEditingSupplier(null);
        setIsDialogOpen(true);
    }
  }, [router]);
  
  const handleSaveSupplier = useCallback(async (formData: SupplierFormValues) => {
    try {
      await inventoryService.saveSupplier(formData, editingSupplier?.id);
      toast({ title: `Proveedor ${editingSupplier ? 'Actualizado' : 'Agregado'}` });
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Error saving supplier:", error);
      toast({ title: "Error al guardar", description: "No se pudo guardar el proveedor.", variant: "destructive" });
    }
  }, [editingSupplier, toast]);

  const handleDeleteSupplier = useCallback(async (supplierId: string) => {
    try {
      await inventoryService.deleteSupplier(supplierId);
      toast({ title: "Proveedor Eliminado" });
    } catch (error) {
      console.error("Error deleting supplier:", error);
      toast({ title: "Error al eliminar", description: "No se pudo eliminar el proveedor.", variant: "destructive" });
    }
  }, [toast]);

  return (
    <>
      <div className="mt-6 space-y-4">
        <div className="flex justify-end">
            <Button onClick={() => handleOpenDialog()}><PlusCircle className="mr-2 h-4 w-4" />Nuevo Proveedor</Button>
        </div>

        <TableToolbar
            {...tableManager}
            searchPlaceholder="Buscar por nombre o contacto..."
            sortOptions={[
                { value: 'name_asc', label: 'Nombre (A-Z)' },
                { value: 'name_desc', label: 'Nombre (Z-A)' },
                { value: 'debt_desc', label: 'Deuda (Mayor a Menor)' },
                { value: 'debt_asc', label: 'Deuda (Menor a Mayor)' },
            ]}
        />
        <Card>
            <CardContent className="p-0">
                <SuppliersTable suppliers={filteredAndSortedSuppliers} onEdit={handleOpenDialog} onDelete={handleDeleteSupplier} />
            </CardContent>
        </Card>
      </div>
      <SupplierDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} supplier={editingSupplier} onSave={handleSaveSupplier} />
    </>
  );
}
