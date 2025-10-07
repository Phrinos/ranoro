
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { CalendarIcon, PlusCircle, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { addDoc, collection, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebaseClient";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { InventoryItem, InventorySearchDialog } from "@/components/shared/InventorySearchDialog";

// Esquema de validación para el formulario de compra
const purchaseFormSchema = z.object({
  supplierName: z.string().min(1, "El proveedor es obligatorio."),
  date: z.date({ required_error: "La fecha es obligatoria." }),
  items: z.array(z.object({
    id: z.string().min(1, "El item es inválido."),
    name: z.string(),
    quantity: z.coerce.number().min(1, "La cantidad debe ser al menos 1."),
    unitPrice: z.coerce.number().min(0, "El costo no puede ser negativo."),
  })).min(1, "Debes añadir al menos un producto a la compra."),
});

type PurchaseFormValues = z.infer<typeof purchaseFormSchema>;

interface PurchaseFormProps {
  onSuccess: () => void;
}

export function PurchaseForm({ onSuccess }: PurchaseFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSearchDialogOpen, setIsSearchDialogOpen] = React.useState(false);
  const { toast } = useToast();

  const form = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseFormSchema),
    defaultValues: {
      supplierName: "",
      date: new Date(),
      items: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });
  
  const itemsWatch = useWatch({
    control: form.control,
    name: "items",
  });

  const totalAmount = React.useMemo(() => {
    return itemsWatch.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
  }, [itemsWatch]);

  const handleProductSelect = (product: InventoryItem) => {
    // Evitar añadir duplicados
    const existingItem = fields.find(item => item.id === product.id);
    if (existingItem) {
      toast({
        title: "Producto ya añadido",
        description: "Este producto ya está en la lista de compra.",
        variant: "default",
      });
      return;
    }

    append({
      id: product.id,
      name: product.name,
      quantity: 1,
      unitPrice: product.unitPrice || 0, // Usar el costo unitario del inventario como base
    });
  };

  const onSubmit = async (values: PurchaseFormValues, status: 'completado' | 'pendiente') => {
    setIsSubmitting(true);
    try {
      const total = values.items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
      const purchaseData = {
        ...values,
        date: Timestamp.fromDate(values.date),
        status,
        totalAmount: total,
        createdAt: Timestamp.now(),
      };
      await addDoc(collection(db, "purchases"), purchaseData);
      toast({
        title: "Compra registrada",
        description: `La compra se ha guardado como "${status}".`,
      });
      onSuccess();
    } catch (error) {
      console.error("Error al registrar la compra: ", error);
      toast({
        title: "Error",
        description: "No se pudo registrar la compra. Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleSave = (status: 'completado' | 'pendiente') => {
    form.handleSubmit((data) => onSubmit(data, status))();
  };

  return (
    <>
      <InventorySearchDialog
        open={isSearchDialogOpen}
        onOpenChange={setIsSearchDialogOpen}
        onItemSelected={handleProductSelect}
      />
      <Form {...form}>
        <form className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="supplierName" render={({ field }) => ( <FormItem><FormLabel>Proveedor</FormLabel><FormControl><Input placeholder="Ej. Autopartes Wolf" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem> )} />
            <FormField control={form.control} name="date" render={({ field }) => ( <FormItem className="flex flex-col"><FormLabel>Fecha de Compra</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")} disabled={isSubmitting}>{field.value ? format(field.value, "PPP") : <span>Elige una fecha</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar value={field.value} onChange={(date) => field.onChange(date)} maxDate={new Date()} minDate={new Date("1900-01-01")} /></PopoverContent></Popover><FormMessage /></FormItem> )} />
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-medium">Productos Comprados</h3>
            <div className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-12 gap-x-4 items-start p-2 border rounded-md">
                  <div className="col-span-12 md:col-span-5 font-medium">{field.name || 'Producto sin nombre'}</div>
                  <FormField control={form.control} name={`items.${index}.quantity`} render={({ field }) => ( <FormItem className="col-span-6 md:col-span-3"><FormLabel className="sr-only">Cantidad</FormLabel><FormControl><Input type="number" placeholder="Cantidad" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem> )} />
                  <FormField control={form.control} name={`items.${index}.unitPrice`} render={({ field }) => ( <FormItem className="col-span-6 md:col-span-3"><FormLabel className="sr-only">Costo Unit.</FormLabel><FormControl><Input type="number" placeholder="Costo Unit." {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem> )} />
                  <div className="col-span-12 md:col-span-1 flex justify-end">
                    <Button variant="ghost" size="icon" onClick={() => remove(index)} disabled={isSubmitting}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
            <Button type="button" variant="outline" onClick={() => setIsSearchDialogOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" /> Buscar y Añadir Producto
            </Button>
          </div>
          
          <div className="text-right text-2xl font-bold">
            Total: ${totalAmount.toFixed(2)}
          </div>

          <div className="flex justify-end gap-4 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => handleSave('pendiente')} disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Guardar como Pendiente'}
            </Button>
            <Button type="button" onClick={() => handleSave('completado')} disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Finalizar y Añadir al Stock'}
            </Button>
          </div>
        </form>
      </Form>
    </>
  );
}
