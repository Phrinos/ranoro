// src/app/(app)/inventario/components/register-purchase-dialog.tsx

"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useForm, FormProvider, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, PackagePlus, Plus, Minus, ArrowLeft, DollarSign, PlusCircle, Trash2, CalendarIcon } from 'lucide-react';
import type { InventoryItem, Supplier, InventoryCategory } from '@/types';
import { formatCurrency, capitalizeWords } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { InventoryItemDialog } from './inventory-item-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format as formatDate } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { InventoryItemFormValues } from '@/schemas/inventory-item-form-schema';


const purchaseItemSchema = z.object({
  inventoryItemId: z.string(),
  itemName: z.string(),
  quantity: z.coerce.number().min(0.01, "La cantidad debe ser mayor a 0."),
  purchasePrice: z.coerce.number().min(0, "El costo debe ser un número positivo."),
});

const purchaseFormSchema = z.object({
  supplierId: z.string().min(1, "Debe seleccionar un proveedor."),
  invoiceId: z.string().optional(),
  items: z.array(purchaseItemSchema).min(1, "Debe añadir al menos un artículo a la compra."),
  paymentMethod: z.enum(['Efectivo', 'Tarjeta', 'Transferencia', 'Crédito']),
  dueDate: z.date().optional(),
  invoiceTotal: z.coerce.number().min(0.01, "El total debe ser mayor a cero.")
}).refine((data) => {
    if (data.paymentMethod === 'Crédito' && !data.dueDate) {
        return false;
    }
    return true;
}, {
    message: 'La fecha de vencimiento es obligatoria para compras a crédito.',
    path: ['dueDate'],
});


export type PurchaseFormValues = z.infer<typeof purchaseFormSchema>;

interface RegisterPurchaseDialogProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  suppliers: Supplier[];
  inventoryItems: InventoryItem[];
  categories: InventoryCategory[];
  onSave: (data: PurchaseFormValues) => void;
  onInventoryItemCreated: (formData: InventoryItemFormValues) => Promise<InventoryItem>;
}

