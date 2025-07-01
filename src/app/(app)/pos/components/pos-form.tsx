
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PlusCircle, Trash2, Receipt, Search, PackagePlus, Wallet, CreditCard, Send, WalletCards, ArrowRightLeft, Plus, Minus } from "lucide-react";
import type { InventoryItem, PaymentMethod, SaleReceipt } from "@/types";
import { useToast } from "@/hooks/use-toast";
import React, { useState, useEffect } from "react";
import { placeholderSales, placeholderInventory, placeholderCategories, placeholderSuppliers, persistToFirestore } from "@/lib/placeholder-data";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { InventoryItemDialog } from "../../inventario/components/inventory-item-dialog";
import type { InventoryItemFormValues } from "../../inventario/components/inventory-item-form";


const saleItemSchema = z.object({
  inventoryItemId: z.string().min(1, "Seleccione un artículo."),
  itemName: z.string(),
  quantity: z.coerce.number().min(0.001, "La cantidad debe ser mayor a 0."),
  unitPrice: z.coerce.number(),
  totalPrice: z.coerce.number(),
  isService: z.boolean().optional(),
});

const paymentMethods: [PaymentMethod, ...PaymentMethod[]] = [
  "Efectivo",
  "Tarjeta",
  "Transferencia",
  "Efectivo+Transferencia",
  "Tarjeta+Transferencia"
];

const paymentMethodIcons: Record<PaymentMethod, React.ElementType> = {
  "Efectivo": Wallet,
  "Tarjeta": CreditCard,
  "Transferencia": Send,
  "Efectivo+Transferencia": WalletCards,
  "Tarjeta+Transferencia": ArrowRightLeft,
};

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
  onInventoryItemCreated?: (newItem: InventoryItem) => void;
}

