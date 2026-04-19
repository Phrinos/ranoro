// src/app/(app)/flotilla/components/dialogs/withdrawal-dialog.tsx
"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download } from "lucide-react";

const schema = z.object({
  ownerName: z.string().min(1, "Selecciona un socio"),
  amount: z.coerce.number().positive("El monto debe ser positivo"),
  date: z.string().min(1),
  note: z.string().optional(),
});

export type WithdrawalFormValues = z.infer<typeof schema>;

interface WithdrawalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (values: WithdrawalFormValues) => Promise<void>;
  owners: string[];
}

export function WithdrawalDialog({ open, onOpenChange, onSave, owners }: WithdrawalDialogProps) {
  const form = useForm<WithdrawalFormValues, any, WithdrawalFormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: { ownerName: "", amount: 0, date: format(new Date(), "yyyy-MM-dd"), note: "" },
  });

  useEffect(() => {
    if (open) {
      form.reset({ ownerName: "", amount: 0, date: format(new Date(), "yyyy-MM-dd"), note: "" });
    }
  }, [open]);

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSave(values);
    onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-amber-600" />
            Registrar Retiro de Socio
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField control={form.control} name="ownerName" render={({ field }) => (
              <FormItem>
                <FormLabel>Socio</FormLabel>
                {owners.length > 0 ? (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecciona un socio" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {owners.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <FormControl><Input placeholder="Nombre del socio" {...field} /></FormControl>
                )}
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="amount" render={({ field }) => (
                <FormItem>
                  <FormLabel>Monto</FormLabel>
                  <FormControl><Input type="number" min={0} step="0.01" placeholder="0.00" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="date" render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="note" render={({ field }) => (
              <FormItem>
                <FormLabel>Nota (opcional)</FormLabel>
                <FormControl><Input placeholder="Concepto del retiro..." {...field} /></FormControl>
              </FormItem>
            )} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Guardando..." : "Registrar Retiro"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
