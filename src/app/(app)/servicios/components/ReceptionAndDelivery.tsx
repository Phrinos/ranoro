

"use client";

import React, { useState } from "react";
import { useFormContext, type Control } from "react-hook-form";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Signature, BrainCircuit, Loader2, CheckCircle, Clock, Edit } from "lucide-react";
import type { ServiceFormValues } from "@/schemas/service-form";
import { format, parseISO, isValid } from "date-fns";
import { es } from 'date-fns/locale';
import { normalizeDataUrl } from "@/lib/utils";
import { parseDate } from "@/lib/forms";
import Image from "next/image";

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
  onOpenSignature: (kind: 'reception' | 'delivery') => void;
}

export const ReceptionAndDelivery = ({
  isReadOnly,
  isEnhancingText,
  handleEnhanceText,
  onOpenSignature
}: ReceptionAndDeliveryProps) => {
  const { control, watch, getValues } = useFormContext<ServiceFormValues>();
  const customerSignatureReception = watch("customerSignatureReception");
  const customerSignatureDelivery = watch("customerSignatureDelivery");

  const [isEditingDelivery, setIsEditingDelivery] = useState(false);

  const receptionDateTime = watch("receptionDateTime");
  const deliveryDateTime = watch("deliveryDateTime");
  
  const formattedReceptionDate = receptionDateTime && isValid(receptionDateTime)
    ? format(receptionDateTime, "dd MMM yyyy, HH:mm 'hrs'", { locale: es })
    : null;
    
  const formattedDeliveryDate = deliveryDateTime && isValid(deliveryDateTime)
    ? format(deliveryDateTime, "dd MMM yyyy, HH:mm 'hrs'", { locale: es })
    : null;

  return (
    <div className="space-y-6">
      {/* --- RECEPCIÓN CARD --- */}
      <Card>
        <CardHeader>
          <CardTitle>Recepción del Vehículo</CardTitle>
          <CardDescription>
            Documenta el estado y las pertenencias del vehículo al ingresar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-2">
                <FormLabel>Fecha y Hora de Recepción</FormLabel>
                <div className="p-2 border rounded-md bg-muted/50 flex items-center justify-center text-sm font-medium h-10">
                    {formattedReceptionDate || 'Pendiente'}
                </div>
            </div>
            <FormField
                control={control}
                name="fuelLevel"
                render={({ field }) => (
                <FormItem>
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={control}
              name="vehicleConditions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex justify-between items-center w-full">
                    <span>Condiciones del Vehículo</span>
                    {!isReadOnly && (
                      <Button type="button" size="sm" variant="ghost" onClick={() => handleEnhanceText("vehicleConditions")} disabled={isEnhancingText === "vehicleConditions" || !getValues("vehicleConditions")}>
                        {isEnhancingText === "vehicleConditions" ? <Loader2 className="animate-spin" /> : <BrainCircuit className="h-4 w-4" />}
                      </Button>
                    )}
                  </FormLabel>
                  <FormControl>
                    <Textarea placeholder="Ej: Rayón en puerta trasera derecha..." {...field} disabled={isReadOnly} className="min-h-[100px]" />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name="customerItems"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex justify-between items-center w-full">
                    <span>Pertenencias del Cliente</span>
                    {!isReadOnly && (
                      <Button type="button" size="sm" variant="ghost" onClick={() => handleEnhanceText("customerItems")} disabled={isEnhancingText === "customerItems" || !getValues("customerItems")}>
                        {isEnhancingText === "customerItems" ? <Loader2 className="animate-spin" /> : <BrainCircuit className="h-4 w-4" />}
                      </Button>
                    )}
                  </FormLabel>
                  <FormControl>
                    <Textarea placeholder="Ej: Gato, llanta de refacción..." {...field} disabled={isReadOnly} className="min-h-[100px]" />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
          
          <div className="pt-4 border-t">
            <FormLabel className="font-semibold text-base">Firma de Recepción</FormLabel>
            <div className="mt-2 p-3 min-h-[100px] border rounded-md bg-muted/50 flex items-center justify-center">
                {customerSignatureReception ? (
                    <Image 
                        src={normalizeDataUrl(customerSignatureReception)}
                        alt="Firma de recepción"
                        width={250}
                        height={100}
                        style={{ objectFit: 'contain' }}
                        unoptimized
                    />
                ) : (
                    <div className="text-center text-muted-foreground">
                        <Clock className="mx-auto h-6 w-6 mb-1"/>
                        <p>Firma Pendiente</p>
                    </div>
                )}
            </div>
             {!isReadOnly && (
              <Button type="button" variant="outline" className="w-full mt-2" onClick={() => onOpenSignature('reception')}>
                <Signature className="mr-2 h-4 w-4" />{customerSignatureReception ? 'Cambiar Firma de Recepción' : 'Capturar Firma de Recepción'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* --- ENTREGA CARD --- */}
      <Card>
        <CardHeader>
          <CardTitle>Entrega y Conformidad</CardTitle>
          <CardDescription>
            Documenta la entrega del vehículo al cliente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="space-y-2">
                 <div className="flex justify-between items-center">
                    <FormLabel>Fecha y Hora de Entrega</FormLabel>
                    {!isReadOnly && (
                        <Button type="button" variant="ghost" size="icon" onClick={() => setIsEditingDelivery(!isEditingDelivery)}>
                            <Edit className="h-4 w-4" />
                        </Button>
                    )}
                 </div>
                 {isEditingDelivery ? (
                    <FormField
                      control={control}
                      name="deliveryDateTime"
                      render={({ field }) => (
                        <FormControl>
                           <Input
                                type="datetime-local"
                                value={field.value ? format(field.value, "yyyy-MM-dd'T'HH:mm") : ''}
                                onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)}
                                disabled={isReadOnly}
                            />
                        </FormControl>
                      )}
                    />
                 ) : (
                    <div className="p-2 border rounded-md bg-muted/50 flex items-center justify-center text-sm font-medium h-10">
                        {formattedDeliveryDate || 'Pendiente'}
                    </div>
                 )}
            </div>
            <div>
              <FormLabel className="font-semibold text-base">Firma de Conformidad</FormLabel>
              <div className="mt-2 p-3 min-h-[100px] border rounded-md bg-muted/50 flex items-center justify-center">
                {customerSignatureDelivery ? (
                   <Image 
                        src={normalizeDataUrl(customerSignatureDelivery)}
                        alt="Firma de entrega"
                        width={250}
                        height={100}
                        style={{ objectFit: 'contain' }}
                        unoptimized
                    />
                ) : (
                  <div className="text-center text-muted-foreground">
                    <Clock className="mx-auto h-6 w-6 mb-1"/>
                    <p>Firma Pendiente</p>
                  </div>
                )}
              </div>
              {!isReadOnly && (
                <Button type="button" variant="outline" className="w-full mt-2" onClick={() => onOpenSignature('delivery')}>
                  <Signature className="mr-2 h-4 w-4" />{customerSignatureDelivery ? 'Cambiar Firma de Entrega' : 'Capturar Firma de Entrega'}
                </Button>
              )}
            </div>
        </CardContent>
      </Card>
    </div>
  );
};
