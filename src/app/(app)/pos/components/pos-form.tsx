
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
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PlusCircle, Trash2, Receipt } from "lucide-react";
import type { InventoryItem, SaleItem, PaymentMethod, SaleReceipt } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { placeholderSales, placeholderInventory } from "@/lib/placeholder-data";
import { useRouter } from "next/navigation";

const saleItemSchema = z.object({
  inventoryItemId: z.string().min(1, "Seleccione un artículo."),
  itemName: z.string(), 
  quantity: z.coerce.number().min(1, "La cantidad debe ser al menos 1."),
  unitPrice: z.coerce.number(), 
  totalPrice: z.coerce.number(), 
});

const paymentMethods: [PaymentMethod, ...PaymentMethod[]] = [
  "Efectivo", 
  "Tarjeta", 
  "Transferencia", 
  "Efectivo+Transferencia", 
  "Tarjeta+Transferencia"
];

const posFormSchema = z.object({
  items: z.array(saleItemSchema).min(1, "Debe agregar al menos un artículo a la venta."),
  customerName: z.string().optional(),
  paymentMethod: z.enum(paymentMethods).default("Efectivo"),
  cardFolio: z.string().optional(),
  transferFolio: z.string().optional(),
}).refine(data => {
  if ((data.paymentMethod === "Tarjeta" || data.paymentMethod === "Tarjeta+Transferencia") && !data.cardFolio) {
    return false;
  }
  return true;
}, {
  message: "El folio de la tarjeta es obligatorio para este método de pago.",
  path: ["cardFolio"],
}).refine(data => {
  if ((data.paymentMethod === "Transferencia" || data.paymentMethod === "Efectivo+Transferencia" || data.paymentMethod === "Tarjeta+Transferencia") && !data.transferFolio) {
    return false;
  }
  return true;
}, {
  message: "El folio de la transferencia es obligatorio para este método de pago.",
  path: ["transferFolio"],
});


type POSFormValues = z.infer<typeof posFormSchema>;

interface POSFormProps {
  inventoryItems: InventoryItem[];
  onSaleComplete: (saleData: SaleReceipt) => void; 
}

