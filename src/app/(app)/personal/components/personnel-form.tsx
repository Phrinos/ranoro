
"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Personnel, AppRole } from "@/types";
import { DollarSign } from "lucide-react";
import { capitalizeWords } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";

const personnelFormSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres."),
  roles: z.array(z.string()).min(1, "Debe seleccionar al menos un rol."),
  contactInfo: z.string().min(7, "El teléfono debe tener al menos 7 caracteres.").optional().or(z.literal('')),
  hireDate: z.string().optional(),
  monthlySalary: z.coerce.number().min(0, "El sueldo no puede ser negativo.").optional(),
  commissionRate: z.coerce.number().min(0, "La comisión no puede ser negativa.").max(1, "La comisión no puede ser mayor a 1 (100%).").optional(),
  standardHoursPerDay: z.coerce.number().min(1, "Debe ser al menos 1 hora.").max(16, "No puede ser más de 16 horas.").optional(),
  specialty: z.string().optional(),
  notes: z.string().optional(),
});

export type PersonnelFormValues = z.infer<typeof personnelFormSchema>;

interface PersonnelFormProps {
  id: string;
  initialData?: Personnel | null;
  onSubmit: (values: PersonnelFormValues) => void;
  appRoles: AppRole[];
}

export function PersonnelForm({ id, initialData, onSubmit, appRoles }: PersonnelFormProps) {
  const form = useForm<PersonnelFormValues>({
    resolver: zodResolver(personnelFormSchema),
    defaultValues: initialData ? {
        ...initialData,
        hireDate: initialData.hireDate ? new Date(initialData.hireDate).toISOString().split('T')[0] : '',
        monthlySalary: initialData.monthlySalary ?? undefined,
        commissionRate: initialData.commissionRate ?? undefined,
        standardHoursPerDay: initialData.standardHoursPerDay ?? 8,
    } : {
      name: "",
      roles: [],
      hireDate: new Date().toISOString().split('T')[0],
      monthlySalary: undefined,
      commissionRate: 0.05,
      standardHoursPerDay: 8,
    },
  });

  const handleFormSubmit = async (values: PersonnelFormValues) => {
    onSubmit(values);
  };

  return (
    <Form {...form}>
      <form id={id} onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem><FormLabel>Nombre Completo</FormLabel><FormControl><Input placeholder="Ej: Carlos Rodríguez" {...field} /></FormControl><FormMessage /></FormItem>
          )}
        />
        <FormField
            control={form.control}
            name="roles"
            render={() => (
                <FormItem>
                    <FormLabel>Roles Asignados</FormLabel>
                    <div className="space-y-2 rounded-md border p-4">
                        {appRoles.map((role) => (
                        <FormField
                            key={role.id}
                            control={form.control}
                            name="roles"
                            render={({ field }) => {
                            return (
                                <FormItem key={role.id} className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                    <Checkbox
                                        checked={field.value?.includes(role.name)}
                                        onCheckedChange={(checked) => {
                                            return checked
                                            ? field.onChange([...field.value, role.name])
                                            : field.onChange(field.value?.filter((value) => value !== role.name))
                                        }}
                                    />
                                </FormControl>
                                <FormLabel className="font-normal">{role.name}</FormLabel>
                                </FormItem>
                            )
                            }}
                        />
                        ))}
                    </div>
                    <FormMessage />
                </FormItem>
            )}
        />
        <FormField
          control={form.control}
          name="contactInfo"
          render={({ field }) => (
            <FormItem><FormLabel>Teléfono</FormLabel><FormControl><Input placeholder="Ej: 555-123456" {...field} /></FormControl><FormMessage /></FormItem>
          )}
        />
        <FormField
            control={form.control}
            name="monthlySalary"
            render={({ field }) => (
            <FormItem><FormLabel>Sueldo Mensual Base</FormLabel>
                <FormControl><div className="relative"><DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="number" step="0.01" placeholder="8000.00" {...field} value={field.value ?? ''} className="pl-8" /></div></FormControl><FormMessage />
            </FormItem>
            )}
        />
        <FormField
            control={form.control}
            name="commissionRate"
            render={({ field }) => (
            <FormItem><FormLabel>Tasa de Comisión</FormLabel>
                <FormControl><Input type="number" step="0.01" min="0" max="1" placeholder="0.05 (para 5%)" {...field} value={field.value ?? ''} /></FormControl>
                <FormDescription>Sobre la ganancia neta del taller.</FormDescription><FormMessage />
            </FormItem>
            )}
        />
      </form>
    </Form>
  );
}
