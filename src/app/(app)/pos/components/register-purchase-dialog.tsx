// src/app/(app)/compras/components/register-purchase-dialog.tsx
"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useForm, FormProvider, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, PackagePlus, DollarSign, PlusCircle, Trash2, CalendarIcon } from "lucide-react";
import type { InventoryItem, Supplier, InventoryCategory } from "@/types";
import { formatCurrency, cn } from "@/lib/utils";
import { InventoryItemDialog } from "../../inventario/components/inventory-item-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { NewCalendar } from "@/components/ui/calendar";
import { format as formatDate } from "date-fns";
import { es } from "date-fns/locale";
import type { InventoryItemFormValues } from "@/schemas/inventory-item-form-schema";

const purchaseItemSchema = z.object({
  inventoryItemId: z.string(),
  itemName: z.string(),
  quantity: z.coerce.number().min(0.01, "La cantidad debe ser mayor a 0."),
  purchasePrice: z.coerce.number().min(0, "El costo debe ser un número positivo."),
});

const purchaseFormSchema = z
  .object({
    supplierId: z.string().min(1, "Debe seleccionar un proveedor."),
    invoiceId: z.string().optional(),
    items: z.array(purchaseItemSchema).min(1, "Debe añadir al menos un artículo a la compra."),
    paymentMethod: z.enum(["Efectivo", "Tarjeta", "Transferencia", "Crédito"]),
    dueDate: z.date().optional(),
    invoiceTotal: z.coerce.number().min(0.01, "El total debe ser mayor a cero."),
  })
  .refine((data) => (data.paymentMethod === "Crédito" ? !!data.dueDate : true), {
    message: "La fecha de vencimiento es obligatoria para compras a crédito.",
    path: ["dueDate"],
  });

export type PurchaseFormValues = z.infer<typeof purchaseFormSchema>;

interface RegisterPurchaseDialogProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  suppliers: Supplier[];
  inventoryItems: InventoryItem[];
  categories: InventoryCategory[];
  onSave: (data: PurchaseFormValues) => void;
  onInventoryItemCreated: (formData: InventoryItemFormValues) => Promise<InventoryItem>;
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
  const form = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseFormSchema),
    defaultValues: {
      supplierId: "",
      items: [],
      paymentMethod: "Efectivo",
      invoiceTotal: 0,
    },
    mode: "onChange",
  });

  const { control, handleSubmit, watch, setValue } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const watchedItems = watch("items");
  const paymentMethod = watch("paymentMethod");

  const [isItemSearchOpen, setIsItemSearchOpen] = useState(false);
  const [isNewItemDialogOpen, setIsNewItemDialogOpen] = useState(false);
  const [newItemSearchTerm, setNewItemSearchTerm] = useState("");

  // recalcula total
  useEffect(() => {
    const total = watchedItems.reduce(
      (sum, i) => sum + Number(i.quantity || 0) * Number(i.purchasePrice || 0),
      0
    );
    setValue("invoiceTotal", total, { shouldValidate: true });
  }, [watchedItems, setValue]);

  const handleAddItem = (item: InventoryItem) => {
    append({
      inventoryItemId: item.id,
      itemName: item.name,
      quantity: 1,
      purchasePrice: Number(item.unitPrice || 0),
    });
    setIsItemSearchOpen(false);
  };

  const handleNewItemRequest = (searchTerm: string) => {
    setNewItemSearchTerm(searchTerm);
    setIsItemSearchOpen(false);
    setIsNewItemDialogOpen(true);
  };

  const handleNewItemSaved = async (formData: InventoryItemFormValues) => {
    const newItem = await onInventoryItemCreated(formData);
    append({
      inventoryItemId: newItem.id,
      itemName: newItem.name,
      quantity: 1,
      purchasePrice: Number(newItem.unitPrice || 0),
    });
    setIsNewItemDialogOpen(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl p-0">
          <DialogHeader className="border-b p-6 pb-4 bg-white">
            <DialogTitle>Registrar Nueva Compra</DialogTitle>
            <DialogDescription>
              Seleccione un proveedor, añada los productos comprados y especifique los detalles del pago.
            </DialogDescription>
          </DialogHeader>

          <FormProvider {...form}>
            <Form {...form}>
              <form onSubmit={handleSubmit(onSave)} id="purchase-form" className="space-y-4">
                <div className="max-h-[calc(80vh-150px)] space-y-6 overflow-y-auto px-6 py-4 bg-muted/50">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FormField
                      control={control}
                      name="supplierId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Proveedor</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-white">
                                <SelectValue placeholder="Seleccione un proveedor" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <ScrollArea className="h-48">
                                {suppliers.map((s) => (
                                  <SelectItem key={s.id} value={s.id}>
                                    {s.name}
                                  </SelectItem>
                                ))}
                              </ScrollArea>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={control}
                      name="invoiceId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Folio de Factura (Opcional)</FormLabel>
                          <FormControl>
                            <Input placeholder="F-12345" {...field} value={field.value ?? ""} className="bg-white" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div>
                    <FormLabel>Artículos Comprados</FormLabel>
                    <div className="mt-2 space-y-2 rounded-md border bg-card p-4">
                      <ScrollArea className="max-h-48 pr-3">
                        <div className="space-y-3">
                          {fields.map((field, index) => (
                            <div key={field.id} className="flex items-center gap-2">
                              <span
                                className="flex-1 truncate text-sm font-medium"
                                title={field.itemName}
                              >
                                {field.itemName}
                              </span>

                              <FormField
                                control={control}
                                name={`items.${index}.quantity`}
                                render={({ field }) => (
                                  <Input
                                    type="number"
                                    step="1"
                                    min="0.01"
                                    className="h-8 w-20 text-right bg-white"
                                    {...field}
                                  />
                                )}
                              />
                              <FormField
                                control={control}
                                name={`items.${index}.purchasePrice`}
                                render={({ field }) => (
                                  <div className="relative">
                                    <DollarSign className="text-muted-foreground absolute left-2.5 top-1.5 h-4 w-4" />
                                    <Input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      className="h-8 w-28 pl-8 text-right bg-white"
                                      {...field}
                                    />
                                  </div>
                                )}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => remove(index)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>

                      <div className="border-t pt-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setIsItemSearchOpen(true)}
                          className="bg-white"
                        >
                          <PlusCircle className="mr-2 h-4 w-4" />
                          Añadir Artículo
                        </Button>
                      </div>
                    </div>
                    {!!form.formState.errors.items && (
                      <p className="mt-2 text-sm text-destructive">
                        {form.formState.errors.items?.message as any}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FormField
                      control={control}
                      name="paymentMethod"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Método de Pago</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-white">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Efectivo">Efectivo</SelectItem>
                              <SelectItem value="Tarjeta">Tarjeta</SelectItem>
                              <SelectItem value="Transferencia">Transferencia</SelectItem>
                              <SelectItem value="Crédito">Crédito</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {paymentMethod === "Crédito" && (
                      <FormField
                        control={control}
                        name="dueDate"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Fecha de Vencimiento</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    className={cn(
                                      "pl-3 text-left font-normal bg-white",
                                      !field.value && "text-muted-foreground"
                                    )}
                                  >
                                    <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                                    {field.value ? (
                                      formatDate(field.value, "PPP", { locale: es })
                                    ) : (
                                      <span>Seleccione fecha</span>
                                    )}
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <NewCalendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  initialFocus
                                  locale={es}
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                </div>

                <DialogFooter className="flex w-full flex-col-reverse items-center border-t bg-white p-6 pt-4 sm:flex-row sm:justify-between">
                    <div className="text-right text-lg font-bold">
                        Total: {formatCurrency(watch("invoiceTotal") || 0)}
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
                        Cancelar
                        </Button>
                        <Button type="submit" form="purchase-form" disabled={fields.length === 0}>
                        Registrar Compra
                        </Button>
                    </div>
                </DialogFooter>
              </form>
            </Form>
          </FormProvider>
        </DialogContent>
      </Dialog>

      <SearchItemDialog
        open={isItemSearchOpen}
        onOpenChange={setIsItemSearchOpen}
        inventoryItems={inventoryItems}
        onItemSelected={handleAddItem}
        onNewItemRequest={handleNewItemRequest}
      />

      <InventoryItemDialog
        open={isNewItemDialogOpen}
        onOpenChange={setIsNewItemDialogOpen}
        onSave={handleNewItemSaved}
        item={{ name: newItemSearchTerm }}
        categories={categories}
        suppliers={suppliers}
      />
    </>
  );
}

// --- Subcomponente buscador ---
interface SearchItemDialogProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  inventoryItems: InventoryItem[];
  onItemSelected: (item: InventoryItem) => void;
  onNewItemRequest: (searchTerm: string) => void;
}

function SearchItemDialog({
  open,
  onOpenChange,
  inventoryItems,
  onItemSelected,
  onNewItemRequest,
}: SearchItemDialogProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredItems = useMemo(() => {
    const physical = inventoryItems.filter((i) => !i.isService);
    if (!searchTerm.trim()) return physical;
    const q = searchTerm.toLowerCase();
    return physical.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        (i.sku && i.sku.toLowerCase().includes(q))
    );
  }, [searchTerm, inventoryItems]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0">
        <DialogHeader className="border-b p-6 pb-4">
          <DialogTitle>Buscar Artículo en Inventario</DialogTitle>
          <DialogDescription>
            Seleccione un artículo para añadir a la compra o cree uno nuevo.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6">
          <div className="relative">
            <Search className="text-muted-foreground absolute left-2.5 top-2.5 h-4 w-4" />
            <Input
              placeholder="Buscar por nombre o SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        <div className="px-6 pb-6">
          <ScrollArea className="h-72 rounded-md border">
            <div className="space-y-1 p-2">
              {filteredItems.map((item) => (
                <Button
                  key={item.id}
                  variant="ghost"
                  className="h-auto w-full justify-start px-2 py-1.5 text-left"
                  onClick={() => onItemSelected(item)}
                >
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Stock: {item.quantity} | Costo: {formatCurrency(item.unitPrice || 0)}
                    </p>
                  </div>
                </Button>
              ))}

              {searchTerm && filteredItems.length === 0 && (
                <div className="p-4 text-center">
                  <Button variant="link" onClick={() => onNewItemRequest(searchTerm)}>
                    <PackagePlus className="mr-2 h-4 w-4" />
                    Crear Nuevo Artículo &quot;{searchTerm}&quot;
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
