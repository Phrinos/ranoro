
"use client";

import React, { useState } from 'react';
import { useFormContext, FormField, FormControl, FormLabel, FormItem } from "react-hook-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Signature, BrainCircuit, Loader2 } from "lucide-react";
import type { ServiceFormValues } from "./service-form";
import Image from "next/image";

const fuelLevels = ['Vacío', '1/8', '1/4', '3/8', '1/2', '5/8', '3/4', '7/8', 'Lleno'];

interface ReceptionAndDeliveryProps {
  isReadOnly?: boolean;
  onCustomerSignatureClick: (type: 'reception' | 'delivery') => void;
  isEnhancingText: string | null;
  handleEnhanceText: (fieldName: 'notes' | 'vehicleConditions' | 'customerItems' | 'safetyInspection.inspectionNotes' | `photoReports.${number}.description`) => void;
}

export const ReceptionAndDelivery = ({ 
  isReadOnly, 
  onCustomerSignatureClick, 
  isEnhancingText, 
  handleEnhanceText 
}: ReceptionAndDeliveryProps) => {
  const { control, watch } = useFormContext<ServiceFormValues>();
  const customerSignatureReception = watch('customerSignatureReception');
  const customerSignatureDelivery = watch('customerSignatureDelivery');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recepción y Entrega</CardTitle>
        <CardDescription>Documenta el estado y las pertenencias del vehículo.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={control}
            name="vehicleConditions"
            render={({ field }) => (
                <FormItem>
                    <FormLabel className="flex justify-between items-center w-full">
                        <span>Condiciones del Vehículo</span>
                        {!isReadOnly && (
                            <Button type="button" size="sm" variant="ghost" onClick={() => handleEnhanceText('vehicleConditions')} disabled={isEnhancingText === 'vehicleConditions' || !field.value}>
                                {isEnhancingText === 'vehicleConditions' ? <Loader2 className="animate-spin"/> : <BrainCircuit className="h-4 w-4" />}
                                <span className="ml-2 hidden sm:inline">Mejorar</span>
                            </Button>
                        )}
                    </FormLabel>
                    <FormControl><Textarea placeholder="Ej: Rayón en puerta trasera derecha, golpe en facia delantera." {...field} disabled={isReadOnly} className="min-h-[100px]" /></FormControl>
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
                            <Button type="button" size="sm" variant="ghost" onClick={() => handleEnhanceText('customerItems')} disabled={isEnhancingText === 'customerItems' || !field.value}>
                                {isEnhancingText === 'customerItems' ? <Loader2 className="animate-spin"/> : <BrainCircuit className="h-4 w-4" />}
                                <span className="ml-2 hidden sm:inline">Mejorar</span>
                            </Button>
                        )}
                    </FormLabel>
                    <FormControl><Textarea placeholder="Ej: Gato, llanta de refacción, cables pasacorriente." {...field} disabled={isReadOnly} className="min-h-[100px]" /></FormControl>
                </FormItem>
            )}
          />
        </div>
        <FormField
          control={control}
          name="fuelLevel"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nivel de Combustible</FormLabel>
              <Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly}>
                <FormControl><SelectTrigger><SelectValue placeholder="Seleccione nivel..." /></SelectTrigger></FormControl>
                <SelectContent>
                  {fuelLevels.map(level => <SelectItem key={level} value={level}>{level}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
            <div>
                <FormLabel>Firma de Recepción del Cliente</FormLabel>
                 <div className="mt-2 p-2 min-h-[100px] border rounded-md bg-muted/50 flex items-center justify-center">
                    {customerSignatureReception ? (
                        <div className="relative w-full h-full max-w-[200px] aspect-video">
                            <Image src={customerSignatureReception} alt="Firma del cliente" layout="fill" objectFit="contain" />
                        </div>
                    ) : (
                        <span className="text-sm text-muted-foreground">Firma pendiente</span>
                    )}
                </div>
                {!isReadOnly && (
                    <Button type="button" variant="outline" onClick={() => onCustomerSignatureClick('reception')} className="w-full mt-2">
                        <Signature className="mr-2 h-4 w-4" />
                        {customerSignatureReception ? 'Cambiar Firma' : 'Capturar Firma'}
                    </Button>
                )}
            </div>
             <div>
                <FormLabel>Firma de Entrega del Cliente</FormLabel>
                 <div className="mt-2 p-2 min-h-[100px] border rounded-md bg-muted/50 flex items-center justify-center">
                    {customerSignatureDelivery ? (
                         <div className="relative w-full h-full max-w-[200px] aspect-video">
                            <Image src={customerSignatureDelivery} alt="Firma de entrega del cliente" layout="fill" objectFit="contain" />
                        </div>
                    ) : (
                        <span className="text-sm text-muted-foreground">Firma pendiente</span>
                    )}
                </div>
                {!isReadOnly && (
                    <Button type="button" variant="outline" onClick={() => onCustomerSignatureClick('delivery')} className="w-full mt-2">
                        <Signature className="mr-2 h-4 w-4" />
                        {customerSignatureDelivery ? 'Cambiar Firma' : 'Capturar Firma'}
                    </Button>
                )}
            </div>
        </div>
      </CardContent>
    </Card>
  );
};
