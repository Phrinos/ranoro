

"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Search, ListFilter } from 'lucide-react';
import type { Supplier } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { SuppliersTable } from './suppliers-table';
import { SupplierDialog } from './supplier-dialog';
import type { SupplierFormValues } from '@/schemas/supplier-form-schema';
import { inventoryService } from '@/lib/services';
import { Loader2 } from 'lucide-react';
import { useTableManager } from '@/hooks/useTableManager';
import { TableToolbar } from '@/components/shared/table-toolbar';

type SupplierSortOption = | "name_asc" | "name_desc" | "debt_asc" | "debt_desc";

const sortOptions = [
    { value: 'name_asc', label: 'Nombre (A-Z)' },
    { value: 'name_desc', label: 'Nombre (Z-A)' },
    { value: 'debt_desc', label: 'Deuda (Mayor a Menor)' },
    { value: 'debt_asc', label: 'Deuda (Menor a Mayor)' },
];

export function ProveedoresPageComponent() {
  const { toast } = useToast();
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = inventoryService.onSuppliersUpdate((data) => {
      setSuppliers(data);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);
  
  const { filteredData: filteredAndSortedSuppliers, ...tableManager } = useTableManager<Supplier>({
      initialData: suppliers,
      searchKeys: ['name', 'contactPerson'],
      dateFilterKey: '',
      initialSortOption: 'name_asc',
      itemsPerPage: 100,
  });

  const handleOpenDialog = useCallback((supplier: Supplier | null = null) => {
    setEditingSupplier(supplier);
    setIsDialogOpen(true);
  }, []);
  
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
  
  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex justify-end">
            <Button onClick={() => handleOpenDialog()}><PlusCircle className="mr-2 h-4 w-4" />Nuevo Proveedor</Button>
        </div>
        <TableToolbar 
            {...tableManager}
            sortOptions={sortOptions}
            searchPlaceholder="Buscar por nombre o contacto..."
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
