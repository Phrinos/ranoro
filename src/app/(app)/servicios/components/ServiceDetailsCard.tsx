
// src/app/(app)/servicios/components/ServiceDetailsCard.tsx
"use client";

import React, { useMemo, useState, useCallback } from 'react';
import { useFormContext, Controller } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CalendarIcon, Signature } from "lucide-react";
import type { ServiceFormValues } from "@/schemas/service-form";
import type { User, ServiceTypeRecord } from "@/types";
import { cn } from "@/lib/utils";
import { format, setHours, setMinutes, isValid, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

const statusOptions: { value: ServiceFormValues['status'], label: string }[] = [
    { value: 'Cotizacion', label: 'Cotización' },
    { value: 'Agendado', label: 'Agendado' },
    { value: 'En Taller', label: 'En Taller' },
    { value: 'Entregado', label: 'Entregado' },
];

interface ServiceDetailsCardProps {
  isReadOnly?: boolean;
  advisors: User[];
  technicians: User[];
  serviceTypes: ServiceTypeRecord[];
  onOpenSignature: (type: 'reception' | 'delivery' | 'advisor') => void;
  isNew: boolean;
}

export function ServiceDetailsCard({
  isReadOnly,
  advisors,
  technicians,
  onOpenSignature,
  isNew
}: ServiceDetailsCardProps) {
  const { control, watch, formState: { errors }, setValue } = useFormContext<ServiceFormValues>();
  
  const watchedStatus = watch('status');
  
  const isFinalStatus = watchedStatus === 'Cancelado' || watchedStatus === 'Entregado';
  
  const handleStatusChange = (newStatus: ServiceFormValues['status']) => {
    if (newStatus === 'En Taller' && !watch('receptionDateTime')) {
      setValue('receptionDateTime', new Date());
    } else if (newStatus !== 'Agendado') {
      setValue('appointmentDateTime', null);
    }
    setValue('status', newStatus, { shouldValidate: true });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
            <CardTitle className="text-lg">Detalles del Servicio</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          <FormField
            control={control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={cn(errors.status && "text-destructive")}>Estado</FormLabel>
                <Select
                  onValueChange={(value) => handleStatusChange(value as ServiceFormValues['status'])}
                  value={field.value || 'Cotizacion'}
                  disabled={isFinalStatus}
                >
                  <FormControl>
                    <SelectTrigger className={cn("font-bold", errors.status && "border-destructive focus-visible:ring-destructive")}>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>{statusOptions.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </FormItem>
            )}
          />

          {/* ... (resto de los campos del formulario se mantienen igual) */}
        </div>
        {/* ... (resto del JSX de la tarjeta se mantiene igual) */}
      </CardContent>
    </Card>
  );
}
