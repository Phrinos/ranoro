"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useForm, FormProvider, useFieldArray, type Resolver, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { 
  Search, 
  PackagePlus, 
  DollarSign, 
  PlusCircle, 
  Trash2, 
  CalendarIcon, 
  Check,
  ChevronsUpDown,
  Tags,
  Package,
  Car,
  TrendingUp,
  Receipt,
  Search as SearchIcon,
  Loader2,
  Plus,
  Minus
} from "lucide-react";
import type { InventoryItem, Supplier, InventoryCategory } from "@/types";
import { formatCurrency, cn, getToday } from "@/lib/utils";
import { InventoryItemDialog } from "@/app/(app)/inventario/components/inventory-item-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Command, 
  CommandEmpty, 
  CommandGroup, 
  CommandInput, 
  CommandItem, 
  CommandList 
} from "@/components/ui/command";
import { Calendar } from "@/components/ui/calendar";
import { format as formatDate } from "date-fns";
import { es } from "date-fns/locale";
import type { InventoryItemFormValues } from '@/schemas/inventory-item-form-schema';
import { registerPurchaseSchema, type RegisterPurchaseFormValues } from "@/schemas/register-purchase-schema";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";

export type PurchaseFormValues = RegisterPurchaseFormValues;

interface RegisterPurchaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

  const [isSupplierSearchOpen, setIsSupplierSearchOpen] = useState(false);
  const [supplierSearchQuery, setSupplierSearchQuery] = useState("");
  const [isItemSearchOpen, setIsItemSearchOpen] = useState(false);
  const [isNewItemDialogOpen, setIsNewItemDialogOpen] = useState(false);
  const [newItemSearchTerm, setNewItemSearchTerm] = useState("");

  const filteredSuppliers = useMemo(() => {
    const q = (supplierSearchQuery || "").toLowerCase().trim();
    if (!q) return suppliers;
    return suppliers.filter(s => 
      s.name.toLowerCase().includes(q) || 
      (s.rfc && s.rfc.toLowerCase().includes(q))
    );
  }, [suppliers, supplierSearchQuery]);

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
    if (open) {
      reset(buildDefaults());
      setSupplierSearchQuery("");
    }
  }, [open, reset]);

  const handleSelectInventoryItem = (item: InventoryItem) => {
    append({
      inventoryItemId: item.id,
      itemName: item.name,
      quantity: 1,
      purchasePrice: Number(item.unitPrice || 0),
      sellingPrice: Number(item.sellingPrice || 0),
      totalPrice: Number(item.unitPrice || 0),
    });
    setIsItemSearchOpen(false);
  };
  
  const updateLineTotals = (index: number) => {
    const item = getValues(`items.${index}`);
    const qty = Number(item?.quantity) || 0;
    const cost = Number(item?.purchasePrice) || 0;
    setValue(`items.${index}.totalPrice`, cost * qty, { shouldDirty: true });
  };

  const handleNewItemRequest = (searchTerm: string) => {
    setNewItemSearchTerm(searchTerm);
    setIsItemSearchOpen(false);
    setIsNewItemDialogOpen(true);
  };

  const handleNewItemSaved = async (formData: InventoryItemFormValues) => {
    const newItem = await onInventoryItemCreated(formData);
    handleSelectInventoryItem(newItem);
    setIsNewItemDialogOpen(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl p-0 overflow-hidden">
          <DialogHeader className="border-b p-6 pb-4 bg-white">
            <DialogTitle>Registrar Nueva Compra</DialogTitle>
            <DialogDescription>
              Captura los datos del proveedor, método de pago y el detalle de los artículos.
            </DialogDescription>
          </DialogHeader>

          <FormProvider {...form}>
              <Form {...form}>
                <form onSubmit={handleSubmit(onSave)} id="purchase-form" className="space-y-0">
                  <div className="max-h-[calc(80vh-150px)] space-y-6 overflow-y-auto px-6 py-6 bg-muted/50">
                    
                    {/* CABECERA UNIFICADA: PROVEEDOR, FOLIO, METODO */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                      <div className="md:col-span-6">
                        <FormField
                          control={control as any}
                          name="supplierId"
                          render={({ field }) => (
                            <FormItem className="flex flex-col">
                              <Label className="font-bold mb-1">Proveedor</Label>
                              <Popover open={isSupplierSearchOpen} onOpenChange={setIsSupplierSearchOpen}>
                                <PopoverTrigger asChild>
                                  <FormControl>
                                    <Button
                                      variant="outline"
                                      role="combobox"
                                      className={cn(
                                        "w-full justify-between bg-white text-left font-normal h-10",
                                        !field.value && "text-muted-foreground"
                                      )}
                                    >
                                      <span className="truncate text-sm">
                                        {field.value
                                          ? suppliers.find((s) => s.id === field.value)?.name
                                          : "Buscar proveedor..."}
                                      </span>
                                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                  </FormControl>
                                </PopoverTrigger>
                                <PopoverContent 
                                  className="w-[var(--radix-popover-trigger-width)] p-0" 
                                  align="start"
                                  onOpenAutoFocus={(e) => e.preventDefault()}
                                >
                                  <Command shouldFilter={false}>
                                    <CommandInput 
                                      placeholder="Escribe nombre o RFC..." 
                                      value={supplierSearchQuery}
                                      onValueChange={setSupplierSearchQuery}
                                      autoFocus
                                    />
                                    <CommandList>
                                      <CommandEmpty>No se encontró el proveedor.</CommandEmpty>
                                      <CommandGroup>
                                        {filteredSuppliers.map((s) => (
                                          <CommandItem
                                            key={s.id}
                                            value={`${s.name} ${s.rfc ?? ""}`.trim()}
                                            onSelect={() => {
                                              setValue("supplierId", String(s.id), { shouldValidate: true, shouldDirty: true });
                                              setIsSupplierSearchOpen(false);
                                              setSupplierSearchQuery("");
                                            }}
                                          >
                                            <Check
                                              className={cn(
                                                "mr-2 h-4 w-4",
                                                String(s.id) === String(field.value) ? "opacity-100" : "opacity-0"
                                              )}
                                            />
                                            {s.name}
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    </CommandList>
                                  </Command>
                                </PopoverContent>
                              </Popover>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="md:col-span-3">
                        <FormField
                          control={control as any}
                          name="invoiceId"
                          render={({ field }) => (
                            <FormItem>
                              <Label className="font-bold mb-1">Folio Factura</Label>
                              <FormControl>
                                <Input placeholder="F-12345" {...field} value={field.value ?? ""} className="bg-white h-10 text-sm" />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="md:col-span-3">
                        <FormField
                          control={control as any}
                          name="paymentMethod"
                          render={({ field }) => (
                            <FormItem>
                              <Label className="font-bold mb-1">Método de Pago</Label>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger className="bg-white h-10 text-sm">
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="Efectivo">Efectivo</SelectItem>
                                  <SelectItem value="Tarjeta">Tarjeta</SelectItem>
                                  <SelectItem value="Tarjeta MSI">Tarjeta MSI</SelectItem>
                                  <SelectItem value="Transferencia">Transferencia</SelectItem>
                                  <SelectItem value="Crédito">Crédito</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    {paymentMethod === "Crédito" && (
                      <div className="flex justify-end">
                        <FormField
                          control={control as any}
                          name="dueDate"
                          render={({ field }) => (
                            <FormItem className="flex flex-col w-full md:w-1/4">
                              <Label className="font-bold mb-1">Fecha de Vencimiento</Label>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <FormControl>
                                    <Button
                                      variant="outline"
                                      className={cn(
                                        "pl-3 text-left font-normal bg-white h-10 text-sm",
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
                      </div>
                    )}

                    {/* SECCIÓN ARTÍCULOS */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-base font-bold flex items-center gap-2">
                          <Receipt className="h-5 w-5 text-primary" />
                          Detalle de Artículos
                        </Label>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground uppercase font-bold tracking-tighter">Total Actual</span>
                          <span className="text-xl font-bold text-primary">
                            {formatCurrency(watch("invoiceTotal") || 0)}
                          </span>
                        </div>
                      </div>

                      <div className="rounded-xl border bg-card shadow-inner overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-black text-white">
                            <tr>
                              <th className="px-4 py-3 text-left">Artículo</th>
                              <th className="px-2 py-3 text-center w-36">Cantidad</th>
                              <th className="px-2 py-3 text-right w-32">Costo (Taller)</th>
                              <th className="px-2 py-3 text-right w-32">Venta (Público)</th>
                              <th className="px-2 py-3 text-right w-32">Total</th>
                              <th className="px-4 py-3 w-10"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {fields.map((field, index) => (
                              <tr key={field.id} className="border-b last:border-0 hover:bg-muted/5 transition-colors">
                                <td className="px-4 py-3">
                                  <p className="font-bold text-sm truncate max-w-[200px]" title={watch(`items.${index}.itemName`)}>
                                    {watch(`items.${index}.itemName`)}
                                  </p>
                                </td>
                                <td className="px-2 py-3">
                                  <div className="flex items-center justify-center gap-1">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="icon"
                                      className="h-8 w-8 bg-white shrink-0"
                                      onClick={() => {
                                        const curr = Number(getValues(`items.${index}.quantity`)) || 0;
                                        const next = Math.max(0, curr - 1);
                                        setValue(`items.${index}.quantity`, next, { shouldDirty: true });
                                        updateLineTotals(index);
                                      }}
                                    >
                                      <Minus className="h-3 w-3" />
                                    </Button>
                                    <FormField
                                      control={control as any}
                                      name={`items.${index}.quantity`}
                                      render={({ field }) => (
                                        <Input
                                          type="number"
                                          step="0.01"
                                          className="h-9 w-16 text-center bg-white"
                                          {...field}
                                          value={(field.value as any) ?? ""}
                                          onChange={(e) => {
                                            field.onChange(e.target.value === "" ? "" : parseFloat(e.target.value));
                                            updateLineTotals(index);
                                          }}
                                        />
                                      )}
                                    />
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="icon"
                                      className="h-8 w-8 bg-white shrink-0"
                                      onClick={() => {
                                        const curr = Number(getValues(`items.${index}.quantity`)) || 0;
                                        const next = curr + 1;
                                        setValue(`items.${index}.quantity`, next, { shouldDirty: true });
                                        updateLineTotals(index);
                                      }}
                                    >
                                      <Plus className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </td>
                                <td className="px-2 py-3">
                                  <FormField
                                    control={control as any}
                                    name={`items.${index}.purchasePrice`}
                                    render={({ field }) => (
                                      <div className="relative">
                                        <DollarSign className="text-muted-foreground absolute left-2 top-2.5 h-3.5 w-3.5" />
                                        <Input
                                          type="number"
                                          step="0.01"
                                          className="h-9 pl-7 text-right bg-white"
                                          {...field}
                                          value={(field.value as any) ?? ""}
                                          onChange={(e) => {
                                            field.onChange(e.target.value === "" ? "" : parseFloat(e.target.value));
                                            updateLineTotals(index);
                                          }}
                                        />
                                      </div>
                                    )}
                                  />
                                </td>
                                <td className="px-2 py-3">
                                  <FormField
                                    control={control as any}
                                    name={`items.${index}.sellingPrice`}
                                    render={({ field }) => (
                                      <div className="relative">
                                        <TrendingUp className="text-green-600 absolute left-2 top-2.5 h-3.5 w-3.5" />
                                        <Input
                                          type="number"
                                          step="0.01"
                                          className="h-9 pl-7 text-right bg-white font-bold text-green-700"
                                          {...field}
                                          value={(field.value as any) ?? ""}
                                          onChange={(e) => field.onChange(e.target.value === "" ? "" : parseFloat(e.target.value))}
                                        />
                                      </div>
                                    )}
                                  />
                                </td>
                                <td className="px-2 py-3 text-right">
                                  <span className="font-bold text-foreground">
                                    {formatCurrency(Number(watch(`items.${index}.totalPrice`) || 0))}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => remove(index)}
                                    className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </td>
                              </tr>
                            ))}
                            {fields.length === 0 && (
                              <tr>
                                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground italic">
                                  No has añadido ningún artículo aún.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      <div className="flex justify-start">
                        <Button
                          type="button"
                          onClick={() => setIsItemSearchOpen(true)}
                          className="h-10 gap-2 shadow-md bg-red-600 hover:bg-red-700 text-white font-bold"
                        >
                          <PlusCircle className="h-4 w-4" />
                          Añadir Artículo/Insumo
                        </Button>
                      </div>
                    </div>
                  </div>

                  <DialogFooter className="border-t bg-white p-6 pt-4">
                      <div className="flex w-full justify-end gap-2">
                          <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
                          Cancelar
                          </Button>
                          <Button type="submit" disabled={fields.length === 0}>
                          Completar Registro
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
        onItemSelected={handleSelectInventoryItem}
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
    const trimmed = searchTerm.trim();
    if (trimmed.length > 0 && trimmed.length < 3) return [];
    
    if (!trimmed) return physical.slice(0, 50);
    const q = normalize(trimmed);
    return physical.filter(
      (i) =>
        normalize(i.name).includes(q) ||
        (i.sku && normalize(i.sku).includes(q)) ||
        (i.category && normalize(i.category).includes(q))
    ).slice(0, 100);
  }, [searchTerm, inventoryItems]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 bg-white">
          <DialogTitle>Buscar Artículo en Inventario</DialogTitle>
          <DialogDescription>
            Busca por nombre, SKU o categoría. Mínimo 3 caracteres.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-4">
          <div className="relative">
            <Search className="text-muted-foreground absolute left-2.5 top-2.5 h-4 w-4" />
            <Input
              placeholder="Escribe al menos 3 caracteres..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
              autoFocus
            />
          </div>
        </div>

        <div className="px-6 pb-6 bg-muted/10">
          <ScrollArea className="h-[450px] rounded-md border bg-white shadow-inner">
            <div className="p-2">
              <div className="grid grid-cols-1 gap-1">
                {searchTerm.trim().length > 0 && searchTerm.trim().length < 3 ? (
                  <div className="p-10 text-center text-muted-foreground flex flex-col items-center gap-2">
                    <SearchIcon className="h-8 w-8 opacity-20" />
                    <p className="text-sm font-medium">Ingresa al menos 3 caracteres para buscar...</p>
                  </div>
                ) : filteredItems.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-muted-foreground mb-4">No se encontraron artículos que coincidan.</p>
                    {searchTerm.trim().length >= 3 && (
                      <Button variant="outline" onClick={() => onNewItemRequest(searchTerm)}>
                        <PackagePlus className="mr-2 h-4 w-4" />
                        Crear Nuevo Artículo &quot;{searchTerm}&quot;
                      </Button>
                    )}
                  </div>
                ) : (
                  filteredItems.map((item) => {
                    const isLowStock = item.quantity <= (item.lowStockThreshold || 0);
                    const price = item.sellingPrice ?? item.unitPrice ?? 0;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        className="w-full text-left p-3 rounded-lg hover:bg-muted/50 border-b last:border-0 transition-colors group"
                        onClick={() => onItemSelected(item)}
                      >
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 min-w-0">
                              <Badge variant="secondary" className="shrink-0 text-[10px] font-bold uppercase tracking-wider h-5">
                                {item.category || 'General'}
                              </Badge>
                              <span className="font-bold text-base truncate">{item.name}</span>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="font-bold text-primary text-lg">
                                {formatCurrency(price)}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-6 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <Tags className="h-3.5 w-3.5 opacity-50" />
                              <span>SKU: <span className="font-medium text-foreground">{item.sku || '—'}</span></span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Package className="h-3.5 w-3.5 opacity-50" />
                              <span>Stock: <span className={cn("font-bold", isLowStock ? "text-destructive" : "text-foreground")}>
                                {item.quantity}
                              </span></span>
                            </div>
                            {item.brand && (
                              <div className="flex items-center gap-1.5">
                                <Car className="h-3.5 w-3.5 opacity-50" />
                                <span>Marca: <span className="font-medium text-foreground">{item.brand}</span></span>
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function normalize(s?: string) {
  return (s ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
