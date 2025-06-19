
"use client";

import { useParams, useRouter } from 'next/navigation';
import { placeholderInventory, placeholderCategories } from '@/lib/placeholder-data'; // Import placeholderCategories
import type { InventoryItem } from '@/types';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Archive, Edit, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { InventoryItemDialog } from '../components/inventory-item-dialog';
import type { InventoryItemFormValues } from '../components/inventory-item-form';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function InventoryItemDetailPage() {
  const params = useParams();
  const itemId = params.id as string;
  const { toast } = useToast();
  const router = useRouter();

  const [item, setItem] = useState<InventoryItem | null | undefined>(undefined);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  useEffect(() => {
    const foundItem = placeholderInventory.find(i => i.id === itemId);
    setItem(foundItem || null);
  }, [itemId]);

  const handleSaveEditedItem = async (formData: InventoryItemFormValues) => {
    if (!item) return;

    const updatedItemData: Partial<InventoryItem> = {
      ...formData,
      unitPrice: Number(formData.unitPrice),
      sellingPrice: Number(formData.sellingPrice),
      quantity: Number(formData.quantity),
      lowStockThreshold: Number(formData.lowStockThreshold),
      // category is already a string from formData
    };
    
    const updatedItem = { ...item, ...updatedItemData } as InventoryItem;
    setItem(updatedItem);

    const pIndex = placeholderInventory.findIndex(i => i.id === updatedItem.id);
    if (pIndex !== -1) {
      placeholderInventory[pIndex] = updatedItem;
    }

    setIsEditDialogOpen(false);
    toast({
      title: "Artículo Actualizado",
      description: `Los datos del artículo ${updatedItem.name} han sido actualizados.`,
    });
  };
  
  const handleDeleteItem = () => {
    if (!item) return;
    const itemIndex = placeholderInventory.findIndex(i => i.id === item.id);
    if (itemIndex > -1) {
      placeholderInventory.splice(itemIndex, 1);
    }
    toast({
      title: "Artículo Eliminado",
      description: `El artículo ${item.name} ha sido eliminado.`,
    });
    router.push('/inventario');
  };


  if (item === undefined) {
    return <div className="container mx-auto py-8 text-center">Cargando datos del artículo...</div>;
  }

  if (!item) {
    return (
      <div className="container mx-auto py-8 text-center">
        <ShieldAlert className="mx-auto h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold">Artículo no encontrado</h1>
        <p className="text-muted-foreground">No se pudo encontrar un artículo con el ID: {itemId}.</p>
        <Button asChild className="mt-6">
          <Link href="/inventario">Volver a Inventario</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <PageHeader
        title={`${item.name} (Código: ${item.sku})`}
        description={`ID Artículo: ${item.id}`}
      />

      <Tabs defaultValue="details" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-2 lg:w-1/3 mb-6">
          <TabsTrigger value="details" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Información del Producto</TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Historial (Pendiente)</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <div className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Detalles del Artículo</CardTitle>
                <Button variant="outline" size="sm" onClick={() => setIsEditDialogOpen(true)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </Button>
              </CardHeader>
              <CardContent className="space-y-2">
                <p><strong>Código (SKU):</strong> {item.sku}</p>
                <p><strong>Nombre:</strong> {item.name}</p>
                <p><strong>Categoría:</strong> {item.category}</p>
                <p><strong>Descripción:</strong> {item.description || 'N/A'}</p>
                <p><strong>Cantidad en Stock:</strong> {item.quantity}</p>
                <p><strong>Costo Unitario:</strong> ${item.unitPrice.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                <p><strong>Precio de Venta:</strong> ${item.sellingPrice.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                <p><strong>Umbral de Stock Bajo:</strong> {item.lowStockThreshold}</p>
                <p><strong>Proveedor:</strong> {item.supplier || 'N/A'}</p>
              </CardContent>
            </Card>
          </div>
          <div className="mt-8 flex justify-start">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" >
                  <Archive className="mr-2 h-4 w-4" />
                  Archivar Artículo
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Estás seguro de archivar/eliminar este artículo?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción no se puede deshacer fácilmente y eliminará el artículo del inventario activo.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteItem} className="bg-destructive hover:bg-destructive/90">
                    Sí, Archivar/Eliminar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Movimientos</CardTitle>
              <CardDescription>Esta sección mostrará el historial de entradas y salidas del artículo (Pendiente de implementación).</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Funcionalidad pendiente.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      {item && (
         <InventoryItemDialog
            open={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
            item={item}
            onSave={handleSaveEditedItem}
            // categories prop removed here, as InventoryItemDialog now imports placeholderCategories directly
          />
      )}
    </div>
  );
}
