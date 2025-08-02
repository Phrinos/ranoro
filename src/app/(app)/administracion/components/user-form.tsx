
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
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

const userFormSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres."),
  email: z.string().email("Ingrese un correo electrónico válido."),
  phone: z.string().optional(),
  role: z.string({ required_error: "Seleccione un rol." }).min(1, "Debe seleccionar un rol."),
  monthlySalary: z.coerce.number().optional(),
  commissionRate: z.coerce.number().optional(),
});

export type UserFormValues = z.infer<typeof userFormSchema>;

interface UserFormProps {
  id?: string;
  initialData?: User | null;
  roles: AppRole[];
  onSubmit: (values: UserFormValues) => Promise<void>;
}

export function UserForm({ id, initialData, roles, onSubmit }: UserFormProps) {
  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: initialData ? {
        name: initialData.name,
        email: initialData.email,
        phone: initialData.phone || '',
        role: initialData.role || '',
        monthlySalary: initialData.monthlySalary || 0,
        commissionRate: initialData.commissionRate || 0,
    } : {
      name: "",
      email: "",
      phone: "",
      role: "",
      monthlySalary: 0,
      commissionRate: 0,
    },
  });

  return (
    <Form {...form}>
      <form id={id} onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4 pb-4">
        <FormField control={form.control} name="name" render={({ field }) => (
          <FormItem><FormLabel>Nombre Completo</FormLabel><FormControl><Input placeholder="Ej: Juan Pérez" {...field} value={field.value ?? ''} onChange={(e) => field.onChange(capitalizeWords(e.target.value))} /></FormControl><FormMessage /></FormItem>
        )}/>
        <FormField control={form.control} name="email" render={({ field }) => (
          <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" placeholder="usuario@ranoro.mx" {...field} value={field.value ?? ''} disabled={!!initialData} /></FormControl><FormDescription>El email se usa para iniciar sesión y no se puede cambiar.</FormDescription><FormMessage /></FormItem>
        )}/>
        <FormField control={form.control} name="phone" render={({ field }) => (
          <FormItem><FormLabel>Teléfono (Opcional)</FormLabel><FormControl><Input type="tel" placeholder="4491234567" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
        )}/>
        <FormField control={form.control} name="role" render={({ field }) => (
          <FormItem><FormLabel>Rol del Usuario</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Seleccione un rol" /></SelectTrigger></FormControl><SelectContent>{roles.map(r => (<SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>
        )}/>
        <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="monthlySalary" render={({ field }) => (
                <FormItem><FormLabel>Sueldo Base Mensual</FormLabel><FormControl><Input type="number" placeholder="0.00" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="commissionRate" render={({ field }) => (
                <FormItem><FormLabel>Comisión (%)</FormLabel><FormControl><Input type="number" placeholder="Ej: 5 para 5%" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
            )}/>
        </div>
      </form>
    </Form>
  );
}
