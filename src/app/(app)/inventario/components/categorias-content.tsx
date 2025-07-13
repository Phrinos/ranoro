
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from '@/hooks/use-toast';
import type { InventoryCategory, InventoryItem, User } from '@/types';
import { PlusCircle, Trash2, Edit, Search } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter } from "@/components/ui/alert-dialog";
import { inventoryService } from '@/lib/services';
import { CategoryDialog } from './category-dialog';

interface CategoriasContentProps {
  categories: InventoryCategory[];
  inventoryItems: InventoryItem[];
}

export function CategoriasContent({ categories: initialCategories, inventoryItems }: CategoriasContentProps) {
  const { toast } = useToast();
  const [categories, setCategories] = useState(initialCategories);
  const [searchTermCategories, setSearchTermCategories] = useState('');
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<InventoryCategory | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<InventoryCategory | null>(null);

  useEffect(() => {
    setCategories(initialCategories);
  }, [initialCategories]);

  const categoryProductCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    categories.forEach(cat => { counts[cat.id] = inventoryItems.filter(item => item.category === cat.name).length; });
    return counts;
  }, [categories, inventoryItems]);

  const filteredCategories = useMemo(() => {
    const filtered = searchTermCategories ? categories.filter(cat => cat.name.toLowerCase().includes(searchTermCategories.toLowerCase())) : categories;
    return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
  }, [categories, searchTermCategories]);

  const handleOpenAddCategoryDialog = useCallback(() => { setEditingCategory(null); setIsCategoryDialogOpen(true); }, []);
  const handleOpenEditCategoryDialog = useCallback((category: InventoryCategory) => { setEditingCategory(category); setIsCategoryDialogOpen(true); }, []);
  
  const handleSaveCategory = useCallback(async (name: string, id?: string) => {
    try {
      await inventoryService.saveCategory({ name }, id);
      toast({ title: `Categoría ${id ? 'Actualizada' : 'Agregada'}` });
    } catch (error) {
      console.error("Error saving category:", error);
      toast({ title: "Error al guardar", description: "No se pudo guardar la categoría.", variant: "destructive" });
    }
  }, [toast]);

  const handleDeleteCategory = useCallback(async () => {
    if (!categoryToDelete) return;
    try {
      await inventoryService.deleteCategory(categoryToDelete.id);
      toast({ title: "Categoría Eliminada" });
      setCategoryToDelete(null);
    } catch (error) {
       console.error("Error deleting category:", error);
       toast({ title: "Error al eliminar", description: "No se pudo eliminar la categoría.", variant: "destructive" });
    }
  }, [categoryToDelete, toast]);

  return (
    <div className="mt-6 space-y-4">
        <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight">Lista de Categorías</h2>
            <p className="text-muted-foreground">Visualiza, edita y elimina categorías.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative sm:w-1/3"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input type="search" placeholder="Buscar categorías..." className="pl-8 bg-background" value={searchTermCategories} onChange={(e) => setSearchTermCategories(e.target.value)} /></div>
            <Button onClick={handleOpenAddCategoryDialog}><PlusCircle className="mr-2 h-4 w-4" />Nueva Categoría</Button>
        </div>
        <Card>
            <CardContent className="p-0">
                {filteredCategories.length > 0 ? (
                    <div className="rounded-md border"><Table><TableHeader className="bg-black"><TableRow><TableHead className="text-white">Nombre de la Categoría</TableHead><TableHead className="text-right text-white">Productos</TableHead><TableHead className="text-right text-white">Acciones</TableHead></TableRow></TableHeader><TableBody>{filteredCategories.map((category) => (<TableRow key={category.id}><TableCell className="font-medium">{category.name}</TableCell><TableCell className="text-right">{categoryProductCounts[category.id] || 0}</TableCell><TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => handleOpenEditCategoryDialog(category)} className="mr-2"><Edit className="h-4 w-4" /></Button><AlertDialog open={categoryToDelete?.id === category.id} onOpenChange={(open) => !open && setCategoryToDelete(null)}><AlertDialogTrigger asChild><Button variant="ghost" size="icon" onClick={() => setCategoryToDelete(category)}><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Eliminar Categoría?</AlertDialogTitle><AlertDialogDescription>¿Estás seguro de que quieres eliminar la categoría &quot;{categoryToDelete?.name}&quot;? Esta acción no se puede deshacer.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDeleteCategory} className="bg-destructive hover:bg-destructive/90">Sí, Eliminar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></TableCell></TableRow>))}</TableBody></Table></div>
                ) : (<p className="text-muted-foreground text-center py-4">{searchTermCategories ? "No se encontraron categorías." : "No hay categorías registradas."}</p>)}
            </CardContent>
        </Card>
        <CategoryDialog
          open={isCategoryDialogOpen}
          onOpenChange={setIsCategoryDialogOpen}
          category={editingCategory}
          onSave={handleSaveCategory}
          existingCategories={categories}
        />
    </div>
  );
}
