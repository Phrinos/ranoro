// src/app/(app)/punto-de-venta/components/categories-tab.tsx
"use client";

import React, { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PlusCircle, Edit, Trash2, Package, Wrench } from "lucide-react";
import { db } from "@/lib/firebaseClient";
import { addDoc, updateDoc, deleteDoc, doc, collection } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CategoryDialog, type CategoryFormValues } from "./dialogs/category-dialog";
import type { PosCategory } from "../hooks/use-pos-data";

interface Props {
  categories: PosCategory[];
}

export function CategoriesTab({ categories }: Props) {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editCat, setEditCat] = useState<PosCategory | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PosCategory | null>(null);

  const productCats = categories.filter((c) => c.type === "product");
  const serviceCats = categories.filter((c) => c.type === "service");

  const handleSave = useCallback(async (values: CategoryFormValues, id?: string) => {
    try {
      if (id) {
        await updateDoc(doc(db, "inventoryCategories", id), values);
        toast({ title: "Categoría actualizada" });
      } else {
        await addDoc(collection(db, "inventoryCategories"), values);
        toast({ title: "Categoría creada" });
      }
    } catch {
      toast({ title: "Error al guardar", variant: "destructive" });
    }
  }, [toast]);

  const handleDelete = useCallback(async (cat: PosCategory) => {
    try {
      await deleteDoc(doc(db, "inventoryCategories", cat.id));
      toast({ title: "Categoría eliminada" });
      setDeleteTarget(null);
    } catch {
      toast({ title: "Error al eliminar", variant: "destructive" });
    }
  }, [toast]);

  const openNew = () => { setEditCat(null); setDialogOpen(true); };
  const openEdit = (cat: PosCategory) => { setEditCat(cat); setDialogOpen(true); };

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold">Categorías</h3>
            <p className="text-sm text-muted-foreground">Organiza tu catálogo de productos y servicios.</p>
          </div>
          <Button onClick={openNew}>
            <PlusCircle className="mr-2 h-4 w-4" /> Nueva Categoría
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Productos */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="bg-blue-500 p-1.5 rounded-lg">
                  <Package className="h-4 w-4 text-white" />
                </div>
                Categorías de Productos
                <Badge variant="secondary" className="ml-auto">{productCats.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {productCats.length > 0 ? productCats.map((cat) => (
                <div key={cat.id} className="flex items-center justify-between p-3 rounded-xl border bg-card hover:bg-muted/30 transition-colors">
                  <span className="font-medium text-sm">{cat.name}</span>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(cat)}>
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(cat)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )) : (
                <p className="text-sm text-muted-foreground text-center py-8">Sin categorías de productos.</p>
              )}
            </CardContent>
          </Card>

          {/* Servicios */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="bg-purple-500 p-1.5 rounded-lg">
                  <Wrench className="h-4 w-4 text-white" />
                </div>
                Categorías de Servicios
                <Badge variant="secondary" className="ml-auto">{serviceCats.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {serviceCats.length > 0 ? serviceCats.map((cat) => (
                <div key={cat.id} className="flex items-center justify-between p-3 rounded-xl border bg-card hover:bg-muted/30 transition-colors">
                  <span className="font-medium text-sm">{cat.name}</span>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(cat)}>
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(cat)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )) : (
                <p className="text-sm text-muted-foreground text-center py-8">Sin categorías de servicios.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <CategoryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        category={editCat}
        onSave={handleSave}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Categoría</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Eliminar la categoría &quot;{deleteTarget?.name}&quot;? Los ítems asignados no se eliminarán.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
