
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

import { collection, getDocs } from "firebase/firestore";
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
  type: "Salida por Servicio" | "Salida por Venta" | "Entrada por Compra";
  quantity: number;
  relatedId: string;
  unitType?: "units" | "ml" | "liters";
}

export default function InventoryItemDetailPage() {
  const params = useParams();
  const itemId = params.id as string;
  const { toast } = useToast();
  const router = useRouter();

  const [item, setItem] = useState<InventoryItem | null | undefined>(undefined);
  const [allServices, setAllServices] = useState<ServiceRecord[]>([]);
  const [allSales, setAllSales] = useState<any[]>([]); // ventas pueden variar de forma
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // ===== Data fetch =====
  useEffect(() => {
    if (!itemId) {
      setItem(null);
      return;
    }

    const fetchItemAndRelatedData = async () => {
      try {
        const fetchedItem = await inventoryService.getDocById(
          "inventory",
          itemId
        );
        setItem(fetchedItem);

        if (!fetchedItem) return;

        const [servicesData, salesData, categoriesData, suppliersData] =
          await Promise.all([
            serviceService.onServicesUpdatePromise(),
            getDocs(collection(db, "sales")).then((snap) =>
              snap.docs.map((d) => ({ ...d.data(), id: d.id }))
            ),
            inventoryService.onCategoriesUpdatePromise(),
            inventoryService.onSuppliersUpdatePromise(),
          ]);

        setAllServices(servicesData);
        setAllSales(salesData);
        setCategories(categoriesData);
        setSuppliers(suppliersData);
      } catch (error) {
        console.error("Error fetching item details:", error);
        setItem(null);
        toast({
          title: "Error",
          description: "No se pudieron cargar los datos del ítem.",
          variant: "destructive",
        });
      }
    };

    fetchItemAndRelatedData();
  }, [itemId, toast]);

  // ===== Derived data =====
  const history = useMemo<InventoryMovement[]>(() => {
    if (!item) return [];
    const currentItemId = item.id;

    const serviceExits: InventoryMovement[] = allServices.flatMap((svc) =>
      (svc.serviceItems ?? [])
        .flatMap((svcItem: any) => svcItem.suppliesUsed ?? [])
        .filter((sup: any) => sup.supplyId === currentItemId)
        .map((sup: any) => ({
          date:
            svc.deliveryDateTime ?? svc.serviceDate ?? svc.receptionDateTime ?? "",
          type: "Salida por Servicio" as const,
          quantity: safeNumber(sup.quantity),
          relatedId: svc.id,
          unitType: item.unitType as any,
        }))
    );

    const saleExits: InventoryMovement[] = allSales.flatMap((sale) =>
      (sale.items ?? [])
        .filter((si: any) => si.inventoryItemId === currentItemId)
        .map((si: any) => ({
          date: sale.saleDate ?? (sale as any)?.createdAt ?? "",
          type: "Salida por Venta" as const,
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
    const salidaServicio = history
      .filter((m) => m.type === "Salida por Servicio")
      .reduce((a, b) => a + b.quantity, 0);
    const salidaVenta = history
      .filter((m) => m.type === "Salida por Venta")
      .reduce((a, b) => a + b.quantity, 0);
    return {
      salidaServicio,
      salidaVenta,
      totalSalidas: salidaServicio + salidaVenta,
    };
  }, [history]);

  // ===== Handlers =====
  const handleSaveEditedItem = async (formData: InventoryItemFormValues) => {
    if (!item) return;
    try {
      await inventoryService.saveItem(formData, item.id);
      const updatedItem = await inventoryService.getDocById("inventory", item.id);
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
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger
            value="details"
          >
            Información del Ítem
          </TabsTrigger>
          <TabsTrigger
            value="history"
          >
            Historial
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-6">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-start justify-between">
                  <div>
                    <Badge variant={item.isService ? "secondary" : "default"} className="mb-2">{item.isService ? "Servicio" : "Producto"}</Badge>
                    <p className="text-lg font-semibold flex items-center gap-2"><Tag className="h-5 w-5 text-muted-foreground" />{item.category}</p>
                    <CardTitle className="text-2xl mt-1">{item.brand} {item.name}</CardTitle>
                    <CardDescription className="mt-1">SKU: {item.sku || "N/A"} • Proveedor: {item.supplier || "N/A"}</CardDescription>
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
              </Card>
            </div>

            {/* SEGUNDA FILA */}
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

                    {/* Barra visual de referencia al umbral */}
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

        <TabsContent value="history" className="mt-6">
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
                Entradas y salidas del producto. Las entradas se registran desde
                la pantalla principal de inventario.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {history.length > 0 ? (
                // Tabla con scroll horizontal en móvil
                <div className="w-full overflow-x-auto rounded-md border">
                  <Table className="min-w-[700px]">
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
                        const qtyPrefix = move.type.startsWith("Salida") ? "-" : "+";
                        return (
                          <TableRow key={`${move.relatedId}-${index}`}>
                            <TableCell>
                              {date
                                ? format(date, "dd MMM yyyy, HH:mm", { locale: es })
                                : "Fecha no disponible"}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  move.type === "Salida por Venta"
                                    ? "destructive"
                                    : "secondary"
                                }
                              >
                                {move.type}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {qtyPrefix}
                              {move.quantity} {unitLabel(move.unitType as any)}
                            </TableCell>
                            <TableCell>
                              <Link
                                href={
                                  move.type === "Salida por Venta"
                                    ? `/pos?id=${move.relatedId}`
                                    : `/servicios/${move.relatedId}`
                                }
                                className="text-primary hover:underline inline-flex items-center gap-1"
                              >
                                {move.relatedId}
                                <ArrowRight className="h-3 w-3" />
                              </Link>
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

      {/* Dialogo de Edición */}
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
