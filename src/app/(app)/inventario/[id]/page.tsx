// src/app/(app)/inventario/[id]/page.tsx
"use client";

import { useParams, useRouter } from "next/navigation";
import { db } from "@/lib/firebaseClient";
import { usePermissions } from "@/hooks/usePermissions";
import type {
  InventoryItem,
  InventoryCategory,
  Supplier,
} from "@/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import {
  ShieldAlert,
  Edit,
  Boxes,
  Trash2,
  ArrowRight,
  Loader2,
  ArrowLeft,
  Tag,
  Factory,
  Truck,
  Phone,
  User,
  MapPin,
  TrendingUp,
  TrendingDown,
  Fingerprint,
  Mail
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

import { collection, onSnapshot, query, where, doc } from "firebase/firestore";
import { format, isValid } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import { useEffect, useState, useMemo } from "react";

import { useToast } from "@/hooks/use-toast";
import { inventoryService } from "@/lib/services";
import { parseDate } from "@/lib/forms";
import { formatCurrency, cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { InventoryItemDialog } from "../components/inventory-item-dialog";
import type { InventoryItemFormValues } from "../components/inventory-item-form";
import { Separator } from "@/components/ui/separator";

// ===== Helpers =====
const unitLabel = (ut?: string) =>
  ut === "ml" ? "ml" : ut === "liters" ? "L" : ut === "kg" ? "kg" : ut === "units" ? "Pza" : ut === "service" ? "Serv" : "";

const getPresentationLabel = (ut?: string) => {
  switch(ut) {
    case 'units': return 'Pieza';
    case 'ml': return 'Mililitro';
    case 'liters': return 'Litro';
    case 'kg': return 'Kilogramo';
    case 'service': return 'Servicio';
    default: return 'Pieza';
  }
};

const getIntelligentPricing = (price: number, unitType?: string, rendimiento?: number) => {
  if (!price || price <= 0) return null;
  if (unitType === 'liters') {
    const yieldMl = rendimiento && rendimiento > 0 ? rendimiento : 1000;
    const pricePerMl = price / yieldMl;
    const pricePerL = pricePerMl * 1000;
    return { perSmall: pricePerMl, perBase: pricePerL, smallLabel: 'ml', baseLabel: 'L' };
  }
  if (unitType === 'ml') {
    const yieldMl = rendimiento && rendimiento > 0 ? rendimiento : 1; 
    const pricePerMl = price / yieldMl;
    const pricePerL = pricePerMl * 1000;
    return { perSmall: pricePerMl, perBase: pricePerL, smallLabel: 'ml', baseLabel: 'L' };
  }
  if (unitType === 'kg') {
    const yieldG = rendimiento && rendimiento > 0 ? rendimiento : 1000;
    const pricePerG = price / yieldG;
    const pricePerKg = pricePerG * 1000;
    return { perSmall: pricePerG, perBase: pricePerKg, smallLabel: 'g', baseLabel: 'kg' };
  }
  return null;
};

const safeNumber = (v: unknown) =>
  typeof v === "number" && Number.isFinite(v) ? v : 0;

interface VisualMovement {
  id: string;
  dateStr: string;
  parsedDate: Date;
  type: string;
  quantity: number;
  relatedId?: string;
  unitType?: string;
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
  const [activeTab, setActiveTab] = useState<'details' | 'history'>('details');
  const userPermissions = usePermissions();

  // ===== Data fetch =====
  useEffect(() => {
    if (!itemId) {
      setItem(null);
      return;
    }

    // Subscribe to the item document
    const unsubItem = onSnapshot(doc(db, "inventory", itemId), (docSnapshot) => {
      setItem(docSnapshot.exists() ? ({ id: docSnapshot.id, ...docSnapshot.data() } as InventoryItem) : null);
    }, (error) => {
      console.error("Error fetching item details:", error);
      setItem(null);
    });

    // Fetch related generic data
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
        const movements = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
        setInventoryMovements(movements);
    });

    return () => {
      unsubItem();
      unsubscribeMovements();
    };
  }, [itemId, toast]);

  // ===== Derived history data =====
  const history = useMemo<VisualMovement[]>(() => {
    if (!item || !inventoryMovements) return [];

    const mapped = inventoryMovements.map(mov => {
        let type = 'Ajuste';
        if (mov.type === 'sale') type = 'Salida de Inventario';
        if (mov.type === 'purchase') type = 'Entrada por Compra';

        const parsedDate = parseDate(mov.date);

        return {
            id: mov.id,
            dateStr: mov.date,
            parsedDate: parsedDate && isValid(parsedDate) ? parsedDate : new Date(0), // fallback if invalid
            type: type,
            quantity: safeNumber(mov.quantityChanged),
            relatedId: mov.serviceId || mov.purchaseId || mov.relatedId,
            notes: mov.reason,
            unitType: item.unitType,
        };
    });

    mapped.sort((a, b) => b.parsedDate.getTime() - a.parsedDate.getTime());
    return mapped;
  }, [item, inventoryMovements]);

  // ===== Handlers =====
  const handleSaveEditedItem = async (formData: InventoryItemFormValues) => {
    if (!item) return;
    try {
      await inventoryService.saveItem(formData, item.id);
      setIsEditDialogOpen(false);
      toast({
        title: "Ítem Actualizado",
        description: `Los datos de ${formData.name} han sido actualizados exitosamente.`,
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
      <div className="container mx-auto py-12 flex flex-col items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <span className="text-muted-foreground">Cargando datos del inventario...</span>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="container mx-auto py-12 text-center max-w-lg">
        <ShieldAlert className="mx-auto h-20 w-20 text-destructive mb-6" />
        <h1 className="text-3xl font-bold tracking-tight mb-2">Artículo no encontrado</h1>
        <p className="text-muted-foreground mb-8">
          No se pudo encontrar un artículo en el sistema con el ID: <span className="font-mono bg-muted px-1 py-0.5 rounded">{itemId}</span>.
        </p>
        <Button asChild size="lg" className="w-full sm:w-auto">
          <Link href="/inventario"><ArrowLeft className="mr-2 h-4 w-4"/> Volver al Inventario</Link>
        </Button>
      </div>
    );
  }

  // ===== UI Preparations =====
  const unit = unitLabel(item.unitType as any);
  const unitPrice = safeNumber(item.unitPrice);
  const sellingPrice = safeNumber(item.sellingPrice);
  const lowStock = !item.isService && item.quantity <= (item.lowStockThreshold ?? 0);

  const costBreakdown = getIntelligentPricing(unitPrice, item.unitType, item.rendimiento);
  const saleBreakdown = getIntelligentPricing(sellingPrice, item.unitType, item.rendimiento);

  return (
    <div className="container mx-auto py-8">
      
      <div className="flex items-center gap-4 mb-8">
        <Button variant="outline" size="icon" onClick={() => router.back()} className="h-10 w-10 shrink-0 rounded-full">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Detalles del Artículo</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Información de producto, disponibilidad y movimientos recientes.</p>
        </div>
      </div>

      {/* Pill tabs */}
      <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200 mb-6">
        <button
          onClick={() => setActiveTab('details')}
          className={cn(
            "px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200",
            activeTab === 'details'
              ? "bg-white text-slate-900 shadow-sm border border-slate-200"
              : "text-slate-500 hover:text-slate-700"
          )}
        >
          Ficha Técnica
        </button>
        {!item.isService && (
          <button
            onClick={() => setActiveTab('history')}
            className={cn(
              "px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200",
              activeTab === 'history'
                ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            Historial de Movimientos
            {history.length > 0 && (
              <span className="ml-2 px-1.5 py-0.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full">
                {history.length}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Tab content */}
      {activeTab === 'details' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* CARD 1: INFORMACIÓN PRINCIPAL (Cubre 2 columnas) */}
            <Card className="md:col-span-2 shadow-sm border overflow-hidden rounded-xl">
              <div className={cn("px-6 py-1.5 flex items-center justify-center font-bold uppercase tracking-widest text-[11px]", item.isService ? "bg-blue-600 text-white" : "bg-red-600 text-white")}>
                 {item.isService ? "Servicio" : "Producto Físico"}
              </div>
              <CardHeader className="pb-4 relative pt-6">
                <div className="absolute top-4 right-4 flex items-center gap-1">
                   {userPermissions.has('inventory:edit') && (
                     <Button size="icon" variant="ghost" className="h-9 w-9 hover:bg-slate-100 text-slate-500 hover:text-slate-900" onClick={() => setIsEditDialogOpen(true)}>
                         <Edit className="h-4 w-4" />
                     </Button>
                   )}
                   {userPermissions.has('inventory:delete') && (
                     <ConfirmDialog
                       triggerButton={
                         <Button size="icon" variant="ghost" className="h-9 w-9 hover:bg-red-50 text-slate-500 hover:text-red-600">
                             <Trash2 className="h-4 w-4" />
                         </Button>
                       }
                       title={`¿Eliminar "${item.name}"?`}
                       description="Esta acción eliminará el producto del catálogo y no se puede deshacer."
                       onConfirm={handleDeleteItem}
                       confirmText="Sí, eliminar"
                     />
                   )}
                </div>
                <div className="flex justify-between items-start">
                    <div className="pr-20">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                                <Tag className="h-3.5 w-3.5" /> {item.category || "General"}
                            </span>
                        </div>
                        <CardTitle className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">
                        {item.name}
                        </CardTitle>
                        <CardDescription className="text-base mt-2 font-medium text-slate-500">
                        {item.brand ? `Marca: ${item.brand}` : "Distribución General"}
                        </CardDescription>
                    </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                   <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Descripción General</h4>
                   <p className="text-foreground leading-relaxed bg-muted/30 p-4 rounded-lg border border-border/50">
                        {item.description || "No hay una descripción proporcionada para este artículo."}
                   </p>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div className="bg-background rounded-lg p-3 border">
                        <span className="text-xs text-muted-foreground flex items-center gap-1 mb-1"><Fingerprint className="h-3 w-3"/> Código SKU</span>
                        <span className="font-semibold">{item.sku || "Sin asignar"}</span>
                    </div>
                    <div className="bg-background rounded-lg p-3 border">
                        <span className="text-xs text-muted-foreground flex items-center gap-1 mb-1"><Boxes className="h-3 w-3"/> Presentación</span>
                        <div className="flex flex-col gap-0">
                          <span className="font-semibold">{getPresentationLabel(item.unitType)}</span>
                          {item.rendimiento ? <span className="text-xs text-muted-foreground font-medium">Rinde: {item.rendimiento} ml</span> : null}
                        </div>
                    </div>
                    <div className="bg-background rounded-lg p-3 border">
                        <span className="text-xs text-muted-foreground flex items-center gap-1 mb-1"><Factory className="h-3 w-3"/> Proveedor Registrado</span>
                        <span className="font-semibold">{item.supplier || "Ninguno"}</span>
                    </div>
                </div>
              </CardContent>
            </Card>

            {/* CARD 2: PRECIOS Y STOCK (Lateral, 1 columna) */}
            <Card className="shadow-sm border-t-4 border-t-emerald-500">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl flex items-center gap-2">
                  Existencias y Valor
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                
                <div className="space-y-4">
                    <div className="flex flex-col p-3 rounded-lg border bg-muted/10">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground font-medium">Costo de Compra</span>
                            <span className="font-bold text-lg">{formatCurrency(unitPrice)}</span>
                        </div>
                        {costBreakdown && (
                            <div className="flex justify-between items-center mt-2 pt-2 border-t border-border">
                                <span className="text-xs text-muted-foreground font-medium">Precio Unitario Inteligente</span>
                                <div className="text-xs text-right font-medium text-muted-foreground space-x-2">
                                    <span>{formatCurrency(costBreakdown.perSmall)} / {costBreakdown.smallLabel}</span>
                                    <span className="border-l border-border pl-2 border-opacity-50">{formatCurrency(costBreakdown.perBase)} / {costBreakdown.baseLabel}</span>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    <div className="flex flex-col p-3 rounded-lg border bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-emerald-700 dark:text-emerald-400 font-bold">Precio de Venta</span>
                            <span className="text-xl font-black text-emerald-700 dark:text-emerald-400">{formatCurrency(sellingPrice)}</span>
                        </div>
                        {saleBreakdown && (
                            <div className="flex justify-between items-center mt-2 pt-2 border-t border-emerald-200/50 dark:border-emerald-800/50">
                                <span className="text-xs text-emerald-600/80 dark:text-emerald-400/80 font-medium">Precio Unitario Inteligente</span>
                                <div className="text-xs text-right font-bold text-emerald-700 dark:text-emerald-400 space-x-2">
                                    <span>{formatCurrency(saleBreakdown.perSmall)} / {saleBreakdown.smallLabel}</span>
                                    <span className="border-l border-emerald-200/50 dark:border-emerald-800/50 pl-2">{formatCurrency(saleBreakdown.perBase)} / {saleBreakdown.baseLabel}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {!item.isService && (
                    <>
                        <Separator />
                        <div className="pt-2 space-y-3">
                            <div>
                                <div className="flex justify-between items-end mb-1">
                                    <span className="text-sm font-semibold text-muted-foreground">Stock Actual</span>
                                    <span className={`text-3xl font-black tracking-tighter leading-none ${lowStock ? "text-destructive" : "text-foreground"}`}>
                                        {item.quantity} <span className="text-base font-normal tracking-normal text-muted-foreground">{unit}</span>
                                    </span>
                                </div>
                            </div>
                            
                            <div className="bg-muted/30 p-3 rounded-lg border border-border flex justify-between items-center">
                                <span className="text-xs text-muted-foreground flex items-center gap-1 font-medium">
                                    <TrendingDown className="h-3 w-3" /> Aviso bajo stock
                                </span>
                                <Badge variant={lowStock ? "destructive" : "outline"} className={lowStock ? "animate-pulse" : ""}>
                                    Alerta: ≤ {item.lowStockThreshold ?? 0}
                                </Badge>
                            </div>
                        </div>
                    </>
                )}
              </CardContent>
            </Card>

          </div>
        </div>
      )}

      {/* =============== HISTORY TAB =============== */}
      {activeTab === 'history' && !item.isService && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <Card className="shadow-sm border-t-4 border-t-primary">
            <CardHeader className="bg-muted/10 border-b">
              <CardTitle>Rastreo de Movimientos</CardTitle>
              <CardDescription>
                Entradas por compra y salidas por servicio o venta directa.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {history.length > 0 ? (
                <div className="w-full overflow-x-auto">
                  <Table className="min-w-[700px]">
                    <TableHeader className="bg-muted/50">
                      <TableRow className="uppercase text-xs tracking-wider">
                        <TableHead className="w-[180px] pl-6">Fecha</TableHead>
                        <TableHead>Operación</TableHead>
                        <TableHead className="text-right">Afectación de Stock</TableHead>
                        <TableHead className="text-right pr-6">Comprobante / Detalle</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {history.map((move) => {
                        const isExit = move.quantity < 0;
                        const isEntry = move.quantity > 0;
                        const validDate = move.parsedDate.getTime() > 0;
                        
                        return (
                          <TableRow key={move.id} className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-muted-foreground font-medium pl-6">
                              {validDate
                                ? format(move.parsedDate, "dd MMM yyyy, HH:mm", { locale: es })
                                : move.dateStr || "Registro Antiguo"}
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-2">
                                    {isExit ? (
                                        <div className="h-6 w-6 rounded-full bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400 flex items-center justify-center shrink-0">
                                            <TrendingDown className="h-3 w-3" />
                                        </div>
                                    ) : (
                                        <div className="h-6 w-6 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                            <TrendingUp className="h-3 w-3" />
                                        </div>
                                    )}
                                    <span className="font-semibold text-sm">
                                        {move.type}
                                    </span>
                                </div>
                            </TableCell>
                            <TableCell className="text-right">
                                <Badge variant="outline" className={`font-mono text-sm px-2 py-0.5 border ${
                                    isExit 
                                        ? "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950/20 border-red-200 dark:border-red-900" 
                                        : isEntry 
                                            ? "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900"
                                            : "text-muted-foreground bg-muted"
                                }`}>
                                    {isEntry ? '+' : ''}{move.quantity} {unitLabel(move.unitType as any)}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right pr-6">
                                {move.relatedId ? (
                                    <Button variant="ghost" size="sm" asChild className="h-8 group hover:bg-primary/10 hover:text-primary">
                                        <Link
                                            href={
                                                move.type === "Entrada por Compra"
                                                ? `/inventario/compras?id=${move.relatedId}`
                                                : move.type.includes("Venta")
                                                ? `/pos?saleId=${move.relatedId}`
                                                : `/servicios/${move.relatedId}`
                                            }
                                        >
                                            <span className="font-mono text-xs opacity-70 group-hover:opacity-100 mr-1">{move.relatedId.slice(-6).toUpperCase()}</span>
                                            <ArrowRight className="h-3 w-3" />
                                        </Link>
                                    </Button>
                                ) : (
                                    <span className="text-muted-foreground text-xs italic">{move.notes || 'Ajuste Manual / Movimiento Indirecto'}</span>
                                )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-16 px-4 bg-muted/10 rounded-b-lg">
                    <Boxes className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                    <h3 className="text-lg font-medium">Sin movimientos registrados</h3>
                    <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-1">
                        No hay entradas o salidas de inventario registradas para este artículo.
                    </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

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
