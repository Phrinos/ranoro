
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { MonthlyFixedExpense } from "@/types";

const fixedExpenseFormSchema = z.object({
  name: z.string().min(2, "El nombre del gasto debe tener al menos 2 caracteres."),
  amount: z.coerce.number().min(0, "El monto no puede ser negativo."),
});

export type FixedExpenseFormValues = z.infer<typeof fixedExpenseFormSchema>;

interface FixedExpenseFormProps {
  initialData?: MonthlyFixedExpense | null;
  onSubmit: (values: FixedExpenseFormValues) => void; // Changed to synchronous
  onClose: () => void;
}

export function FixedExpenseForm({ initialData, onSubmit, onClose }: FixedExpenseFormProps) {
  const form = useForm<FixedExpenseFormValues>({
    resolver: zodResolver(fixedExpenseFormSchema),
    defaultValues: initialData || {
      name: "",
      amount: 0,
    },
  });

  const handleFormSubmit = (values: FixedExpenseFormValues) => {
    onSubmit(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre del Gasto</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Renta del Local" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Monto Mensual</FormLabel>
              <FormControl>
                <Input type="number" step="0.01" placeholder="Ej: 15000.00" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">
            {initialData ? "Actualizar Gasto" : "Crear Gasto"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
