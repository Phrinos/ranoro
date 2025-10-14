// src/app/(app)/servicios/components/ServiceItemCard.tsx
"use client";

import React, { useMemo, useState } from "react";
import { useFormContext, Controller, useWatch } from "react-hook-form";
import type { ServiceFormValues } from "@/schemas/service-form";
import type {
  InventoryItem,
  ServiceTypeRecord,
  User,
  Vehicle,
  VehiclePriceList,
  PricedService,
} from "@/types";
import { Button } from "@/components/ui/button";
import { FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { PlusCircle, Trash2, Wrench, Tags } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { capitalizeWords, formatCurrency, cn } from "@/lib/utils";
import type { InventoryItemFormValues } from "../../inventario/components/inventory-item-form";
import { inventoryService } from "@/lib/services";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { usePermissions } from "@/hooks/usePermissions";
import { ServiceSuppliesArray } from "./ServiceSuppliesArray";
import { Separator } from "@/components/ui/separator";

const IVA_RATE = 0.16;
const toNumber = (v: unknown): number => {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const n = Number(v.replace(/[^\d.-]/g, ""));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
};

interface ServiceItemCardProps {
  serviceIndex: number;
  removeServiceItem: (index: number) => void;
  isReadOnly?: boolean;
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
  const { toast } = useToast();

  const serviceStatus = useWatch({ control, name: 'status' });
  const sellingPrice = useWatch({ control, name: `serviceItems.${serviceIndex}.sellingPrice` });
  const suppliesUsed = useWatch({ control, name: `serviceItems.${serviceIndex}.suppliesUsed` }) as any[] | undefined;

  const { subTotal, tax, totalCostOfSupplies, profit } = useMemo(() => {
    const price = toNumber(sellingPrice);
    const supplies = Array.isArray(suppliesUsed) ? suppliesUsed : [];
    const suppliesCost = supplies.reduce((sum, s) => {
      const unit = toNumber((s as any)?.unitCost ?? (s as any)?.unitPrice);
      const qty = toNumber((s as any)?.quantity);
      return sum + unit * qty;
    }, 0);
    const sub = price / (1 + IVA_RATE);
    const iva = price - sub;
    const prf = price - suppliesCost;
    return { subTotal: sub, tax: iva, totalCostOfSupplies: suppliesCost, profit: prf };
  }, [sellingPrice, suppliesUsed]);

  const serviceItemErrors = (errors as any)?.serviceItems?.[serviceIndex];
  
  const sortedServiceTypes = useMemo(() => {
    return [...serviceTypes].sort((a, b) => a.name.localeCompare(b.name));
  }, [serviceTypes]);

  return (
    <Card className="p-4 bg-muted/30">
      <div className="flex justify-between items-start mb-4">
        <h4 className="text-base font-semibold flex items-center gap-2">
          <Wrench className="h-5 w-5 text-muted-foreground" />
          Trabajo a Realizar #{serviceIndex + 1}
        </h4>
        <div className="flex items-center">
          {!isReadOnly && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive"
              onClick={() => removeServiceItem(serviceIndex)}
              title="Eliminar Trabajo"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={control} name={`serviceItems.${serviceIndex}.serviceType`} render={({ field }) => (
                <FormItem><FormLabel>Tipo de Servicio</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly}>
                        <FormControl><SelectTrigger className="bg-card"><SelectValue placeholder="Seleccione un tipo..." /></SelectTrigger></FormControl>
                        <SelectContent>{sortedServiceTypes.map((t) => (<SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>))}</SelectContent>
                    </Select>
                </FormItem>
            )}/>
            <FormField
                control={control}
                name={`serviceItems.${serviceIndex}.name`}
                render={({ field }) => (
                <FormItem>
                    <FormLabel className={cn(serviceItemErrors?.name && "text-destructive")}>
                    Nombre del Servicio
                    </FormLabel>
                    <FormControl>
                    <Input
                        placeholder="Afinación Mayor"
                        {...field}
                        disabled={isReadOnly}
                        onChange={(e) => field.onChange(capitalizeWords(e.target.value))}
                        className={cn("bg-card", serviceItemErrors?.name && "border-destructive focus-visible:ring-destructive")}
                    />
                    </FormControl>
                </FormItem>
                )}
            />
        </div>
        <div className="grid grid-cols-1 gap-4">
            <Controller
                control={control}
                name={`serviceItems.${serviceIndex}.sellingPrice`}
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Precio Cliente (IVA Inc.)</FormLabel>
                    <FormControl>
                    <Input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        placeholder="0.00"
                        disabled={isReadOnly}
                        value={field.value ?? ""}
                        onChange={(e) => {
                        const raw = e.target.value;
                        field.onChange(raw === "" ? "" : toNumber(raw));
                        }}
                        onBlur={field.onBlur}
                        className="bg-card"
                    />
                    </FormControl>
                </FormItem>
                )}
            />
        </div>
      </div>

      <div className="mt-4">
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
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Subtotal Trabajo:</span>
          <span className="font-medium">{formatCurrency(subTotal)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">IVA Trabajo(16%):</span>
          <span className="font-medium">{formatCurrency(tax)}</span>
        </div>
        <div className="flex justify-between items-center font-semibold text-base pt-1 border-t">
          <span>Total Trabajo:</span>
          <span className="font-bold">{formatCurrency(sellingPrice)}</span>
        </div>
        {canViewCosts && (
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Costo Insumos:</span>
            <span className="font-medium text-red-600">-{formatCurrency(totalCostOfSupplies)}</span>
          </div>
        )}
        <div className="flex justify-between items-center text-base pt-1 border-t">
          <span className="font-semibold text-green-700">Ganancia del Trabajo:</span>
          <span className="font-bold text-lg text-green-600">{formatCurrency(profit)}</span>
        </div>
      </div>
    </Card>
  );
}

export default ServiceItemCard;
