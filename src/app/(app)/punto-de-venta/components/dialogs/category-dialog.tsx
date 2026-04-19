// src/app/(app)/punto-de-venta/components/dialogs/category-dialog.tsx
"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Package, Wrench } from "lucide-react";
import type { PosCategory } from "../../hooks/use-pos-data";

const schema = z.object({
  name: z.string().min(1, "Nombre requerido"),
  type: z.enum(["product", "service"]),
});
export type CategoryFormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  category?: PosCategory | null;
  onSave: (values: CategoryFormValues, id?: string) => Promise<void>;
}

export function CategoryDialog({ open, onOpenChange, category, onSave }: Props) {
  const isEditing = !!category?.id;
  const form = useForm<CategoryFormValues, any, CategoryFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", type: "product" },
  });
  const type = form.watch("type");

  useEffect(() => {
    if (open) form.reset({ name: category?.name ?? "", type: category?.type ?? "product" });
  }, [open, category, form]);

  const onSubmit = async (values: CategoryFormValues) => {
    await onSave(values, category?.id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar" : "Nueva"} Categoría</DialogTitle>
          <DialogDescription>Define el tipo y nombre de esta categoría.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Type toggle */}
            <FormField control={form.control} name="type" render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo</FormLabel>
                <div className="flex gap-2 p-1 bg-muted rounded-xl">
                  {([["product", "Producto", Package], ["service", "Servicio", Wrench]] as const).map(([val, label, Icon]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => field.onChange(val)}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all",
                        type === val ? "bg-background shadow text-foreground" : "text-muted-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4" /> {label}
                    </button>
                  ))}
                </div>
              </FormItem>
            )} />

            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre *</FormLabel>
                <FormControl>
                  <Input placeholder={type === "service" ? "Ej: Diagnóstico, Afinación…" : "Ej: Aceites, Filtros…"} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Guardando…" : isEditing ? "Actualizar" : "Crear"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
