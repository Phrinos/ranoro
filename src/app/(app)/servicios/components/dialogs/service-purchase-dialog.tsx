// src/app/(app)/servicios/components/dialogs/service-purchase-dialog.tsx
"use client";

import React, { useState, useCallback } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFormContext } from "react-hook-form";
import {
  registerPurchaseSchema,
  type RegisterPurchaseFormValues,
} from "@/schemas/register-purchase-schema";
import type { Supplier, InventoryItem, InventoryCategory } from "@/types";
import type { ServiceFormValues } from "@/schemas/service-form";
import type { PosCategory } from "@/app/(app)/punto-de-venta/hooks/use-pos-data";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Trash2, Plus, Minus, PackagePlus, Package, ShoppingBag,
  Receipt, Link, Search, PlusCircle,
} from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import { purchaseService } from "@/lib/services";
import { useToast } from "@/hooks/use-toast";
import { InventorySearchDialog } from "@/components/shared/InventorySearchDialog";
import { ItemDialog, type ItemFormValues } from "@/app/(app)/punto-de-venta/components/dialogs/item-dialog";
import { db } from "@/lib/firebaseClient";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";

const PAYMENT_METHODS = ["Efectivo", "Tarjeta", "Tarjeta 3 MSI", "Tarjeta 6 MSI", "Transferencia", "Crédito"];
const inputCls = "bg-white border-slate-200 focus:border-primary h-10";
const selectCls = "bg-white border-slate-200 h-10";

interface ServicePurchaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suppliers: Supplier[];
  inventoryItems: InventoryItem[];
  categories: InventoryCategory[];
  defaultServiceItemIndex?: number;
  serviceItemNames: { index: number; label: string }[];
  onPurchaseRegistered?: () => void;
}

// Each purchase item can be individually toggled for service
interface ItemWithToggle {
  inventoryItemId: string;
  itemName: string;
  quantity: number;
  purchasePrice: number;
  sellingPrice: number;
  addToService: boolean; // per-item toggle
}

