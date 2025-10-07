// src/app/(app)/finanzas/components/fixed-expense-form.tsx

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
import { Textarea } from "@/components/ui/textarea";
import type { MonthlyFixedExpense } from "@/types";
import { DollarSign } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const expenseCategories = ["Renta", "Servicios", "Otros"] as const;

// Preprocesa el monto: '' -> undefined (obliga a capturar un número), string/number -> Number
const fixedExpenseFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "El nombre del gasto debe tener al menos 2 caracteres."),
  amount: z.preprocess(
    (v) => {
      if (v === "" || v === null || typeof v === "undefined") return undefined;
      return typeof v === "string" ? Number(v) : v;
    },
    z
      .number({
        required_error: "El monto es requerido.",
        invalid_type_error: "Captura un número válido.",
      })
      .positive("El monto debe ser mayor a 0.")
  ),
  category: z.enum(expenseCategories, {
    required_error: "Debe seleccionar una categoría.",
  }),
  notes: z.string().optional(),
});

export type FixedExpenseFormValues = z.infer<typeof fixedExpenseFormSchema>;

interface FixedExpenseFormProps {
  initialData?: MonthlyFixedExpense | null;
  onSubmit: (values: FixedExpenseFormValues) => void; // sincrónico
  onClose: () => void;
}

export function FixedExpenseForm({
  initialData,
  onSubmit,
  onClose,
}: FixedExpenseFormProps) {
  const form = useForm<FixedExpenseFormValues>({
    resolver: zodResolver(fixedExpenseFormSchema),
    defaultValues: initialData
      ? {
          name: initialData.name ?? "",
          amount:
            typeof initialData.amount === "number"
              ? initialData.amount
              : (initialData as any).amount
              ? Number((initialData as any).amount)
              : undefined,
          category: ((): (typeof expenseCategories)[number] => {
            const cat = (initialData as any)?.category;
            return expenseCategories.includes(cat) ? cat : "Otros";
          })(),
          notes: initialData.notes ?? "",
        }
      : {
          name: "",
          amount: undefined,
          category: "Otros",
          notes: "",
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
                <Input
                  placeholder="Ej: Renta del Local"
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Categoría</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione una categoría" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {expenseCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    placeholder="15000.00"
                    // Permitimos string vacío mientras escribe; el schema valida al enviar
                    value={field.value === undefined || field.value === null ? "" : String(field.value)}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "") {
                        field.onChange(""); // deja limpiar sin poner 0
                      } else {
                        field.onChange(val); // se convierte en número en el schema
                      }
                    }}
                    className="pl-8"
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notas (Opcional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Detalles adicionales (ej: contrato #123, CFE, mantenimiento, etc.)"
                  {...field}
                  value={field.value ?? ""}
                />
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
