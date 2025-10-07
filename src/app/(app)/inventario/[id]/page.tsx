// src/app/(app)/inventario/[id]/page.tsx
"use client";

import { useParams, useRouter } from 'next/navigation';
import type { InventoryItem, ServiceRecord, SaleReceipt, InventoryCategory, Supplier } from '@/types';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Archive, Edit, ShieldAlert, Package, ArrowRight, Loader2, ArrowLeft, DollarSign, Boxes } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { InventoryItemDialog } from '../components/inventory-item-dialog';
import type { InventoryItemFormValues } from '../components/inventory-item-form';
import { useToast } from '@/hooks/use-toast';
import { format, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { inventoryService, saleService, serviceService } from '@/lib/services';
import { parseDate } from '@/lib/forms';
import { formatCurrency } from '@/lib/utils';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';

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
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Helpers locales
  const unitLabel = (ut?: string) => (ut === 'ml' ? 'ml' : ut === 'liters' ? 'L' : '');
  const safeNumber = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

  const fetchItemAndRelatedData = useCallback(async () => {
    if (!itemId) {
      setItem(null);
      return;
    }
    try {
      const fetchedItem = await inventoryService.getDocById('inventory', itemId);
      setItem(fetchedItem);

      if (fetchedItem) {
        const [servicesData, salesData, categoriesData, suppliersData] = await Promise.all([
          serviceService.onServicesUpdatePromise(),
          saleService.onSalesUpdatePromise(),
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
  }, [itemId, toast]);

  useEffect(() => {
    fetchItemAndRelatedData();
  }, [fetchItemAndRelatedData]);

  // Historial (fix: sin sombrear "item", parse seguro, orden por fecha)
  const history = useMemo<InventoryMovement[]>(() => {
    if (!item) return [];
    const currentItemId = item.id;

    const serviceExits: InventoryMovement[] = allServices.flatMap((svc) =>
      (svc.serviceItems ?? [])
        .flatMap((svcItem) => (svcItem.suppliesUsed ?? []))
        .filter((sup) => sup.supplyId === currentItemId)
        .map((sup) => ({
          date: svc.deliveryDateTime ?? svc.serviceDate ?? svc.receptionDateTime ?? '',
          type: 'Salida por Servicio' as const,
          quantity: safeNumber(sup.quantity),
          relatedId: svc.id,
          unitType: item.unitType,
        }))
    );

    const saleExits: InventoryMovement[] = allSales.flatMap((sale) =>
      (sale.items ?? [])
        .filter((si) => si.inventoryItemId === currentItemId)
        .map((si) => ({
          date: sale.saleDate ?? (sale as any)?.createdAt ?? '',
          type: 'Salida por Venta' as const,
          quantity: safeNumber(si.quantity),
          relatedId: sale.id,
          unitType: item.unitType,
        }))
    );

    // Si después quieres entradas por compra, agrégalas aquí y concatenas.
    const movements = [...serviceExits, ...saleExits]
      .map((m) => {
        const d = parseDate(m.date);
        return d && isValid(d) ? { ...m, _parsed: d } : null;
      })
      .filter(Boolean) as (InventoryMovement & { _parsed: Date })[];

    movements.sort((a, b) => b._parsed.getTime() - a._parsed.getTime());

    return movements.map(({ _parsed, ...rest }) => rest);
  }, [item, allServices, allSales]);

  // KPIs simples del historial
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
      await inventoryService.deleteDoc('inventory', item.id);
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
      <div className="mb-4">
        <Button variant="outline" onClick={() => router.back()} className="bg-gray-800 text-white hover:bg-gray-700">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
      </div>

      <PageHeader title={item.name} description={`ID: ${item.id}`} />

      <Tabs defaultValue="details" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-2 lg:w-1/3 mb-6">
          <TabsTrigger value="details" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Información del Ítem
          </TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Historial
          </TabsTrigger>
        </TabsList>

        {/* Detalles */}
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
                      <Button variant="destructive" size="sm">
                        <Archive className="mr-2 h-4 w-4" />
                        Eliminar
                      </Button>
                    }
                    title={`¿Estás seguro de eliminar "${item.name}"?`}
                    description="Esta acción no se puede deshacer y eliminará permanentemente el ítem del inventario."
                    onConfirm={handleDeleteItem}
                    confirmText="Sí, Eliminar"
                  />
                  <Button variant="outline" size="sm" onClick={() => setIsEditDialogOpen(true)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Editar
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-muted-foreground" />
                    Precios
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Costo (Taller)</p>
                    <p className="font-semibold text-lg">{formatCurrency(item.unitPrice)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Precio Venta (Cliente)</p>
                    <p className="font-semibold text-lg text-primary">{formatCurrency(item.sellingPrice)}</p>
                  </div>
                </CardContent>
              </Card>

              {!item.isService && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Boxes className="h-5 w-5 text-muted-foreground" />
                      Control de Stock
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Stock Actual</p>
                        <p
                          className={`font-semibold text-lg ${
                            item.lowStockThreshold != null && item.quantity <= item.lowStockThreshold ? 'text-red-600' : ''
                          }`}
                        >
                          {item.quantity} {unitLabel(item.unitType)}
                        </p>
                      </div>
                      {item.lowStockThreshold != null && item.quantity <= item.lowStockThreshold && (
                        <Badge variant="destructive">Bajo stock</Badge>
                      )}
                    </div>

                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Umbral de Stock Bajo</p>
                      <p className="font-semibold text-lg">{item.lowStockThreshold ?? '—'}</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Historial */}
        <TabsContent value="history">
          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Resumen de Movimientos</CardTitle>
              <CardDescription>Totales calculados sobre el periodo mostrado.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-md border p-4">
                  <p className="text-sm text-muted-foreground">Salida por Servicio</p>
                  <p className="text-2xl font-bold">{kpis.salidaServicio} {unitLabel(item.unitType)}</p>
                </div>
                <div className="rounded-md border p-4">
                  <p className="text-sm text-muted-foreground">Salida por Venta</p>
                  <p className="text-2xl font-bold">{kpis.salidaVenta} {unitLabel(item.unitType)}</p>
                </div>
                <div className="rounded-md border p-4">
                  <p className="text-sm text-muted-foreground">Total Salidas</p>
                  <p className="text-2xl font-bold">{kpis.totalSalidas} {unitLabel(item.unitType)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

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
                        const qtyPrefix = move.type.startsWith('Salida') ? '-' : '+';
                        return (
                          <TableRow key={`${move.relatedId}-${index}`}>
                            <TableCell>
                              {date ? format(date, 'dd MMM yyyy, HH:mm', { locale: es }) : 'Fecha no disponible'}
                            </TableCell>
                            <TableCell>
                              <Badge variant={move.type === 'Salida por Venta' ? 'destructive' : 'secondary'}>
                                {move.type}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {qtyPrefix}
                              {move.quantity} {unitLabel(move.unitType)}
                            </TableCell>
                            <TableCell>
                              <Link
                                href={move.type === 'Salida por Venta' ? `/pos?id=${move.relatedId}` : `/servicios/${move.relatedId}`}
                                className="text-primary hover:underline flex items-center gap-1"
                              >
                                {move.relatedId} <ArrowRight className="h-3 w-3" />
                              </Link>
                            </TableCell>
                          </TableRow>
                        );
                      })}
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
