
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { DollarSign } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

const debtFormSchema = z.object({
  amount: z.coerce.number().min(0.01, "El monto debe ser mayor a 0."),
  note: z.string().min(3, "La nota o concepto es obligatorio."),
});

export type DebtFormValues = z.infer<typeof debtFormSchema>;

interface DebtFormProps {
  onSubmit: (values: DebtFormValues) => Promise<void>;
  onClose: () => void;
  initialData?: Partial<DebtFormValues>;
}

export function DebtForm({ onSubmit, onClose, initialData }: DebtFormProps) {
  const form = useForm<DebtFormValues>({
    resolver: zodResolver(debtFormSchema),
    defaultValues: initialData || {
      amount: undefined,
      note: "",
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Monto del Adeudo</FormLabel>
              <FormControl>
                  <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input type="number" step="0.01" placeholder="Ej: 550.00" {...field} value={field.value ?? ''} className="pl-8" />
                  </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="note"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Concepto / Nota</FormLabel>
              <FormControl>
                <Textarea placeholder="Ej: Multa de tránsito, reparación de llanta, etc." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Guardando..." : "Registrar Adeudo"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
