

"use client";

import React from "react";
import { useFormContext } from "react-hook-form";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Signature, BrainCircuit, Loader2, CheckCircle, Clock } from "lucide-react";
import type { ServiceFormValues } from "./service-form";
import { format, parseISO, isValid } from "date-fns";
import { es } from "date-fns/locale";

const fuelLevels = [
  "Vacío",
  "1/8",
  "1/4",
  "3/8",
  "1/2",
  "5/8",
  "3/4",
  "7/8",
  "Lleno",
];

interface ReceptionAndDeliveryProps {
  isReadOnly?: boolean;
  isEnhancingText: string | null;
  handleEnhanceText: (
    fieldName:
      | "notes"
      | "vehicleConditions"
      | "customerItems"
      | "safetyInspection.inspectionNotes"
      | `photoReports.${number}.description`
  ) => void;
}

export const ReceptionAndDelivery = ({
  isReadOnly,
  isEnhancingText,
  handleEnhanceText,
}: ReceptionAndDeliveryProps) => {
  const { control, watch } = useFormContext<ServiceFormValues>();
  const customerSignatureReception = watch("customerSignatureReception");
  const customerSignatureDelivery = watch("customerSignatureDelivery");

  const receptionDateTime = watch("receptionDateTime");
  const deliveryDateTime = watch("deliveryDateTime");
  
  const formattedReceptionDate = receptionDateTime && isValid(receptionDateTime)
    ? format(receptionDateTime, "dd MMM yyyy, HH:mm 'hrs'", { locale: es })
    : null;
    
  const formattedDeliveryDate = deliveryDateTime && isValid(deliveryDateTime)
    ? format(deliveryDateTime, "dd MMM yyyy, HH:mm 'hrs'", { locale: es })
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recepción y Entrega</CardTitle>
        <CardDescription>
          Documenta el estado y las pertenencias del vehículo.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Panel de Firmas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
          <div>
            <FormLabel className="font-semibold text-base">Firma de Recepción</FormLabel>
            {formattedReceptionDate && (
                <p className="text-xs text-muted-foreground mt-1">
                    Recepción: {formattedReceptionDate}
                </p>
            )}
             <div className="mt-2 p-3 min-h-[50px] border rounded-md bg-muted/50 flex items-center justify-center">
                {customerSignatureReception ? (
                  <div className="text-center text-green-600">
                    <CheckCircle className="mx-auto h-6 w-6 mb-1"/>
                    <p className="font-semibold">Firma Capturada</p>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground">
                    <Clock className="mx-auto h-6 w-6 mb-1"/>
                    <p>Firma Pendiente</p>
                  </div>
                )}
            </div>
          </div>
          <div>
            <FormLabel className="font-semibold text-base">Firma de Conformidad</FormLabel>
            {formattedDeliveryDate && (
                 <p className="text-xs text-muted-foreground mt-1">
                    Entrega: {formattedDeliveryDate}
                </p>
            )}
            <div className="mt-2 p-3 min-h-[50px] border rounded-md bg-muted/50 flex items-center justify-center">
                {customerSignatureDelivery ? (
                   <div className="text-center text-green-600">
                    <CheckCircle className="mx-auto h-6 w-6 mb-1"/>
                    <p className="font-semibold">Firma Capturada</p>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground">
                    <Clock className="mx-auto h-6 w-6 mb-1"/>
                    <p>Firma Pendiente</p>
                  </div>
                )}
            </div>
          </div>
        </div>
        
        {/* Condiciones y pertenencias */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 pt-4 border-t">
          {/* Condiciones del vehículo */}
          <FormField
            control={control}
            name="vehicleConditions"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex justify-between items-center w-full">
                  <span>Condiciones del Vehículo</span>
                  {!isReadOnly && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEnhanceText("vehicleConditions")}
                      disabled={
                        isEnhancingText === "vehicleConditions" || !field.value
                      }
                    >
                      {isEnhancingText === "vehicleConditions" ? (
                        <Loader2 className="animate-spin" />
                      ) : (
                        <BrainCircuit className="h-4 w-4" />
                      )}
                      <span className="ml-2 hidden sm:inline">Mejorar</span>
                    </Button>
                  )}
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Ej: Rayón en puerta trasera derecha, golpe en facia delantera."
                    {...field}
                    disabled={isReadOnly}
                    className="min-h-[100px]"
                  />
                </FormControl>
              </FormItem>
            )}
          />

          {/* Pertenencias del cliente */}
          <FormField
            control={control}
            name="customerItems"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex justify-between items-center w-full">
                  <span>Pertenencias del Cliente</span>
                  {!isReadOnly && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEnhanceText("customerItems")}
                      disabled={
                        isEnhancingText === "customerItems" || !field.value
                      }
                    >
                      {isEnhancingText === "customerItems" ? (
                        <Loader2 className="animate-spin" />
                      ) : (
                        <BrainCircuit className="h-4 w-4" />
                      )}
                      <span className="ml-2 hidden sm:inline">Mejorar</span>
                    </Button>
                  )}
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Ej: Gato, llanta de refacción, cables pasacorriente."
                    {...field}
                    disabled={isReadOnly}
                    className="min-h-[100px]"
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        {/* Nivel de combustible */}
        <FormField
          control={control}
          name="fuelLevel"
          render={({ field }) => (
            <FormItem className="pt-4 border-t">
              <FormLabel>Nivel de Combustible</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value}
                disabled={isReadOnly}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione nivel..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {fuelLevels.map((level) => (
                    <SelectItem key={level} value={level}>
                      {level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />
        
      </CardContent>
    </Card>
  );
};
