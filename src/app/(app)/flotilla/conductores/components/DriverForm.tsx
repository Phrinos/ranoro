// src/app/(app)/flotilla/conductores/components/DriverForm.tsx
"use client";

import { useEffect } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { driverFormSchema, type DriverFormValues } from "@/schemas/driver-form-schema";
import type { Driver } from "@/types";

interface DriverFormProps {
  id: string;
  initialData?: Driver | null;
  onSubmit: (values: DriverFormValues) => void;
}

export function DriverForm({ id, initialData, onSubmit }: DriverFormProps) {
  const form = useForm<DriverFormValues>({
    resolver: zodResolver(driverFormSchema) as Resolver<DriverFormValues, any>,
    defaultValues: initialData || {
      name: "",
      phone: "",
      address: "",
    },
  });

  useEffect(() => {
    form.reset(initialData || { name: "", phone: "", address: "" });
  }, [initialData, form]);

  return (
    <Form {...form}>
      <form id={id} onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre Completo</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Nombre del conductor" />
              </FormControl>
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
              <FormControl>
                <Input {...field} placeholder="Número de teléfono" />
              </FormControl>
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
              <FormControl>
                <Textarea {...field} placeholder="Dirección del conductor" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}
