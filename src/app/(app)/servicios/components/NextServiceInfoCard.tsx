// src/app/(app)/servicios/components/NextServiceInfoCard.tsx
"use client";

import React, { useState } from 'react';
import { useFormContext, Controller } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, addMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { ServiceFormValues } from '@/schemas/service-form';

interface NextServiceInfoCardProps {
  isReadOnly?: boolean;
  currentMileage?: number;
}

export function NextServiceInfoCard({ isReadOnly, currentMileage = 0 }: NextServiceInfoCardProps) {
  const { control, formState: { errors }, setValue } = useFormContext<ServiceFormValues>();
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const addMonthsToCurrentDate = (months: number) => {
    setValue("nextServiceInfo.nextServiceDate", addMonths(new Date(), months), { shouldValidate: true, shouldDirty: true });
  };

  const addMileage = (amount: number) => {
    const newMileage = (currentMileage || 0) + amount;
    setValue("nextServiceInfo.nextServiceMileage", newMileage, { shouldValidate: true, shouldDirty: true });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Próximo Servicio</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={control}
            name="nextServiceInfo.nextServiceDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel className={cn(errors.nextServiceInfo?.nextServiceDate && "text-destructive")}>Fecha Próximo Servicio</FormLabel>
                <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground", errors.nextServiceInfo?.nextServiceDate && "border-destructive")}
                        disabled={isReadOnly}
                      >
                        {field.value ? format(field.value as Date, "PPP", { locale: es }) : <span>Seleccione fecha</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value as Date | undefined}
                      onSelect={(date) => {
                        field.onChange(date);
                        setIsDatePickerOpen(false);
                      }}
                      disabled={(date) => date < new Date() || isReadOnly}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <div className="flex gap-2 mt-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => addMonthsToCurrentDate(6)} disabled={isReadOnly}>+6 Meses</Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => addMonthsToCurrentDate(12)} disabled={isReadOnly}>+12 Meses</Button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="nextServiceInfo.nextServiceMileage"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={cn(errors.nextServiceInfo?.nextServiceMileage && "text-destructive")}>Kilometraje Próximo Servicio</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="Ej. 85000" 
                    {...field} 
                    value={field.value ?? ''}
                    disabled={isReadOnly}
                    onChange={e => field.onChange(parseInt(e.target.value, 10) || null)}
                   />
                </FormControl>
                 <div className="flex gap-2 mt-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => addMileage(10000)} disabled={isReadOnly}>+10K Km</Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => addMileage(15000)} disabled={isReadOnly}>+15K Km</Button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
}
