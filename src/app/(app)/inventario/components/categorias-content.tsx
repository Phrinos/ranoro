
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from '@/hooks/use-toast';
import type { InventoryCategory, InventoryItem } from '@/types';
import { PlusCircle, Trash2, Edit, Search } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogTrigger, AlertDialogFooter } from "@/components/ui/alert-dialog";
import { persistToFirestore, placeholderCategories, placeholderInventory, logAudit } from '@/lib/placeholder-data';
import { capitalizeWords } from '@/lib/utils';

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
  const [currentCategoryName, setCurrentCategoryName] = useState('');
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

  const handleOpenAddCategoryDialog = useCallback(() => { setEditingCategory(null); setCurrentCategoryName(''); setIsCategoryDialogOpen(true); }, []);
  const handleOpenEditCategoryDialog = useCallback((category: InventoryCategory) => { setEditingCategory(category); setCurrentCategoryName(category.name); setIsCategoryDialogOpen(true); }, []);
  
  const handleSaveCategory = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    const categoryName = currentCategoryName.trim();
    if (!categoryName) return toast({ title: "Nombre Vacío", variant: "destructive" });
    if (categories.some(cat => cat.name.toLowerCase() === categoryName.toLowerCase() && cat.id !== editingCategory?.id)) return toast({ title: "Categoría Duplicada", variant: "destructive" });

    const action = editingCategory ? 'Editar' : 'Crear';
    const entityId = editingCategory ? editingCategory.id : `CAT${String(categories.length + 1).padStart(3, '0')}${Date.now().toString().slice(-3)}`;
    const description = `Se ${editingCategory ? 'actualizó la' : 'creó la nueva'} categoría de inventario: "${categoryName}".`;
    
    if (editingCategory) {
      const pIndex = placeholderCategories.findIndex(cat => cat.id === editingCategory.id);
      if (pIndex !== -1) placeholderCategories[pIndex].name = categoryName;
    } else {
      placeholderCategories.push({ id: entityId, name: categoryName });
    }
    
    await logAudit(action, description, { entityType: 'Categoría', entityId });
    await persistToFirestore(['categories', 'auditLogs']);
    setCategories([...placeholderCategories]);
    toast({ title: `Categoría ${editingCategory ? 'Actualizada' : 'Agregada'}` });
    setIsCategoryDialogOpen(false);
    setEditingCategory(null);
    setCurrentCategoryName('');
  }, [currentCategoryName, categories, editingCategory, toast]);

  const handleDeleteCategory = useCallback(async () => {
    if (!categoryToDelete) return;

    await logAudit('Eliminar', `Se eliminó la categoría de inventario "${categoryToDelete.name}".`, { entityType: 'Categoría', entityId: categoryToDelete.id });
    
    const pIndex = placeholderCategories.findIndex(cat => cat.id === categoryToDelete.id);
    if (pIndex !== -1) {
        placeholderCategories.splice(pIndex, 1);
        await persistToFirestore(['categories', 'auditLogs']);
        setCategories([...placeholderCategories]);
        toast({ title: "Categoría Eliminada" });
    }
    setCategoryToDelete(null);
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
        <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}><DialogContent className="sm:max-w-[425px]"><form onSubmit={handleSaveCategory}><DialogHeader><DialogTitle>{editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}</DialogTitle><DialogDescription>{editingCategory ? 'Modifica el nombre de la categoría.' : 'Ingresa el nombre para la nueva categoría.'}</DialogDescription></DialogHeader><div className="grid gap-4 py-4"><div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="category-name" className="text-right">Nombre</Label><Input id="category-name" value={currentCategoryName} onChange={(e) => setCurrentCategoryName(capitalizeWords(e.target.value))} className="col-span-3" placeholder="Ej: Aceites" /></div></div><DialogFooter><Button type="button" variant="outline" onClick={() => setIsCategoryDialogOpen(false)}>Cancelar</Button><Button type="submit">{editingCategory ? 'Guardar Cambios' : 'Crear Categoría'}</Button></DialogFooter></form></DialogContent></Dialog>
    </div>
  );
}
