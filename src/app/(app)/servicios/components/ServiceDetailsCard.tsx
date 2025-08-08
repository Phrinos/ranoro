// src/app/(app)/servicios/components/ServiceDetailsCard.tsx

"use client";

import { useFormContext, Controller } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CalendarIcon, Loader2 } from "lucide-react";
import type { ServiceFormValues } from "@/schemas/service-form";
import type { User, ServiceTypeRecord } from "@/types";
import { cn } from "@/lib/utils";
import { format, setHours, setMinutes, isValid, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { useState, useMemo } from 'react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

const statusOptions: { value: ServiceFormValues['status'], label: string }[] = [
    { value: 'Cotizacion', label: 'Cotización' },
    { value: 'Agendado', label: 'Agendado' },
    { value: 'En Taller', label: 'En Taller' },
    { value: 'Entregado', label: 'Entregado' },
    { value: 'Cancelado', label: 'Cancelado' },
];

const subStatusOptions: Record<string, { value: ServiceFormValues['subStatus'], label: string }[]> = {
    'Agendado': [
        { value: 'Cita Agendada', label: 'Cita Agendada' },
        { value: 'Cita Confirmada', label: 'Cita Confirmada' },
    ],
    'En Taller': [
        { value: 'Ingresado', label: 'Ingresado' },
        { value: 'En Espera de Refacciones', label: 'Espera Refacciones' },
        { value: 'Reparando', label: 'Reparando' },
        { value: 'Completado', label: 'Listo para Entrega' },
    ],
};

interface ServiceDetailsCardProps {
  isReadOnly?: boolean;
  users: User[];
  serviceTypes: ServiceTypeRecord[];
}

export function ServiceDetailsCard({
  isReadOnly,
  users,
  serviceTypes
}: ServiceDetailsCardProps) {
  const { control, watch, formState: { errors }, setValue } = useFormContext<ServiceFormValues>();
  
  const watchedStatus = watch('status');
  const watchedAdvisorName = watch('serviceAdvisorName');
  
  const isFinalStatus = watchedStatus === 'Cancelado' && !isReadOnly;
  
  const relevantSubStatusOptions = subStatusOptions[watchedStatus] || [];
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isQuoteDatePickerOpen, setIsQuoteDatePickerOpen] = useState(false);

  const technicians = useMemo(() => {
    return users.filter(u => u.role.toLowerCase().includes('tecnico') || u.role.toLowerCase().includes('admin'));
  }, [users]);

  const showAppointmentFields = useMemo(() => watchedStatus === 'Agendado', [watchedStatus]);
  const showTechnicianField = useMemo(() => watchedStatus === 'En Taller', [watchedStatus]);
  const showQuoteDateField = useMemo(() => watchedStatus === 'Cotizacion', [watchedStatus]);
  const showWorkshopFields = useMemo(() => watchedStatus === 'En Taller', [watchedStatus]);

  
  const handleStatusChange = (newStatus: ServiceFormValues['status']) => {
    setValue('status', newStatus);
    if (newStatus === 'Agendado') {
      const tomorrow = addDays(new Date(), 1);
      const defaultAppointmentTime = setMinutes(setHours(tomorrow, 8), 30);
      setValue('appointmentDateTime', defaultAppointmentTime, { shouldValidate: true });
    }
  };


  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
            <CardTitle className="text-lg">Detalles Generales</CardTitle>
            {watchedAdvisorName && <span className="text-sm text-muted-foreground">Asesor: {watchedAdvisorName}</span>}
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
                  value={field.value || ''}
                  disabled={isFinalStatus}
                >
                  <FormControl>
                    <SelectTrigger className={cn("font-bold", errors.status && "border-destructive focus-visible:ring-destructive")}>
                      <SelectValue placeholder="Seleccione un estado" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>{statusOptions.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </FormItem>
            )}
          />

          {showWorkshopFields && (
             <FormField
                control={control}
                name="subStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sub-Estado Taller</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ''} disabled={isReadOnly}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Seleccione..." /></SelectTrigger></FormControl>
                      <SelectContent>
                        {relevantSubStatusOptions.map(s => <SelectItem key={s.value} value={s.value!}>{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
          )}
        </div>
        
        {showTechnicianField && (
            <FormField
              control={control}
              name="technicianId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Técnico Asignado</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ''} disabled={isReadOnly}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Seleccione un técnico..." /></SelectTrigger></FormControl>
                    <SelectContent>
                      {technicians.filter((t) => !t.isArchived).map((technician) => (
                        <SelectItem key={technician.id} value={technician.id}>{technician.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
        )}
        
        {showQuoteDateField && (
          <div className="pt-4 border-t">
            <Controller
              name="serviceDate"
              control={control}
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel className={cn(errors.serviceDate && "text-destructive")}>Fecha de Cotización</FormLabel>
                  <Popover open={isQuoteDatePickerOpen} onOpenChange={setIsQuoteDatePickerOpen}>
                    <PopoverTrigger asChild disabled={isReadOnly}>
                      <Button variant="outline" className={cn("justify-start text-left font-normal", !field.value && "text-muted-foreground", errors.serviceDate && "border-destructive focus-visible:ring-destructive")} disabled={isReadOnly}>
                        {field.value ? format(field.value, "PPP", { locale: es }) : <span>Seleccione fecha</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={(date) => {
                           const newDate = date || new Date();
                           field.onChange(newDate);
                           setIsQuoteDatePickerOpen(false);
                        }}
                        disabled={isReadOnly}
                        initialFocus
                        locale={es}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        {showAppointmentFields && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t items-end">
            <Controller
              name="appointmentDateTime"
              control={control}
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel className={cn(errors.appointmentDateTime && "text-destructive")}>Fecha de Cita</FormLabel>
                  <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                    <PopoverTrigger asChild disabled={isReadOnly}>
                      <Button variant="outline" className={cn("justify-start text-left font-normal", !field.value && "text-muted-foreground", errors.appointmentDateTime && "border-destructive focus-visible:ring-destructive")} disabled={isReadOnly}>
                        {field.value ? format(field.value, "PPP", { locale: es }) : <span>Seleccione fecha</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={(date) => {
                          const currentTime = field.value || new Date();
                          const newDate = date ? setMinutes(setHours(date, currentTime.getHours()), currentTime.getMinutes()) : undefined;
                          field.onChange(newDate);
                          setIsDatePickerOpen(false);
                        }}
                        disabled={isReadOnly}
                        initialFocus
                        locale={es}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Controller
              name="appointmentDateTime"
              control={control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hora de la Cita</FormLabel>
                  <FormControl>
                    <Input
                      type="time"
                      value={field.value && isValid(field.value) ? format(field.value, 'HH:mm') : ""}
                      onChange={(e) => {
                        if (!e.target.value) {
                            field.onChange(null);
                            return;
                        };
                        const [h, m] = e.target.value.split(':').map(Number);
                        field.onChange(setMinutes(setHours(field.value || new Date(), h), m));
                      }}
                      disabled={isReadOnly}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
