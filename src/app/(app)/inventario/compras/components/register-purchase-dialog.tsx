"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useForm, FormProvider, useFieldArray, type Resolver, useWatch } from "react-hook-form";
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
import { Search, PackagePlus, DollarSign, PlusCircle, Trash2, CalendarIcon, Minus, Plus } from "lucide-react";
import type { InventoryItem, Supplier, InventoryCategory } from "@/types";
import { formatCurrency, cn, getToday } from "@/lib/utils";
import { InventoryItemDialog } from "@/app/(app)/inventario/components/inventory-item-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format as formatDate } from "date-fns";
import { es } from "date-fns/locale";
import type { InventoryItemFormValues } from '@/schemas/inventory-item-form-schema';
import { registerPurchaseSchema, type RegisterPurchaseFormValues } from "@/schemas/register-purchase-schema";

export type PurchaseFormValues = RegisterPurchaseFormValues;

interface RegisterPurchaseDialogProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  suppliers: Supplier[];
  inventoryItems: InventoryItem[];
  categories: InventoryCategory[];
  onSave: (data: RegisterPurchaseFormValues) => void;
  onInventoryItemCreated: (formData: InventoryItemFormValues) => Promise<InventoryItem>;
}

const buildDefaults = (): RegisterPurchaseFormValues => ({
  supplierId: "",
  purchaseDate: getToday(),
  paymentMethod: "Efectivo",
  items: [],
  invoiceTotal: 0,
  subtotal: 0,
  discounts: 0,
  note: "",
});


