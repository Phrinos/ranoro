"use client";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
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

export function PaperworkDialog({ open, onOpenChange, paperwork, onSave }: PaperworkDialogProps) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const form = useForm<PaperworkFormValues>({
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
      dueDate: paperwork?.dueDate ? new Date(paperwork.dueDate) : toMidday(new Date()),
    });
  }, [open, paperwork, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Gestionar Trámite</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSave)} className="space-y-4 pt-2">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem><FormLabel>Nombre</FormLabel><FormControl><Input {...field} className="bg-white" /></FormControl><FormMessage /></FormItem>
            )}/>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit">Guardar</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
