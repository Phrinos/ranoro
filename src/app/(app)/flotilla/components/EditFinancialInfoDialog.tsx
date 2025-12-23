// src/app/(app)/flotilla/components/EditFinancialInfoDialog.tsx
"use client";

import React, { useEffect, useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarIcon } from 'lucide-react';
import { format as formatDate } from 'date-fns';
import { es } from 'date-fns/locale';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { cn } from "@/lib/utils";

import { financialInfoSchema, type FinancialInfoFormValues } from "@/schemas/financial-info-schema";
import type { Driver } from "@/types";

export type { FinancialInfoFormValues };

interface EditFinancialInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: FinancialInfoFormValues) => Promise<void> | void;
  driver?: Driver;
}

const buildDefaults = (driver?: Driver): FinancialInfoFormValues => ({
  hasNotaryPower: driver?.hasNotaryPower ?? false,
  notaryPowerRegistrationDate: driver?.notaryPowerRegistrationDate ? new Date(driver.notaryPowerRegistrationDate) : undefined,
  notaryPowerExpirationDate: driver?.notaryPowerExpirationDate ? new Date(driver.notaryPowerExpirationDate) : undefined,
});

export function EditFinancialInfoDialog({ open, onOpenChange, onSave, driver }: EditFinancialInfoDialogProps) {
  const resolver = zodResolver(financialInfoSchema) as unknown as Resolver<FinancialInfoFormValues>;

  const form = useForm<FinancialInfoFormValues>({
    resolver,
    defaultValues: buildDefaults(driver),
    mode: "onBlur",
  });

  const { handleSubmit, reset, formState, watch } = form;
  const hasNotaryPower = watch("hasNotaryPower");

  useEffect(() => {
    if (open) reset(buildDefaults(driver));
  }, [open, reset, driver]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Editar información financiera</DialogTitle>
          <DialogDescription>Actualiza los datos financieros del conductor.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit(async (data) => onSave(data))} className="space-y-4">
            <FormField
              control={form.control}
              name="hasNotaryPower"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Poder notarial</FormLabel>
                  </div>
                </FormItem>
              )}
            />

            {hasNotaryPower && (
              <>
                <FormField
                  control={form.control}
                  name="notaryPowerRegistrationDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Fecha de registro</FormLabel>
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
                  name="notaryPowerExpirationDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Fecha de vencimiento</FormLabel>
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
              </>
            )}

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
