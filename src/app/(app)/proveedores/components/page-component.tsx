

"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Supplier } from '@/types';
import { PlusCircle, Search, ListFilter } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SuppliersTable } from './suppliers-table';
import { SupplierDialog } from './supplier-dialog';
import type { SupplierFormValues } from '@/schemas/supplier-form-schema';
import { inventoryService } from '@/lib/services';
import { Loader2 } from 'lucide-react';

type SupplierSortOption = | "name_asc" | "name_desc" | "debt_asc" | "debt_desc";

export function ProveedoresContent() {
  const { toast } = useToast();
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState<SupplierSortOption>('name_asc');
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
  
  const filteredAndSortedSuppliers = useMemo(() => {
    let items = [...suppliers];
    if (searchTerm) {
        items = items.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    items.sort((a,b) => {
        switch(sortOption) {
            case 'debt_asc': return (a.debtAmount || 0) - (b.debtAmount || 0);
            case 'debt_desc': return (b.debtAmount || 0) - (a.debtAmount || 0);
            case 'name_desc': return b.name.localeCompare(a.name);
            case 'name_asc':
            default: return a.name.localeCompare(b.name);
        }
    });
    return items;
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
  
  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex justify-end">
            <Button onClick={() => handleOpenDialog()}><PlusCircle className="mr-2 h-4 w-4" />Nuevo Proveedor</Button>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative flex-1 w-full sm:w-auto"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input type="search" placeholder="Buscar por nombre o contacto..." className="w-full rounded-lg bg-card pl-8" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
            <DropdownMenu>
                <DropdownMenuTrigger asChild><Button variant="outline" className="w-full sm:w-auto bg-card"><ListFilter className="mr-2 h-4 w-4" />Ordenar por</Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end"><DropdownMenuLabel>Ordenar por</DropdownMenuLabel><DropdownMenuRadioGroup value={sortOption} onValueChange={(value) => setSortOption(value as SupplierSortOption)}><DropdownMenuRadioItem value="name_asc">Nombre (A-Z)</DropdownMenuRadioItem><DropdownMenuRadioItem value="name_desc">Nombre (Z-A)</DropdownMenuRadioItem><DropdownMenuRadioItem value="debt_desc">Deuda (Mayor a Menor)</DropdownMenuRadioItem><DropdownMenuRadioItem value="debt_asc">Deuda (Menor a Mayor)</DropdownMenuRadioItem></DropdownMenuRadioGroup></DropdownMenuContent>
            </DropdownMenu>
        </div>
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
