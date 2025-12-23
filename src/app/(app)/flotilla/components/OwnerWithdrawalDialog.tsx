// src/app/(app)/flotilla/components/OwnerWithdrawalDialog.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import type { Vehicle } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const withdrawalSchema = z.object({
  ownerName: z.string().min(1, "Debe seleccionar un propietario."),
  amount: z.coerce.number().min(0.01, "El monto debe ser positivo."),
  note: z.string().optional(),
});

type WithdrawalFormInput = z.input<typeof withdrawalSchema>;
export type OwnerWithdrawalFormValues = z.infer<typeof withdrawalSchema>;

interface OwnerWithdrawalDialogProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  vehicles: Vehicle[];
  onSave: (values: OwnerWithdrawalFormValues) => Promise<void>;
}

export function OwnerWithdrawalDialog({ open, onOpenChange, vehicles, onSave }: OwnerWithdrawalDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<WithdrawalFormInput, any, OwnerWithdrawalFormValues>({
    resolver: zodResolver(withdrawalSchema),
    defaultValues: { ownerName: "", amount: undefined, note: "" },
  });

  const owners = useMemo(() => {
    const ownerNames = vehicles
      .filter((v) => v.isFleetVehicle)
      .map((v) => v.ownerName)
      .filter((name): name is string => typeof name === "string" && name.trim().length > 0);

    return Array.from(new Set(ownerNames));
  }, [vehicles]);


  useEffect(() => {
    if (!open) return;
    form.reset({ ownerName: "", amount: undefined, note: "" });
  }, [open, form]);

  const handleFormSubmit = async (values: OwnerWithdrawalFormValues) => {
    setIsSubmitting(true);
    try {
      await onSave(values);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Retiro de Propietario</DialogTitle>
          <DialogDescription>Registra una salida de dinero de la caja para un propietario.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 p-4">
            <FormField
              control={form.control}
              name="ownerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Propietario</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <FormControl>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Seleccionar propietario..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {owners.map((owner) => (
                        <SelectItem key={owner} value={owner}>
                          {owner}
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
                  <FormLabel>Monto a Retirar ($)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01" 
                      {...field} 
                      className="bg-white" 
                      value={field.value ?? ""} 
                      onChange={(e) => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)}
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
                  <FormLabel>Nota o Descripción</FormLabel>
                  <FormControl>
                    <Textarea {...field} className="bg-white" value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Registrar Retiro
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
