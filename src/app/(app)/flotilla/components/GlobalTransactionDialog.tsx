"use client";

import React, { useEffect } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarIcon } from "lucide-react";
import { format as formatDate } from "date-fns";
import { es } from "date-fns/locale";

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
import { NewCalendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { cn } from "@/lib/utils";

import { globalTransactionSchema, type GlobalTransactionFormValues } from "@/schemas/global-transaction-schema";
import type { Driver } from "@/types";

interface GlobalTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  drivers: Driver[];
  onSave: (data: GlobalTransactionFormValues) => Promise<void> | void;
}

const buildDefaults = (): GlobalTransactionFormValues => ({
  driverId: "",
  date: new Date(),
  amount: 0,
  note: "",
  paymentMethod: undefined,
});

export function GlobalTransactionDialog({ open, onOpenChange, drivers, onSave }: GlobalTransactionDialogProps) {
  const resolver = zodResolver(globalTransactionSchema) as unknown as Resolver<GlobalTransactionFormValues>;

  const form = useForm<GlobalTransactionFormValues>({
    resolver,
    defaultValues: buildDefaults(),
    mode: "onBlur",
  });

  const { handleSubmit, reset, formState } = form;

  useEffect(() => {
    if (open) reset(buildDefaults());
  }, [open, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Registrar transacción</DialogTitle>
          <DialogDescription>Asigna la transacción a un chofer y guarda el movimiento.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit(async (data) => onSave(data))} className="space-y-4">
            <FormField
              control={form.control}
              name="driverId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Chofer</FormLabel>
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Selecciona un chofer" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {drivers.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
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
              name="date"
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
                      <NewCalendar mode="single" selected={field.value} onSelect={(d) => field.onChange(d ?? new Date())} initialFocus />
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
                      value={Number.isFinite(field.value) ? field.value : 0}
                      onChange={(e) => field.onChange(e.target.value === "" ? 0 : e.target.valueAsNumber)}
                    />
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
                  <FormLabel>Nota</FormLabel>
                  <FormControl>
                    <Textarea className="bg-white" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
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
