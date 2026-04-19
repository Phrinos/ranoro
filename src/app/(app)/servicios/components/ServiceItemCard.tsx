// src/app/(app)/servicios/components/ServiceItemCard.tsx
"use client";

import React, { useMemo } from "react";
import { useFormContext, Controller, useWatch } from "react-hook-form";
import type { ServiceFormValues } from "@/schemas/service-form";
import type {
  InventoryItem,
  ServiceTypeRecord,
  User,
} from "@/types";
import { Button } from "@/components/ui/button";
import { FormField, FormItem } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Trash2, Wrench } from "lucide-react";
import { capitalizeWords, formatCurrency, cn } from "@/lib/utils";
import type { ItemFormValues as InventoryItemFormValues } from "../../punto-de-venta/components/dialogs/item-dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { usePermissions } from "@/hooks/usePermissions";
import { ServiceSuppliesArray } from "./ServiceSuppliesArray";
import { Separator } from "@/components/ui/separator";

const toNumber = (v: unknown): number => {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const n = Number(String(v).replace(/[^\d.-]/g, ""));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
};

interface ServiceItemCardProps {
  serviceIndex: number;
  removeServiceItem: (index: number) => void;
  isReadOnly?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  inventoryItems: InventoryItem[];
  serviceTypes: ServiceTypeRecord[];
  technicians: User[];
  mode: "service" | "quote";
  onNewInventoryItemCreated: (formData: InventoryItemFormValues) => Promise<InventoryItem>;
  categories: any[];
  suppliers: any[];
}

