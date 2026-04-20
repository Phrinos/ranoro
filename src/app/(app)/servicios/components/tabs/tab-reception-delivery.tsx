// src/app/(app)/servicios/components/tabs/tab-reception-delivery.tsx
"use client";

import React from "react";
import { useFormContext } from "react-hook-form";
import { FormField, FormItem } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { PenLine } from "lucide-react";

// Reuse PhotoReportTab from the old path (stable component)
const PhotoReportTab: any = React.lazy(() =>
  import("@/app/(app)/servicios/components/PhotoReportTab").then((m: any) => ({
    default: m.PhotoReportTab || m.default,
  }))
);

interface TabReceptionDeliveryProps {
  isReadOnly?: boolean;
  onOpenSignature: (type: "reception" | "delivery") => void;
}

export function TabReceptionDelivery({
  isReadOnly,
  onOpenSignature,
}: TabReceptionDeliveryProps) {
  const { control, watch } = useFormContext();
  const sigReception = watch("customerSignatureReception");
  const sigDelivery = watch("customerSignatureDelivery");

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      {/* ── COLUMNA RECEPCIÓN ── */}
      <div className="space-y-6 bg-card border border-border shadow-xs rounded-xl p-6">
        <div className="border-b border-border/50 pb-2 mb-4">
          <h3 className="text-lg font-semibold text-primary uppercase flex items-center gap-2">
            📋 Recepción del Vehículo
          </h3>
        </div>

        {/* Fotografías */}
        <div>
          <Label className="block mb-2 font-semibold">Fotografías de Recepción</Label>
          <div className="bg-muted/10 rounded-xl p-4 border border-border/50">
            <React.Suspense fallback={<div className="animate-pulse h-32 bg-muted rounded-lg" />}>
              <PhotoReportTab category="reception" />
            </React.Suspense>
          </div>
        </div>

        {/* Combustible */}
        <FormField
          control={control}
          name="fuelLevel"
          render={({ field }) => (
            <FormItem className="pt-2 border-t border-border/50">
              <Label className="font-semibold text-sm">Nivel de Combustible</Label>
              <div className="px-2 mt-2">
                <Input
                  type="range"
                  min="0"
                  max="8"
                  step="1"
                  {...field}
                  disabled={isReadOnly}
                  className="cursor-pointer w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>Vacío</span>
                  <span>1/2</span>
                  <span>Lleno</span>
                </div>
              </div>
            </FormItem>
          )}
        />

        {/* Condiciones */}
        <FormField
          control={control}
          name="vehicleConditions"
          render={({ field }) => (
            <FormItem>
              <Label className="font-semibold text-sm">Condiciones y Daños Previos</Label>
              <Textarea
                placeholder="Describir rayones, golpes, testigos encendidos..."
                {...field}
                disabled={isReadOnly}
                className="min-h-[100px] bg-card resize-none"
              />
            </FormItem>
          )}
        />

        {/* Pertenencias */}
        <FormField
          control={control}
          name="customerItems"
          render={({ field }) => (
            <FormItem>
              <Label className="font-semibold text-sm">Pertenencias del Vehículo</Label>
              <Textarea
                placeholder="Herramienta, llanta de refacción, documentos, etc."
                {...field}
                disabled={isReadOnly}
                className="min-h-[80px] bg-card resize-none"
              />
            </FormItem>
          )}
        />

        {/* Firma Recepción */}
        <FormField
          control={control}
          name="customerSignatureReception"
          render={() => (
            <FormItem className="pt-4 border-t border-border/50">
              <Label className="font-semibold text-sm">Firma de Recepción (Cliente)</Label>
              <div className="p-2 border rounded-md min-h-[120px] flex justify-center items-center bg-muted/30">
                {sigReception ? (
                  <Image
                    src={sigReception}
                    alt="Firma Recepción"
                    width={250}
                    height={120}
                    style={{ objectFit: "contain" }}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground italic">Firma pendiente.</p>
                )}
              </div>
              {!isReadOnly && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenSignature("reception")}
                  className="mt-2 w-full"
                >
                  <PenLine className="h-4 w-4 mr-2" /> Capturar Firma
                </Button>
              )}
            </FormItem>
          )}
        />
      </div>

      {/* ── COLUMNA ENTREGA ── */}
      <div className="space-y-6 bg-card border border-border shadow-xs rounded-xl p-6">
        <div className="border-b border-border/50 pb-2 mb-4">
          <h3 className="text-lg font-semibold text-primary uppercase flex items-center gap-2">
            ✅ Entrega del Vehículo
          </h3>
        </div>

        {/* Notas de Entrega */}
        <FormField
          control={control}
          name="privateNotes"
          render={({ field }) => (
            <FormItem>
              <Label className="font-semibold text-sm">Notas Internas o de Entrega</Label>
              <Textarea
                placeholder="Recomendaciones futuras, notas para el cliente..."
                {...field}
                disabled={isReadOnly}
                className="min-h-[180px] bg-card resize-none"
              />
            </FormItem>
          )}
        />

        {/* Firma Entrega */}
        <FormField
          control={control}
          name="customerSignatureDelivery"
          render={() => (
            <FormItem className="pt-4 border-t border-border/50">
              <Label className="font-semibold text-sm">Firma de Conformidad (Cliente)</Label>
              <div className="p-2 border rounded-md min-h-[120px] flex justify-center items-center bg-muted/30">
                {sigDelivery ? (
                  <Image
                    src={sigDelivery}
                    alt="Firma Entrega"
                    width={250}
                    height={120}
                    style={{ objectFit: "contain" }}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground italic">Firma pendiente.</p>
                )}
              </div>
              {!isReadOnly && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenSignature("delivery")}
                  className="mt-2 w-full"
                >
                  <PenLine className="h-4 w-4 mr-2" /> Capturar Firma
                </Button>
              )}
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
