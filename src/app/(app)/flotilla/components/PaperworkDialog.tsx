// src/app/(app)/flotilla/components/PaperworkDialog.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import type { Paperwork } from "@/types";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { NewCalendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

const paperworkSchema = z.object({
  name: z.string().min(3, "El nombre del trámite es obligatorio."),
  dueDate: z.coerce.date({ message: "La fecha de vencimiento es obligatoria." }),
});

type PaperworkFormInput = z.input<typeof paperworkSchema>;
export type PaperworkFormValues = z.output<typeof paperworkSchema>;

interface PaperworkDialogProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  paperwork?: Paperwork | null;
  onSave: (values: PaperworkFormValues) => void;
}

const toMidday = (d: Date) => {
  const n = new Date(d);
  n.setHours(12, 0, 0, 0);
  return n;
};

const toDateSafe = (v: any): Date => {
  if (!v) return new Date();
  if (v instanceof Date) return v;
  if (typeof v?.toDate === "function") return v.toDate();
  return new Date(v);
};

export function PaperworkDialog({ open, onOpenChange, paperwork, onSave }: PaperworkDialogProps) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const form = useForm<PaperworkFormInput, any, PaperworkFormValues>({
    resolver: zodResolver(paperworkSchema),
    defaultValues: {
      name: "",
      dueDate: toMidday(new Date()),
    },
  });

  useEffect(() => {
    if (!open) return;

    form.reset({
      name: paperwork?.name ?? "",
      dueDate: toMidday(toDateSafe((paperwork as any)?.dueDate)),
    });
  }, [open, paperwork, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{paperwork ? "Editar Trámite" : "Añadir Trámite"}</DialogTitle>
          <DialogDescription>Registra un nuevo trámite pendiente y su fecha de vencimiento.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSave)} className="space-y-4 pt-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del Trámite</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ej: Verificación, Tenencia..." className="bg-white" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => {
                const dateValue = field.value instanceof Date ? field.value : undefined;
                return (
                  <FormItem className="flex flex-col">
                    <FormLabel>Fecha de Vencimiento</FormLabel>
                    <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            type="button"
                            variant={"outline"}
                            className={cn("pl-3 text-left font-normal bg-white", !dateValue && "text-muted-foreground")}
                            onClick={() => setIsCalendarOpen((o) => !o)}
                          >
                            {dateValue ? format(dateValue, "PPP", { locale: es }) : "Seleccionar fecha"}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>

                      <PopoverContent className="w-auto p-0" align="start">
                        <NewCalendar
                          onChange={(d: any) => {
                            if (d) {
                              field.onChange(toMidday(d));
                              setIsCalendarOpen(false);
                            }
                          }}
                          value={dateValue ?? undefined}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )
              }}
            />

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit">Guardar</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
