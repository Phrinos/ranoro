// src/app/(app)/personal/components/user-form.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller, type Resolver } from "react-hook-form";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { User, AppRole } from "@/types";
import { capitalizeWords } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { es } from 'date-fns/locale';
import { parseDate } from "@/lib/forms";
import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { userFormSchema, type UserFormValues } from '@/schemas/user-form-schema';
import { NewCalendar } from "@/components/ui/calendar";
import type { CalendarProps } from "react-calendar";

interface UserFormProps {
  id?: string;
  initialData?: User | null;
  roles: AppRole[];
  onSubmit: (values: UserFormValues) => Promise<void>;
}

const OPERATIVE_FUNCTIONS = [
    { id: 'asesor', label: 'Asesor de Servicio' },
    { id: 'tecnico', label: 'Técnico Mecánico' },
]

export function UserForm({ id, initialData, roles, onSubmit }: UserFormProps) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: initialData ? {
        name: initialData.name,
        email: initialData.email,
        phone: initialData.phone || '',
        role: initialData.role || '',
        functions: initialData.functions || [],
        monthlySalary: initialData.monthlySalary || 0,
        commissionRate: initialData.commissionRate || 0,
        hireDate: initialData.hireDate ? parseDate(initialData.hireDate) : undefined,
        isArchived: initialData.isArchived ?? false,
    } : {
      name: "",
      email: "",
      phone: "",
      role: "",
      functions: [],
      monthlySalary: 0,
      commissionRate: 0,
      hireDate: new Date(),
      isArchived: false,
    },
  });

  return (
    <Form {...form}>
      <form id={id} onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-6 pt-4 pb-4">
        <FormField control={form.control as any} name="name" render={({ field }) => (
          <FormItem><FormLabel>Nombre Completo</FormLabel><FormControl><Input placeholder="Ej: Juan Pérez" {...field} value={field.value ?? ''} onChange={(e) => field.onChange(capitalizeWords(e.target.value))} className="bg-card text-foreground" /></FormControl><FormMessage /></FormItem>
        )}/>
        <FormField control={form.control as any} name="email" render={({ field }) => (
          <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" placeholder="usuario@ranoro.mx" {...field} value={field.value ?? ''} disabled={!!initialData} className="bg-card text-foreground" /></FormControl><FormDescription>El email se usa para iniciar sesión y no se puede cambiar.</FormDescription><FormMessage /></FormItem>
        )}/>
        <FormField control={form.control as any} name="phone" render={({ field }) => (
          <FormItem><FormLabel>Teléfono (Opcional)</FormLabel><FormControl><Input type="tel" placeholder="4491234567" {...field} value={field.value ?? ''} className="bg-card text-foreground" /></FormControl><FormMessage /></FormItem>
        )}/>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control as any} name="role" render={({ field }) => (
              <FormItem><FormLabel>Rol de Permisos</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="bg-card text-foreground"><SelectValue placeholder="Seleccione un rol" /></SelectTrigger></FormControl><SelectContent>{roles.map(r => (<SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>
            )}/>
             <FormField
              control={form.control}
              name="functions"
              render={() => (
                <FormItem>
                    <FormLabel>Funciones Operativas</FormLabel>
                    <div className="flex flex-col space-y-2 pt-2">
                        {OPERATIVE_FUNCTIONS.map((item) => (
                            <FormField
                                key={item.id}
                                control={form.control as any}
                                name="functions"
                                render={({ field }) => {
                                    return (
                                        <FormItem key={item.id} className="flex flex-row items-start space-x-3 space-y-0">
                                            <FormControl>
                                                <Checkbox
                                                    checked={Array.isArray(field.value) && field.value.includes(item.id)}
                                                    onCheckedChange={(checked) => {
                                                      const curr = Array.isArray(field.value) ? field.value as string[] : [];
                                                      field.onChange(checked ? [...curr, item.id] : curr.filter(v => v !== item.id));
                                                    }}
                                                />
                                            </FormControl>
                                            <FormLabel className="font-normal">{item.label}</FormLabel>
                                        </FormItem>
                                    )
                                }}
                            />
                        ))}
                    </div>
                </FormItem>
              )}
            />
        </div>
         <FormField
          control={form.control as any}
          name="hireDate"
          render={({ field }) => {
            const valueAsDate = field.value instanceof Date ? field.value : field.value ? new Date(field.value as any) : null;
            const onCalendarChange: CalendarProps['onChange'] = (value, event) => {
                const picked = Array.isArray(value) ? (value[0] as Date | null) : (value as Date | null);
                field.onChange(picked ?? null);
                setIsCalendarOpen(false);
            };
            return (
              <FormItem className="flex flex-col">
                <FormLabel>Fecha de Contratación</FormLabel>
                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal bg-card text-foreground",
                          !valueAsDate && "text-muted-foreground"
                        )}
                      >
                        {valueAsDate ? format(valueAsDate, "PPP", { locale: es }) : <span>Seleccione una fecha</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <NewCalendar
                      onChange={onCalendarChange}
                      value={valueAsDate as any}
                      locale="es-MX"
                      maxDate={new Date()}
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            );
          }}
        />
        <div className="grid grid-cols-2 gap-4">
            <FormField
                control={form.control}
                name="monthlySalary"
                render={({ field }) => (
                <FormItem><FormLabel>Sueldo Base Mensual</FormLabel><FormControl>
                    <Input
                        type="number"
                        value={typeof field.value === 'number' || typeof field.value === 'string' ? field.value : ''}
                        onChange={(e) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                        className="bg-card text-foreground"
                        placeholder="0.00"
                    />
                </FormControl><FormMessage /></FormItem>
            )}/>
            <FormField
                control={form.control}
                name="commissionRate"
                render={({ field }) => (
                <FormItem><FormLabel>% Comisión</FormLabel><FormControl>
                    <Input
                        type="number"
                        value={typeof field.value === 'number' || typeof field.value === 'string' ? field.value : ''}
                        onChange={(e) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                        className="bg-card text-foreground"
                        placeholder="Ej: 5 para 5%"
                    />
                </FormControl><FormMessage /></FormItem>
            )}/>
        </div>
      </form>
    </Form>
  );
}
