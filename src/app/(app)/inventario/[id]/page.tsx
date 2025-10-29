// src/app/(app)/inventario/[id]/page.tsx
"use client";

import { useParams, useRouter } from "next/navigation";
import { db } from "@/lib/firebaseClient";
import type {
  Vehicle,
  ServiceRecord,
  InventoryItem,
  InventoryCategory,
  Supplier,
} from "@/types";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  ShieldAlert,
  Edit,
  Package,
  DollarSign,
  Boxes,
  Trash2,
  ArrowRight,
  Loader2,
  ArrowLeft,
  Tag,
  Factory,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

import { collection, getDocs, onSnapshot, query, where, doc } from "firebase/firestore";
import { format, isValid } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { inventoryService, serviceService } from "@/lib/services";
import { parseDate } from "@/lib/forms";
import { formatCurrency } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { InventoryItemDialog } from "../components/inventory-item-dialog";
import type { InventoryItemFormValues } from "../components/inventory-item-form";

// ===== Helpers =====
const unitLabel = (ut?: string) =>
  ut === "ml" ? "ml" : ut === "liters" ? "L" : ut === "units" ? "u" : "";

const safeNumber = (v: unknown) =>
  typeof v === "number" && Number.isFinite(v) ? v : 0;

interface InventoryMovement {
  date: string;
  type: "Salida por Servicio" | "Salida por Venta" | "Entrada por Compra" | "Ajuste";
  quantity: number;
  relatedId?: string;
  unitType?: "units" | "ml" | "liters" | "kg" | "service";
  notes?: string;
}


