
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { VehiclePaperwork } from "@/types";

const paperworkSchema = z.object({
  name: z.string().min(3, "El nombre del trámite es obligatorio."),
  dueDate: z.date({ required_error: "La fecha de vencimiento es obligatoria." }),
  notes: z.string().optional(),
});

export type PaperworkFormValues = z.infer<typeof paperworkSchema>;

interface PaperworkFormProps {
  initialData?: VehiclePaperwork | null;
  onSubmit: (values: PaperworkFormValues) => void;
  onClose: () => void;
}

export function PaperworkForm({ initialData, onSubmit, onClose }: PaperworkFormProps) {
  const form = useForm<PaperworkFormValues>({
    resolver: zodResolver(paperworkSchema),
    defaultValues: initialData ? {
      ...initialData,
      dueDate: new Date(initialData.dueDate),
    } : {
      name: "",
      dueDate: undefined,
      notes: "",
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={form.control} name="name" render={({ field }) => (
          <FormItem><FormLabel>Nombre del Trámite</FormLabel><FormControl><Input placeholder="Ej: Verificación Vehicular" {...field} /></FormControl><FormMessage /></FormItem>
        )}/>
        <FormField control={form.control} name="dueDate" render={({ field }) => (
          <FormItem className="flex flex-col"><FormLabel>Fecha de Vencimiento</FormLabel>
            <Popover><PopoverTrigger asChild>
                <FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                    {field.value ? format(field.value, "PPP", { locale: es }) : <span>Seleccione fecha</span>}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Button></FormControl>
            </PopoverTrigger><PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus locale={es}/>
            </PopoverContent></Popover><FormMessage />
          </FormItem>
        )}/>
        <FormField control={form.control} name="notes" render={({ field }) => (
          <FormItem><FormLabel>Notas (Opcional)</FormLabel><FormControl><Textarea placeholder="Detalles adicionales sobre el trámite..." {...field} /></FormControl><FormMessage /></FormItem>
        )}/>
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit">Guardar Trámite</Button>
        </div>
      </form>
    </Form>
  );
}