export function PosForm({ inventoryItems: parentInventoryItems, onSaleComplete, onInventoryItemCreated }: POSFormProps) {
  const { toast } = useToast();
  const [subTotalState, setSubTotalState] = useState(0);
  const [taxState, setTaxState] = useState(0);
  const [totalState, setTotalState] = useState(0);

  const IVA_RATE = 0.16;

  const [currentInventoryItems, setCurrentInventoryItems] = useState<InventoryItem[]>(parentInventoryItems);

  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false);
  const [addItemSearchTerm, setAddItemSearchTerm] = useState('');
  const [addItemQuantity, setAddItemQuantity] = useState<number>(1);
  const [filteredInventoryForDialog, setFilteredInventoryForDialog] = useState<InventoryItem[]>([]);
  const [selectedInventoryItemForDialog, setSelectedInventoryItemForDialog] = useState<InventoryItem | null>(null);

  const [isNewInventoryItemDialogOpen, setIsNewInventoryItemDialogOpen] = useState(false);
  const [newItemInitialData, setNewItemInitialData] = useState<Partial<InventoryItemFormValues> | null>(null);


  const form = useForm<POSFormValues>({
    resolver: zodResolver(posFormSchema),
    defaultValues: {
      items: [],
      customerName: "Cliente Mostrador",
      paymentMethod: "Efectivo",
      cardFolio: "",
      transferFolio: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });
  
  const watchedItems = form.watch("items");
  const selectedPaymentMethod = form.watch("paymentMethod");

  useEffect(() => {
    setCurrentInventoryItems(parentInventoryItems);
  }, [parentInventoryItems]);

  // Effect to react to changes in items (e.g., quantity) and update totals
  useEffect(() => {
    let newTotalAmount = 0;
    watchedItems.forEach((item, index) => {
      // Coerce quantity to a number, handling both '.' and ','
      const quantityStr = String(item.quantity || 0);
      const quantity = parseFloat(quantityStr.replace(',', '.'));
      
      if (isNaN(quantity)) return; // Skip if quantity is not a valid number
      
      const unitPrice = item.unitPrice || 0;
      const newTotal = quantity * unitPrice;
      newTotalAmount += newTotal;

      // Only update if the total price for the item has changed to avoid infinite loops
      if (item.totalPrice !== newTotal) {
          form.setValue(`items.${index}.totalPrice`, newTotal, { shouldDirty: true });
      }
    });

    const newSubTotal = newTotalAmount / (1 + IVA_RATE);
    const newTax = newTotalAmount - newSubTotal;
    
    setSubTotalState(newSubTotal);
    setTaxState(newTax);
    setTotalState(newTotalAmount);
  }, [watchedItems, IVA_RATE, form]);


  const onSubmit = (values: POSFormValues) => {
    const newSaleId = `SALE-${Date.now().toString(36).toUpperCase()}`;

    const newSaleTotalAmount = values.items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
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
      status: 'Completado',
    };

    placeholderSales.push(newSale);

    values.items.forEach(soldItem => {
      const inventoryItemIndex = placeholderInventory.findIndex(invItem => invItem.id === soldItem.inventoryItemId);
      if (inventoryItemIndex !== -1 && !placeholderInventory[inventoryItemIndex].isService) { // Only deduct stock for non-service items
        const currentStock = placeholderInventory[inventoryItemIndex].quantity;
        if (currentStock < soldItem.quantity) {
          toast({
            title: "Stock Insuficiente (Advertencia)",
            description: `No hay suficiente stock para ${soldItem.itemName}. Stock actual: ${currentStock}. Vendiendo ${soldItem.quantity}. El stock quedará negativo.`,
            variant: "destructive",
            duration: 7000,
          });
        }
        placeholderInventory[inventoryItemIndex].quantity -= soldItem.quantity;
      }
    });
    
    persistToFirestore(['sales', 'inventory']);

    onSaleComplete(newSale);
  };

  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined) return '$0.00';
    return `$${amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  
  const handleQuantityChange = (index: number, delta: number) => {
    const itemInSale = form.getValues(`items.${index}`);
    if (!itemInSale) return;
    
    const currentQuantity = itemInSale.quantity;
    const newQuantity = currentQuantity + delta;
    
    if (newQuantity <= 0) return;

    const itemDetailsFromInv = currentInventoryItems.find(
      (invItem) => invItem.id === itemInSale.inventoryItemId
    );

    if (itemDetailsFromInv && !itemDetailsFromInv.isService && newQuantity > itemDetailsFromInv.quantity) {
        toast({
            title: 'Stock Insuficiente',
            description: `Solo hay ${itemDetailsFromInv.quantity} de ${itemDetailsFromInv.name}.`,
            variant: 'destructive',
            duration: 3000
        });
        return;
    }
    
    form.setValue(`items.${index}.quantity`, newQuantity, { shouldDirty: true, shouldValidate: true });
  };


  // --- Add Item Dialog Logic ---
  useEffect(() => {
    if (addItemSearchTerm.trim() === '') {
        setFilteredInventoryForDialog(currentInventoryItems.filter(item => item.isService || item.quantity > 0).slice(0,10));
        return;
    }
    const lowerSearchTerm = addItemSearchTerm.toLowerCase();
    setFilteredInventoryForDialog(
        currentInventoryItems.filter(item =>
            (item.name.toLowerCase().includes(lowerSearchTerm) ||
            item.sku.toLowerCase().includes(lowerSearchTerm)) && (item.isService || item.quantity > 0)
        ).slice(0, 10)
    );
  }, [addItemSearchTerm, currentInventoryItems]);

  const handleSelectItemFromSearch = (item: InventoryItem) => {
      setSelectedInventoryItemForDialog(item);
      setAddItemSearchTerm(item.name);
      setFilteredInventoryForDialog([]);
  };

  const handleAddItemConfirmed = () => {
      if (!selectedInventoryItemForDialog || addItemQuantity <= 0) {
          toast({ title: "Datos incompletos", description: "Seleccione un artículo y una cantidad válida.", variant: "destructive" });
          return;
      }
      if (!selectedInventoryItemForDialog.isService && selectedInventoryItemForDialog.quantity < addItemQuantity) {
          toast({ title: "Stock Insuficiente", description: `Solo hay ${selectedInventoryItemForDialog.quantity} unidades de ${selectedInventoryItemForDialog.name}.`, variant: "destructive" });
          return;
      }
      append({
          inventoryItemId: selectedInventoryItemForDialog.id,
          itemName: selectedInventoryItemForDialog.name,
          quantity: addItemQuantity,
          unitPrice: selectedInventoryItemForDialog.sellingPrice, // Selling price for POS
          totalPrice: selectedInventoryItemForDialog.sellingPrice * addItemQuantity,
          isService: selectedInventoryItemForDialog.isService || false,
      });
      setIsAddItemDialogOpen(false);
      setAddItemSearchTerm('');
      setAddItemQuantity(1);
      setSelectedInventoryItemForDialog(null);
  };

  const handleOpenCreateNewItemDialog = () => {
      setNewItemInitialData({
          name: addItemSearchTerm,
          sku: '',
          quantity: 0,
          unitPrice: 0,
          sellingPrice: 0,
          lowStockThreshold: 5,
          isService: false, // Default to product, can be changed in the dialog
          unitType: 'units',
          category: placeholderCategories.length > 0 ? placeholderCategories[0].name : "",
          supplier: placeholderSuppliers.length > 0 ? placeholderSuppliers[0].name : "",
      });
      setIsAddItemDialogOpen(false);
      setIsNewInventoryItemDialogOpen(true);
  };

  const handleNewItemCreated = (newItemFormValues: InventoryItemFormValues) => {
      const newInventoryItem: InventoryItem = {
          id: `PROD-${Date.now().toString(36).toUpperCase()}`,
          ...newItemFormValues,
          isService: newItemFormValues.isService || false,
          quantity: newItemFormValues.isService ? 0 : Number(newItemFormValues.quantity),
          lowStockThreshold: newItemFormValues.isService ? 0 : Number(newItemFormValues.lowStockThreshold),
          unitPrice: Number(newItemFormValues.unitPrice) || 0,
          sellingPrice: Number(newItemFormValues.sellingPrice) || 0,
          unitType: newItemFormValues.unitType || 'units'
      };
      placeholderInventory.push(newInventoryItem);
      persistToFirestore(['inventory']);
      
      setCurrentInventoryItems(prev => [...prev, newInventoryItem]);

      if (onInventoryItemCreated) {
          onInventoryItemCreated(newInventoryItem);
      }
      
      toast({
          title: "Nuevo Ítem Creado",
          description: `${newInventoryItem.name} ha sido agregado al inventario y añadido a la venta.`,
      });

      append({
          inventoryItemId: newInventoryItem.id,
          itemName: newInventoryItem.name,
          quantity: 1, // Default to 1, user can change it
          unitPrice: newInventoryItem.sellingPrice,
          totalPrice: newInventoryItem.sellingPrice * 1,
          isService: newInventoryItem.isService,
      });

      setIsNewInventoryItemDialogOpen(false);
      setNewItemInitialData(null);
      setAddItemSearchTerm('');
      setAddItemQuantity(1);
      setSelectedInventoryItemForDialog(null);
  };


  return (
    <>
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Item List */}
          <Card className="lg:col-span-2">
            <CardHeader>
                <CardTitle>Articulos vendidos</CardTitle>
            </CardHeader>
            <CardContent>
                <ScrollArea className="max-h-[300px] pr-4 flex-grow">
                {fields.length > 0 ? (
                    <div className="space-y-4">
                    {fields.map((field, index) => (
                        <div key={field.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-2 p-3 border rounded-md bg-muted/20 dark:bg-muted/50">
                            <div className="flex-1 w-full sm:w-auto">
                                <FormLabel className="text-xs">Artículo</FormLabel>
                                <Input
                                    type="text"
                                    readOnly
                                    value={`${field.itemName} (${formatCurrency(field.unitPrice)} c/u)`}
                                    className="bg-muted/30 dark:bg-muted/60 border-none text-sm font-medium w-full mt-1"
                                />
                            </div>
                            <div className="w-full sm:w-40">
                                <FormLabel className="text-xs">Cantidad</FormLabel>
                                 <div className="flex items-center justify-center gap-1 mt-1">
                                    <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => handleQuantityChange(index, -1)}>
                                        <Minus className="h-4 w-4" />
                                    </Button>
                                    <FormField
                                        control={form.control}
                                        name={`items.${index}.quantity`}
                                        render={({ field: quantityField }) => (
                                            <Input
                                                type="number"
                                                step="any"
                                                min="0.001"
                                                {...quantityField}
                                                className="w-full text-center font-medium h-8"
                                            />
                                        )}
                                    />
                                     <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => handleQuantityChange(index, 1)}>
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        <div className="w-full sm:w-28 mt-2 sm:mt-0 sm:self-end">
                            <FormLabel className="text-xs">Precio Total (IVA Inc.)</FormLabel>
                            <Input
                                type="text"
                                readOnly
                                value={formatCurrency(form.getValues(`items.${index}.totalPrice`))}
                                className="bg-muted/50 dark:bg-muted/80 border-none text-sm font-medium mt-1"
                            />
                            </div>
                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} aria-label="Eliminar artículo" className="sm:self-end mb-1">
                            <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                        </div>
                    ))}
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-24 text-muted-foreground">
                    ningun articulo añadido
                    </div>
                )}
                </ScrollArea>
                <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleOpenAddItemDialog}
                className="mt-4"
                >
                <PlusCircle className="mr-2 h-4 w-4" />
                Añadir Artículo/Servicio
                </Button>
            </CardContent>
          </Card>

          {/* Customer and Payment */}
          <Card>
              <CardContent className="pt-6 space-y-4">
                <FormField
                  control={form.control}
                  name="customerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre del Cliente</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: Cliente Mostrador" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="paymentMethod"
                  render={({ field }) => {
                    return (
                        <FormItem>
                        <FormLabel>Método de Pago</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccione método de pago" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            {paymentMethods.map(method => {
                                const Icon = paymentMethodIcons[method];
                                return (
                                <SelectItem key={method} value={method}>
                                    <div className="flex items-center gap-2">
                                    <Icon className="h-4 w-4" />
                                    <span>{method}</span>
                                    </div>
                                </SelectItem>
                                )
                            })}
                            </SelectContent>
                        </Select>
                        </FormItem>
                    );
                  }}
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
            </Card>

          {/* Totals and Submit */}
          <Card>
            <CardContent className="pt-6 flex flex-col items-end space-y-2 h-full justify-between">
                <div>
                    <div className="text-lg w-full flex justify-between"><span>Subtotal:</span> <span className="font-semibold">{formatCurrency(subTotalState)}</span></div>
                    <div className="text-sm text-muted-foreground w-full flex justify-between"><span>IVA ({(IVA_RATE*100).toFixed(0)}%):</span> <span className="font-semibold">{formatCurrency(taxState)}</span></div>
                    <div className="text-2xl font-bold w-full flex justify-between"><span>Total:</span> <span className="text-primary">{formatCurrency(totalState)}</span></div>
                </div>
                <Button type="submit" size="lg" className="w-full" disabled={form.formState.isSubmitting || fields.length === 0}>
                <Receipt className="mr-2 h-5 w-5" />
                {form.formState.isSubmitting ? "Procesando..." : "Completar Venta"}
                </Button>
            </CardContent>
          </Card>
        </div>
      </form>
    </Form>

    <Dialog open={isAddItemDialogOpen} onOpenChange={setIsAddItemDialogOpen}>
        <DialogContent className="sm:max-w-lg">
            <DialogHeader>
                <DialogTitle>Añadir Artículo/Servicio a la Venta</DialogTitle>
                <DialogDescription>
                    Busque por nombre o SKU. Puede agregar artículos medidos en unidades, ml o litros.
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        id="item-search"
                        placeholder="Buscar artículo/servicio por nombre o SKU..."
                        value={addItemSearchTerm}
                        onChange={(e) => {
                            setAddItemSearchTerm(e.target.value);
                            setSelectedInventoryItemForDialog(null);
                        }}
                        className="pl-8"
                    />
                </div>
                {addItemSearchTerm && filteredInventoryForDialog.length > 0 && !selectedInventoryItemForDialog && (
                    <ScrollArea className="h-[150px] border rounded-md">
                        <div className="p-2 space-y-1">
                            {filteredInventoryForDialog.map(item => (
                                <Button
                                    key={item.id}
                                    variant="ghost"
                                    className="w-full justify-start text-left h-auto py-1.5 px-2"
                                    onClick={() => handleSelectItemFromSearch(item)}
                                >
                                    <div>
                                        <p className="font-medium">{item.name} <span className="text-xs text-muted-foreground">({item.sku})</span></p>
                                        <p className="text-xs text-muted-foreground">
                                            {item.isService ? 'Servicio' : `Stock: ${item.quantity.toLocaleString('es-ES')}${item.unitType === 'ml' ? ' ml' : item.unitType === 'liters' ? ' L' : ''}`} | Venta: {formatCurrency(item.sellingPrice)}
                                        </p>
                                    </div>
                                </Button>
                            ))}
                        </div>
                    </ScrollArea>
                )}
                {selectedInventoryItemForDialog && (
                    <div className="p-2 border rounded-md bg-muted">
                        <p className="font-medium text-sm">Seleccionado: {selectedInventoryItemForDialog.name}</p>
                        <p className="text-xs text-muted-foreground">Precio Venta: {formatCurrency(selectedInventoryItemForDialog.sellingPrice)}</p>
                    </div>
                )}
                {addItemSearchTerm && filteredInventoryForDialog.length === 0 && !selectedInventoryItemForDialog && (
                    <div className="text-center py-2 text-sm text-muted-foreground">
                        <p>No se encontró el ítem &quot;{addItemSearchTerm}&quot;.</p>
                        <Button variant="link" size="sm" onClick={handleOpenCreateNewItemDialog} className="text-primary">
                            <PackagePlus className="mr-2 h-4 w-4"/>Crear Nuevo Ítem
                        </Button>
                    </div>
                )}
                <div className="space-y-2">
                    <Label htmlFor="item-quantity">
                        Cantidad ({selectedInventoryItemForDialog?.unitType || 'unidades'})
                    </Label>
                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setAddItemQuantity(q => Math.max(1, q - 1))}
                        >
                            <Minus className="h-4 w-4" />
                        </Button>
                        <Input
                            id="item-quantity"
                            type="number"
                            step="any"
                            min="0.001"
                            value={addItemQuantity}
                            onChange={(e) => {
                                const val = e.target.value.replace(',', '.');
                                setAddItemQuantity(parseFloat(val) || 0)
                            }}
                            className="w-20 text-center"
                        />
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setAddItemQuantity(q => q + 1)}
                        >
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
            <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddItemDialogOpen(false)}>Cancelar</Button>
                <Button type="button" onClick={handleAddItemConfirmed} disabled={!selectedInventoryItemForDialog}>Añadir Ítem Seleccionado</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>

    {isNewInventoryItemDialogOpen && (
      <InventoryItemDialog
        open={isNewInventoryItemDialogOpen}
        onOpenChange={setIsNewInventoryItemDialogOpen}
        item={newItemInitialData}
        onSave={handleNewItemCreated}
        categories={placeholderCategories}
        suppliers={placeholderSuppliers}
      />
    )}
    </>
  );
}

    

    