export default function InventoryItemDetailPage() {
  const params = useParams();
  const itemId = params.id as string;
  const { toast } = useToast();
  const router = useRouter();

  const [item, setItem] = useState<InventoryItem | null | undefined>(undefined);
  const [inventoryMovements, setInventoryMovements] = useState<any[]>([]);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // ===== Data fetch =====
  useEffect(() => {
    if (!itemId) {
      setItem(null);
      return;
    }

    // Subscribe to the item document itself
    const unsubItem = onSnapshot(doc(db, "inventory", itemId), (doc) => {
      setItem(doc.exists() ? ({ id: doc.id, ...doc.data() } as InventoryItem) : null);
    }, (error) => {
      console.error("Error fetching item details:", error);
      setItem(null);
    });

    const fetchRelatedData = async () => {
      try {
        const [categoriesData, suppliersData] = await Promise.all([
            inventoryService.onCategoriesUpdatePromise(),
            inventoryService.onSuppliersUpdatePromise(),
        ]);
        setCategories(categoriesData);
        setSuppliers(suppliersData);
      } catch(e) {
         toast({ title: "Error", description: "No se pudieron cargar datos relacionados.", variant: "destructive" });
      }
    };

    fetchRelatedData();
    
    // Subscribe to inventory movements for this specific item
    const q = query(collection(db, 'inventoryMovements'), where("itemId", "==", itemId));
    const unsubscribeMovements = onSnapshot(q, (snapshot) => {
        const movements = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setInventoryMovements(movements);
    });

    return () => {
      unsubItem();
      unsubscribeMovements();
    };

  }, [itemId, toast]);

  // ===== Derived data =====
  const history = useMemo<InventoryMovement[]>(() => {
    if (!item || !inventoryMovements) return [];

    const movementsFromCollection: InventoryMovement[] = inventoryMovements.map(mov => {
        let type: InventoryMovement['type'] = 'Ajuste';
        if (mov.type === 'sale') type = 'Salida por Servicio'; // Ajustado, asumiendo que service y venta usan 'sale'
        if (mov.type === 'purchase') type = 'Entrada por Compra';

        return {
            date: mov.date,
            type: type,
            quantity: mov.quantityChanged,
            relatedId: mov.serviceId || mov.purchaseId || mov.relatedId,
            notes: mov.reason,
            unitType: item.unitType as any,
        };
    });

    const allMovements = [...movementsFromCollection]
      .map((m) => {
        const d = parseDate(m.date);
        return d && isValid(d) ? { ...m, _parsed: d } : null;
      })
      .filter(Boolean) as (InventoryMovement & { _parsed: Date })[];

    allMovements.sort((a, b) => b._parsed.getTime() - a._parsed.getTime());

    return allMovements.map(({ _parsed, ...rest }) => rest);
  }, [item, inventoryMovements]);

  const kpis = useMemo(() => {
    const salidaServicio = history
      .filter((m) => m.type === "Salida por Servicio")
      .reduce((a, b) => a + Math.abs(b.quantity), 0);
    const salidaVenta = history
      .filter((m) => m.type === "Salida por Venta")
      .reduce((a, b) => a + Math.abs(b.quantity), 0);
    return {
      salidaServicio,
      salidaVenta,
      totalSalidas: salidaServicio + salidaVenta,
    };
  }, [history]);

  // ===== Handlers =====
  const handleSaveEditedItem = async (formData: InventoryItemFormValues) => {
    if (!item) return;
    console.log('Saving edited item with data:', formData);
    try {
      await inventoryService.saveItem(formData, item.id);
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
        variant: "destructive",
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
      router.push("/inventario");
    } catch (e) {
      toast({
        title: "Error",
        description: "No se pudo eliminar el ítem.",
        variant: "destructive",
      });
    }
  };

  // ===== Loading / Empty =====
  if (item === undefined) {
    return (
      <div className="container mx-auto py-8 text-center flex items-center justify-center h-64">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        <span className="text-sm">Cargando datos del ítem…</span>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="container mx-auto py-8 text-center">
        <ShieldAlert className="mx-auto h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold">Ítem no encontrado</h1>
        <p className="text-muted-foreground">
          No se pudo encontrar un ítem con el ID: {itemId}.
        </p>
        <Button asChild className="mt-6">
          <Link href="/inventario">Volver a Productos y Servicios</Link>
        </Button>
      </div>
    );
  }

  // ===== UI =====
  const unit = unitLabel(item.unitType as any);
  const unitPrice = safeNumber(item.unitPrice);
  const sellingPrice = safeNumber(item.sellingPrice);
  const margin = sellingPrice - unitPrice;
  const marginPct =
    sellingPrice > 0 ? ((margin / sellingPrice) * 100).toFixed(1) : null;

  const lowStock = !item.isService && item.quantity <= (item.lowStockThreshold ?? 0);
  const stockBarPct = !item.isService
    ? Math.max(
        0,
        Math.min(
          100,
          (item.lowStockThreshold ?? 0) > 0
            ? (item.quantity / (item.lowStockThreshold as number)) * 100
            : 100
        )
      )
    : 0;

  return (
    <div className="container mx-auto py-8">
      <PageHeader
        title="Detalles del Producto/Servicio"
        description={`ID: ${item.id}`}
        actions={
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
        }
      />

      <Tabs defaultValue="details" className="w-full">
        <TabsList className="w-full overflow-x-auto scrollbar-hide flex gap-2 md:gap-4 rounded-lg p-1 bg-muted/60">
          <TabsTrigger
            value="details"
            className="whitespace-nowrap px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            Información del Ítem
          </TabsTrigger>
          <TabsTrigger
            value="history"
            className="whitespace-nowrap px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            Historial
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="md:col-span-2">
                <CardHeader className="flex flex-row items-start justify-between">
                  <div className="flex flex-col gap-1">
                     <p className="text-sm font-medium text-primary mb-1">
                        {item.isService ? "Servicio" : "Producto"}
                      </p>
                    <p className="text-lg font-semibold flex items-center gap-2">
                      <Tag className="h-5 w-5 text-muted-foreground" />
                      {item.category}
                    </p>
                    <CardTitle className="text-2xl mt-2">
                      {item.brand} {item.name}
                    </CardTitle>
                    <CardDescription className="pt-1">
                      SKU: {item.sku || "N/A"} • Proveedor: {item.supplier || "N/A"}
                    </CardDescription>
                  </div>

                  <div className="flex items-center gap-1 sm:gap-2">
                    <ConfirmDialog
                      triggerButton={
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      }
                      title={`¿Eliminar "${item.name}"?`}
                      description="Esta acción no se puede deshacer y eliminará permanentemente el ítem del inventario."
                      onConfirm={handleDeleteItem}
                      confirmText="Sí, eliminar"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsEditDialogOpen(true)}
                      title="Editar ítem"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {item.description && (
                    <div className="pt-1">
                      <p className="text-sm text-foreground whitespace-pre-wrap">
                        {item.description}
                      </p>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 pt-1">
                    {!item.isService && (
                      <Badge variant={lowStock ? "destructive" : "secondary"}>
                        {lowStock ? "Bajo stock" : "Stock OK"}
                      </Badge>
                    )}
                    {unit && <Badge variant="outline">Unidad: {unit}</Badge>}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-muted-foreground" />
                    Precios y Ganancia
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Costo (Taller)
                    </p>
                    <p className="font-semibold text-lg">
                      {formatCurrency(unitPrice)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Precio Venta (Cliente)
                    </p>
                    <p className="font-semibold text-lg text-primary">
                      {formatCurrency(sellingPrice)}
                    </p>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Ganancia Bruta
                    </p>
                    <p className="font-bold text-lg text-green-600">
                      {formatCurrency(margin)}{" "}
                      {marginPct !== null ? `(${marginPct}%)` : ""}
                    </p>
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
                    <div className="flex items-end justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Stock Actual
                        </p>
                        <p
                          className={`font-semibold text-lg ${
                            lowStock ? "text-red-600" : ""
                          }`}
                        >
                          {item.quantity} {unit}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-muted-foreground">
                          Umbral de Stock Bajo
                        </p>
                        <p className="font-semibold text-lg">
                          {item.lowStockThreshold ?? "—"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-2">
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden border border-border">
                        <div
                          className={`h-full transition-all ${
                            lowStock ? "bg-red-500" : "bg-green-500"
                          }`}
                          style={{ width: `${stockBarPct}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Relación actual vs. umbral de bajo stock
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Resumen de Movimientos</CardTitle>
              <CardDescription>
                Totales calculados sobre el periodo mostrado.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-md border p-4">
                  <p className="text-sm text-muted-foreground">
                    Salida por Servicio
                  </p>
                  <p className="text-2xl font-bold">
                    {kpis.salidaServicio} {unit}
                  </p>
                </div>
                <div className="rounded-md border p-4">
                  <p className="text-sm text-muted-foreground">
                    Salida por Venta
                  </p>
                  <p className="text-2xl font-bold">
                    {kpis.salidaVenta} {unit}
                  </p>
                </div>
                <div className="rounded-md border p-4">
                  <p className="text-sm text-muted-foreground">Total Salidas</p>
                  <p className="text-2xl font-bold">
                    {kpis.totalSalidas} {unit}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Historial de Movimientos</CardTitle>
              <CardDescription>
                Entradas y salidas del producto.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {history.length > 0 ? (
                <div className="w-full overflow-x-auto rounded-md border">
                  <Table className="min-w-[700px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Tipo de Movimiento</TableHead>
                        <TableHead className="text-right">Cantidad</TableHead>
                        <TableHead>ID Relacionado / Notas</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {history.map((move, index) => {
                        const date = parseDate(move.date);
                        const isExit = move.quantity < 0;
                        const qtyPrefix = isExit ? '' : '+';
                        return (
                          <TableRow key={`${move.relatedId}-${index}`}>
                            <TableCell>
                              {date
                                ? format(date, "dd MMM yyyy, HH:mm", { locale: es })
                                : "Fecha no disponible"}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={isExit ? "destructive" : "success"}
                              >
                                {move.type}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {qtyPrefix}
                              {move.quantity} {unitLabel(move.unitType as any)}
                            </TableCell>
                            <TableCell>
                                {move.relatedId ? (
                                    <Link
                                        href={
                                        move.type === "Salida por Venta"
                                            ? `/pos?saleId=${move.relatedId}`
                                            : move.type === "Entrada por Compra"
                                            ? `/inventario/compras`
                                            : `/servicios/${move.relatedId}`
                                        }
                                        className="text-primary hover:underline inline-flex items-center gap-1"
                                    >
                                        {move.relatedId.slice(-8)}
                                        <ArrowRight className="h-3 w-3" />
                                    </Link>
                                ) : (
                                    <span className="text-muted-foreground text-xs">{move.notes || 'N/A'}</span>
                                )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-6">
                  No hay historial de movimientos para este producto.
                </p>
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
