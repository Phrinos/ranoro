
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { es } from 'date-fns/locale';
import { parseDate } from "@/lib/forms";
import { useState } from "react";


const userFormSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres."),
  email: z.string().email("Ingrese un correo electrónico válido."),
  phone: z.string().optional(),
  role: z.string({ required_error: "Seleccione un rol." }).min(1, "Debe seleccionar un rol."),
  monthlySalary: z.coerce.number().optional(),
  commissionRate: z.coerce.number().optional(),
  hireDate: z.date().optional(),
});

export type UserFormValues = z.infer<typeof userFormSchema>;

interface UserFormProps {
  id?: string;
  initialData?: User | null;
  roles: AppRole[];
  onSubmit: (values: UserFormValues) => Promise<void>;
}

export function UserForm({ id, initialData, roles, onSubmit }: UserFormProps) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: initialData ? {
        name: initialData.name,
        email: initialData.email,
        phone: initialData.phone || '',
        role: initialData.role || '',
        monthlySalary: initialData.monthlySalary || 0,
        commissionRate: initialData.commissionRate || 0,
        hireDate: initialData.hireDate ? parseDate(initialData.hireDate) : undefined,
    } : {
      name: "",
      email: "",
      phone: "",
      role: "",
      monthlySalary: 0,
      commissionRate: 0,
      hireDate: new Date(),
    },
  });

  return (
    <Form {...form}>
      <form id={id} onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4 pb-4">
        <FormField control={form.control} name="name" render={({ field }) => (
          <FormItem><FormLabel>Nombre Completo</FormLabel><FormControl><Input placeholder="Ej: Juan Pérez" {...field} value={field.value ?? ''} onChange={(e) => field.onChange(capitalizeWords(e.target.value))} className="text-white" /></FormControl><FormMessage /></FormItem>
        )}/>
        <FormField control={form.control} name="email" render={({ field }) => (
          <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" placeholder="usuario@ranoro.mx" {...field} value={field.value ?? ''} disabled={!!initialData} className="text-white" /></FormControl><FormDescription>El email se usa para iniciar sesión y no se puede cambiar.</FormDescription><FormMessage /></FormItem>
        )}/>
        <FormField control={form.control} name="phone" render={({ field }) => (
          <FormItem><FormLabel>Teléfono (Opcional)</FormLabel><FormControl><Input type="tel" placeholder="4491234567" {...field} value={field.value ?? ''} className="text-white" /></FormControl><FormMessage /></FormItem>
        )}/>
        <FormField control={form.control} name="role" render={({ field }) => (
          <FormItem><FormLabel>Rol del Usuario</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="text-white"><SelectValue placeholder="Seleccione un rol" /></SelectTrigger></FormControl><SelectContent>{roles.map(r => (<SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>
        )}/>
         <FormField
          control={form.control}
          name="hireDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Fecha de Contratación</FormLabel>
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-left font-normal text-white",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        format(field.value, "PPP", { locale: es })
                      ) : (
                        <span>Seleccione una fecha</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={(date) => {
                      field.onChange(date);
                      setIsCalendarOpen(false);
                    }}
                    disabled={(date) =>
                      date > new Date() || date < new Date("1980-01-01")
                    }
                    initialFocus
                    locale={es}
                    captionLayout="dropdown-buttons"
                    fromYear={1980}
                    toYear={new Date().getFullYear()}
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="monthlySalary" render={({ field }) => (
                <FormItem><FormLabel>Sueldo Base Mensual</FormLabel><FormControl><Input type="number" placeholder="0.00" {...field} value={field.value ?? ''} className="text-white" /></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="commissionRate" render={({ field }) => (
                <FormItem><FormLabel>% Comisión</FormLabel><FormControl><Input type="number" placeholder="Ej: 5 para 5%" {...field} value={field.value ?? ''} className="text-white" /></FormControl><FormMessage /></FormItem>
            )}/>
        </div>
      </form>
    </Form>
  );
}
