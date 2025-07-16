
"use client";

import { useParams, useRouter } from 'next/navigation';
import type { InventoryItem, ServiceRecord, SaleReceipt } from '@/types';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Archive, Edit, ShieldAlert, Package, Server, ArrowRight, Loader2, ArrowLeft } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useEffect, useState, useMemo, useCallback } from 'react';
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
import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { Separator } from '@/components/ui/separator';
import { inventoryService, operationsService } from '@/lib/services';
import { parseDate } from '@/lib/forms';

interface InventoryMovement {
    date: string;
    type: 'Salida por Servicio' | 'Salida por Venta' | 'Entrada por Compra';
    quantity: number;
    relatedId: string;
    unitType?: 'units' | 'ml' | 'liters';
}

export default function InventoryItemDetailPage() {
  const params = useParams();
  const itemId = params.id as string;
  const { toast } = useToast();
  const router = useRouter();

  const [item, setItem] = useState<InventoryItem | null | undefined>(undefined);
  const [allServices, setAllServices] = useState<ServiceRecord[]>([]);
  const [allSales, setAllSales] = useState<SaleReceipt[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const fetchItemAndRelatedData = useCallback(async () => {
    if (!itemId) {
      setItem(null);
      return;
    }
    try {
      const fetchedItem = await inventoryService.getDocById('inventory', itemId);
      setItem(fetchedItem || null);

      if (fetchedItem) {
        const [servicesData, salesData, categoriesData, suppliersData] = await Promise.all([
            operationsService.onServicesUpdatePromise(),
            operationsService.onSalesUpdatePromise(),
            inventoryService.onCategoriesUpdatePromise(),
            inventoryService.onSuppliersUpdatePromise()
        ]);
        setAllServices(servicesData);
        setAllSales(salesData);
        setCategories(categoriesData);
        setSuppliers(suppliersData);
      }
    } catch (error) {
        console.error("Error fetching item details:", error);
        setItem(null);
        toast({ title: 'Error', description: 'No se pudieron cargar los datos del ítem.', variant: 'destructive' });
    }
  }, [itemId, toast]);

  useEffect(() => {
    fetchItemAndRelatedData();
  }, [fetchItemAndRelatedData]);

  const history = useMemo((): InventoryMovement[] => {
    if (!item) return [];

    const serviceExits = allServices.flatMap(service =>
      (service.serviceItems || [])
        .flatMap(item => item.suppliesUsed || [])
        .filter(supply => supply.supplyId === item.id)
        .map(supply => ({
          date: service.deliveryDateTime || service.serviceDate,
          type: 'Salida por Servicio' as const,
          quantity: supply.quantity,
          relatedId: service.id,
          unitType: item.unitType,
        }))
    );

    const saleExits = allSales.flatMap(sale =>
      (sale.items || [])
        .filter(saleItem => saleItem.inventoryItemId === item.id)
        .map(saleItem => ({
          date: sale.saleDate,
          type: 'Salida por Venta' as const,
          quantity: saleItem.quantity,
          relatedId: sale.id,
          unitType: item.unitType,
        }))
    );
    
    // NOTE: Purchase history (Entrada) would need to be sourced from a 'purchases' collection if it existed.
    const allMovements = [...serviceExits, ...saleExits]
        .filter(move => move.date && isValid(parseDate(move.date)!))
        .sort((a,b) => parseDate(b.date)!.getTime() - parseDate(a.date)!.getTime());
        
    return allMovements;
  }, [item, allServices, allSales]);

  const handleSaveEditedItem = async (formData: InventoryItemFormValues) => {
    if (!item) return;

    try {
      await inventoryService.saveItem(formData, item.id);
      const updatedItem = await inventoryService.getDocById('inventory', item.id);
      setItem(updatedItem);
      setIsEditDialogOpen(false);
      toast({
        title: "Ítem Actualizado",
        description: `Los datos de ${formData.name} han sido actualizados.`,
      });
    } catch (e) {
      console.error(e);
      toast({
        title: "Error al actualizar",
        description: "No se pudo guardar el ítem.",
        variant: 'destructive',
      });
    }
  };
  
  const handleDeleteItem = async () => {
    if (!item) return;
    try {
        await inventoryService.deleteDoc('inventory', item.id);
        toast({
            title: "Ítem Eliminado",
            description: `${item.name} ha sido eliminado.`,
            variant: "destructive",
        });
        router.push('/inventario'); 
    } catch(e) {
         toast({ title: "Error", description: "No se pudo eliminar el ítem.", variant: "destructive" });
    }
  };


  if (item === undefined) {
    return <div className="container mx-auto py-8 text-center flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin" /> Cargando datos del ítem...</div>;
  }

  if (!item) {
    return (
      <div className="container mx-auto py-8 text-center">
        <ShieldAlert className="mx-auto h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold">Ítem no encontrado</h1>
        <p className="text-muted-foreground">No se pudo encontrar un ítem con el ID: {itemId}.</p>
        <Button asChild className="mt-6">
          <Link href="/inventario">Volver a Productos y Servicios</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-4">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
      </div>
      <PageHeader
        title={item.name}
        description={`Marca: ${item.brand || 'N/A'} | SKU: ${item.sku || 'N/A'} | ID: ${item.id}`}
      />

      <Tabs defaultValue="details" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-2 lg:w-1/3 mb-6">
          <TabsTrigger value="details" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Información del Ítem</TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Historial</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <div className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  {item.isService ? <Server className="h-5 w-5 text-muted-foreground"/> : <Package className="h-5 w-5 text-muted-foreground"/>}
                  Detalles del {item.isService ? 'Servicio' : 'Producto'}
                </CardTitle>
                <Button variant="outline" size="sm" onClick={() => setIsEditDialogOpen(true)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </Button>
              </CardHeader>
              <CardContent className="space-y-6">
                  <div>
                      <p className="text-sm font-medium text-muted-foreground">Nombre del Producto/Servicio</p>
                      <h2 className="text-2xl font-bold">{item.name}</h2>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                      <div>
                          <p className="text-sm font-medium text-muted-foreground">Marca</p>
                          <p className="font-semibold">{item.brand || 'N/A'}</p>
                      </div>
                      <div>
                          <p className="text-sm font-medium text-muted-foreground">SKU / Código</p>
                          <p className="font-semibold">{item.sku || 'N/A'}</p>
                      </div>
                  </div>

                  <div>
                      <p className="text-sm font-medium text-muted-foreground">Descripción</p>
                      <p className="text-base text-foreground whitespace-pre-wrap mt-1">{item.description || 'Sin descripción.'}</p>
                  </div>
                  
                  {item.rendimiento && (
                      <div>
                          <p className="text-sm font-medium text-muted-foreground">Rendimiento</p>
                          <p className="font-semibold">{item.rendimiento.toLocaleString('es-ES')} km</p>
                      </div>
                  )}

                  <Separator />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                      <div>
                          <p className="text-sm font-medium text-muted-foreground">Categoría</p>
                          <p className="font-semibold">{item.category}</p>
                      </div>
                      <div>
                          <p className="text-sm font-medium text-muted-foreground">Proveedor</p>
                          <p className="font-semibold">{item.supplier}</p>
                      </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-4">
                      <div>
                          <p className="text-sm font-medium text-muted-foreground">Costo (Taller)</p>
                          <p className="font-semibold">${item.unitPrice.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</p>
                      </div>
                      <div>
                          <p className="text-sm font-medium text-muted-foreground">Precio Venta (Cliente)</p>
                          <p className="font-semibold">${item.sellingPrice.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</p>
                      </div>
                      <div>
                          <p className="text-sm font-medium text-muted-foreground">Tipo</p>
                          <p className="font-semibold">{item.isService ? 'Servicio' : 'Producto'}</p>
                      </div>
                      {!item.isService && (
                          <>
                              <div>
                                  <p className="text-sm font-medium text-muted-foreground">Stock Actual</p>
                                  <p className="font-semibold">{item.quantity}</p>
                              </div>
                              <div>
                                  <p className="text-sm font-medium text-muted-foreground">Stock Bajo</p>
                                  <p className="font-semibold">{item.lowStockThreshold}</p>
                              </div>
                          </>
                      )}
                  </div>
              </CardContent>
            </Card>
          </div>
          <div className="mt-8 flex justify-start">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" >
                  <Archive className="mr-2 h-4 w-4" />
                  Eliminar Ítem
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Estás seguro de eliminar este ítem?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción no se puede deshacer y eliminará permanentemente el ítem {item.name} del inventario.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteItem} className="bg-destructive hover:bg-destructive/90">
                    Sí, Eliminar
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
              <CardDescription>Entradas y salidas del producto. Las entradas se registran desde la pantalla principal de inventario.</CardDescription>
            </CardHeader>
            <CardContent>
                {history.length > 0 ? (
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead>Tipo de Movimiento</TableHead>
                                    <TableHead className="text-right">Cantidad</TableHead>
                                    <TableHead>ID Relacionado</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {history.map((move, index) => {
                                  const date = parseDate(move.date);
                                  return (
                                    <TableRow key={`${move.relatedId}-${index}`}>
                                        <TableCell>{date ? format(date, 'dd MMM yyyy, HH:mm', { locale: es }) : 'Fecha no disponible'}</TableCell>
                                        <TableCell>
                                            <Badge variant={move.type === 'Salida por Venta' ? 'destructive' : 'secondary'}>{move.type}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right font-medium">
                                            {move.type.startsWith('Salida') ? '-' : '+'}
                                            {move.quantity} {move.unitType === 'ml' ? 'ml' : move.unitType === 'liters' ? 'L' : ''}
                                        </TableCell>
                                        <TableCell>
                                            <Link 
                                                href={move.type === 'Salida por Venta' ? `/pos?id=${move.relatedId}` : `/servicios/historial?id=${move.relatedId}`}
                                                className="text-primary hover:underline flex items-center gap-1"
                                            >
                                                {move.relatedId} <ArrowRight className="h-3 w-3"/>
                                            </Link>
                                        </TableCell>
                                    </TableRow>
                                )})}
                            </TableBody>
                        </Table>
                    </div>
                ) : (
                    <p className="text-muted-foreground text-center py-4">No hay historial de movimientos para este producto.</p>
                )}
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
            categories={categories} 
            suppliers={suppliers}
          />
      )}
    </div>
  );
}