export function ServiceItemCard({
  serviceIndex,
  removeServiceItem,
  isReadOnly,
  isCollapsed,
  onToggleCollapse,
  inventoryItems,
  serviceTypes,
  technicians,
  mode,
  onNewInventoryItemCreated,
  categories,
  suppliers,
}: ServiceItemCardProps) {
  const { control, formState: { errors } } = useFormContext<ServiceFormValues>();
  const permissions = usePermissions();
  const canViewCosts = permissions.has("inventory:view_costs");

  const sellingPrice = useWatch({ control, name: `serviceItems.${serviceIndex}.sellingPrice` });
  const serviceTypeStr = useWatch({ control, name: `serviceItems.${serviceIndex}.serviceType` });
  const itemNameStr = useWatch({ control, name: `serviceItems.${serviceIndex}.itemName` });
  const suppliesUsed = useWatch({ control, name: `serviceItems.${serviceIndex}.suppliesUsed` }) as any[] | undefined;

  const { totalCostOfSupplies, profit } = useMemo(() => {
    const price = toNumber(sellingPrice);
    const supplies = Array.isArray(suppliesUsed) ? suppliesUsed : [];
    const suppliesCost = supplies.reduce((sum, s) => {
      const unit = toNumber((s as any)?.unitPrice);
      const qty = toNumber((s as any)?.quantity);
      return sum + unit * qty;
    }, 0);
    // Ganancia = precio cliente minus costo insumos (sin IVA)
    return { totalCostOfSupplies: suppliesCost, profit: price - suppliesCost };
  }, [sellingPrice, suppliesUsed]);

  const serviceItemErrors = (errors as any)?.serviceItems?.[serviceIndex];

  const sortedServiceTypes = useMemo(
    () => [...serviceTypes].sort((a, b) => a.name.localeCompare(b.name)),
    [serviceTypes]
  );

  return (
    <Card className={cn("p-4 transition-all", isCollapsed ? "bg-card shadow-sm border-muted" : "bg-muted/30 border-primary/20 shadow-md")}>
      <div className={cn("flex justify-between items-center", isCollapsed ? "" : "mb-4")}>
        <div className="flex items-center gap-3">
          <h4 className="text-base font-semibold flex items-center gap-2">
            <Wrench className="h-5 w-5 text-muted-foreground" />
            Trabajo #{serviceIndex + 1}
          </h4>
          {isCollapsed && (
             <div className="text-sm border-l pl-3 ml-1 flex items-center gap-2">
                <span className="font-medium text-foreground">{String(itemNameStr || "Sin nombre")}</span>
                <span className="text-muted-foreground">({String(serviceTypeStr || "Tipo no asig.")})</span>
                <span className="font-bold text-green-600 ml-2">{formatCurrency(toNumber(sellingPrice))}</span>
             </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          {isCollapsed && !isReadOnly && (
             <Button
               type="button"
               variant="outline"
               size="sm"
               className="h-8"
               onClick={onToggleCollapse}
             >
               Editar Trabajo
             </Button>
          )}
          {!isCollapsed && !isReadOnly && onToggleCollapse && (
             <Button
               type="button"
               variant="outline"
               size="sm"
               className="h-8 mr-2"
               onClick={onToggleCollapse}
             >
               Minimizar
             </Button>
          )}
          {!isReadOnly && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive"
              onClick={() => removeServiceItem(serviceIndex)}
              title="Eliminar Trabajo"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {!isCollapsed && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr_auto] gap-3 items-end mb-4 mt-2">
            <FormField
              control={control}
          name={`serviceItems.${serviceIndex}.name`}
          render={({ field }) => (
            <FormItem>
              <Label>Tipo de Servicio</Label>
              <Select onValueChange={field.onChange} value={field.value ?? ""} disabled={isReadOnly}>
                <SelectTrigger className="bg-card">
                  <SelectValue placeholder="Tipo..." />
                </SelectTrigger>
                <SelectContent>
                  {sortedServiceTypes.map((t) => (
                    <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name={`serviceItems.${serviceIndex}.itemName`}
          render={({ field }) => (
            <FormItem>
              <Label className={cn(serviceItemErrors?.itemName && "text-destructive")}>
                Nombre del Servicio
              </Label>
              <Input
                placeholder="Descripción específica..."
                {...field}
                disabled={isReadOnly}
                onChange={(e) => field.onChange(capitalizeWords(e.target.value))}
                className={cn(
                  "bg-card",
                  serviceItemErrors?.itemName && "border-destructive focus-visible:ring-destructive"
                )}
              />
            </FormItem>
          )}
        />

        <Controller
          control={control}
          name={`serviceItems.${serviceIndex}.sellingPrice`}
          render={({ field }) => (
            <FormItem className="w-36">
              <Label>Precio Cliente</Label>
              <Input
                type="number"
                inputMode="decimal"
                step="0.01"
                placeholder="0.00"
                disabled={isReadOnly}
                value={field.value ?? ""}
                onChange={(e) => {
                  const raw = e.target.value;
                  field.onChange(raw === "" ? null : parseFloat(raw));
                }}
                onBlur={field.onBlur}
                className="bg-card"
              />
            </FormItem>
          )}
        />
      </div>

      <div>
        <h5 className="text-sm font-medium mb-2">Insumos para este Servicio</h5>
        <ServiceSuppliesArray
          serviceIndex={serviceIndex}
          control={control}
          inventoryItems={inventoryItems}
          onNewInventoryItemCreated={onNewInventoryItemCreated}
          categories={categories}
          suppliers={suppliers}
          isReadOnly={isReadOnly}
        />
      </div>

      <Separator className="my-4" />

      <div className="text-sm space-y-1">
        <div className="flex justify-between items-center font-semibold text-base">
          <span>Total Trabajo:</span>
          <span className="font-bold">{formatCurrency(sellingPrice as any)}</span>
        </div>
        {canViewCosts && (
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Costo Insumos:</span>
            <span className="font-medium text-red-600">-{formatCurrency(totalCostOfSupplies)}</span>
          </div>
        )}
        <div className="flex justify-between items-center text-base pt-1 border-t">
          <span className="font-semibold text-green-700">Ganancia:</span>
          <span className="font-bold text-lg text-green-600">{formatCurrency(profit)}</span>
        </div>
      </div>
    </>
  )}
</Card>
  );
}

export default ServiceItemCard;
