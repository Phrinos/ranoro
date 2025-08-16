
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Driver } from "@/types";
import { DollarSign, CalendarIcon } from "lucide-react";
import { capitalizeWords } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const driverFormSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres."),
  address: z.string().min(5, "La dirección es obligatoria."),
  phone: z.string().min(7, "Ingrese un número de teléfono válido."),
  emergencyPhone: z.string().min(7, "Ingrese un teléfono de emergencia válido."),
  requiredDepositAmount: z.coerce.number().min(0, "El depósito requerido no puede ser negativo.").optional(),
  depositAmount: z.coerce.number().min(0, "El depósito pagado no puede ser negativo.").optional(),
  contractDate: z.date({
    required_error: "La fecha del contrato es requerida.",
    invalid_type_error: "Por favor seleccione una fecha válida.",
  }).optional(),
});

export type DriverFormValues = z.infer<typeof driverFormSchema>;

interface DriverFormProps {
  id?: string;
  initialData?: Driver | null;
  onSubmit: (values: DriverFormValues) => Promise<void>;
}

export function DriverForm({ id, initialData, onSubmit }: DriverFormProps) {
  const form = useForm<DriverFormValues>({
    resolver: zodResolver(driverFormSchema),
    defaultValues: initialData ? {
        ...initialData,
        requiredDepositAmount: initialData.requiredDepositAmount ?? 3500, // Default to 3500 if not present
        depositAmount: initialData.depositAmount ?? undefined,
        contractDate: initialData.contractDate ? new Date(initialData.contractDate) : undefined,
    } : {
      name: "",
      address: "",
      phone: "",
      emergencyPhone: "",
      requiredDepositAmount: 3500,
      depositAmount: undefined,
      contractDate: new Date(),
    },
  });

  return (
    <Form {...form}>
      <form id={id} onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4 pb-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre Completo</FormLabel>
              <FormControl><Input placeholder="Ej: Juan Pérez" {...field} onChange={(e) => field.onChange(capitalizeWords(e.target.value))} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Dirección</FormLabel>
              <FormControl><Textarea placeholder="Calle, número, colonia, ciudad..." {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Teléfono</FormLabel>
                <FormControl><Input placeholder="Ej: 4491234567" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="emergencyPhone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Teléfono de Emergencia</FormLabel>
                <FormControl><Input placeholder="Ej: 4497654321" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
                control={form.control}
                name="requiredDepositAmount"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Depósito Total Requerido</FormLabel>
                    <FormControl>
                        <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input type="number" step="0.01" placeholder="Ej: 3500.00" {...field} value={field.value ?? ''} className="pl-8" />
                        </div>
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="depositAmount"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Depósito Pagado</FormLabel>
                    <FormControl>
                        <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input type="number" step="0.01" placeholder="Ej: 2500.00" {...field} value={field.value ?? ''} className="pl-8" />
                        </div>
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
         </div>
         <FormField
              control={form.control}
              name="contractDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Fecha del Contrato</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                          {field.value ? (format(field.value, "PPP", { locale: es })) : (<span>Seleccione fecha</span>)}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={field.value} onSelect={field.onChange} locale={es}/>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
      </form>
    </Form>
  );
}
