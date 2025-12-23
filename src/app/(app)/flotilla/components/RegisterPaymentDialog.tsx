// src/app/(app)/flotilla/components/RegisterPaymentDialog.tsx
"use client";

import React, { useEffect, useMemo } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarIcon } from "lucide-react";
import { format as formatDate } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { cn, CURRENCY_FORMATTER, getToday } from "@/lib/utils";

import { registerPaymentSchema, type RegisterPaymentFormValues } from "@/schemas/register-payment-schema";
import type { Infraction } from "@/types/infraction";

export type PaymentFormValues = RegisterPaymentFormValues;

type AnyPaymentLike = {
  id?: string;
  amount?: number;
  paymentMethod?: string;
  note?: string;
  paymentDate?: string | Date;
  date?: string | Date;
  infractionId?: string;
};

interface RegisterPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: RegisterPaymentFormValues) => Promise<void> | void;

  // si viene, habilita validación vs “restante”
  infraction?: Infraction;

  // edición (lo usa HistoryTabContent)
  paymentToEdit?: AnyPaymentLike | null;
}

const toDateSafe = (v: unknown): Date | undefined => {
  if (!v) return undefined;
  if (v instanceof Date) return v;
  const d = new Date(String(v));
  return Number.isFinite(d.getTime()) ? d : undefined;
};

const buildDefaults = (infraction?: Infraction, payment?: AnyPaymentLike | null): RegisterPaymentFormValues => {
  const paymentDate = toDateSafe(payment?.paymentDate ?? payment?.date) ?? getToday();

  return {
    id: payment?.id,
    paymentDate,
    amount:
      payment?.amount ??
      (infraction ? Math.max(infraction.totalAmount - infraction.paidAmount, 0) : 0),
    paymentMethod: (payment?.paymentMethod as any) ?? undefined,
    note: payment?.note ?? "",
    infractionId: infraction?.id ?? payment?.infractionId,
  };
};

export function RegisterPaymentDialog({
  open,
  onOpenChange,
  onSave,
  infraction,
  paymentToEdit,
}: RegisterPaymentDialogProps) {
  const resolver = zodResolver(registerPaymentSchema) as unknown as Resolver<RegisterPaymentFormValues>;

  const remainingAmount = useMemo(() => {
    if (!infraction) return 0;
    return Math.max(infraction.totalAmount - infraction.paidAmount, 0);
  }, [infraction]);

  const form = useForm<RegisterPaymentFormValues>({
    resolver,
    defaultValues: buildDefaults(infraction, paymentToEdit ?? null),
    mode: "onBlur",
  });

  const { handleSubmit, reset, formState, watch } = form;
  const amount = watch("amount");

  useEffect(() => {
    if (open) reset(buildDefaults(infraction, paymentToEdit ?? null));
  }, [open, reset, infraction, paymentToEdit]);

  const handleSave = async (data: RegisterPaymentFormValues) => {
    try {
      if (infraction && data.amount > remainingAmount) {
        toast.error("El monto a pagar no puede ser mayor al monto restante");
        return;
      }
      await onSave(data);
    } catch {
      toast.error("Error al registrar el pago");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{paymentToEdit ? "Editar pago" : "Registrar pago"}</DialogTitle>

          {infraction ? (
            <DialogDescription>
              Deuda total: {CURRENCY_FORMATTER.format(infraction.totalAmount)} | Deuda restante:{" "}
              {CURRENCY_FORMATTER.format(remainingAmount)}
            </DialogDescription>
          ) : (
            <DialogDescription>Completa los datos del pago.</DialogDescription>
          )}
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit(handleSave)} className="space-y-4">
            <FormField
              control={form.control}
              name="paymentDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Fecha</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          className={cn("justify-start text-left font-normal", !field.value && "text-muted-foreground")}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? formatDate(field.value, "PPP", { locale: es }) : "Selecciona una fecha"}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={(d: Date | undefined) => field.onChange(d ?? new Date())}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monto</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      className="bg-white"
                      value={Number.isFinite(field.value) ? field.value : ""}
                      onChange={(e) => field.onChange(e.target.value === "" ? "" : e.target.valueAsNumber)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Método de pago</FormLabel>
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Selecciona un método de pago" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Efectivo">Efectivo</SelectItem>
                      <SelectItem value="Tarjeta">Tarjeta</SelectItem>
                      <SelectItem value="Transferencia">Transferencia</SelectItem>
                      <SelectItem value="Crédito">Crédito</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nota</FormLabel>
                  <FormControl>
                    <Textarea className="bg-white" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <p className="text-sm text-muted-foreground">
                {infraction && amount > remainingAmount ? (
                  <span className="text-red-500">El monto a pagar es mayor al restante</span>
                ) : null}
              </p>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={formState.isSubmitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={formState.isSubmitting}>
                Guardar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
