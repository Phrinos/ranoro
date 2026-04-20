// src/app/(app)/servicios/components/editor/service-items-editor.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useFormContext, useFieldArray } from "react-hook-form";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, ShoppingCart } from "lucide-react";
import type { InventoryItem, InventoryCategory, Supplier, ServiceTypeRecord, User } from "@/types";
import type { ServiceFormValues, ServiceItem } from "@/schemas/service-form";
import { FormField, FormItem } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { nanoid } from "nanoid";

const ServiceItemCard: any = React.lazy(() =>
  import("@/app/(app)/servicios/components/ServiceItemCard").then((m) => ({
    default: m.ServiceItemCard,
  }))
);

const toNumberLoose = (v: unknown): number => {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const n = Number(v.replace(/[^\d.-]/g, ""));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
};

interface ServiceItemsEditorProps {
  isReadOnly?: boolean;
  inventoryItems: InventoryItem[];
  serviceTypes: ServiceTypeRecord[];
  technicians: User[];
  mode: "service" | "quote";
  onNewInventoryItemCreated: (formData: any) => Promise<InventoryItem>;
  categories: InventoryCategory[];
  suppliers: Supplier[];
}

export function ServiceItemsEditor({
  isReadOnly,
  inventoryItems,
  serviceTypes,
  technicians,
  mode,
  onNewInventoryItemCreated,
  categories,
  suppliers,
}: ServiceItemsEditorProps) {
  const { control, setValue, watch } = useFormContext<ServiceFormValues>();

  const { fields, append, remove } = useFieldArray({
    control,
    name: "serviceItems" as const,
  });

  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(fields.length === 1 ? 0 : null);

  const items = watch("serviceItems");
  const stableItems = useMemo(() => items ?? [], [items]);

  // Sync totals and coerce string values to numbers
  useEffect(() => {
    let runningTotal = 0;
    stableItems.forEach((item: any, i) => {
      if (typeof item?.sellingPrice === "string") {
        (setValue as any)(`serviceItems.${i}.sellingPrice`, toNumberLoose(item.sellingPrice), {
          shouldDirty: true,
          shouldValidate: false,
        });
      }
      runningTotal += toNumberLoose(item?.sellingPrice);

      (item?.suppliesUsed ?? []).forEach((s: any, j: number) => {
        if (typeof s?.unitCost === "string")
          (setValue as any)(`serviceItems.${i}.suppliesUsed.${j}.unitCost`, toNumberLoose(s.unitCost), {
            shouldDirty: true,
            shouldValidate: false,
          });
        if (typeof s?.quantity === "string")
          (setValue as any)(`serviceItems.${i}.suppliesUsed.${j}.quantity`, toNumberLoose(s.quantity), {
            shouldDirty: true,
            shouldValidate: false,
          });
      });
    });
    (setValue as any)("totalCost", runningTotal, { shouldDirty: false, shouldValidate: false });
  }, [stableItems, setValue]);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Trabajos y Refacciones</CardTitle>
        <CardDescription>Añade trabajos, servicios e insumos utilizados.</CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col grow space-y-4 pt-0">
        <div className="grow space-y-4">
          {fields.length > 0 ? (
            <React.Suspense fallback={<div className="animate-pulse h-32 bg-muted rounded-lg" />}>
              {fields.map((field, index) => (
                <ServiceItemCard
                  key={field.id}
                  serviceIndex={index}
                  removeServiceItem={remove}
                  isReadOnly={isReadOnly}
                  isCollapsed={editingItemIndex !== index}
                  onToggleCollapse={() => setEditingItemIndex(editingItemIndex === index ? null : index)}
                  inventoryItems={inventoryItems}
                  serviceTypes={serviceTypes}
                  technicians={technicians}
                  mode={mode}
                  onNewInventoryItemCreated={onNewInventoryItemCreated}
                  categories={categories}
                  suppliers={suppliers}
                />
              ))}
            </React.Suspense>
          ) : (
            <div className="flex flex-col items-center justify-center h-24 text-center text-muted-foreground border-2 border-dashed rounded-lg">
              <ShoppingCart className="h-8 w-8 mb-2 opacity-30" />
              <p className="text-sm font-medium">Sin trabajos añadidos</p>
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-col gap-4 border-t pt-4">
          {!isReadOnly && (
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="bg-card"
                onClick={() => {
                  append({
                    id: `item_${nanoid(6)}`,
                    name: "",
                    itemName: "",
                    sellingPrice: 0,
                    suppliesUsed: [],
                  } as ServiceItem);
                  setEditingItemIndex(fields.length);
                }}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Añadir Trabajo
              </Button>
            </div>
          )}

          <FormField
            control={control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <Label>Notas Adicionales del Servicio</Label>
                <Textarea
                  placeholder="Observaciones generales sobre el servicio..."
                  {...field}
                  className="min-h-[100px] bg-card"
                  disabled={isReadOnly}
                  value={typeof field.value === "string" ? field.value : ""}
                />
              </FormItem>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
}
