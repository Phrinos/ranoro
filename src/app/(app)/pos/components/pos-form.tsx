
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import * as z from "zod";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PlusCircle, Trash2, Receipt } from "lucide-react";
import type { InventoryItem, SaleItem } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

const saleItemSchema = z.object({
  inventoryItemId: z.string().min(1, "Seleccione un artículo."),
  itemName: z.string(), 
  quantity: z.coerce.number().min(1, "La cantidad debe ser al menos 1."),
  unitPrice: z.coerce.number(), // This will be the sellingPrice from InventoryItem
  totalPrice: z.coerce.number(), 
});

const posFormSchema = z.object({
  items: z.array(saleItemSchema).min(1, "Debe agregar al menos un artículo a la venta."),
  customerName: z.string().optional(),
  paymentMethod: z.enum(["Efectivo", "Tarjeta", "Transferencia"]).default("Efectivo"),
});

type POSFormValues = z.infer<typeof posFormSchema>;

interface POSFormProps {
  inventoryItems: InventoryItem[];
}

export function PosForm({ inventoryItems }: POSFormProps) {
  const { toast } = useToast();
  const [subTotal, setSubTotal] = useState(0);
  const [total, setTotal] = useState(0);
  
  const TAX_RATE = 0.10; // 10%

  const form = useForm<POSFormValues>({
    resolver: zodResolver(posFormSchema),
    defaultValues: {
      items: [],
      customerName: "",
      paymentMethod: "Efectivo",
    },
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const currentItems = form.watch("items");

  useEffect(() => {
    const currentSubTotal = currentItems.reduce((acc, item) => acc + (item.totalPrice || 0), 0);
    setSubTotal(currentSubTotal);
    setTotal(currentSubTotal * (1 + TAX_RATE)); 
  }, [currentItems, TAX_RATE]);


  const handleAddItem = () => {
    append({ inventoryItemId: "", itemName: "", quantity: 1, unitPrice: 0, totalPrice: 0 });
  };

  const handleItemChange = (index: number, itemId: string) => {
    const selectedItem = inventoryItems.find(item => item.id === itemId);
    if (selectedItem) {
      const quantity = form.getValues(`items.${index}.quantity`) || 1;
      update(index, {
        ...form.getValues(`items.${index}`),
        inventoryItemId: selectedItem.id,
        itemName: selectedItem.name,
        unitPrice: selectedItem.sellingPrice, // Use sellingPrice for sales
        totalPrice: selectedItem.sellingPrice * quantity,
      });
    }
  };

  const handleQuantityChange = (index: number, quantity: number) => {
    const unitPrice = form.getValues(`items.${index}.unitPrice`) || 0; // This is sellingPrice
    update(index, {
      ...form.getValues(`items.${index}`),
      quantity: quantity,
      totalPrice: unitPrice * quantity,
    });
  };
  
  const onSubmit = async (values: POSFormValues) => {
    
    toast({
      title: "Venta Registrada",
      description: `Venta procesada por un total de $${total.toLocaleString('es-ES', {minimumFractionDigits: 2})}.`,
    });
    form.reset(); 
    // Manually clear field array after reset
    while(fields.length > 0) remove(0); 
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Artículos de Venta</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px] pr-4">
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-end gap-2 mb-4 p-3 border rounded-md bg-muted/20">
                  <FormField
                    control={form.control}
                    name={`items.${index}.inventoryItemId`}
                    render={({ field: controllerField }) => (
                      <FormItem className="flex-1">
                        <FormLabel className="text-xs">Artículo</FormLabel>
                        <Select
                          onValueChange={(value) => {
                            controllerField.onChange(value);
                            handleItemChange(index, value);
                          }}
                          defaultValue={controllerField.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccione un artículo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {inventoryItems.map((item) => (
                              <SelectItem key={item.id} value={item.id} disabled={item.quantity === 0}>
                                {item.name} (Stock: {item.quantity})
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
                    name={`items.${index}.quantity`}
                    render={({ field: controllerField }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Cantidad</FormLabel>
                        <Input
                          type="number"
                          placeholder="Cant."
                          {...controllerField}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            controllerField.onChange(val);
                            handleQuantityChange(index, val);
                          }}
                          className="w-24"
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <div className="w-28">
                      <FormLabel className="text-xs">Precio Total</FormLabel>
                      <Input 
                        type="text" 
                        readOnly 
                        value={`$${(form.getValues(`items.${index}.totalPrice`) || 0).toLocaleString('es-ES')}`} 
                        className="bg-muted border-none"
                      />
                    </div>
                  <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} aria-label="Eliminar artículo">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </ScrollArea>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddItem}
              className="mt-4"
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Añadir Artículo
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Detalles Adicionales y Pago</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="customerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del Cliente (Opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Cliente Mostrador" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Método de Pago</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione método de pago" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {["Efectivo", "Tarjeta", "Transferencia"].map(method => (
                        <SelectItem key={method} value={method}>{method}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex flex-col items-end space-y-2 pt-6">
            <div className="text-lg">Subtotal: <span className="font-semibold">${subTotal.toLocaleString('es-ES', {minimumFractionDigits: 2})}</span></div>
            <div className="text-sm text-muted-foreground">Impuestos ({TAX_RATE*100}%): <span className="font-semibold">${(subTotal * TAX_RATE).toLocaleString('es-ES', {minimumFractionDigits: 2})}</span></div>
            <div className="text-2xl font-bold">Total: <span className="text-primary">${total.toLocaleString('es-ES', {minimumFractionDigits: 2})}</span></div>
            <Button type="submit" size="lg" className="mt-4 w-full md:w-auto" disabled={form.formState.isSubmitting || fields.length === 0}>
              <Receipt className="mr-2 h-5 w-5" />
              {form.formState.isSubmitting ? "Procesando..." : "Completar Venta"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}
