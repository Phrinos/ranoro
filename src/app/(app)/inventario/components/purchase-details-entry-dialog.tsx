
"use client";

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { InventoryItem } from "@/types";

const purchaseDetailsSchema = z.object({
  quantityPurchased: z.coerce.number().int().min(1, "La cantidad debe ser al menos 1."),
  newCostPrice: z.coerce.number().min(0, "El precio de costo no puede ser negativo."),
  newSellingPrice: z.coerce.number().min(0, "El precio de venta no puede ser negativo."),
});

export type PurchaseDetailsFormValues = z.infer<typeof purchaseDetailsSchema>;

interface PurchaseDetailsEntryDialogProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  item: InventoryItem;
  onSave: (details: PurchaseDetailsFormValues) => void;
  onClose: () => void;
}

export function PurchaseDetailsEntryDialog({
  open,
  onOpenChange,
  item,
  onSave,
  onClose,
}: PurchaseDetailsEntryDialogProps) {
  const form = useForm<PurchaseDetailsFormValues>({
    resolver: zodResolver(purchaseDetailsSchema),
    defaultValues: {
      quantityPurchased: 1,
      newCostPrice: item.unitPrice,
      newSellingPrice: item.sellingPrice,
    },
  });

  const handleSubmit = (values: PurchaseDetailsFormValues) => {
    onSave(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Compra para: {item.name}</DialogTitle>
          <DialogDescription>
            SKU: {item.sku} | Stock Actual: {item.quantity}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 py-4">
            <FormField
              control={form.control}
              name="quantityPurchased"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cantidad Comprada</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="newCostPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nuevo Precio de Costo Unitario</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="newSellingPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nuevo Precio de Venta Unitario (IVA Inc.)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Guardando..." : "Registrar Compra"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
