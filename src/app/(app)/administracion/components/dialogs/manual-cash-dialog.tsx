// src/app/(app)/administracion/components/dialogs/manual-cash-dialog.tsx
"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebaseClient";
import { AUTH_USER_LOCALSTORAGE_KEY } from "@/lib/placeholder-data";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

const PAYMENT_METHODS = ["Efectivo", "Tarjeta", "Transferencia"] as const;

const CONCEPTS_INCOME = [
  "Venta ocasional",
  "Adelanto de cliente",
  "Préstamo recibido",
  "Reembolso",
  "Otro ingreso",
];
const CONCEPTS_EXPENSE = [
  "Gasto operativo",
  "Pago de nómina",
  "Servicio básico",
  "Material o herramienta",
  "Préstamo pagado",
  "Otro gasto",
];

const schema = z.object({
  type: z.enum(["Entrada", "Salida"]),
  amount: z.coerce.number().positive("El monto debe ser mayor a $0"),
  concept: z.string().min(1, "Selecciona un concepto"),
  paymentMethod: z.enum(["Efectivo", "Tarjeta", "Transferencia"]),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  defaultType?: "Entrada" | "Salida";
  onOpenChange: (open: boolean) => void;
}

export function ManualCashDialog({ open, defaultType = "Entrada", onOpenChange }: Props) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      type: defaultType,
      amount: undefined as any,
      concept: "",
      paymentMethod: "Efectivo",
      notes: "",
    },
  });

  const watchedType = form.watch("type");
  const isIncome = watchedType === "Entrada";
  const concepts = isIncome ? CONCEPTS_INCOME : CONCEPTS_EXPENSE;

  // Reset concept when type changes
  React.useEffect(() => {
    form.setValue("concept", "");
  }, [watchedType, form]);

  // Reset form when dialog opens
  React.useEffect(() => {
    if (open) {
      form.reset({
        type: defaultType,
        amount: undefined as any,
        concept: "",
        paymentMethod: "Efectivo",
        notes: "",
      });
    }
  }, [open, defaultType, form]);

  const handleSubmit = async (data: FormValues) => {
    setIsSaving(true);
    try {
      const userStr = typeof window !== "undefined" ? localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY) : null;
      const user = userStr ? JSON.parse(userStr) : null;

      await addDoc(collection(db, "cashDrawerTransactions"), {
        type: data.type,
        amount: data.amount,
        concept: data.concept,
        paymentMethod: data.paymentMethod,
        notes: data.notes ?? "",
        date: new Date().toISOString(),
        createdAt: serverTimestamp(),
        userId: user?.id ?? "system",
        userName: user?.name ?? "Sistema",
        // No relatedType → no se confunde con flotilla ni compras
        relatedType: "Manual",
        relatedId: null,
        source: "taller",
      });

      toast({
        title: data.type === "Entrada" ? "✅ Ingreso registrado" : "✅ Salida registrada",
        description: `${data.concept} — $${data.amount.toFixed(2)}`,
      });
      onOpenChange(false);
    } catch (e) {
      console.error(e);
      toast({ title: "Error al registrar movimiento", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-0 overflow-hidden">
        {/* Colored header */}
        <div className={cn(
          "px-6 py-5 flex items-center gap-3",
          isIncome ? "bg-emerald-600" : "bg-red-600"
        )}>
          <div className="p-2 bg-white/20 rounded-xl">
            {isIncome
              ? <TrendingUp className="h-5 w-5 text-white" />
              : <TrendingDown className="h-5 w-5 text-white" />}
          </div>
          <div>
            <DialogTitle className="text-white font-black text-base">
              {isIncome ? "Registrar Ingreso" : "Registrar Salida"}
            </DialogTitle>
            <DialogDescription className="text-white/70 text-xs mt-0.5">
              Taller · Movimiento manual de caja
            </DialogDescription>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="px-6 py-4 space-y-4">

            {/* Tipo */}
            <FormField control={form.control} name="type" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Tipo
                </FormLabel>
                <div className="grid grid-cols-2 gap-2">
                  {(["Entrada", "Salida"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => field.onChange(t)}
                      className={cn(
                        "py-2 rounded-lg text-sm font-bold border-2 transition-all",
                        field.value === t && t === "Entrada" && "border-emerald-500 bg-emerald-50 text-emerald-700",
                        field.value === t && t === "Salida"  && "border-red-500 bg-red-50 text-red-700",
                        field.value !== t && "border-muted text-muted-foreground hover:border-foreground/20"
                      )}
                    >
                      {t === "Entrada" ? "↑ Ingreso" : "↓ Salida"}
                    </button>
                  ))}
                </div>
              </FormItem>
            )} />

            {/* Monto */}
            <FormField control={form.control} name="amount" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Monto *
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-muted-foreground text-sm">$</span>
                    <Input
                      type="number" min="0.01" step="0.01"
                      placeholder="0.00"
                      className="pl-7"
                      {...field}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* Concepto */}
            <FormField control={form.control} name="concept" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Concepto *
                </FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="Seleccionar…" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {concepts.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            {/* Método de pago */}
            <FormField control={form.control} name="paymentMethod" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Método de Pago *
                </FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FormItem>
            )} />

            {/* Notas */}
            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Notas (opcional)
                </FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="Descripción adicional…"
                    rows={2}
                    className="resize-none text-sm"
                  />
                </FormControl>
              </FormItem>
            )} />

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className={cn(isIncome ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700")}
              >
                {isSaving ? "Guardando…" : isIncome ? "Registrar Ingreso" : "Registrar Salida"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
