
"use client";

import { useState, useMemo, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PlusCircle, Trash2, Edit, Search } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { placeholderCategories, placeholderInventory, persistToFirestore } from '@/lib/placeholder-data';
import type { InventoryCategory, InventoryItem } from '@/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { capitalizeWords } from '@/lib/utils';

export default function CategoriasInventarioPage() {
  const [categories, setCategories] = useState<InventoryCategory[]>(placeholderCategories);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<InventoryCategory | null>(null);
  const [currentCategoryName, setCurrentCategoryName] = useState('');
  const [categoryToDelete, setCategoryToDelete] = useState<InventoryCategory | null>(null);
  const { toast } = useToast();

  const categoryProductCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    categories.forEach(cat => {
      counts[cat.id] = placeholderInventory.filter(item => item.category === cat.name).length;
    });
    return counts;
  }, [categories]);

  const filteredCategories = useMemo(() => {
    const filtered = searchTerm
      ? categories.filter(cat => cat.name.toLowerCase().includes(searchTerm.toLowerCase()))
      : categories;

    return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
  }, [categories, searchTerm]);

  const handleOpenAddDialog = () => {
    setEditingCategory(null);
    setCurrentCategoryName('');
    setIsCategoryDialogOpen(true);
  };

  const handleOpenEditDialog = (category: InventoryCategory) => {
    setEditingCategory(category);
    setCurrentCategoryName(category.name);
    setIsCategoryDialogOpen(true);
  };

  const handleSaveCategory = (e?: React.FormEvent) => {
    e?.preventDefault();
    const categoryName = currentCategoryName.trim();
    if (!categoryName) {
      toast({
        title: "Nombre Vacío",
        description: "El nombre de la categoría no puede estar vacío.",
        variant: "destructive",
      });
      return;
    }

    const isDuplicate = categories.some(
      cat => cat.name.toLowerCase() === categoryName.toLowerCase() && cat.id !== editingCategory?.id
    );

    if (isDuplicate) {
      toast({
        title: "Categoría Duplicada",
        description: `La categoría "${categoryName}" ya existe.`,
        variant: "destructive",
      });
      return;
    }

    if (editingCategory) {
      const updatedCategories = categories.map(cat =>
        cat.id === editingCategory.id ? { ...cat, name: categoryName } : cat
      );
      setCategories(updatedCategories);
      
      const pIndex = placeholderCategories.findIndex(cat => cat.id === editingCategory.id);
      if (pIndex !== -1) placeholderCategories[pIndex].name = categoryName;
      
      toast({
        title: "Categoría Actualizada",
        description: `La categoría "${categoryName}" ha sido actualizada.`,
      });
    } else {
      const newCategory: InventoryCategory = {
        id: `CAT${String(categories.length + 1).padStart(3, '0')}${Date.now().toString().slice(-3)}`,
        name: categoryName,
      };
      setCategories(prev => [...prev, newCategory]);
      placeholderCategories.push(newCategory);
      toast({
        title: "Categoría Agregada",
        description: `La categoría "${newCategory.name}" ha sido creada.`,
      });
    }

    persistToFirestore(['categories']);

    setIsCategoryDialogOpen(false);
    setEditingCategory(null);
    setCurrentCategoryName('');
  };

  const handleDeleteCategory = () => {
    if (!categoryToDelete) return;

    setCategories(prev => prev.filter(cat => cat.id !== categoryToDelete.id));
    const pIndex = placeholderCategories.findIndex(cat => cat.id === categoryToDelete.id);
    if (pIndex !== -1) {
      placeholderCategories.splice(pIndex, 1);
    }
    
    persistToFirestore(['categories']);

    toast({
      title: "Categoría Eliminada",
      description: `La categoría "${categoryToDelete.name}" ha sido eliminada.`,
    });
    setCategoryToDelete(null);
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col items-start gap-4">
            <div>
                <CardTitle>Lista de Categorías</CardTitle>
                <CardDescription>
                    Visualiza, edita y elimina categorías. La columna 'Productos' muestra cuántos artículos pertenecen a cada categoría.
                </CardDescription>
            </div>
             <div className="flex justify-between items-center w-full">
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Buscar categorías..."
                        className="pl-8 sm:w-[300px] bg-white"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Button onClick={handleOpenAddDialog}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Nueva Categoría
                </Button>
            </div>
        </CardHeader>
        <CardContent>
          {filteredCategories.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader className="bg-white">
                  <TableRow>
                    <TableHead className="font-bold">Nombre de la Categoría</TableHead>
                    <TableHead className="text-right font-bold">Productos</TableHead>
                    <TableHead className="text-right font-bold">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCategories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell className="font-medium">{category.name}</TableCell>
                      <TableCell className="text-right">{categoryProductCounts[category.id] || 0}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenEditDialog(category)} className="mr-2">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => setCategoryToDelete(category)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          {categoryToDelete?.id === category.id && ( 
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Eliminar Categoría?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  ¿Estás seguro de que quieres eliminar la categoría "{categoryToDelete.name}"? 
                                  Esta acción no se puede deshacer. Los productos en esta categoría no serán eliminados pero quedarán sin categoría.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel onClick={() => setCategoryToDelete(null)}>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={handleDeleteCategory}
                                  className="bg-destructive hover:bg-destructive/90"
                                >
                                  Sí, Eliminar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          )}
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">
              {searchTerm ? "No se encontraron categorías." : "No hay categorías registradas."}
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleSaveCategory}>
            <DialogHeader>
              <DialogTitle>{editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}</DialogTitle>
              <DialogDescription>
                {editingCategory ? 'Modifica el nombre de la categoría.' : 'Ingresa el nombre para la nueva categoría.'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="category-name" className="text-right">
                  Nombre
                </Label>
                <Input
                  id="category-name"
                  value={currentCategoryName}
                  onChange={(e) => setCurrentCategoryName(capitalizeWords(e.target.value))}
                  className="col-span-3"
                  placeholder="Ej: Aceites"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCategoryDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">{editingCategory ? 'Guardar Cambios' : 'Crear Categoría'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
