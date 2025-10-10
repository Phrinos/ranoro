
// src/app/(app)/inventario/[id]/page.tsx
"use client";

import { useParams, useRouter } from "next/navigation";
import type { InventoryItem, ServiceRecord, InventoryCategory, Supplier } from '@/types';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ShieldAlert, Edit, CalendarCheck, Package, DollarSign, Boxes, Trash2, ArrowRight, Loader2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebaseClient";

import { format, isValid } from "date-fns";
import { es } from 'date-fns/locale';
import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { InventoryItemDialog } from '../components/inventory-item-dialog';
import type { InventoryItemFormValues } from '../components/inventory-item-form';
import { useToast } from '@/hooks/use-toast';
import { inventoryService, serviceService } from '@/lib/services';
import { parseDate } from '@/lib/forms';
import { UnifiedPreviewDialog } from "@/components/shared/unified-preview-dialog";
import { formatNumber, formatCurrency } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

// Helpers locales
const unitLabel = (ut?: string) => (ut === 'ml' ? 'ml' : ut === 'liters' ? 'L' : '');
const safeNumber = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

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
  const [allSales, setAllSales] = useState<any[]>([]); // Using any for sales to avoid type conflicts if structure varies
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  useEffect(() => {
    if (!itemId) {
      setItem(null);
      return;
    }
  
    const fetchItemAndRelatedData = async () => {
      try {
        const fetchedItem = await inventoryService.getDocById('inventory', itemId);
        setItem(fetchedItem);
  
        if (fetchedItem) {
          const [servicesData, salesData, categoriesData, suppliersData] = await Promise.all([
            serviceService.onServicesUpdatePromise(),
            getDocs(collection(db, 'sales')).then(snap => snap.docs.map(d => ({...d.data(), id: d.id}))),
            inventoryService.onCategoriesUpdatePromise(),
            inventoryService.onSuppliersUpdatePromise(),
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
    };
  
    fetchItemAndRelatedData();
  }, [itemId, toast]);

  const history = useMemo<InventoryMovement[]>(() => {
    if (!item) return [];
    const currentItemId = item.id;

    const serviceExits: InventoryMovement[] = allServices.flatMap((svc) =>
      (svc.serviceItems ?? [])
        .flatMap((svcItem: any) => (svcItem.suppliesUsed ?? []))
        .filter((sup: any) => sup.supplyId === currentItemId)
        .map((sup: any) => ({
          date: svc.deliveryDateTime ?? svc.serviceDate ?? svc.receptionDateTime ?? '',
          type: 'Salida por Servicio' as const,
          quantity: safeNumber(sup.quantity),
          relatedId: svc.id,
          unitType: item.unitType as any,
        }))
    );

    const saleExits: InventoryMovement[] = allSales.flatMap((sale) =>
      (sale.items ?? [])
        .filter((si: any) => si.inventoryItemId === currentItemId)
        .map((si: any) => ({
          date: sale.saleDate ?? (sale as any)?.createdAt ?? '',
          type: 'Salida por Venta' as const,
          quantity: safeNumber(si.quantity),
          relatedId: sale.id,
          unitType: item.unitType as any,
        }))
    );

    const movements = [...serviceExits, ...saleExits]
      .map((m) => {
        const d = parseDate(m.date);
        return d && isValid(d) ? { ...m, _parsed: d } : null;
      })
      .filter(Boolean) as (InventoryMovement & { _parsed: Date })[];

    movements.sort((a, b) => b._parsed.getTime() - a._parsed.getTime());

    return movements.map(({ _parsed, ...rest }) => rest);
  }, [item, allServices, allSales]);

  const kpis = useMemo(() => {
    const salidaServicio = history.filter((m) => m.type === 'Salida por Servicio').reduce((a, b) => a + b.quantity, 0);
    const salidaVenta = history.filter((m) => m.type === 'Salida por Venta').reduce((a, b) => a + b.quantity, 0);
    return {
      salidaServicio,
      salidaVenta,
      totalSalidas: salidaServicio + salidaVenta,
    };
  }, [history]);
  
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
      await inventoryService.deleteItem(item.id);
      toast({
        title: "Ítem Eliminado",
        description: `${item.name} ha sido eliminado.`,
        variant: "destructive",
      });
      router.push('/inventario');
    } catch (e) {
      toast({ title: "Error", description: "No se pudo eliminar el ítem.", variant: "destructive" });
    }
  };


  if (item === undefined) {
    return (
      <div className="container mx-auto py-8 text-center flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />&nbsp;Cargando datos del ítem...
      </div>
    );
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
      <PageHeader title={item.name} description={`ID: ${item.id}`} />

      <Tabs defaultValue="details" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="details" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Información del Ítem
          </TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Historial
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <div className="space-y-6">
             <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5 text-muted-foreground" />
                      Detalles del Producto/Servicio
                    </CardTitle>
                    <div className="flex items-center gap-2">
                        <ConfirmDialog
                          triggerButton={
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          }
                          title={`¿Estás seguro de eliminar "${item.name}"?`}
                          description="Esta acción no se puede deshacer y eliminará permanentemente el ítem del inventario."
                          onConfirm={handleDeleteItem}
                          confirmText="Sí, Eliminar"
                        />
                        <Button variant="ghost" size="icon" onClick={() => setIsEditDialogOpen(true)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-primary">{item.isService ? 'Servicio' : 'Producto'}</p>
                    <div className="flex items-baseline gap-2 mt-1">
                      <h2 className="text-2xl font-bold">{item.name}</h2>
                      <p className="text-sm text-muted-foreground">(SKU: {item.sku || 'N/A'})</p>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {item.category} | {item.brand || 'N/A'} | {item.supplier}
                    </p>
                  </div>
                  {item.description && (
                    <div className="pt-2">
                      <p className="text-sm text-foreground whitespace-pre-wrap mt-1">{item.description}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5 text-muted-foreground" />Precios y Ganancia</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div><p className="text-sm font-medium text-muted-foreground">Costo (Taller)</p><p className="font-semibold text-lg">{formatCurrency(item.unitPrice)}</p></div>
                        <div><p className="text-sm font-medium text-muted-foreground">Precio Venta (Cliente)</p><p className="font-semibold text-lg text-primary">{formatCurrency(item.sellingPrice)}</p></div>
                        <Separator />
                        <div><p className="text-sm font-medium text-muted-foreground">Ganancia Bruta</p><p className="font-bold text-lg text-green-600">{formatCurrency(item.sellingPrice - item.unitPrice)} ({(100 * (item.sellingPrice - item.unitPrice) / item.sellingPrice).toFixed(1)}%)</p></div>
                    </CardContent>
                </Card>
                {!item.isService && (
                    <Card>
                        <CardHeader><CardTitle className="flex items-center gap-2"><Boxes className="h-5 w-5 text-muted-foreground" />Control de Stock</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                             <div className="flex items-center gap-2">
                                <div><p className="text-sm font-medium text-muted-foreground">Stock Actual</p><p className={`font-semibold text-lg ${item.quantity <= item.lowStockThreshold ? 'text-red-600' : ''}`}>{item.quantity} {unitLabel(item.unitType as any)}</p></div>
                                {item.quantity <= item.lowStockThreshold && (<Badge variant="destructive">Bajo stock</Badge>)}
                            </div>
                            <div><p className="text-sm font-medium text-muted-foreground">Umbral de Stock Bajo</p><p className="font-semibold text-lg">{item.lowStockThreshold ?? '—'}</p></div>
                        </CardContent>
                    </Card>
                )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <Card className="mb-4">
            <CardHeader><CardTitle>Resumen de Movimientos</CardTitle><CardDescription>Totales calculados sobre el periodo mostrado.</CardDescription></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-md border p-4"><p className="text-sm text-muted-foreground">Salida por Servicio</p><p className="text-2xl font-bold">{kpis.salidaServicio} {unitLabel(item.unitType as any)}</p></div>
                <div className="rounded-md border p-4"><p className="text-sm text-muted-foreground">Salida por Venta</p><p className="text-2xl font-bold">{kpis.salidaVenta} {unitLabel(item.unitType as any)}</p></div>
                <div className="rounded-md border p-4"><p className="text-sm text-muted-foreground">Total Salidas</p><p className="text-2xl font-bold">{kpis.totalSalidas} {unitLabel(item.unitType as any)}</p></div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Historial de Movimientos</CardTitle><CardDescription>Entradas y salidas del producto. Las entradas se registran desde la pantalla principal de inventario.</CardDescription></CardHeader>
            <CardContent>
              {history.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Tipo de Movimiento</TableHead><TableHead className="text-right">Cantidad</TableHead><TableHead>ID Relacionado</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {history.map((move, index) => {
                        const date = parseDate(move.date);
                        const qtyPrefix = move.type.startsWith('Salida') ? '-' : '+';
                        return (
                          <TableRow key={`${move.relatedId}-${index}`}>
                            <TableCell>{date ? format(date, 'dd MMM yyyy, HH:mm', { locale: es }) : 'Fecha no disponible'}</TableCell>
                            <TableCell><Badge variant={move.type === 'Salida por Venta' ? 'destructive' : 'secondary'}>{move.type}</Badge></TableCell>
                            <TableCell className="text-right font-medium">{qtyPrefix}{move.quantity} {unitLabel(move.unitType as any)}</TableCell>
                            <TableCell>
                              <Link href={move.type === 'Salida por Venta' ? `/pos?id=${move.relatedId}` : `/servicios/${move.relatedId}`} className="text-primary hover:underline flex items-center gap-1">
                                {move.relatedId} <ArrowRight className="h-3 w-3" />
                              </Link>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : ( <p className="text-muted-foreground text-center py-4">No hay historial de movimientos para este producto.</p> )}
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
