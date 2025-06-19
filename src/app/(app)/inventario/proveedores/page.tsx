
"use client";

import { useState, useMemo } from 'react';
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PlusCircle, Search } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { placeholderSuppliers } from '@/lib/placeholder-data';
import type { Supplier } from '@/types';
import { SupplierDialog } from './components/supplier-dialog';
import { SuppliersTable } from './components/suppliers-table';
import type { SupplierFormValues } from './components/supplier-form';

export default function ProveedoresPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>(placeholderSuppliers);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const { toast } = useToast();

  const filteredSuppliers = useMemo(() => {
    if (!searchTerm) return suppliers;
    return suppliers.filter(sup =>
      sup.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (sup.contactPerson && sup.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [suppliers, searchTerm]);

  const handleOpenDialog = (supplier: Supplier | null = null) => {
    setEditingSupplier(supplier);
    setIsDialogOpen(true);
  };

  const handleSaveSupplier = async (formData: SupplierFormValues) => {
    if (editingSupplier) {
      // Edit existing supplier
      const updatedSuppliers = suppliers.map(sup =>
        sup.id === editingSupplier.id ? { ...editingSupplier, ...formData, debtAmount: Number(formData.debtAmount) || 0 } : sup
      );
      setSuppliers(updatedSuppliers);
      const pIndex = placeholderSuppliers.findIndex(sup => sup.id === editingSupplier.id);
      if (pIndex !== -1) placeholderSuppliers[pIndex] = { ...placeholderSuppliers[pIndex], ...formData, debtAmount: Number(formData.debtAmount) || 0 };
      
      toast({
        title: "Proveedor Actualizado",
        description: `El proveedor "${formData.name}" ha sido actualizado.`,
      });
    } else {
      // Add new supplier
      const newSupplier: Supplier = {
        id: `SUP${String(suppliers.length + 1).padStart(3, '0')}${Date.now().toString().slice(-3)}`,
        ...formData,
        debtAmount: Number(formData.debtAmount) || 0,
      };
      setSuppliers(prev => [...prev, newSupplier]);
      placeholderSuppliers.push(newSupplier);
      toast({
        title: "Proveedor Agregado",
        description: `El proveedor "${newSupplier.name}" ha sido creado.`,
      });
    }
    setIsDialogOpen(false);
    setEditingSupplier(null);
  };

  const handleDeleteSupplier = (supplierId: string) => {
    const supplierToDelete = suppliers.find(s => s.id === supplierId);
    if (!supplierToDelete) return;

    setSuppliers(prev => prev.filter(sup => sup.id !== supplierId));
    const pIndex = placeholderSuppliers.findIndex(sup => sup.id === supplierId);
    if (pIndex !== -1) {
      placeholderSuppliers.splice(pIndex, 1);
    }
    
    toast({
      title: "Proveedor Eliminado",
      description: `El proveedor "${supplierToDelete.name}" ha sido eliminado.`,
    });
  };

  return (
    <>
      <PageHeader
        title="Gestión de Proveedores"
        description="Administra la información de tus proveedores y sus cuentas."
        actions={
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar proveedores..."
                className="pl-8 sm:w-[300px]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button onClick={() => handleOpenDialog()}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Nuevo Proveedor
            </Button>
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Lista de Proveedores</CardTitle>
          <CardDescription>
            Visualiza, edita y elimina proveedores. La columna 'Deuda' muestra el monto pendiente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SuppliersTable
            suppliers={filteredSuppliers}
            onEdit={handleOpenDialog}
            onDelete={handleDeleteSupplier}
          />
        </CardContent>
      </Card>

      <SupplierDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        supplier={editingSupplier}
        onSave={handleSaveSupplier}
      />
    </>
  );
}
