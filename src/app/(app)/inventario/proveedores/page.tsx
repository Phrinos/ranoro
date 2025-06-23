
"use client";

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PlusCircle, Search, DollarSign, ShoppingCart, ListFilter } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from '@/hooks/use-toast';
import { placeholderSuppliers, placeholderServiceRecords, placeholderInventory } from '@/lib/placeholder-data';
import type { Supplier, InventoryItem } from '@/types';
import { SupplierDialog } from './components/supplier-dialog';
import { SuppliersTable } from './components/suppliers-table';
import type { SupplierFormValues } from './components/supplier-form';
import { subMonths, startOfMonth, endOfMonth, isWithinInterval, parseISO, format } from 'date-fns';
import { es } from 'date-fns/locale';

type SupplierSortOption = 
  | "name_asc" | "name_desc"
  | "debt_asc" | "debt_desc";

export default function ProveedoresPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>(placeholderSuppliers);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [sortOption, setSortOption] = useState<SupplierSortOption>("name_asc");
  const { toast } = useToast();
  const [topSupplierLastMonth, setTopSupplierLastMonth] = useState<{ name: string; quantity: number } | null>(null);

  useEffect(() => {
    const lastMonthStart = startOfMonth(subMonths(new Date(), 1));
    const lastMonthEnd = endOfMonth(subMonths(new Date(), 1));
    const supplierPurchaseQuantity: Record<string, { name: string, quantity: number }> = {};

    placeholderServiceRecords.forEach(service => {
      const serviceDate = parseISO(service.serviceDate);
      if (isWithinInterval(serviceDate, { start: lastMonthStart, end: lastMonthEnd })) {
        if (service.suppliesUsed && Array.isArray(service.suppliesUsed)) {
          service.suppliesUsed.forEach(part => {
            const inventoryItem = placeholderInventory.find(item => item.id === part.supplyId);
            if (inventoryItem && inventoryItem.supplier) {
              const supplierName = inventoryItem.supplier;
              if (!supplierPurchaseQuantity[supplierName]) {
                supplierPurchaseQuantity[supplierName] = { name: supplierName, quantity: 0 };
              }
              supplierPurchaseQuantity[supplierName].quantity += part.quantity;
            }
          });
        }
      }
    });

    let topSupplier: { name: string, quantity: number } | null = null;
    for (const supplierInfo of Object.values(supplierPurchaseQuantity)) {
      if (!topSupplier || supplierInfo.quantity > topSupplier.quantity) {
        topSupplier = supplierInfo;
      }
    }
    setTopSupplierLastMonth(topSupplier);
  }, []);

  const totalDebtWithSuppliers = useMemo(() => {
    return suppliers.reduce((total, supplier) => total + (supplier.debtAmount || 0), 0);
  }, [suppliers]);

  const filteredAndSortedSuppliers = useMemo(() => {
    let itemsToDisplay = [...suppliers];
    if (searchTerm) {
      itemsToDisplay = itemsToDisplay.filter(sup =>
        sup.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (sup.contactPerson && sup.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()))
      );
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

  const handleOpenDialog = (supplier: Supplier | null = null) => {
    setEditingSupplier(supplier);
    setIsDialogOpen(true);
  };

  const handleSaveSupplier = async (formData: SupplierFormValues) => {
    if (editingSupplier) {
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
      <div className="mb-6 grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Deuda Total con Proveedores
            </CardTitle>
            <DollarSign className="h-5 w-5 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">${totalDebtWithSuppliers.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <p className="text-xs text-muted-foreground">
              Suma de todas las deudas pendientes.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Top Compras (Mes Pasado)
            </CardTitle>
            <ShoppingCart className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            {topSupplierLastMonth ? (
              <>
                <div className="text-xl font-bold font-headline">{topSupplierLastMonth.name}</div>
                <p className="text-xs text-muted-foreground">
                  {topSupplierLastMonth.quantity} unidades de repuestos suministradas en servicios ({format(startOfMonth(subMonths(new Date(), 1)), "MMMM yyyy", { locale: es })}).
                </p>
              </>
            ) : (
              <p className="text-muted-foreground">No se registraron compras a proveedores en servicios el mes pasado.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Proveedores</CardTitle>
          <CardDescription>
            Visualiza, edita y elimina proveedores. La columna 'Deuda' muestra el monto pendiente.
          </CardDescription>
           <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-2 w-full">
                <div className="relative flex-1 sm:flex-initial w-full sm:w-auto">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Buscar proveedores..."
                    className="pl-8 w-full sm:w-[250px] lg:w-[300px] bg-white"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full sm:w-auto bg-white">
                        <ListFilter className="mr-2 h-4 w-4" />
                        Ordenar
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Ordenar por</DropdownMenuLabel>
                        <DropdownMenuRadioGroup value={sortOption} onValueChange={(value) => setSortOption(value as SupplierSortOption)}>
                        <DropdownMenuRadioItem value="name_asc">Nombre (A-Z)</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="name_desc">Nombre (Z-A)</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="debt_desc">Deuda (Mayor a Menor)</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="debt_asc">Deuda (Menor a Mayor)</DropdownMenuRadioItem>
                        </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                    </DropdownMenu>
                    <Button onClick={() => handleOpenDialog()} className="w-full sm:w-auto">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Nuevo Proveedor
                    </Button>
                </div>
            </div>
        </CardHeader>
        <CardContent>
          <SuppliersTable
            suppliers={filteredAndSortedSuppliers}
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
