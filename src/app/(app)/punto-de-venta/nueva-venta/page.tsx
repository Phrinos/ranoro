// src/app/(app)/punto-de-venta/nueva-venta/page.tsx
"use client";

/**
 * Nueva Venta — POS Form
 *
 * Reuses the existing PosForm component (tested, battle-hardened) but:
 * - Reads inventory from the new `inventoryItems` collection (via usePosData)
 * - Redirects back to /punto-de-venta?tab=ventas after completing the sale
 * - Mirrors the same sale registration flow and ticket preview
 */

import React, {
  useState, useEffect, useCallback, useRef, useMemo,
} from "react";
import { FormProvider, type Resolver } from "react-hook-form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebaseClient";
import { writeBatch } from "firebase/firestore";
import html2canvas from "html2canvas";
import dynamic from "next/dynamic";

import { posFormSchema, type POSFormValues } from "@/schemas/pos-form-schema";
import { saleService } from "@/lib/services";
import { AUTH_USER_LOCALSTORAGE_KEY } from "@/lib/placeholder-data";
import { formatCurrency, generateTicketId } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { usePosData } from "../hooks/use-pos-data";

import type { SaleReceipt, User } from "@/types";
import { Button } from "@/components/ui/button";
import { Loader2, Copy, Share2, ArrowLeft } from "lucide-react";
import { UnifiedPreviewDialog } from "@/components/shared/unified-preview-dialog";
import { TicketContent } from "@/app/(app)/ticket/components";
import {
  Tooltip, TooltipProvider, TooltipContent, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogFooter, AlertDialogDescription,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import Link from "next/link";

// Dynamic imports for heavy components
const PosForm = dynamic(
  () => import("@/app/(app)/punto-de-venta/nueva-venta/components/pos-form").then((m) => ({ default: m.PosForm })),
  { ssr: false }
);



import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Search as SearchIcon, Tags, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PosInventoryItem } from "../hooks/use-pos-data";

// ── Mini QuickAdd Dialog reading from new inventoryItems collection ───────────

