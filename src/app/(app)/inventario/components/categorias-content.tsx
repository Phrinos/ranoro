

"use client";

import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from '@/hooks/use-toast';
import type { InventoryCategory, InventoryItem } from '@/types';
import { PlusCircle, Trash2, Edit, Search } from 'lucide-react';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { CategoryDialog } from './category-dialog';

interface CategoriasContentProps {
  categories: InventoryCategory[];
  inventoryItems: InventoryItem[];
  onSaveCategory: (name: string, id?: string) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
}

export function CategoriasContent({ 
    categories, 
    inventoryItems,
    onSaveCategory,
    onDeleteCategory
}: CategoriasContentProps) {
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<InventoryCategory | null>(null);

  const categoryProductCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    categories.forEach(cat => { counts[cat.id] = inventoryItems.filter(item => item.category === cat.name).length; });
    return counts;
  }, [categories, inventoryItems]);

  const filteredCategories = useMemo(() => {
    const filtered = searchTerm ? categories.filter(cat => cat.name.toLowerCase().includes(searchTerm.toLowerCase())) : categories;
    return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
  }, [categories, searchTerm]);

  const handleOpenDialog = useCallback((category: InventoryCategory | null = null) => {
    setEditingCategory(category);
    setIsDialogOpen(true);
  }, []);

  const handleSave = async (name: string, id?: string) => {
    await onSaveCategory(name, id);
    setIsDialogOpen(false);
  };
  
  const handleDelete = async (id: string) => {
    await onDeleteCategory(id);
  };

  return (
    <div className="mt-6 space-y-4">
        <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight">Lista de Categorías</h2>
            <p className="text-muted-foreground">Visualiza, edita y elimina categorías.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative sm:w-1/3"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input type="search" placeholder="Buscar categorías..." className="pl-8 bg-white" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
            <Button onClick={() => handleOpenDialog()}><PlusCircle className="mr-2 h-4 w-4" />Nueva Categoría</Button>
        </div>
        <Card>
            <CardContent className="p-0">
                {filteredCategories.length > 0 ? (
                    <div className="rounded-md border"><Table><TableHeader className="bg-black"><TableRow><TableHead className="text-white">Nombre de la Categoría</TableHead><TableHead className="text-right text-white">Productos</TableHead><TableHead className="text-right text-white">Acciones</TableHead></TableRow></TableHeader><TableBody>{filteredCategories.map((category) => (<TableRow key={category.id}><TableCell className="font-medium">{category.name}</TableCell><TableCell className="text-right">{categoryProductCounts[category.id] || 0}</TableCell><TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => handleOpenDialog(category)} className="mr-2"><Edit className="h-4 w-4" /></Button><ConfirmDialog
                        triggerButton={<Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                        title={`¿Eliminar la categoría "${category.name}"?`}
                        description="Esta acción no se puede deshacer. Los productos de esta categoría no serán eliminados."
                        onConfirm={() => handleDelete(category.id)}
                    /></TableCell></TableRow>))}</TableBody></Table></div>
                ) : (<p className="text-muted-foreground text-center py-4">{searchTerm ? "No se encontraron categorías." : "No hay categorías registradas."}</p>)}
            </CardContent>
        </Card>
        <CategoryDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          category={editingCategory}
          onSave={handleSave}
          existingCategories={categories}
        />
    </div>
  );
}