export function ServicePurchaseDialog({
  open,
  onOpenChange,
  suppliers,
  categories,
  defaultServiceItemIndex,
  serviceItemNames,
  onPurchaseRegistered,
}: ServicePurchaseDialogProps) {
  const { toast } = useToast();
  const { setValue: setServiceFormValue, getValues } = useFormContext<ServiceFormValues>();

  const [isSaving, setIsSaving] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [targetServiceIndex, setTargetServiceIndex] = useState<number>(defaultServiceItemIndex ?? 0);
  // Per-item "add to service" toggle
  const [itemToggles, setItemToggles] = useState<boolean[]>([]);

  const form = useForm<RegisterPurchaseFormValues>({
    resolver: zodResolver(registerPurchaseSchema) as any,
    defaultValues: {
      supplierId: "",
      invoiceId: "",
      purchaseDate: new Date(),
      items: [],
      paymentMethod: "Efectivo",
      note: "",
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" });
  const watchedItems = form.watch("items");
  const total = watchedItems.reduce((s, i) => s + (i.quantity || 0) * (i.purchasePrice || 0), 0);

  // ── Item selection ──────────────────────────────────────────────────────
  const handleItemSelected = useCallback((item: InventoryItem) => {
    append({
      inventoryItemId: item.id,
      itemName: item.name,
      quantity: 1,
      purchasePrice: item.unitPrice || 0,
      sellingPrice: item.sellingPrice || 0,
    });
    setItemToggles((prev) => [...prev, true]); // default: add to service
    setIsSearchOpen(false);
  }, [append]);

  // ── Create new inventory item, then add to purchase ──────────────────────
  const handleNewItemSaved = useCallback(async (values: ItemFormValues) => {
    try {
      const docRef = await addDoc(collection(db, "inventoryItems"), {
        ...values,
        stock: values.isService ? 0 : (values.stock ?? 0),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      append({
        inventoryItemId: docRef.id,
        itemName: values.name,
        quantity: 1,
        purchasePrice: values.costPrice || 0,
        sellingPrice: values.salePrice || 0,
      });
      setItemToggles((prev) => [...prev, true]);
      toast({ title: "Producto creado y añadido a la compra ✅" });
    } catch (e: any) {
      toast({ title: "Error al crear el producto", description: e.message, variant: "destructive" });
    }
  }, [append, toast]);

  // ── Quantity helpers ─────────────────────────────────────────────────────
  const adjustQty = (index: number, delta: number) => {
    const current = Number(watchedItems[index]?.quantity || 1);
    const next = Math.max(0.001, current + delta);
    form.setValue(`items.${index}.quantity`, parseFloat(next.toFixed(3)));
  };

  const toggleItem = (index: number, checked: boolean) => {
    setItemToggles((prev) => {
      const next = [...prev];
      next[index] = checked;
      return next;
    });
  };

  const handleRemove = (index: number) => {
    remove(index);
    setItemToggles((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async (data: RegisterPurchaseFormValues) => {
    if (data.items.length === 0) {
      toast({ title: "Agrega al menos un artículo", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      const invoiceTotal = data.items.reduce((s, i) => s + (i.quantity || 0) * (i.purchasePrice || 0), 0);
      await purchaseService.registerPurchase({ ...data, invoiceTotal });

      // Load items that have addToService toggled ON
      if (serviceItemNames.length > 0) {
        const itemsForService = data.items.filter((_, i) => itemToggles[i] !== false);
        if (itemsForService.length > 0) {
          const currentSupplies: any[] =
            getValues(`serviceItems.${targetServiceIndex}.suppliesUsed` as any) || [];
          const newSupplies = itemsForService.map((item) => ({
            supplyId: item.inventoryItemId,
            supplyName: item.itemName,
            quantity: item.quantity,
            unitPrice: item.purchasePrice,
            sellingPrice: item.sellingPrice,
          }));
          setServiceFormValue(
            `serviceItems.${targetServiceIndex}.suppliesUsed` as any,
            [...currentSupplies, ...newSupplies],
            { shouldDirty: true }
          );
          toast({
            title: "Compra Registrada ✅",
            description: `${itemsForService.length} artículo(s) cargado(s) al trabajo "${serviceItemNames[targetServiceIndex]?.label || `#${targetServiceIndex + 1}`}".`,
          });
        } else {
          toast({ title: "Compra Registrada en Inventario ✅" });
        }
      } else {
        toast({ title: "Compra Registrada en Inventario ✅" });
      }

      form.reset();
      setItemToggles([]);
      onOpenChange(false);
      onPurchaseRegistered?.();
    } catch (e: any) {
      toast({ title: "Error al registrar compra", description: e.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  const hasItems = fields.length > 0;
  const posCats = categories as unknown as PosCategory[];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        {/* max-w-6xl for more horizontal space */}
        <DialogContent className="max-w-6xl max-h-[92vh] p-0 overflow-hidden">
          <div className="flex h-full min-h-[560px]">

            {/* ══ LEFT: Products list ═════════════════════════════════════ */}
            <div className="flex-1 flex flex-col border-r overflow-hidden">

              {/* Header with two action buttons */}
              <div className="px-5 py-4 border-b bg-muted/20">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-base">Artículos de la Compra</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {!hasItems ? "Sin artículos" : `${fields.length} artículo${fields.length > 1 ? "s" : ""}`}
                      {hasItems && (
                        <span className="ml-2 text-amber-600 font-medium">
                          · Activa el switch por ítem para cargarlo al servicio
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => setIsSearchOpen(true)}
                      className="gap-1.5 shadow-sm"
                    >
                      <Search className="h-3.5 w-3.5" /> Agregar Inventario
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsCreateOpen(true)}
                      className="gap-1.5 shadow-sm border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                    >
                      <PlusCircle className="h-3.5 w-3.5" /> Crear Producto
                    </Button>
                  </div>
                </div>
              </div>

              {/* Scrollable items */}
              <ScrollArea className="flex-1">
                {!hasItems ? (
                  <div
                    className="flex flex-col items-center justify-center h-52 gap-3 text-muted-foreground cursor-pointer hover:bg-muted/20 transition-colors mx-5 my-6 rounded-xl border-2 border-dashed"
                    onClick={() => setIsSearchOpen(true)}
                  >
                    <ShoppingBag className="h-10 w-10 opacity-20" />
                    <p className="text-sm font-medium">Haz clic para buscar artículos en el inventario</p>
                    <p className="text-xs opacity-60">O usa "Crear Producto" para uno nuevo</p>
                  </div>
                ) : (
                  <div>
                    {/* ── Column headers — fixed layout ── */}
                    <div className="grid px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/30 border-b"
                      style={{ gridTemplateColumns: "2fr 120px 110px 90px 100px 40px 44px" }}>
                      <div>Artículo</div>
                      <div className="text-center">Cantidad</div>
                      <div className="text-right">Costo Unit.</div>
                      <div className="text-right">Subtotal</div>
                      <div className="text-right">P. Venta</div>
                      <div className="text-center">Svc</div>
                      <div />
                    </div>

                    {/* ── Rows ── */}
                    <div className="divide-y">
                      {fields.map((field, index) => {
                        const qty = Number(watchedItems[index]?.quantity ?? 1);
                        const cost = Number(watchedItems[index]?.purchasePrice ?? 0);
                        const sale = Number(watchedItems[index]?.sellingPrice ?? 0);
                        const subtotal = qty * cost;
                        const addToSvc = itemToggles[index] !== false; // default true

                        return (
                          <div
                            key={field.id}
                            className={cn(
                              "grid px-4 py-2.5 items-center hover:bg-muted/10 group transition-colors",
                              addToSvc && "bg-primary/[0.02]"
                            )}
                            style={{ gridTemplateColumns: "2fr 120px 110px 90px 100px 40px 44px" }}
                          >
                            {/* Artículo */}
                            <div className="flex items-center gap-2 min-w-0 pr-2">
                              <div className={cn("p-1 rounded shrink-0", addToSvc ? "bg-primary/10" : "bg-blue-50")}>
                                <Package className={cn("h-3 w-3", addToSvc ? "text-primary" : "text-blue-500")} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{watchedItems[index]?.itemName || "—"}</p>
                              </div>
                            </div>

                            {/* Cantidad con +/− */}
                            <div className="flex items-center gap-1">
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-7 w-7 shrink-0 rounded-lg border-slate-200 hover:bg-red-50 hover:border-red-200 hover:text-red-600"
                                onClick={() => adjustQty(index, -1)}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <Input
                                type="number" step="0.001" min="0.001"
                                className="h-7 text-xs text-center bg-white border-slate-200 px-0 w-12 shrink-0"
                                value={qty}
                                onChange={(e) => form.setValue(`items.${index}.quantity`, Number(e.target.value))}
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-7 w-7 shrink-0 rounded-lg border-slate-200 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-600"
                                onClick={() => adjustQty(index, 1)}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>

                            {/* Costo unitario */}
                            <div className="flex items-center justify-end">
                              <div className="relative w-full max-w-[100px]">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-[11px]">$</span>
                                <Input
                                  type="number" step="0.01" min="0"
                                  className="h-7 text-xs text-right bg-white border-slate-200 pl-4 pr-1"
                                  value={cost}
                                  onChange={(e) => form.setValue(`items.${index}.purchasePrice`, Number(e.target.value))}
                                />
                              </div>
                            </div>

                            {/* Subtotal — read only */}
                            <div className="text-right">
                              <span className="text-sm font-semibold tabular-nums">{formatCurrency(subtotal)}</span>
                            </div>

                            {/* Precio de venta */}
                            <div className="flex items-center justify-end">
                              <div className="relative w-full max-w-[90px]">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-[11px]">$</span>
                                <Input
                                  type="number" step="0.01" min="0"
                                  className="h-7 text-xs text-right bg-white border-slate-200 pl-4 pr-1"
                                  value={sale}
                                  onChange={(e) => form.setValue(`items.${index}.sellingPrice`, Number(e.target.value))}
                                />
                              </div>
                            </div>

                            {/* Switch: cargar al servicio */}
                            <div className="flex justify-center">
                              <Switch
                                checked={addToSvc}
                                onCheckedChange={(v) => toggleItem(index, v)}
                                className="scale-75"
                              />
                            </div>

                            {/* Delete */}
                            <div className="flex justify-center">
                              <Button
                                type="button" variant="ghost" size="icon"
                                className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => handleRemove(index)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </ScrollArea>

              {/* Total footer */}
              {hasItems && (
                <div className="border-t px-5 py-3 bg-muted/20 flex items-center justify-between">
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <p>{fields.length} artículo{fields.length > 1 ? "s" : ""}</p>
                    <p className="text-[11px]">
                      <span className="inline-flex items-center gap-1">
                        <span className="w-3 h-3 rounded-sm bg-primary/20 inline-block" />
                        = se cargará al servicio
                      </span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Total de compra</p>
                    <p className="text-2xl font-black tabular-nums">{formatCurrency(total)}</p>
                  </div>
                </div>
              )}
            </div>

            {/* ══ RIGHT: Form ═════════════════════════════════════════════ */}
            <div className="w-72 xl:w-80 shrink-0 flex flex-col">
              <div className="px-5 py-4 border-b bg-gradient-to-br from-emerald-50 to-teal-50">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-base">
                    <div className="p-1.5 rounded-lg bg-emerald-100">
                      <PackagePlus className="h-4 w-4 text-emerald-600" />
                    </div>
                    Datos de Compra
                  </DialogTitle>
                  <DialogDescription className="text-xs mt-1">
                    Completa la información de la factura o nota.
                  </DialogDescription>
                </DialogHeader>
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col flex-1">
                  <div className="flex-1 px-4 py-4 space-y-3 overflow-y-auto">

                    {/* Fecha */}
                    <FormField control={form.control} name="purchaseDate" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Fecha *</FormLabel>
                        <FormControl>
                          <DatePicker date={field.value} onDateChange={(d) => field.onChange(d ?? new Date())}
                            className="bg-white border-slate-200 h-10 w-full" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    {/* Proveedor */}
                    <FormField control={form.control} name="supplierId" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Proveedor *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className={selectCls}><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />

                    {/* Folio */}
                    <FormField control={form.control} name="invoiceId" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Folio / Factura</FormLabel>
                        <FormControl><Input className={inputCls} {...field} placeholder="FAC-001" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    {/* Método de pago */}
                    <FormField control={form.control} name="paymentMethod" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Método de Pago *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className={selectCls}><SelectValue /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />

                    {/* Destino del servicio */}
                    {serviceItemNames.length > 0 && (
                      <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <Link className="h-3.5 w-3.5 text-primary shrink-0" />
                          <p className="text-xs font-semibold">Trabajo de destino</p>
                        </div>
                        <Select value={String(targetServiceIndex)} onValueChange={(v) => setTargetServiceIndex(Number(v))}>
                          <SelectTrigger className="bg-white border-slate-200 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {serviceItemNames.map(s => (
                              <SelectItem key={s.index} value={String(s.index)} className="text-xs">{s.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-[10px] text-muted-foreground">
                          Usa el switch (Svc) por artículo para elegir cuáles se cargan a este trabajo.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Buttons */}
                  <div className="border-t p-4 space-y-2">
                    <Button type="submit" disabled={isSaving || !hasItems} className="w-full gap-2">
                      <Receipt className="h-4 w-4" />
                      {isSaving ? "Registrando..." : "Registrar Compra"}
                    </Button>
                    <Button type="button" variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
                      Regresar
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Search existing inventory */}
      <InventorySearchDialog
        open={isSearchOpen}
        onOpenChange={setIsSearchOpen}
        onItemSelected={handleItemSelected}
      />

      {/* Create new inventory item */}
      <ItemDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        item={null}
        categories={posCats}
        onSave={handleNewItemSaved}
      />
    </>
  );
}
