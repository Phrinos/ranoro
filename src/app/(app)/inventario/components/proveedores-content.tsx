

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
import type { SupplierFormValues } from '../proveedores/components/supplier-form';
import { inventoryService } from '@/lib/services';

type SupplierSortOption = | "name_asc" | "name_desc" | "debt_asc" | "debt_desc";

interface ProveedoresContentProps {
  suppliers: Supplier[];
}

export function ProveedoresContent({ suppliers: initialSuppliers }: ProveedoresContentProps) {
  const { toast } = useToast();
  const [suppliers, setSuppliers] = useState(initialSuppliers);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState<SupplierSortOption>("name_asc");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  useEffect(() => {
    setSuppliers(initialSuppliers);
  }, [initialSuppliers]);

  const filteredAndSortedSuppliers = useMemo(() => {
    let itemsToDisplay = [...suppliers];
    if (searchTerm) {
      itemsToDisplay = itemsToDisplay.filter(sup => sup.name.toLowerCase().includes(searchTerm.toLowerCase()) || (sup.contactPerson && sup.contactPerson.toLowerCase().includes(searchTerm.toLowerCase())));
    }
    itemsToDisplay.sort((a, b) => {
      switch (sortOption) {
        case 'name_asc': return a.name.localeCompare(b.name);
        case 'name_desc': return b.name.localeCompare(a.name);
        case 'debt_asc': return (a.debtAmount || 0) - (b.debtAmount || 0);
        case 'debt_desc': return (b.debtAmount || 0) - (a.debtAmount || 0);
        default: return a.name.localeCompare(b.name);
      }
    });
    return itemsToDisplay;
  }, [suppliers, searchTerm, sortOption]);

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

  return (
    <>
      <div className="mt-6 space-y-4">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">Lista de Proveedores</h2>
          <p className="text-muted-foreground">Visualiza, edita y elimina proveedores.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 w-full">
          <div className="relative flex-1 sm:flex-initial w-full sm:w-auto">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input type="search" placeholder="Buscar proveedores..." className="pl-8 w-full sm:w-[250px] lg:w-[300px] bg-card" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" className="w-full sm:w-auto bg-card"><ListFilter className="mr-2 h-4 w-4" />Ordenar</Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuLabel>Ordenar por</DropdownMenuLabel><DropdownMenuRadioGroup value={sortOption} onValueChange={(value) => setSortOption(value as SupplierSortOption)}><DropdownMenuRadioItem value="name_asc">Nombre (A-Z)</DropdownMenuRadioItem><DropdownMenuRadioItem value="name_desc">Nombre (Z-A)</DropdownMenuRadioItem><DropdownMenuRadioItem value="debt_desc">Deuda (Mayor a Menor)</DropdownMenuRadioItem><DropdownMenuRadioItem value="debt_asc">Deuda (Menor a Mayor)</DropdownMenuRadioItem></DropdownMenuRadioGroup></DropdownMenuContent></DropdownMenu>
            <Button onClick={() => handleOpenDialog()}><PlusCircle className="mr-2 h-4 w-4" />Nuevo Proveedor</Button>
          </div>
        </div>
        <Card><CardContent className="p-0"><SuppliersTable suppliers={filteredAndSortedSuppliers} onEdit={handleOpenDialog} onDelete={handleDeleteSupplier} /></CardContent></Card>
      </div>
      <SupplierDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} supplier={editingSupplier} onSave={handleSaveSupplier} />
    </>
  );
}
