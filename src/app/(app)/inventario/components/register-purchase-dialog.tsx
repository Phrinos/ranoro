"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray, type Control } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { InventoryItem, InventoryCategory, Supplier, PaymentMethod } from "@/types";
import type { InventoryItemFormValues } from "./inventory-item-form";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { PurchaseItemSelectionDialog } from "./purchase-item-selection-dialog";
import { InventoryItemDialog } from "./inventory-item-dialog";
import { PlusCircle, Trash2, DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const purchaseItemSchema = z.object({
  inventoryItemId: z.string(),
  name: z.string(),
  quantity: z.coerce.number().min(0.01, "Debe ser > 0"),
  unitPrice: z.coerce.number().min(0, "Costo >= 0"),
});

const purchasePaymentMethods: ['Efectivo', 'Tarjeta', 'Transferencia', 'Crédito'] = [
  'Efectivo',
  'Tarjeta',
  'Transferencia',
  'Crédito',
];

const purchaseFormSchema = z.object({
  supplierId: z.string().min(1, "Debe seleccionar un proveedor."),
  invoiceTotal: z.coerce.number().min(0.01, "El total de la factura debe ser mayor a cero."),
  paymentMethod: z.enum(purchasePaymentMethods, { required_error: "Debe seleccionar un método de pago." }),
  items: z.array(purchaseItemSchema).min(1, "Debe agregar al menos un artículo a la compra."),
});

export type PurchaseFormValues = z.infer<typeof purchaseFormSchema>;

interface RegisterPurchaseDialogProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  suppliers: Supplier[];
  inventoryItems: InventoryItem[];
  categories: InventoryCategory[];
  onSave: (data: PurchaseFormValues) => Promise<void>;
  onInventoryItemCreated: (data: InventoryItemFormValues) => Promise<InventoryItem>;
}

export function RegisterPurchaseDialog({
  open,
  onOpenChange,
  suppliers,
  inventoryItems,
  categories,
  onSave,
  onInventoryItemCreated,
}: RegisterPurchaseDialogProps) {
  const { toast } = useToast();
  const [isItemSelectorOpen, setIsItemSelectorOpen] = useState(false);
  const [isNewItemDialogOpen, setIsNewItemDialogOpen] = useState(false);
  const [newItemSearchTerm, setNewItemSearchTerm] = useState('');

  const form = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseFormSchema),
    defaultValues: { items: [] },
  });

  const { control, handleSubmit, watch, getValues, setValue } = form;
  
  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  const watchedItems = watch("items");

  const subtotal = useMemo(() => {
    return watchedItems.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
  }, [watchedItems]);

  const handleAddItem = useCallback((item: InventoryItem) => {
    const existingItem = fields.find(field => field.inventoryItemId === item.id);
    if (existingItem) {
      toast({ title: "Artículo ya en la lista", description: "Ya ha agregado este artículo. Puede editar la cantidad directamente.", variant: "default" });
      return;
    }
    append({
      inventoryItemId: item.id,
      name: item.name,
      quantity: 1,
      unitPrice: item.unitPrice,
    });
    setIsItemSelectorOpen(false);
  }, [append, fields, toast]);

  const handleCreateNewFromSelector = useCallback((searchTerm: string) => {
    setNewItemSearchTerm(searchTerm);
    setIsItemSelectorOpen(false);
    setIsNewItemDialogOpen(true);
  }, []);

  const handleNewItemSaved = useCallback(async (formData: InventoryItemFormValues) => {
    const newItem = await onInventoryItemCreated(formData);
    append({
      inventoryItemId: newItem.id,
      name: newItem.name,
      quantity: formData.quantity || 1, // Use quantity from form if available, else default to 1
      unitPrice: formData.unitPrice || 0,
    });
    setIsNewItemDialogOpen(false);
  }, [onInventoryItemCreated, append]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Registrar Nueva Compra</DialogTitle>
            <DialogDescription>
              Seleccione un proveedor, ingrese los detalles de la factura y añada los productos comprados.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={handleSubmit(onSave)} className="flex-grow overflow-hidden flex flex-col gap-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-1">
                    <FormField
                        control={control}
                        name="supplierId"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Proveedor</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Seleccione un proveedor"/></SelectTrigger></FormControl>
                                    <SelectContent>
                                        {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={control}
                        name="invoiceTotal"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Total de Factura</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input type="number" placeholder="Monto total de la factura" {...field} value={field.value ?? ''} className="pl-8"/>
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={control}
                        name="paymentMethod"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Método de Pago</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Seleccione un método"/></SelectTrigger></FormControl>
                                    <SelectContent>
                                        {purchasePaymentMethods.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
              
              <div className="flex-grow overflow-hidden border rounded-md relative">
                <ScrollArea className="h-full">
                  <Table>
                    <TableHeader className="sticky top-0 bg-muted z-10">
                      <TableRow>
                        <TableHead>Producto</TableHead>
                        <TableHead className="w-28">Cantidad</TableHead>
                        <TableHead className="w-36">Costo Unit.</TableHead>
                        <TableHead className="w-36 text-right">Subtotal</TableHead>
                        <TableHead className="w-12">Acción</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fields.length > 0 ? fields.map((field, index) => (
                        <TableRow key={field.id}>
                          <TableCell className="font-medium">{field.name}</TableCell>
                          <TableCell>
                            <FormField control={control} name={`items.${index}.quantity`} render={({ field: qtyField }) => ( <FormControl><Input type="number" {...qtyField} className="h-8" /></FormControl> )}/>
                          </TableCell>
                           <TableCell>
                            <FormField control={control} name={`items.${index}.unitPrice`} render={({ field: priceField }) => ( <FormControl><Input type="number" {...priceField} className="h-8" /></FormControl> )}/>
                          </TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency((getValues(`items.${index}.quantity`) || 0) * (getValues(`items.${index}.unitPrice`) || 0))}</TableCell>
                          <TableCell>
                            <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                          </TableCell>
                        </TableRow>
                      )) : (
                        <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">Añada artículos a la compra.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>

              <div className="flex justify-between items-center pt-2">
                <Button type="button" variant="outline" onClick={() => setIsItemSelectorOpen(true)}><PlusCircle className="mr-2 h-4 w-4"/>Añadir Artículo</Button>
                <div className="text-right">
                    <p className="text-sm text-muted-foreground">Subtotal de Artículos</p>
                    <p className="text-xl font-bold">{formatCurrency(subtotal)}</p>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? "Guardando..." : "Registrar Compra"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      <PurchaseItemSelectionDialog
        open={isItemSelectorOpen}
        onOpenChange={setIsItemSelectorOpen}
        inventoryItems={inventoryItems.filter(i => !i.isService)}
        onItemSelected={handleAddItem}
        onCreateNew={handleCreateNewFromSelector}
      />
      
      <InventoryItemDialog
        open={isNewItemDialogOpen}
        onOpenChange={setIsNewItemDialogOpen}
        item={{ name: newItemSearchTerm, sku: newItemSearchTerm, isService: false }}
        onSave={handleNewItemSaved}
        categories={categories}
        suppliers={suppliers}
      />
    </>
  );
}