export function RegisterPurchaseDialog({
  open,
  onOpenChange,
  suppliers,
  inventoryItems,
  categories,
  onSave,
  onInventoryItemCreated,
}: RegisterPurchaseDialogProps) {
  const resolver = zodResolver(registerPurchaseSchema) as unknown as Resolver<RegisterPurchaseFormValues>;

  const form = useForm<RegisterPurchaseFormValues>({
    resolver,
    defaultValues: buildDefaults(),
    mode: "onBlur",
  });

  const { control, handleSubmit, watch, setValue, getValues, reset } = form;
  const { fields, append, remove } = useFieldArray({ control: control as any, name: "items" });
  const paymentMethod = watch("paymentMethod");
  const itemsWatch = useWatch({ control, name: "items" });

  useEffect(() => {
    const total = (itemsWatch ?? []).reduce((sum: number, i: any) => {
      const qty = Number(i?.quantity) || 0;
      const unit = Number(i?.purchasePrice) || 0;
      return sum + qty * unit;
    }, 0);
  
    setValue("invoiceTotal", Number.isFinite(total) ? total : 0, {
      shouldDirty: true,
      shouldValidate: false,
    });
  }, [itemsWatch, setValue]);

  useEffect(() => {
    if (open) reset(buildDefaults());
  }, [open, reset]);

  const handleAddItem = (item: InventoryItem) => {
    const price = Number(item.unitPrice || 0);
    append({
      inventoryItemId: item.id,
      itemName: item.name,
      quantity: 1,
      purchasePrice: price,
      totalPrice: price,
    });
    setIsItemSearchOpen(false);
  };
  
  const updateQty = (index: number, nextQty: number) => {
    const items = getValues('items');
    const safeQty = Math.max(0.01, Number(nextQty) || 0.01);
    const unit = Number(items[index]?.purchasePrice || 0);
    setValue(`items.${index}.quantity`, safeQty, { shouldDirty: true, shouldTouch: true });
    setValue(`items.${index}.totalPrice`, unit * safeQty, { shouldDirty: true, shouldTouch: true });
  };


  const handleNewItemRequest = (searchTerm: string) => {
    setNewItemSearchTerm(searchTerm);
    setIsItemSearchOpen(false);
    setIsNewItemDialogOpen(true);
  };

  const handleNewItemSaved = async (formData: InventoryItemFormValues) => {
    const newItem = await onInventoryItemCreated(formData);
    handleAddItem(newItem);
    setIsNewItemDialogOpen(false);
  };

  const [isItemSearchOpen, setIsItemSearchOpen] = useState(false);
  const [isNewItemDialogOpen, setIsNewItemDialogOpen] = useState(false);
  const [newItemSearchTerm, setNewItemSearchTerm] = useState("");

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl p-0">
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
                        control={control as any}
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
                        control={control as any}
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

                    <FormField
                      control={control as any}
                      name="items"
                      render={() => (
                        <FormItem>
                          <FormLabel>Artículos Comprados</FormLabel>
                          <div className="mt-2 space-y-2 rounded-md border bg-card p-4">
                            {fields.length > 0 && (
                              <div className="hidden sm:grid sm:grid-cols-12 gap-2 text-xs font-semibold text-muted-foreground pr-10">
                                <span className="sm:col-span-5">Artículo</span>
                                <span className="sm:col-span-3 text-center">Cantidad</span>
                                <span className="sm:col-span-2 text-right">Costo Unitario</span>
                                <span className="sm:col-span-2 text-right">Costo Total</span>
                              </div>
                            )}
                            <ScrollArea className="max-h-48 pr-3">
                              <div className="space-y-3">
                                {fields.map((field, index) => {
                                  const itemValues = watch(`items.${index}`);
                                  const qty = Number(itemValues?.quantity || 1);
                                  const unitPrice = Number(itemValues?.purchasePrice || 0);
                                  const lineTotal = qty * unitPrice;
                                  return (
                                    <div key={field.id} className="grid grid-cols-12 gap-2 items-center">
                                      <span
                                        className="col-span-12 sm:col-span-5 truncate text-sm font-medium"
                                        title={itemValues.itemName}
                                      >
                                        {itemValues.itemName}
                                      </span>
                                      <div className="col-span-6 sm:col-span-3 flex items-center gap-1">
                                        <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQty(index, qty - 1)} disabled={qty <= 1}>
                                          <Minus className="h-4 w-4" />
                                        </Button>
                                        <FormField
                                          control={control as any}
                                          name={`items.${index}.quantity`}
                                          render={({ field }) => (
                                            <Input
                                              type="number"
                                              step="0.01"
                                              min="0.01"
                                              inputMode="decimal"
                                              className="h-8 w-16 text-center bg-white"
                                              {...field}
                                              value={(field.value as any) ?? ""}
                                              onChange={(e) => updateQty(index, parseFloat(e.target.value))}
                                              onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                                            />
                                          )}
                                        />
                                        <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQty(index, qty + 1)}>
                                          <Plus className="h-4 w-4" />
                                        </Button>
                                      </div>
                                      <div className="col-span-3 sm:col-span-2">
                                        <FormField
                                          control={control as any}
                                          name={`items.${index}.purchasePrice`}
                                          render={({ field }) => (
                                            <div className="relative">
                                              <DollarSign className="text-muted-foreground absolute left-2.5 top-1.5 h-4 w-4" />
                                              <Input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                inputMode="decimal"
                                                className="h-8 pl-8 text-right bg-white"
                                                {...field}
                                                value={(field.value as any) ?? ""}
                                                onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                                              />
                                            </div>
                                          )}
                                        />
                                      </div>
                                      <div className="col-span-2 sm:col-span-2 text-right font-semibold">
                                        {formatCurrency(lineTotal)}
                                      </div>
                                      <div className="col-span-1 text-right">
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => remove(index)}
                                        >
                                          <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                      </div>
                                    </div>
                                  )
                                })}
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
                          <FormMessage />
                        </FormItem>
                      )}
                    />


                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <FormField
                        control={control as any}
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
                          control={control as any}
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
                                        formatDate(field.value as Date, "PPP", { locale: es })
                                      ) : (
                                        <span>Seleccione fecha</span>
                                      )}
                                    </Button>
                                  </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar
                                    mode="single"
                                    onSelect={(d: Date | undefined) => field.onChange(d)}
                                    selected={field.value as Date}
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
  onItemSelected: (item: InventoryItem, quantity: number) => void;
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
                  onClick={() => onItemSelected(item, 1)}
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