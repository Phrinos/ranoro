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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { cn } from "@/lib/utils";

import { ownerWithdrawalSchema, type OwnerWithdrawalFormValues } from "@/schemas/owner-withdrawal-schema";

interface OwnerWithdrawalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: OwnerWithdrawalFormValues) => Promise<void> | void;
}

const buildDefaults = (): OwnerWithdrawalFormValues => ({
  date: new Date(),
  amount: 0,
  note: "",
});

export function OwnerWithdrawalDialog({ open, onOpenChange, onSave }: OwnerWithdrawalDialogProps) {
  const resolver = zodResolver(ownerWithdrawalSchema) as unknown as Resolver<OwnerWithdrawalFormValues>;

  const form = useForm<OwnerWithdrawalFormValues>({
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
          <DialogTitle>Retiro del dueño</DialogTitle>
          <DialogDescription>Registra un retiro (salida) de dinero.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit(async (data) => onSave(data))} className="space-y-4">
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