export default function RegisterPurchaseDialog({ 
    open, onOpenChange, suppliers, inventoryItems, categories, onSave, onInventoryItemCreated 
}: RegisterPurchaseDialogProps) {
  const { toast } = useToast();
  const form = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseFormSchema),
    defaultValues: { items: [], paymentMethod: 'Efectivo' }
  });

  const { control, handleSubmit, watch, setValue } = form;
  const { fields, append, remove, update } = useFieldArray({ control, name: 'items' });
  const watchedItems = watch('items');
  const paymentMethod = watch('paymentMethod');
  
  const [isItemSearchOpen, setIsItemSearchOpen] = useState(false);
  const [isNewItemDialogOpen, setIsNewItemDialogOpen] = useState(false);
  const [newItemSearchTerm, setNewItemSearchTerm] = useState('');

  useEffect(() => {
    const total = watchedItems.reduce((sum, item) => sum + (item.quantity * item.purchasePrice), 0);
    setValue('invoiceTotal', total, { shouldValidate: true });
  }, [watchedItems, setValue]);


  const handleAddItem = (item: InventoryItem) => {
    append({
        inventoryItemId: item.id,
        itemName: item.name,
        quantity: 1,
        purchasePrice: item.unitPrice
    });
    setIsItemSearchOpen(false);
  };
  
  const handleNewItemRequest = (searchTerm: string) => {
    setNewItemSearchTerm(searchTerm);
    setIsItemSearchOpen(false);
    setIsNewItemDialogOpen(true);
  };

  const handleNewItemSaved = async (formData: InventoryItemFormValues) => {
    const newItem = await onInventoryItemCreated(formData);
    append({
        inventoryItemId: newItem.id,
        itemName: newItem.name,
        quantity: 1,
        purchasePrice: newItem.unitPrice
    });
    setIsNewItemDialogOpen(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Registrar Nueva Compra</DialogTitle>
            <DialogDescription>
              Seleccione un proveedor, añada los productos comprados y especifique los detalles del pago.
            </DialogDescription>
          </DialogHeader>
          <FormProvider {...form}>
            <Form {...form}>
              <form onSubmit={handleSubmit(onSave)} id="purchase-form" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={control} name="supplierId" render={({ field }) => (
                    <FormItem><FormLabel>Proveedor</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Seleccione un proveedor" /></SelectTrigger></FormControl>
                        <SelectContent><ScrollArea className="h-48">{suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</ScrollArea></SelectContent>
                      </Select><FormMessage />
                    </FormItem>
                  )}/>
                   <FormField control={control} name="invoiceId" render={({ field }) => (
                     <FormItem><FormLabel>Folio de Factura (Opcional)</FormLabel><FormControl><Input placeholder="F-12345" {...field} value={field.value ?? ''} /></FormControl></FormItem>
                   )}/>
                </div>
                
                <div>
                    <FormLabel>Artículos Comprados</FormLabel>
                    <div className="space-y-2 mt-2 rounded-md border p-2">
                        {fields.map((field, index) => (
                           <div key={field.id} className="flex items-center gap-2">
                             <span className="flex-1 text-sm">{field.itemName}</span>
                             <FormField control={control} name={`items.${index}.quantity`} render={({ field }) => (
                                <Input type="number" step="1" className="w-20 h-8" placeholder="Cant." {...field}/>
                             )}/>
                             <FormField control={control} name={`items.${index}.purchasePrice`} render={({ field }) => (
                                <div className="relative"><DollarSign className="absolute left-2.5 top-1.5 h-4 w-4 text-muted-foreground" /><Input type="number" step="0.01" className="w-28 h-8 pl-8" placeholder="Costo U." {...field}/></div>
                             )}/>
                             <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                           </div>
                        ))}
                         <Button type="button" variant="outline" size="sm" onClick={() => setIsItemSearchOpen(true)}><PlusCircle className="mr-2 h-4 w-4"/>Añadir Artículo</Button>
                    </div>
                    <FormMessage>{form.formState.errors.items?.message || form.formState.errors.items?.root?.message}</FormMessage>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <FormField control={control} name="paymentMethod" render={({ field }) => (
                        <FormItem><FormLabel>Método de Pago</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                            <SelectContent>
                                <SelectItem value="Efectivo">Efectivo</SelectItem>
                                <SelectItem value="Tarjeta">Tarjeta</SelectItem>
                                <SelectItem value="Transferencia">Transferencia</SelectItem>
                                <SelectItem value="Crédito">Crédito</SelectItem>
                            </SelectContent>
                          </Select><FormMessage />
                        </FormItem>
                    )}/>
                    {paymentMethod === 'Crédito' && (
                        <FormField control={control} name="dueDate" render={({ field }) => (
                            <FormItem className="flex flex-col"><FormLabel>Fecha de Vencimiento</FormLabel>
                                <Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("pl-3 text-left font-normal",!field.value && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4 opacity-50"/>{field.value ? formatDate(field.value, "PPP", { locale: es }) : <span>Seleccione fecha</span>}</Button></FormControl></PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus locale={es}/></PopoverContent>
                                </Popover><FormMessage/>
                            </FormItem>
                        )}/>
                    )}
                </div>
                 <div className="text-right font-bold text-lg">
                    Total: {formatCurrency(watch('invoiceTotal'))}
                </div>

              </form>
            </Form>
          </FormProvider>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" form="purchase-form">Registrar Compra</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <SearchItemDialog 
        open={isItemSearchOpen}
        onOpenChange={setIsItemSearchOpen}
        inventoryItems={inventoryItems}
        onItemSelected={handleAddItem}
        onNewItemRequest={handleNewItemRequest}
      />
      
       <InventoryItemDialog
        open={isNewItemDialogOpen}
        onOpenChange={setIsNewItemDialogOpen}
        onSave={handleNewItemSaved}
        item={{ name: newItemSearchTerm }}
        categories={categories}
        suppliers={suppliers}
      />
    </>
  );
}


// --- SearchItemDialog Sub-component ---
interface SearchItemDialogProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  inventoryItems: InventoryItem[];
  onItemSelected: (item: InventoryItem) => void;
  onNewItemRequest: (searchTerm: string) => void;
}

function SearchItemDialog({ open, onOpenChange, inventoryItems, onItemSelected, onNewItemRequest }: SearchItemDialogProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return inventoryItems.filter(item => !item.isService).slice(0, 15);
    const lowerSearchTerm = searchTerm.toLowerCase();
    return inventoryItems.filter(item => !item.isService && (item.name.toLowerCase().includes(lowerSearchTerm) || (item.sku && item.sku.toLowerCase().includes(lowerSearchTerm))));
  }, [searchTerm, inventoryItems]);

  return (
      <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                  <DialogTitle>Buscar Artículo en Inventario</DialogTitle>
                  <DialogDescription>Seleccione un artículo para añadir a la compra.</DialogDescription>
              </DialogHeader>
              <div className="relative my-4">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Buscar por nombre o SKU..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-8" />
              </div>
              <ScrollArea className="h-72">
                  <div className="p-2 space-y-1">
                      {filteredItems.map(item => (
                          <Button key={item.id} variant="ghost" className="w-full justify-start text-left h-auto" onClick={() => onItemSelected(item)}>
                              <div><p className="font-medium">{item.name}</p><p className="text-xs text-muted-foreground">Stock: {item.quantity}</p></div>
                          </Button>
                      ))}
                      {searchTerm && filteredItems.length === 0 && (
                          <Button variant="link" onClick={() => onNewItemRequest(searchTerm)}><PackagePlus className="mr-2 h-4 w-4"/>Crear "{searchTerm}"</Button>
                      )}
                  </div>
              </ScrollArea>
          </DialogContent>
      </Dialog>
  )
}
