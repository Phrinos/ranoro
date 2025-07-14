

"use client";

import { useState, useEffect, useCallback } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PageHeader } from "@/components/page-header";
import { PosForm } from "../components/pos-form";
import type { SaleReceipt, InventoryItem, PaymentMethod, InventoryCategory, Supplier } from '@/types'; 
import { useToast } from "@/hooks/use-toast";
import { useRouter } from 'next/navigation';
import { inventoryService, operationsService } from '@/lib/services';
import { Loader2 } from 'lucide-react';
import type { InventoryItemFormValues } from '../../inventario/components/inventory-item-form';
import { db } from '@/lib/firebaseClient';
import { writeBatch, doc } from 'firebase/firestore';

// --- Schema Definitions ---
const saleItemSchema = z.object({
  inventoryItemId: z.string().min(1, "Seleccione un artículo."),
  itemName: z.string(),
  quantity: z.coerce.number().min(0.001, "La cantidad debe ser mayor a 0."),
  unitPrice: z.coerce.number(),
  totalPrice: z.coerce.number(),
  isService: z.boolean().optional(),
  unitType: z.enum(['units', 'ml', 'liters']).optional(),
});

const paymentMethods: [PaymentMethod, ...PaymentMethod[]] = [
  "Efectivo", "Tarjeta", "Transferencia", "Efectivo+Transferencia", "Tarjeta+Transferencia"
];

const posFormSchema = z.object({
  items: z.array(saleItemSchema).min(1, "Debe agregar al menos un artículo a la venta."),
  customerName: z.string().optional(),
  paymentMethod: z.enum(paymentMethods).default("Efectivo"),
  cardFolio: z.string().optional(),
  transferFolio: z.string().optional(),
}).refine(data => {
  if ((data.paymentMethod === "Tarjeta" || data.paymentMethod === "Tarjeta+Transferencia") && !data.cardFolio) return false;
  return true;
}, { message: "El folio de la tarjeta es obligatorio.", path: ["cardFolio"] })
.refine(data => {
  if ((data.paymentMethod === "Transferencia" || data.paymentMethod === "Efectivo+Transferencia" || data.paymentMethod === "Tarjeta+Transferencia") && !data.transferFolio) return false;
  return true;
}, { message: "El folio de la transferencia es obligatorio.", path: ["transferFolio"] });

type POSFormValues = z.infer<typeof posFormSchema>;

export default function NuevaVentaPage() {
  const { toast } = useToast(); 
  const router = useRouter();
  
  const [currentInventoryItems, setCurrentInventoryItems] = useState<InventoryItem[]>([]);
  const [allCategories, setAllCategories] = useState<InventoryCategory[]>([]);
  const [allSuppliers, setAllSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const methods = useForm<POSFormValues>({
    resolver: zodResolver(posFormSchema),
    defaultValues: {
      items: [],
      customerName: "Cliente Mostrador",
      paymentMethod: "Efectivo",
      cardFolio: "",
      transferFolio: "",
    },
  });

  useEffect(() => {
    const unsubs = [
      inventoryService.onItemsUpdate((items) => {
        setCurrentInventoryItems(items);
        setIsLoading(false); // Only set loading to false after items are fetched
      }),
      inventoryService.onCategoriesUpdate(setAllCategories),
      inventoryService.onSuppliersUpdate(setAllSuppliers),
    ];
    return () => unsubs.forEach(unsub => unsub());
  }, []);

  const handleSaleCompletion = async (values: POSFormValues) => {
    if (!db) return;
    const batch = writeBatch(db);
    try {
      const saleId = await operationsService.registerSale(values, currentInventoryItems, batch);
      await batch.commit();

      const newSaleReceipt: SaleReceipt = {
        id: saleId,
        saleDate: new Date().toISOString(),
        ...values,
        subTotal: 0, // Recalculate or get from service
        tax: 0,
        totalAmount: values.items.reduce((sum, item) => sum + item.totalPrice, 0),
        status: 'Completado'
      };
      
      toast({ title: 'Venta Registrada', description: `La venta #${saleId} se ha completado.` });
      router.push('/pos');
    } catch(e) {
      console.error(e);
      toast({ title: "Error al Registrar Venta", variant: "destructive"});
    }
  };
  
  const handleNewInventoryItemCreated = async (formData: InventoryItemFormValues): Promise<InventoryItem> => {
    const newItem = await inventoryService.addItem(formData);
    return newItem;
  };

  if (isLoading) {
      return <div className="text-center p-8 text-muted-foreground flex justify-center items-center"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Cargando...</div>;
  }

  return (
    <FormProvider {...methods}>
      <PageHeader
        title="Registrar Nueva Venta"
        description="Complete los artículos y detalles para la nueva venta."
      />
      
      <PosForm
        inventoryItems={currentInventoryItems} 
        onSaleComplete={handleSaleCompletion}
        onInventoryItemCreated={handleNewInventoryItemCreated}
        categories={allCategories}
        suppliers={allSuppliers}
      />
    </FormProvider>
  );
}