function ItemSearchDialog({
  open, onOpenChange, items, onSelect,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  items: PosInventoryItem[];
  onSelect: (item: PosInventoryItem) => void;
}) {
  const [q, setQ] = useState("");
  const normalize = (s?: string) =>
    (s ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const filtered = useMemo(() => {
    const trimmed = q.trim();
    if (trimmed.length > 0 && trimmed.length < 3) return [];
    const n = normalize(trimmed);
    if (!n) return items.slice(0, 200);
    return items.filter((it) =>
      [it.name, it.sku, it.description, it.brand, it.category].map(normalize).join(" ").includes(n)
    );
  }, [q, items]);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) setQ(""); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-3xl p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-3 border-b">
          <DialogTitle>Buscar artículo</DialogTitle>
          <DialogDescription>Mínimo 3 caracteres para buscar.</DialogDescription>
        </DialogHeader>
        <div className="p-6">
          <Command shouldFilter={false} className="w-full border rounded-xl overflow-hidden">
            <CommandInput placeholder="Nombre, SKU, marca, categoría…" value={q} onValueChange={setQ} className="h-12" />
            <CommandList className="max-h-96 overflow-auto">
              {q.trim().length > 0 && q.trim().length < 3 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">Escribe al menos 3 caracteres…</div>
              ) : filtered.length === 0 ? (
                <CommandEmpty>Sin resultados.</CommandEmpty>
              ) : (
                <CommandGroup heading="Inventario">
                  {filtered.map((it) => (
                    <CommandItem
                      key={it.id}
                      value={it.name}
                      onMouseDownCapture={(e) => { e.preventDefault(); onSelect(it); onOpenChange(false); }}
                      className="flex items-center justify-between p-3 cursor-pointer border-b last:border-0"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Badge variant="secondary" className="text-[10px] shrink-0">{it.category || "General"}</Badge>
                        <span className="font-semibold text-sm truncate">{it.name}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-bold text-primary">{formatCurrency(it.salePrice)}</span>
                        {!it.isService && (
                          <p className={cn("text-[11px]", it.stock === 0 ? "text-red-600" : it.stock <= it.lowStockThreshold ? "text-amber-600" : "text-muted-foreground")}>
                            {it.stock} en stock
                          </p>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </div>
        <DialogFooter className="p-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const resolver = zodResolver(posFormSchema) as unknown as Resolver<POSFormValues>;

export default function NuevaVentaPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { items, categories, suppliers, isLoading } = usePosData();
  const ticketRef = useRef<HTMLDivElement>(null);

  const [workshopInfo, setWorkshopInfo] = useState<any>(null);
  const [saleForTicket, setSaleForTicket] = useState<SaleReceipt | null>(null);
  const [ticketOpen, setTicketOpen] = useState(false);
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [validationOpen, setValidationOpen] = useState(false);
  const [validationIndex, setValidationIndex] = useState<number | null>(null);
  const [validationFolio, setValidationFolio] = useState("");
  const [validatedFolios, setValidatedFolios] = useState<Record<number, boolean>>({});

  const methods = useForm<POSFormValues>({
    resolver,
    defaultValues: {
      items: [],
      customerName: "Cliente Mostrador",
      payments: [{ method: "Efectivo", amount: undefined }],
    } as any,
    mode: "onChange",
  });

  const { watch, setValue, getValues } = methods;

  useEffect(() => {
    try {
      const stored = localStorage.getItem("workshopTicketInfo");
      if (stored) setWorkshopInfo(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  // Convert PosInventoryItem to shape expected by saleService (matches old InventoryItem)
  const inventoryItemsForService = useMemo(() => items.map((it) => ({
    ...it,
    quantity: it.stock,
    sellingPrice: it.salePrice,
    unitPrice: it.salePrice,
  })), [items]);

  const handleSaleCompletion = async (values: POSFormValues) => {
    const authStr = localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY);
    const currentUser: User | null = authStr ? JSON.parse(authStr) : null;
    if (!currentUser) {
      toast({ title: "Error", description: "No se pudo identificar al usuario.", variant: "destructive" });
      return;
    }

    try {
      const batch = writeBatch(db);
      const saleId = generateTicketId();
      await saleService.registerSale(saleId, values, inventoryItemsForService as any, currentUser, batch);
      await batch.commit();

      const totalAmount = (values.items ?? []).reduce((s, i: any) => s + (Number(i.totalPrice) || 0), 0);
      const IVA = 0.16;
      const subTotal = totalAmount / (1 + IVA);

      const receipt: SaleReceipt = {
        id: saleId,
        saleDate: new Date().toISOString(),
        items: values.items.map((it) => ({
          itemId: it.inventoryItemId ?? crypto.randomUUID(),
          inventoryItemId: it.inventoryItemId ?? null,
          itemName: it.itemName,
          quantity: it.quantity,
          total: it.totalPrice ?? (it.unitPrice ?? 0) * it.quantity,
          isService: !!it.isService,
        })),
        customerName: values.customerName,
        payments: (values.payments ?? []).map((p) => ({ method: p.method, amount: p.amount ?? 0, folio: p.folio })),
        subTotal,
        tax: totalAmount - subTotal,
        totalAmount,
        status: "Completado",
        registeredById: currentUser.id,
        registeredByName: currentUser.name,
      };

      setSaleForTicket(receipt);
      setTicketOpen(true);
      toast({ title: "Venta registrada", description: `#${saleId}` });
    } catch (e) {
      console.error(e);
      toast({ title: "Error al registrar venta", variant: "destructive" });
    }
  };

  const handleDialogClose = () => {
    setTicketOpen(false);
    setSaleForTicket(null);
    methods.reset();
    router.push("/punto-de-venta?tab=ventas");
  };

  const handleSelectItem = useCallback((item: PosInventoryItem) => {
    const newRow = {
      id: item.id,
      inventoryItemId: item.id,
      itemName: item.name,
      quantity: 1,
      unitPrice: item.salePrice,
      discount: 0,
      totalPrice: item.salePrice,
      isService: item.isService,
    };
    const current = (getValues("items") as any[]) ?? [];
    const idx = current.findIndex((r) => r?.inventoryItemId === item.id || r?.id === item.id);
    if (idx >= 0) {
      const updated = [...current];
      const row = { ...updated[idx] };
      const qty = Number(row.quantity ?? 1) + 1;
      row.quantity = qty;
      row.totalPrice = Number(row.unitPrice ?? newRow.unitPrice) * qty;
      updated[idx] = row;
      setValue("items", updated as any, { shouldDirty: true });
      toast({ title: "Cantidad actualizada", description: `"${row.itemName}"` });
    } else {
      setValue("items", [...current, newRow] as any, { shouldDirty: true });
      toast({ title: "Artículo añadido", description: `"${newRow.itemName}"` });
    }
  }, [getValues, setValue, toast]);

  const handleCopyAsImage = useCallback(async () => {
    if (!ticketRef.current || !saleForTicket) return;
    try {
      const canvas = await html2canvas(ticketRef.current, { scale: 2.5, backgroundColor: null, useCORS: true });
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
      if (!blob) return;
      const _CI = (window as any).ClipboardItem ?? (globalThis as any).ClipboardItem;
      if (_CI && (navigator.clipboard as any)?.write) {
        await (navigator.clipboard as any).write([new _CI({ "image/png": blob })]);
        toast({ title: "Imagen copiada" });
      }
    } catch { toast({ title: "Error al copiar", variant: "destructive" }); }
  }, [ticketRef, saleForTicket, toast]);

  const handleShare = useCallback(async () => {
    if (!ticketRef.current || !saleForTicket) return;
    try {
      const canvas = await html2canvas(ticketRef.current, { scale: 2.5, backgroundColor: null, useCORS: true });
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
      if (!blob) return;
      const file = new File([blob], `ticket_${saleForTicket.id}.png`, { type: "image/png" });
      if ((navigator as any).share) {
        await (navigator as any).share({ files: [file], title: "Ticket de Venta" });
      } else {
        const msg = `Folio: ${saleForTicket.id}\nTotal: ${formatCurrency(saleForTicket.totalAmount)}\n¡Gracias!`;
        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
      }
    } catch (e) {
      if (!String(e).includes("AbortError")) toast({ title: "Error al compartir", variant: "destructive" });
    }
  }, [ticketRef, saleForTicket, toast]);

  const handleOpenValidate = (index: number) => { setValidationIndex(index); setValidationFolio(""); setValidationOpen(true); };
  const handleConfirmValidate = () => {
    if (validationIndex === null) return;
    const original = watch(`payments.${validationIndex}.folio` as const);
    setValidatedFolios((p) => validationFolio === original ? { ...p, [validationIndex]: true } : (() => { const n = { ...p }; delete n[validationIndex]; return n; })());
    toast({ title: validationFolio === original ? "Folio validado" : "Folio incorrecto", variant: validationFolio === original ? "default" : "destructive" });
    setValidationOpen(false);
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="mb-6 pl-4 border-l-[3px] border-primary">
        <Link href="/punto-de-venta?tab=ventas" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2 transition-colors w-fit">
          <ArrowLeft className="h-4 w-4" /> Volver a Ventas
        </Link>
        <h1 className="text-2xl font-black">Nueva Venta</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Añade artículos del inventario y finaliza la transacción.</p>
      </div>

      <FormProvider {...methods}>
        <PosForm
          inventoryItems={inventoryItemsForService as any}
          categories={categories as any}
          suppliers={suppliers}
          onSaleComplete={handleSaleCompletion}
          onInventoryItemCreated={async (d: any) => d}
          onOpenValidateDialog={handleOpenValidate}
          validatedFolios={validatedFolios}
          onOpenAddItemDialog={() => setAddItemOpen(true)}
        />
      </FormProvider>

      <ItemSearchDialog
        open={addItemOpen}
        onOpenChange={setAddItemOpen}
        items={items}
        onSelect={handleSelectItem}
      />

      {saleForTicket && (
        <UnifiedPreviewDialog
          open={ticketOpen}
          onOpenChange={handleDialogClose}
          title="Venta Completada"
          sale={saleForTicket}
          footerContent={
            <div className="flex w-full justify-end gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" className="h-11 w-11 bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100" onClick={handleCopyAsImage}>
                      <Copy className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>Copiar imagen</p></TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" className="h-11 w-11 bg-green-50 text-green-700 border-green-200 hover:bg-green-100" onClick={handleShare}>
                      <Share2 className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>Compartir / WhatsApp</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          }
        >
          <TicketContent ref={ticketRef} sale={saleForTicket} previewWorkshopInfo={workshopInfo || undefined} />
        </UnifiedPreviewDialog>
      )}

      <AlertDialog open={validationOpen} onOpenChange={setValidationOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Validar folio</AlertDialogTitle>
            <AlertDialogDescription>Reingresa el folio del voucher para confirmar.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="folio-val">Reingresar folio</Label>
            <Input id="folio-val" value={validationFolio} onChange={(e) => setValidationFolio(e.target.value)} className="mt-2" autoFocus />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmValidate}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
