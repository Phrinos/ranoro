
"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';
import { capitalizeWords } from '@/lib/utils';
import type { InventoryCategory } from '@/types';

interface CategoryDialogProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  category?: InventoryCategory | null;
  onSave: (name: string, id?: string) => Promise<void>;
  existingCategories: { name: string }[];
}

export function CategoryDialog({ open, onOpenChange, category, onSave, existingCategories }: CategoryDialogProps) {
  const [name, setName] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setName(category ? category.name : '');
    }
  }, [open, category]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      return toast({ title: "El nombre no puede estar vacío.", variant: "destructive" });
    }
    if (existingCategories.some(c => c.name.toLowerCase() === trimmedName.toLowerCase() && c.name !== category?.name)) {
      return toast({ title: "Esa categoría ya existe.", variant: "destructive" });
    }
    
    await onSave(trimmedName, category?.id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{category ? "Editar Categoría" : "Nueva Categoría"}</DialogTitle>
          <DialogDescription>
            {category ? "Modifica el nombre de la categoría." : "Añade una nueva categoría para organizar tus productos."}
          </DialogDescription>
        </DialogHeader>
        <form id="category-form" onSubmit={handleSubmit} className="py-4">
          <Label htmlFor="category-name">Nombre de la Categoría</Label>
          <Input
            id="category-name"
            value={name}
            onChange={(e) => setName(capitalizeWords(e.target.value))}
            className="mt-2"
            placeholder="Ej: Filtros, Aceites"
          />
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="category-form">Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
