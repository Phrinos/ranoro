
"use client";

import React, { useEffect, useMemo } from "react";
import { useFormContext, useFieldArray } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, ShoppingCart, BrainCircuit, Loader2 } from "lucide-react";
import type { InventoryItem, InventoryCategory, Supplier, ServiceTypeRecord, User } from "@/types";
import { ServiceItemCard } from "./ServiceItemCard";
import type { ServiceFormValues, ServiceItem } from "@/schemas/service-form";
import { nanoid } from "nanoid";
import { FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";

interface ServiceItemsListProps {
  isReadOnly?: boolean;
  inventoryItems: InventoryItem[];
  serviceTypes: ServiceTypeRecord[];
  technicians: User[];
  mode: "service" | "quote";
  onNewInventoryItemCreated: (formData: any) => Promise<InventoryItem>;
  categories: InventoryCategory[];
  suppliers: Supplier[];
  isEnhancingText?: string | null;
  handleEnhanceText?: (fieldName: any) => void;
}

const toNumberLoose = (v: unknown): number => {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const n = Number(v.replace(/[^\d.-]/g, ""));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
};

export function ServiceItemsList({
  isReadOnly,
  inventoryItems,
  serviceTypes,
  technicians,
  mode,
  onNewInventoryItemCreated,
  categories,
  suppliers,
  isEnhancingText,
  handleEnhanceText,
}: ServiceItemsListProps) {
  const { control, setValue, watch } = useFormContext<ServiceFormValues>();

  const { fields, append, remove } = useFieldArray({
    control,
    name: "serviceItems" as const,
  });

  const items = watch("serviceItems");
  const stableItems = useMemo(() => items ?? [], [items]);

  useEffect(() => {
    let mutated = false;
    let runningTotal = 0;

    stableItems.forEach((item: any, i) => {
      if (typeof item?.sellingPrice === "string") {
        const n = toNumberLoose(item.sellingPrice);
        (setValue as any)(`serviceItems.${i}.sellingPrice`, n, { shouldDirty: true, shouldValidate: false });
        mutated = true;
      }
      const price =
        typeof item?.sellingPrice === "number"
          ? item.sellingPrice
          : typeof item?.sellingPrice === "string"
          ? toNumberLoose(item.sellingPrice)
          : 0;

      runningTotal += price;

      const supplies = Array.isArray(item?.suppliesUsed) ? item.suppliesUsed : [];
      supplies.forEach((s: any, j: number) => {
        if (typeof s?.unitCost === "string") {
          (setValue as any)(
            `serviceItems.${i}.suppliesUsed.${j}.unitCost`,
            toNumberLoose(s.unitCost as any),
            { shouldDirty: true, shouldValidate: false }
          );
          mutated = true;
        }
        if (typeof s?.quantity === "string") {
          (setValue as any)(
            `serviceItems.${i}.suppliesUsed.${j}.quantity`,
            toNumberLoose(s.quantity),
            { shouldDirty: true, shouldValidate: false }
          );
          mutated = true;
        }
      });
    });

    (setValue as any)("totalCost", runningTotal, { shouldDirty: mutated, shouldValidate: false });
  }, [stableItems, setValue]);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Trabajos y Refacciones</CardTitle>
        <CardDescription>Añade trabajos e insumos</CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col flex-grow space-y-4 pt-0">
        <div className="flex-grow space-y-4">
          {fields.length > 0 ? (
            fields.map((field, index) => (
              <ServiceItemCard
                key={field.id}
                serviceIndex={index}
                removeServiceItem={remove}
                isReadOnly={isReadOnly}
                inventoryItems={inventoryItems}
                serviceTypes={serviceTypes}
                technicians={technicians || []}
                mode={mode}
                onNewInventoryItemCreated={onNewInventoryItemCreated}
                categories={categories}
                suppliers={suppliers}
              />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center h-24 text-center text-muted-foreground border-2 border-dashed rounded-lg">
              <ShoppingCart className="h-8 w-8 mb-2" />
              <p className="text-sm font-medium">Ningún trabajo añadido</p>
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
                onClick={() =>
                  append({
                    id: `item_${nanoid(6)}`,
                    name: "",
                    sellingPrice: 0,
                    suppliesUsed: [],
                  } as ServiceItem)
                }
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
                <FormLabel className="flex justify-between items-center w-full">
                  <span>Notas Adicionales del Servicio (Opcional)</span>
                  {!isReadOnly && handleEnhanceText && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEnhanceText("notes")}
                      disabled={isEnhancingText === "notes" || !watch("notes")}
                    >
                      {isEnhancingText === "notes" ? (
                        <Loader2 className="animate-spin" />
                      ) : (
                        <BrainCircuit className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Observaciones generales sobre el servicio..."
                    {...field}
                    className="min-h-[100px] bg-card"
                    disabled={isReadOnly}
                    value={typeof field.value === 'string' ? field.value : ""}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
}
