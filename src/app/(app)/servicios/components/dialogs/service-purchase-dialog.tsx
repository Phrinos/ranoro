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
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, Plus, PackagePlus, Package, ShoppingBag, Receipt, Link } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import { purchaseService } from "@/lib/services";
import { useToast } from "@/hooks/use-toast";
import { InventorySearchDialog } from "@/components/shared/InventorySearchDialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

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

export function ServicePurchaseDialog({
  open,
  onOpenChange,
  suppliers,
  defaultServiceItemIndex,
  serviceItemNames,
  onPurchaseRegistered,
}: ServicePurchaseDialogProps) {
  const { toast } = useToast();
  const { setValue: setServiceFormValue, getValues } = useFormContext<ServiceFormValues>();

  const [isSaving, setIsSaving] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [loadToService, setLoadToService] = useState(true);
  const [targetServiceIndex, setTargetServiceIndex] = useState<number>(defaultServiceItemIndex ?? 0);

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

  const handleItemSelected = useCallback((item: InventoryItem) => {
    append({
      inventoryItemId: item.id,
      itemName: item.name,
      quantity: 1,
      purchasePrice: item.unitPrice || 0,
      sellingPrice: item.sellingPrice || 0,
    });
    setIsSearchOpen(false);
  }, [append]);

  const handleSubmit = async (data: RegisterPurchaseFormValues) => {
    if (data.items.length === 0) {
      toast({ title: "Agrega al menos un artículo", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      const invoiceTotal = data.items.reduce((s, i) => s + (i.quantity || 0) * (i.purchasePrice || 0), 0);
      await purchaseService.registerPurchase({ ...data, invoiceTotal });

      if (loadToService && serviceItemNames.length > 0) {
        const currentSupplies: any[] = getValues(`serviceItems.${targetServiceIndex}.suppliesUsed` as any) || [];
        const newSupplies = data.items.map((item) => ({
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
          title: "Compra Registrada y Cargada al Servicio ✅",
          description: `${data.items.length} artículo(s) añadido(s) al trabajo ${serviceItemNames[targetServiceIndex]?.label || `#${targetServiceIndex + 1}`}.`,
        });
      } else {
        toast({ title: "Compra Registrada en Inventario ✅" });
      }

      form.reset();
      onOpenChange(false);
      onPurchaseRegistered?.();
    } catch (e: any) {
      toast({ title: "Error al registrar compra", description: e.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[90vh] p-0 overflow-hidden">
          <div className="flex h-full" style={{ minHeight: 520 }}>

            {/* ── LEFT: Products ──────────────────────────────────── */}
            <div className="flex-1 flex flex-col border-r overflow-hidden">
              <div className="px-5 py-4 border-b bg-muted/20">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-base">Artículos Comprados</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {fields.length === 0 ? "Sin artículos" : `${fields.length} artículo${fields.length > 1 ? 's' : ''}`}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => setIsSearchOpen(true)}
                    className="gap-1.5 shadow-sm"
                  >
                    <Plus className="h-4 w-4" /> Añadir
                  </Button>
                </div>
              </div>

              <ScrollArea className="flex-1">
                {fields.length === 0 ? (
                  <div
                    className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground cursor-pointer hover:bg-muted/20 transition-colors mx-4 my-6 rounded-xl border-2 border-dashed"
                    onClick={() => setIsSearchOpen(true)}
                  >
                    <ShoppingBag className="h-10 w-10 opacity-20" />
                    <p className="text-sm font-medium">Haz clic en Añadir para buscar artículos</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    <div className="grid grid-cols-12 gap-2 px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/30">
                      <div className="col-span-4">Artículo</div>
                      <div className="col-span-2 text-center">Cant.</div>
                      <div className="col-span-2 text-right">Costo U.</div>
                      <div className="col-span-2 text-right">P. Venta</div>
                      <div className="col-span-2 text-right">Subtotal</div>
                    </div>
                    {fields.map((field, index) => (
                      <div key={field.id} className="grid grid-cols-12 gap-2 items-center px-4 py-2.5 hover:bg-muted/20 group">
                        <div className="col-span-4 flex items-center gap-2 min-w-0">
                          <div className="p-1 bg-blue-50 rounded shrink-0">
                            <Package className="h-3 w-3 text-blue-500" />
                          </div>
                          <p className="text-sm font-medium truncate">{watchedItems[index]?.itemName || "—"}</p>
                        </div>
                        <div className="col-span-2">
                          <Input type="number" step="0.001" min="0.001" className="h-7 text-xs text-center bg-white border-slate-200 px-1"
                            value={watchedItems[index]?.quantity ?? ""} onChange={(e) => form.setValue(`items.${index}.quantity`, Number(e.target.value))} />
                        </div>
                        <div className="col-span-2">
                          <Input type="number" step="0.01" min="0" className="h-7 text-xs text-right bg-white border-slate-200 px-1"
                            value={watchedItems[index]?.purchasePrice ?? ""} onChange={(e) => form.setValue(`items.${index}.purchasePrice`, Number(e.target.value))} />
                        </div>
                        <div className="col-span-2">
                          <Input type="number" step="0.01" min="0" className="h-7 text-xs text-right bg-white border-slate-200 px-1"
                            value={watchedItems[index]?.sellingPrice ?? ""} onChange={(e) => form.setValue(`items.${index}.sellingPrice`, Number(e.target.value))} />
                        </div>
                        <div className="col-span-0 flex items-center justify-end gap-1">
                          <span className="text-xs font-semibold text-nowrap">
                            {formatCurrency((watchedItems[index]?.quantity || 0) * (watchedItems[index]?.purchasePrice || 0))}
                          </span>
                          <Button type="button" variant="ghost" size="icon"
                            className="h-6 w-6 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => remove(index)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              {fields.length > 0 && (
                <div className="border-t px-4 py-3 bg-muted/20 flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">{fields.length} artículo{fields.length > 1 ? 's' : ''}</span>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Total de compra</p>
                    <p className="text-xl font-black">{formatCurrency(total)}</p>
                  </div>
                </div>
              )}
            </div>

            {/* ── RIGHT: Form ─────────────────────────────────────── */}
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
                    Registra la compra de refacciones.
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

                    {/* Toggle: cargar al servicio */}
                    {serviceItemNames.length > 0 && (
                      <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Link className="h-3.5 w-3.5 text-primary" />
                            <Label htmlFor="load-toggle" className="text-xs font-semibold cursor-pointer">
                              Cargar al servicio
                            </Label>
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Recomendado</Badge>
                          </div>
                          <Switch id="load-toggle" checked={loadToService} onCheckedChange={setLoadToService} />
                        </div>
                        {loadToService && (
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
                        )}
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="border-t p-4 space-y-2">
                    <Button type="submit" disabled={isSaving || fields.length === 0} className="w-full gap-2">
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

      <InventorySearchDialog
        open={isSearchOpen}
        onOpenChange={setIsSearchOpen}
        onItemSelected={handleItemSelected}
      />
    </>
  );
}
