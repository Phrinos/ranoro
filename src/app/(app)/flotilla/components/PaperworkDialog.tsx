"use client";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import type { Paperwork } from "@/types";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import ReactCalendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

const paperworkSchema = z.object({
  name: z.string().min(3, "El nombre del trámite es obligatorio."),
  dueDate: z.date({ required_error: "La fecha de vencimiento es obligatoria." }),
});
export type PaperworkFormValues = z.infer<typeof paperworkSchema>;

const toMidday = (d: Date) => {
  const n = new Date(d);
  n.setHours(12, 0, 0, 0);
  return n;
};

interface PaperworkDialogProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  paperwork?: Paperwork | null;
  onSave: (values: PaperworkFormValues) => void;
}

export function PaperworkDialog({
  open,
  onOpenChange,
  paperwork,
  onSave,
}: PaperworkDialogProps) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const form = useForm<PaperworkFormValues>({
    resolver: zodResolver(paperworkSchema),
    defaultValues: {
      name: paperwork?.name ?? "",
      dueDate: toMidday(new Date()),
    },
  });

  const selectedDate = form.watch("dueDate");

  useEffect(() => {
    form.reset({
      name: paperwork?.name ?? "",
      // Paperwork.dueDate puede venir como ISO string o Timestamp
      // @ts-expect-error toDate en Timestamp
      dueDate: toMidday(new Date(paperwork?.dueDate?.toDate?.() ?? paperwork?.dueDate ?? new Date())),
    });
  }, [open, paperwork, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{paperwork ? "Editar Trámite" : "Añadir Trámite"}</DialogTitle>
          <DialogDescription>
            Registra un nuevo trámite pendiente y su fecha de vencimiento.
          </DialogDescription>
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

            {/* Fecha */}
            <FormField
              control={form.control}
              name="dueDate"
              render={() => (
                <FormItem className="flex flex-col gap-2">
                  <FormLabel>Fecha de Vencimiento</FormLabel>
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
                          onClick={() => setIsCalendarOpen(true)}
                        >
                          <Input
                            readOnly
                            className="bg-white pr-10"
                            value={selectedDate ? format(selectedDate, "PPP", { locale: es }) : ""}
                            placeholder="Seleccionar fecha"
                          />
                          <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-60" />
                        </div>
                      </FormControl>
                    </PopoverTrigger>

                    <PopoverContent className="p-2 w-auto" align="start" sideOffset={8}>
                      <ReactCalendar
                        value={selectedDate ?? new Date()}
                        onChange={(val) => {
                          const d = Array.isArray(val) ? val[0] : val;
                          if (!d) return;
                          form.setValue("dueDate", toMidday(d), {
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
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
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
