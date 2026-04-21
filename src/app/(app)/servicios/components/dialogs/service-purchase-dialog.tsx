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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { Trash2, PlusCircle, PackagePlus, ShoppingCart, Link } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { purchaseService } from "@/lib/services";
import { useToast } from "@/hooks/use-toast";
import { InventorySearchDialog } from "@/components/shared/InventorySearchDialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const PAYMENT_METHODS = [
  "Efectivo",
  "Tarjeta",
  "Tarjeta 3 MSI",
  "Tarjeta 6 MSI",
  "Transferencia",
  "Crédito",
];

interface ServicePurchaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suppliers: Supplier[];
  inventoryItems: InventoryItem[];
  categories: InventoryCategory[];
  /** El índice del serviceItem al que pre-seleccionar para cargar los insumos */
  defaultServiceItemIndex?: number;
  /** Nombres de los serviceItems activos para el selector */
  serviceItemNames: { index: number; label: string }[];
  /** callback para cuando la compra se registra exitosamente */
  onPurchaseRegistered?: () => void;
}

export function ServicePurchaseDialog({
  open,
  onOpenChange,
  suppliers,
  inventoryItems,
  categories,
  defaultServiceItemIndex,
  serviceItemNames,
  onPurchaseRegistered,
}: ServicePurchaseDialogProps) {
  const { toast } = useToast();
  const { setValue: setServiceFormValue, getValues } = useFormContext<ServiceFormValues>();

  const [isSaving, setIsSaving] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [loadToService, setLoadToService] = useState(true);
  const [targetServiceIndex, setTargetServiceIndex] = useState<number>(
    defaultServiceItemIndex ?? 0
  );

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

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  // Total calculado
  const watchedItems = form.watch("items");
  const total = watchedItems.reduce(
    (sum, item) => sum + (item.quantity || 0) * (item.purchasePrice || 0),
    0
  );

  /** Se llama al elegir un item del buscador de inventario */
  const handleItemSelected = useCallback(
    (item: InventoryItem, quantity: number) => {
      append({
        inventoryItemId: item.id,
        itemName: item.name,
        quantity: quantity || 1,
        purchasePrice: item.unitPrice || 0,
        sellingPrice: item.sellingPrice || 0,
      });
      setIsSearchOpen(false);
    },
    [append]
  );

  /** Al enviar el formulario */
  const handleSubmit = async (data: RegisterPurchaseFormValues) => {
    if (data.items.length === 0) {
      toast({ title: "Agrega al menos un artículo", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      // 1. Calcular total si no viene en el form
      const invoiceTotal = data.items.reduce(
        (s, i) => s + (i.quantity || 0) * (i.purchasePrice || 0),
        0
      );
      await purchaseService.registerPurchase({ ...data, invoiceTotal });

      // 2. Si el toggle está activo, inyectar insumos en el serviceItem elegido
      if (loadToService && serviceItemNames.length > 0) {
        const currentSupplies: any[] =
          getValues(`serviceItems.${targetServiceIndex}.suppliesUsed` as any) || [];

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
          description: `${data.items.length} artículo(s) añadido(s) al trabajo ${
            serviceItemNames[targetServiceIndex]?.label || `#${targetServiceIndex + 1}`
          }.`,
        });
      } else {
        toast({ title: "Compra Registrada en Inventario ✅" });
      }

      form.reset();
      onOpenChange(false);
      onPurchaseRegistered?.();
    } catch (e: any) {
      toast({
        title: "Error al registrar compra",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PackagePlus className="h-5 w-5 text-primary" />
              Registrar Compra de Refacciones
            </DialogTitle>
            <DialogDescription>
              Ingresa la factura o nota de compra. Los artículos se agregarán al inventario
              y opcionalmente se cargarán al servicio activo.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
              {/* Header: Proveedor + Fecha + Folio */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="supplierId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Proveedor *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar proveedor..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {suppliers.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="purchaseDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fecha de Compra *</FormLabel>
                      <FormControl>
                        <DatePicker
                          date={field.value}
                          onDateChange={(d) => field.onChange(d ?? new Date())}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="invoiceId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Folio / Factura</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Ej: FAC-001" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="paymentMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Método de Pago *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {PAYMENT_METHODS.map((m) => (
                            <SelectItem key={m} value={m}>
                              {m}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Artículos */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Artículos Comprados *</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsSearchOpen(true)}
                  >
                    <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> Agregar del Inventario
                  </Button>
                </div>

                {fields.length === 0 ? (
                  <div
                    className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg py-8 text-muted-foreground cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => setIsSearchOpen(true)}
                  >
                    <ShoppingCart className="h-8 w-8 mb-2 opacity-40" />
                    <p className="text-sm">Haz clic para agregar artículos del catálogo</p>
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    {/* Column headers */}
                    <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-muted-foreground bg-muted/50 px-3 py-2">
                      <div className="col-span-5">Artículo</div>
                      <div className="col-span-2 text-center">Cant.</div>
                      <div className="col-span-2 text-right">Costo Unit.</div>
                      <div className="col-span-2 text-right">Subtotal</div>
                      <div className="col-span-1" />
                    </div>

                    <div className="divide-y">
                      {fields.map((field, index) => (
                        <div
                          key={field.id}
                          className="grid grid-cols-12 gap-2 items-center px-3 py-2"
                        >
                          <div className="col-span-5">
                            <p className="text-sm font-medium truncate">
                              {watchedItems[index]?.itemName || "—"}
                            </p>
                          </div>
                          <div className="col-span-2">
                            <Input
                              type="number"
                              step="0.001"
                              min="0.001"
                              className="h-7 text-xs text-center"
                              value={watchedItems[index]?.quantity ?? ""}
                              onChange={(e) =>
                                form.setValue(`items.${index}.quantity`, Number(e.target.value))
                              }
                            />
                          </div>
                          <div className="col-span-2">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              className="h-7 text-xs text-right"
                              value={watchedItems[index]?.purchasePrice ?? ""}
                              onChange={(e) =>
                                form.setValue(
                                  `items.${index}.purchasePrice`,
                                  Number(e.target.value)
                                )
                              }
                            />
                          </div>
                          <div className="col-span-2 text-right">
                            <span className="text-sm font-semibold">
                              {formatCurrency(
                                (watchedItems[index]?.quantity || 0) *
                                  (watchedItems[index]?.purchasePrice || 0)
                              )}
                            </span>
                          </div>
                          <div className="col-span-1 flex justify-end">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              onClick={() => remove(index)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-end px-3 py-2 bg-muted/30 border-t">
                      <span className="text-sm font-bold">
                        Total: {formatCurrency(total)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* Toggle: cargar al servicio */}
              {serviceItemNames.length > 0 && (
                <div className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Link className="h-4 w-4 text-primary" />
                      <Label htmlFor="load-toggle" className="font-semibold text-sm cursor-pointer">
                        Cargar materiales al servicio
                      </Label>
                      <Badge variant="secondary" className="text-xs">Recomendado</Badge>
                    </div>
                    <Switch
                      id="load-toggle"
                      checked={loadToService}
                      onCheckedChange={setLoadToService}
                    />
                  </div>

                  {loadToService && (
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">
                        ¿A qué trabajo cargar los artículos?
                      </Label>
                      <Select
                        value={String(targetServiceIndex)}
                        onValueChange={(v) => setTargetServiceIndex(Number(v))}
                      >
                        <SelectTrigger className="bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {serviceItemNames.map((s) => (
                            <SelectItem key={s.index} value={String(s.index)}>
                              {s.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSaving || fields.length === 0}>
                  {isSaving ? "Registrando..." : "Registrar Compra"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <InventorySearchDialog
        open={isSearchOpen}
        onOpenChange={setIsSearchOpen}
        onItemSelected={handleItemSelected}
        onNewItemRequest={() => setIsSearchOpen(false)}
      />
    </>
  );
}
