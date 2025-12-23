"use client";

import React, { useEffect } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format as formatDate } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";

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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { NewCalendar } from "@/components/ui/calendar";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { cn } from "@/lib/utils";

import { financialInfoSchema, type FinancialInfoFormValues } from "@/schemas/financial-info-schema";
import type { FinancialInfo } from "@/types";

interface EditFinancialInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  financialInfo?: FinancialInfo | null;
  onSave: (data: FinancialInfoFormValues) => Promise<void> | void;
}

const buildDefaults = (v?: FinancialInfo | null): FinancialInfoFormValues => ({
  contractDate: v?.contractDate ? new Date(v.contractDate as any) : undefined,
  requiredDepositAmount: Number(v?.requiredDepositAmount ?? 0),
  depositAmount: Number(v?.depositAmount ?? 0),
  monthlyPayment: Number(v?.monthlyPayment ?? 0),
  remainingBalance: Number(v?.remainingBalance ?? 0),
});

export function EditFinancialInfoDialog({
  open,
  onOpenChange,
  financialInfo,
  onSave,
}: EditFinancialInfoDialogProps) {
  // 👇 clave: tipar el form con OUTPUT y castear el resolver
  const resolver = zodResolver(financialInfoSchema) as unknown as Resolver<FinancialInfoFormValues>;

  const form = useForm<FinancialInfoFormValues>({
    resolver,
    defaultValues: buildDefaults(financialInfo),
    mode: "onBlur",
  });

  const { handleSubmit, reset, formState } = form;

  useEffect(() => {
    if (open) reset(buildDefaults(financialInfo));
  }, [open, financialInfo, reset]);

  const numOrZero = (v: unknown) => {
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Editar información financiera</DialogTitle>
          <DialogDescription>Actualiza los datos del contrato y pagos.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit(async (data) => onSave(data))} className="space-y-5">
            <FormField
              control={form.control}
              name="contractDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Fecha de contrato</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          className={cn(
                            "justify-start text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? formatDate(field.value, "PPP", { locale: es }) : "Selecciona una fecha"}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <NewCalendar
                        mode="single"
                        selected={field.value}
                        onSelect={(d) => field.onChange(d ?? undefined)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="requiredDepositAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Enganche requerido</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        className="bg-white"
                        value={numOrZero(field.value)}
                        onChange={(e) => field.onChange(e.target.value === "" ? 0 : e.target.valueAsNumber)}
                      />
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
                    <FormLabel>Enganche pagado</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        className="bg-white"
                        value={numOrZero(field.value)}
                        onChange={(e) => field.onChange(e.target.value === "" ? 0 : e.target.valueAsNumber)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="monthlyPayment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mensualidad</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        className="bg-white"
                        value={numOrZero(field.value)}
                        onChange={(e) => field.onChange(e.target.value === "" ? 0 : e.target.valueAsNumber)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="remainingBalance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Saldo restante</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        className="bg-white"
                        value={numOrZero(field.value)}
                        onChange={(e) => field.onChange(e.target.value === "" ? 0 : e.target.valueAsNumber)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={formState.isSubmitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={formState.isSubmitting}>
                Guardar cambios
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
