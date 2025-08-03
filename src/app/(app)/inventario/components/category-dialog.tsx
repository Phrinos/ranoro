
"use client";

import React, { useState, useEffect } from 'react';
import { FormDialog } from '@/components/shared/form-dialog';
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
  existingCategories: { name: string, id: string }[];
}

export function CategoryDialog({ open, onOpenChange, category, onSave, existingCategories }: CategoryDialogProps) {
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setName(category ? category.name : '');
    }
  }, [open, category]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast({ title: "El nombre no puede estar vacío.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }
    if (existingCategories.some(c => c.name.toLowerCase() === trimmedName.toLowerCase() && c.id !== category?.id)) {
      toast({ title: "Esa categoría ya existe.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }
    
    try {
      await onSave(trimmedName, category?.id);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={category ? "Editar Categoría" : "Nueva Categoría"}
      description={category ? "Modifica el nombre de la categoría." : "Añade una nueva categoría para organizar tus productos."}
      formId="category-form"
      isSubmitting={isSubmitting}
      submitButtonText="Guardar"
      dialogContentClassName="sm:max-w-md"
    >
      <form id="category-form" onSubmit={handleSubmit} className="py-4 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="category-name">Nombre de la Categoría</Label>
          <Input
              id="category-name"
              value={name}
              onChange={(e) => setName(capitalizeWords(e.target.value))}
              className="mt-2"
              placeholder="Ej: Filtros, Aceites"
          />
        </div>
      </form>
    </FormDialog>
  );
}
