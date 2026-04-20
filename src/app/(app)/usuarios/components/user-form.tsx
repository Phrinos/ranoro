// src/app/(app)/usuarios/components/user-form.tsx
"use client";

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { userFormSchema, type UserFormValues } from '@/schemas/user-form-schema';
import type { User, AppRole } from '@/types';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { Switch } from '@/components/ui/switch';

interface UserFormProps {
  id?: string;
  initialData?: User | null;
  roles: AppRole[];
  onSubmit: (values: UserFormValues) => Promise<void>;
}

export function UserForm({ id, initialData, roles, onSubmit }: UserFormProps) {
  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema) as any,
    defaultValues: {
      name: initialData?.name ?? '',
      email: initialData?.email ?? '',
      password: '',
      phone: initialData?.phone ?? '',
      role: initialData?.role ?? '',
      functions: initialData?.functions ?? [],
      monthlySalary: initialData?.monthlySalary ?? undefined,
      commissionRate: initialData?.commissionRate ?? undefined,
      hireDate: initialData?.hireDate ? new Date(initialData.hireDate) : undefined,
      isArchived: initialData?.isArchived ?? false,
      signatureDataUrl: initialData?.signatureDataUrl ?? undefined,
    },
  });

  return (
    <Form {...form}>
      <form id={id} onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre completo</FormLabel>
                <FormControl><Input {...field} placeholder="Ej: Juan García" /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Correo electrónico</FormLabel>
                <FormControl><Input {...field} type="email" placeholder="correo@empresa.com" /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contraseña {initialData ? '(opcional)' : '*'}</FormLabel>
                <FormControl><Input {...field} type="password" placeholder={initialData ? 'Dejar en blanco para no cambiar' : 'Mínimo 6 caracteres'} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Teléfono</FormLabel>
                <FormControl><Input {...field} placeholder="Ej: 614123456" /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Rol</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="Seleccionar rol..." /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {roles.map(r => (
                      <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="hireDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha de ingreso</FormLabel>
                <FormControl>
                  <DatePicker
                    date={field.value}
                    onDateChange={field.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="monthlySalary"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sueldo mensual base ($)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    {...field}
                    value={field.value ?? ''}
                    onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="commissionRate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>% de Comisión</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    placeholder="0"
                    {...field}
                    value={field.value ?? ''}
                    onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                  />
                </FormControl>
                <FormDescription>Porcentaje sobre el ingreso generado.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {initialData && (
          <FormField
            control={form.control}
            name="isArchived"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <FormLabel className="text-base">Usuario archivado</FormLabel>
                  <FormDescription>Los usuarios archivados no pueden iniciar sesión.</FormDescription>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />
        )}
      </form>
    </Form>
  );
}