export function PosForm({ inventoryItems, onSaleComplete }: POSFormProps) {
  const { toast } = useToast();
  const [subTotalState, setSubTotalState] = useState(0);
  const [taxState, setTaxState] = useState(0);
  const [totalState, setTotalState] = useState(0);
  
  const IVA_RATE = 0.16; 

  const form = useForm<POSFormValues>({
    resolver: zodResolver(posFormSchema),
    defaultValues: {
      items: [],
      customerName: "",
      paymentMethod: "Efectivo",
      cardFolio: "",
      transferFolio: "",
    },
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const currentItems = form.watch("items");
  const selectedPaymentMethod = form.watch("paymentMethod");

  useEffect(() => {
    const currentTotalAmount = currentItems.reduce((acc, item) => acc + (item.totalPrice || 0), 0);
    const currentSubTotal = currentTotalAmount / (1 + IVA_RATE);
    const currentTax = currentTotalAmount - currentSubTotal;
    
    setSubTotalState(currentSubTotal);
    setTaxState(currentTax);
    setTotalState(currentTotalAmount);
  }, [currentItems, IVA_RATE]);


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
        unitPrice: selectedItem.sellingPrice, 
        totalPrice: selectedItem.sellingPrice * quantity,
      });
    }
  };

  const handleQuantityChange = (index: number, quantity: number) => {
    const unitPrice = form.getValues(`items.${index}.unitPrice`) || 0; 
    update(index, {
      ...form.getValues(`items.${index}`),
      quantity: quantity,
      totalPrice: unitPrice * quantity,
    });
  };
  
  const onSubmit = async (values: POSFormValues) => {
    const newSaleId = `SALE${String(placeholderSales.length + 1).padStart(3, '0')}${Date.now().toString().slice(-3)}`;
    
    const newSaleTotalAmount = values.items.reduce((sum, item) => sum + item.totalPrice, 0);
    const newSaleSubTotal = newSaleTotalAmount / (1 + IVA_RATE);
    const newSaleTax = newSaleTotalAmount - newSaleSubTotal;

    const newSale: SaleReceipt = {
      id: newSaleId,
      saleDate: new Date().toISOString(),
      items: values.items.map(item => ({ 
        inventoryItemId: item.inventoryItemId,
        itemName: item.itemName,
        quantity: item.quantity,
        unitPrice: item.unitPrice, 
        totalPrice: item.totalPrice, 
      })),
      subTotal: newSaleSubTotal,
      tax: newSaleTax,
      totalAmount: newSaleTotalAmount,
      paymentMethod: values.paymentMethod,
      customerName: values.customerName,
      cardFolio: values.cardFolio,
      transferFolio: values.transferFolio,
    };

    placeholderSales.push(newSale);

    let stockIssues = false;
    values.items.forEach(soldItem => {
      const inventoryItemIndex = placeholderInventory.findIndex(invItem => invItem.id === soldItem.inventoryItemId);
      if (inventoryItemIndex !== -1) {
        const currentStock = placeholderInventory[inventoryItemIndex].quantity;
        if (currentStock < soldItem.quantity) {
          toast({
            title: "Stock Insuficiente (Advertencia)",
            description: `No hay suficiente stock para ${soldItem.itemName}. Stock actual: ${currentStock}. Vendiendo ${soldItem.quantity}. El stock quedará negativo.`,
            variant: "destructive",
            duration: 5000,
          });
          stockIssues = true; 
        }
        placeholderInventory[inventoryItemIndex].quantity -= soldItem.quantity;
      }
    });
    
    toast({
      title: "Venta Registrada",
      description: `Venta ${newSaleId} procesada por un total de $${newSaleTotalAmount.toLocaleString('es-MX', {minimumFractionDigits: 2})}.`,
    });
    
    onSaleComplete(newSale);
  };
  
  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined) return '$0.00';
    return `$${amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
                <div key={field.id} className="flex items-end gap-2 mb-4 p-3 border rounded-md bg-muted/20 dark:bg-muted/50">
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
                              <SelectItem key={item.id} value={item.id} disabled={item.quantity <= 0 && !currentItems.find(ci => ci.inventoryItemId === item.id && ci.quantity > 0 )}>
                                {item.name} (Stock: {item.quantity}) - {formatCurrency(item.sellingPrice)} c/u (IVA Inc.)
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
                          min="1"
                          placeholder="Cant."
                          {...controllerField}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            controllerField.onChange(val >= 1 ? val : 1);
                            handleQuantityChange(index, val >= 1 ? val : 1);
                          }}
                          className="w-24"
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <div className="w-28">
                      <FormLabel className="text-xs">Precio Total (IVA Inc.)</FormLabel>
                      <Input 
                        type="text" 
                        readOnly 
                        value={formatCurrency(form.getValues(`items.${index}.totalPrice`))} 
                        className="bg-muted/50 dark:bg-muted/80 border-none text-sm font-medium"
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
                      {paymentMethods.map(method => (
                        <SelectItem key={method} value={method}>{method}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            {(selectedPaymentMethod === "Tarjeta" || selectedPaymentMethod === "Tarjeta+Transferencia") && (
                 <FormField
                    control={form.control}
                    name="cardFolio"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Folio Terminal (Tarjeta)</FormLabel>
                        <FormControl>
                            <Input placeholder="Ingrese folio de la transacción con tarjeta" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                 />
            )}
            {(selectedPaymentMethod === "Transferencia" || selectedPaymentMethod === "Efectivo+Transferencia" || selectedPaymentMethod === "Tarjeta+Transferencia") && (
                <FormField
                    control={form.control}
                    name="transferFolio"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Folio Transferencia</FormLabel>
                        <FormControl>
                            <Input placeholder="Ingrese folio/referencia de la transferencia" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            )}
          </CardContent>
          <CardFooter className="flex flex-col items-end space-y-2 pt-6">
            <div className="text-lg">Subtotal: <span className="font-semibold">{formatCurrency(subTotalState)}</span></div>
            <div className="text-sm text-muted-foreground">IVA ({(IVA_RATE*100).toFixed(0)}%): <span className="font-semibold">{formatCurrency(taxState)}</span></div>
            <div className="text-2xl font-bold">Total: <span className="text-primary">{formatCurrency(totalState)}</span></div>
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

