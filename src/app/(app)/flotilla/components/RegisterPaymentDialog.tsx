
"use client";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { RentalPayment } from "@/types";

import ReactCalendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

const paymentSchema = z.object({
  paymentDate: z.date({ required_error: "La fecha es obligatoria." }),
  amount: z.coerce.number().min(0.01, "El monto debe ser positivo."),
  note: z.string().optional(),
  paymentMethod: z.string().optional(),
});

export type PaymentFormValues = z.infer<typeof paymentSchema>;

interface RegisterPaymentDialogProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (values: PaymentFormValues) => Promise<void>;
  paymentToEdit?: RentalPayment | null;
}

const toMidday = (d: Date) => {
  const n = new Date(d);
  n.setHours(12, 0, 0, 0);
  return n;
};

export function RegisterPaymentDialog({
  open,
  onOpenChange,
  onSave,
  paymentToEdit = null,
}: RegisterPaymentDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      paymentDate: toMidday(new Date()),
      amount: undefined,
      note: "Abono de Renta",
      paymentMethod: "Efectivo",
    },
  });

  const selectedPaymentDate = form.watch("paymentDate");

  useEffect(() => {
    if (!open) return;
    if (paymentToEdit) {
      const base = toMidday(new Date(paymentToEdit.paymentDate));
      form.reset({
        paymentDate: base,
        amount: paymentToEdit.amount,
        note: paymentToEdit.note ?? "Abono de Renta",
        paymentMethod: paymentToEdit.paymentMethod ?? "Efectivo",
      });
    } else {
      form.reset({
        paymentDate: toMidday(new Date()),
        amount: undefined,
        note: "Abono de Renta",
        paymentMethod: "Efectivo",
      });
    }
  }, [open, paymentToEdit, form]);

  const handleFormSubmit = async (values: PaymentFormValues) => {
    setIsSubmitting(true);
    await onSave(values);
    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle>{paymentToEdit ? "Editar Pago" : "Registrar Pago"}</DialogTitle>
          <DialogDescription>
            {paymentToEdit
              ? "Actualiza los detalles del pago."
              : "Registra un nuevo abono a la cuenta del conductor."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 p-6 pt-0">
            {/* Fecha */}
            <FormField
              control={form.control}
              name="paymentDate"
              render={() => (
                <FormItem className="flex flex-col gap-2">
                  <FormLabel>Fecha del Pago</FormLabel>
                  <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <div
                          className="relative w-full cursor-pointer"
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") setIsCalendarOpen((o) => !o);
                          }}
                        >
                          <Input
                            readOnly
                            className="bg-white pr-10"
                            value={
                              selectedPaymentDate
                                ? format(selectedPaymentDate, "d 'de' MMMM 'de' yyyy", { locale: es })
                                : ""
                            }
                            placeholder="Seleccionar fecha"
                          />
                          <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-60" />
                        </div>
                      </FormControl>
                    </PopoverTrigger>

                    <PopoverContent
                      className="p-0 w-auto"
                      align="start"
                      sideOffset={8}
                    >
                        <ReactCalendar
                          value={selectedPaymentDate ?? new Date()}
                          onChange={(val) => {
                            const d = Array.isArray(val) ? val[0] : val;
                            if (!d) return;
                            form.setValue("paymentDate", toMidday(d), {
                              shouldDirty: true,
                              shouldTouch: true,
                              shouldValidate: true,
                            });
                            setIsCalendarOpen(false);
                          }}
                          locale="es-MX"
                          calendarType="iso8601"
                          selectRange={false}
                          minDetail="month"
                          maxDetail="month"
                          className="react-calendar styled"
                        />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Método de Pago */}
            <FormField
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Método de Pago</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Selecciona un método" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Efectivo">Efectivo</SelectItem>
                      <SelectItem value="Transferencia">Transferencia</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Monto */}
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monto del Pago ($)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      inputMode="decimal"
                      {...field}
                      className="bg-white"
                      placeholder="0.00"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Descripción */}
            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Textarea {...field} className="bg-white" placeholder="Abono de Renta" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {paymentToEdit ? "Actualizar Pago" : "Guardar Pago"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>

      {/* Estilos para react-calendar (mismo theme que arriba) */}
      <style jsx global>{`
        .react-calendar.styled {
          background: hsl(var(--background));
          border: 1px solid hsl(var(--border));
          border-radius: 0.75rem;
          padding: 0.5rem;
          font-size: 0.9rem;
        }
        .react-calendar.styled .react-calendar__navigation {
          margin-bottom: 0.25rem;
        }
        .react-calendar.styled .react-calendar__navigation button {
          border-radius: 0.5rem;
          padding: 0.35rem 0.5rem;
          color: hsl(var(--foreground));
        }
        .react-calendar.styled .react-calendar__navigation button:hover {
          background: hsl(var(--muted));
        }
        .react-calendar.styled .react-calendar__tile {
          border-radius: 0.5rem;
          padding: 0.4rem 0;
        }
        .react-calendar.styled .react-calendar__month-view__weekdays__weekday {
          padding: 0.4rem 0;
          color: hsl(var(--muted-foreground));
          abbr[title] {
            text-decoration: none;
          }
        }
        .react-calendar.styled .react-calendar__tile:enabled:hover {
          background: hsl(var(--muted));
        }
        .react-calendar.styled .react-calendar__tile--now {
          background: hsl(var(--muted) / 0.5);
        }
        .react-calendar.styled .react-calendar__tile--active,
        .react-calendar.styled .react-calendar__tile--hasActive {
          background: hsl(var(--primary));
          color: hsl(var(--primary-foreground));
        }
        .react-calendar.styled .react-calendar__tile--active:hover {
          filter: brightness(0.95);
        }
      `}</style>
    </Dialog>
  );
}
