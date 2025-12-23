"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarIcon, PlusCircle, Trash2 } from "lucide-react";
import { format as formatDate } from "date-fns";
import { es } from "date-fns/locale";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { cn } from "@/lib/utils";

import { registerPurchaseSchema, type RegisterPurchaseFormValues } from "@/schemas/register-purchase-schema";
import { CURRENCY_FORMATTER, getToday } from "@/lib/utils";
import type { InventoryItem, Supplier } from "@/types/inventory";

interface RegisterPurchaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: RegisterPurchaseFormValues) => Promise<void> | void;
  suppliers: Supplier[];
  inventoryItems: InventoryItem[];
}

const buildDefaults = (): RegisterPurchaseFormValues => ({
  supplierId: "",
  date: getToday(),
  paymentMethod: "Efectivo",
  items: [],
  subtotal: 0,
  discounts: 0,
  total: 0,
  note: "",
});

export function RegisterPurchaseDialog({
  open,
  onOpenChange,
  onSave,
  suppliers,
  inventoryItems,
}: RegisterPurchaseDialogProps) {
  const resolver = zodResolver(registerPurchaseSchema) as unknown as Resolver<RegisterPurchaseFormValues>;

  const form = useForm<RegisterPurchaseFormValues>({
    resolver,
    defaultValues: buildDefaults(),
    mode: "onBlur",
  });

  const { handleSubmit, reset, formState, control, watch } = form;
  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  const items = watch("items");

  const subtotal = useMemo(() => {
    return items.reduce((acc, item) => acc + item.quantity * item.purchasePrice, 0);
  }, [items]);

  useEffect(() => {
    if (open) reset(buildDefaults());
  }, [open, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Registrar compra</DialogTitle>
          <DialogDescription>Completa los datos de la compra y agrega los artículos correspondientes.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit(async (data) => onSave(data))} className="space-y-4">
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-6">
                <FormField
                  control={form.control}
                  name="supplierId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Proveedor</FormLabel>
                      <Select value={field.value ?? ""} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="bg-white">
                            <SelectValue placeholder="Selecciona un proveedor" />
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
              </div>

              <div className="col-span-6">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Fecha</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              type="button"
                              variant="outline"
                              className={cn("justify-start text-left font-normal", !field.value && "text-muted-foreground")}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value ? formatDate(field.value, "PPP", { locale: es }) : "Selecciona una fecha"}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={(d) => field.onChange(d ?? new Date())}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-lg font-semibold">Artículos</h3>

              <div className="mt-2 space-y-2">
                {fields.map((field, index) => {
                  const inventoryItem = inventoryItems.find((i) => i.id === items[index]?.inventoryItemId);

                  return (
                    <div key={field.id} className="grid grid-cols-12 gap-x-2 rounded-md border p-2">
                      <div className="col-span-4">
                        <FormField
                          control={form.control}
                          name={`items.${index}.inventoryItemId`}
                          render={({ field }) => (
                            <FormItem>
                              <Select value={field.value ?? ""} onValueChange={field.onChange}>
                                <FormControl>
                                  <SelectTrigger className="bg-white">
                                    <SelectValue placeholder="Selecciona un artículo" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {inventoryItems.map((i) => (
                                    <SelectItem key={i.id} value={i.id}>
                                      {i.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="col-span-2">
                        <FormField
                          control={form.control}
                          name={`items.${index}.quantity`}
                          render={({ field }) => (
                            <FormItem>
                              <Input
                                type="number"
                                placeholder="Cantidad"
                                className="bg-white"
                                {...field}
                                value={Number.isFinite(field.value) ? field.value : ""}
                                onChange={(e) => field.onChange(e.target.value === "" ? "" : e.target.valueAsNumber)}
                              />
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="col-span-2">
                        <FormField
                          control={form.control}
                          name={`items.${index}.purchasePrice`}
                          render={({ field }) => (
                            <FormItem>
                              <Input
                                type="number"
                                placeholder="Precio de compra"
                                className="bg-white"
                                {...field}
                                value={Number.isFinite(field.value) ? field.value : ""}
                                onChange={(e) => field.onChange(e.target.value === "" ? "" : e.target.valueAsNumber)}
                              />
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="col-span-2 flex items-center">
                        <p className="text-sm">
                          Total:{" "}
                          {CURRENCY_FORMATTER.format(items[index].quantity * items[index].purchasePrice)}
                        </p>
                      </div>

                      <div className="col-span-1 flex items-center">
                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <Button
                type="button"
                variant="link"
                className="mt-2 text-sm"
                onClick={() =>
                  append({
                    inventoryItemId: "",
                    itemName: "",
                    quantity: 0,
                    purchasePrice: 0,
                    totalPrice: 0,
                  })
                }
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Agregar artículo
              </Button>
            </div>

            <Separator />

            <div className="grid grid-cols-12">
              <div className="col-span-7"></div>
              <div className="col-span-5 space-y-2">
                <div className="flex justify-between">
                  <p className="text-sm">Subtotal</p>
                  <p className="text-sm">{CURRENCY_FORMATTER.format(subtotal)}</p>
                </div>
                <div className="flex justify-between">
                  <p className="text-sm">Descuentos</p>
                  <p className="text-sm">{CURRENCY_FORMATTER.format(0)}</p>
                </div>
                <div className="flex justify-between">
                  <p className="text-sm font-semibold">Total</p>
                  <p className="text-sm font-semibold">{CURRENCY_FORMATTER.format(subtotal)}</p>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={formState.isSubmitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={formState.isSubmitting}>
                Guardar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
