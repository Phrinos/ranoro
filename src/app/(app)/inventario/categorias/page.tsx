
"use client";

import { useState } from 'react';
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PlusCircle, Trash2 } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { placeholderCategories } from '@/lib/placeholder-data';
import type { InventoryCategory } from '@/types';
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

export default function CategoriasInventarioPage() {
  const [categories, setCategories] = useState<InventoryCategory[]>(placeholderCategories);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryToDelete, setCategoryToDelete] = useState<InventoryCategory | null>(null);
  const { toast } = useToast();

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) {
      toast({
        title: "Nombre Vacío",
        description: "El nombre de la categoría no puede estar vacío.",
        variant: "destructive",
      });
      return;
    }
    if (categories.some(cat => cat.name.toLowerCase() === newCategoryName.trim().toLowerCase())) {
      toast({
        title: "Categoría Duplicada",
        description: `La categoría "${newCategoryName.trim()}" ya existe.`,
        variant: "destructive",
      });
      return;
    }

    const newCategory: InventoryCategory = {
      id: `CAT${String(categories.length + 1).padStart(3, '0')}${Date.now().toString().slice(-3)}`,
      name: newCategoryName.trim(),
    };

    setCategories(prev => [...prev, newCategory]);
    placeholderCategories.push(newCategory); // Also update placeholder for demo persistence
    setNewCategoryName('');
    toast({
      title: "Categoría Agregada",
      description: `La categoría "${newCategory.name}" ha sido creada.`,
    });
  };

  const handleDeleteCategory = () => {
    if (!categoryToDelete) return;

    setCategories(prev => prev.filter(cat => cat.id !== categoryToDelete.id));
    const pIndex = placeholderCategories.findIndex(cat => cat.id === categoryToDelete.id);
    if (pIndex !== -1) {
      placeholderCategories.splice(pIndex, 1);
    }
    
    toast({
      title: "Categoría Eliminada",
      description: `La categoría "${categoryToDelete.name}" ha sido eliminada.`,
    });
    setCategoryToDelete(null);
  };

  return (
    <>
      <PageHeader
        title="Categorías de Inventario"
        description="Administra las categorías para tus productos."
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Nueva Categoría</CardTitle>
            <CardDescription>Añade una nueva categoría al sistema.</CardDescription>
          </CardHeader>
          <form onSubmit={handleAddCategory}>
            <CardContent>
              <Input
                type="text"
                placeholder="Nombre de la categoría (ej: Aceites)"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
              />
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full">
                <PlusCircle className="mr-2 h-4 w-4" />
                Agregar Categoría
              </Button>
            </CardFooter>
          </form>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Categorías Existentes</CardTitle>
            <CardDescription>Lista de todas las categorías de productos.</CardDescription>
          </CardHeader>
          <CardContent>
            {categories.length > 0 ? (
              <ul className="space-y-2">
                {categories.map((category) => (
                  <li
                    key={category.id}
                    className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/50"
                  >
                    <span className="font-medium">{category.name}</span>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={() => setCategoryToDelete(category)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      {/* AlertDialogContent will only render if categoryToDelete matches this item implicitly */}
                      {categoryToDelete?.id === category.id && (
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar Categoría?</AlertDialogTitle>
                            <AlertDialogDescription>
                              ¿Estás seguro de que quieres eliminar la categoría "{categoryToDelete.name}"? 
                              Esta acción no se puede deshacer.
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
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-center py-4">No hay categorías registradas.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
