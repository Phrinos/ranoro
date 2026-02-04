"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { useForm, FormProvider, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PosForm } from "../components/pos-form";
import type {
  SaleReceipt,
  InventoryItem,
  InventoryCategory,
  Supplier,
  User,
} from "@/types";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { inventoryService, saleService } from "@/lib/services";
import { Loader2, Copy, Printer, Share2, Tags, Package, Car, Search as SearchIcon } from "lucide-react";
import type { InventoryItemFormValues } from "@/schemas/inventory-item-form-schema";
import { db } from "@/lib/firebaseClient";
import { writeBatch, doc, collection } from "firebase/firestore";
import { UnifiedPreviewDialog } from "@/components/shared/unified-preview-dialog";
import { TicketContent } from "@/components/ticket-content";
import { Button } from "@/components/ui/button";
import { formatCurrency, cn } from "@/lib/utils";
import { nanoid } from "nanoid";
import html2canvas from "html2canvas";
import { posFormSchema, type POSFormValues } from "@/schemas/pos-form-schema";
import { AUTH_USER_LOCALSTORAGE_KEY } from "@/lib/placeholder-data";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogDescription,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipProvider,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { z } from "zod";

const normalize = (s?: string) =>
  (s ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const createPOSItemFromInventory = (item: InventoryItem) => {
  const unitPrice =
    (item as any).sellingPrice ??
    (item as any).price ??
    (item as any).unitPrice ??
    0;

  const name =
    (item as any).name ??
    (item as any).title ??
    (item as any).description ??
    (item as any).sku ??
    "Artículo";

  const id =
    (item as any).id ?? (item as any).sku ?? String(unitPrice) + Math.random();

  return {
    id,
    inventoryItemId: (item as any).id ?? null,
    itemName: name,
    quantity: 1,
    unitPrice,
    discount: 0,
    totalPrice: unitPrice,
  };
};

function QuickAddItemDialog({
  open,
  onOpenChange,
  inventoryItems,
  onSelectItem,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inventoryItems: InventoryItem[];
  onSelectItem: (item: InventoryItem) => void;
}) {
  const [q, setQ] = React.useState("");

  const filtered = React.useMemo(() => {
    const trimmed = q.trim();
    if (trimmed.length > 0 && trimmed.length < 3) return [];
    
    const n = normalize(trimmed);
    if (!n) return inventoryItems.slice(0, 200);
    return inventoryItems.filter((it) => {
      const haystack = [
        (it as any).name,
        (it as any).sku,
        (it as any).description,
        (it as any).brand,
        (it as any).category,
      ]
        .map(normalize)
        .join(" ");
      return haystack.includes(n);
    });
  }, [q, inventoryItems]);
  
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setQ('');
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-4xl p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-3 border-b bg-white">
          <DialogTitle>Buscar y añadir artículo</DialogTitle>
          <DialogDescription>
            Busca por nombre, SKU o categoría. Mínimo 3 caracteres.
          </DialogDescription>
        </DialogHeader>

        <div className="p-6">
          <Command className="w-full border rounded-lg overflow-hidden shadow-sm" shouldFilter={false}>
            <CommandInput
              placeholder="Buscar por nombre, SKU, marca o categoría…"
              value={q}
              onValueChange={setQ}
              className="h-12"
            />
            <CommandList className="max-h-[450px] overflow-auto">
              {q.trim().length > 0 && q.trim().length < 3 ? (
                <div className="p-10 text-center text-muted-foreground flex flex-col items-center gap-2">
                  <SearchIcon className="h-8 w-8 opacity-20" />
                  <p className="text-sm font-medium">Escribe al menos 3 caracteres para buscar...</p>
                </div>
              ) : filtered.length === 0 ? (
                <CommandEmpty>Sin resultados para &quot;{q}&quot;</CommandEmpty>
              ) : (
                <CommandGroup heading="Artículos e Insumos Disponibles">
                  {filtered.map((it) => {
                    const price =
                      (it as any).sellingPrice ??
                      (it as any).price ??
                      (it as any).unitPrice ??
                      0;
                    const key =
                      (it as any).id ??
                      (it as any).sku ??
                      String(price) + Math.random();
                    const label = (it as any).name ?? (it as any).sku ?? "Artículo";
                    const isLowStock = !it.isService && it.quantity <= (it.lowStockThreshold || 0);

                    return (
                      <CommandItem
                        key={key}
                        value={label}
                        onMouseDownCapture={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onSelectItem(it);
                          onOpenChange(false);
                        }}
                        className={cn(
                          "flex items-center cursor-pointer p-3 border-b last:border-0 hover:bg-muted/50",
                          "[&[data-disabled]]:opacity-100 [&[data-disabled]]:pointer-events-auto"
                        )}
                      >
                        <div className="flex flex-col w-full gap-1.5">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 min-w-0">
                              <Badge variant="secondary" className="shrink-0 text-[10px] font-bold uppercase tracking-wider h-5">
                                {it.category || 'General'}
                              </Badge>
                              <span className="font-bold text-base truncate">{label}</span>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="font-bold text-primary text-lg">
                                {formatCurrency(price)}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-6 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <Tags className="h-3.5 w-3.5 opacity-50" />
                              <span>SKU: <span className="font-medium text-foreground">{it.sku || '—'}</span></span>
                            </div>
                            {!it.isService && (
                              <div className="flex items-center gap-1.5">
                                <Package className="h-3.5 w-3.5 opacity-50" />
                                <span>Stock: <span className={cn("font-bold", isLowStock ? "text-destructive" : "text-foreground")}>
                                  {it.quantity}
                                </span></span>
                              </div>
                            )}
                            {it.brand && (
                              <div className="flex items-center gap-1.5">
                                <Car className="h-3.5 w-3.5 opacity-50" />
                                <span>Marca: <span className="font-medium text-foreground">{it.brand}</span></span>
                              </div>
                            )}
                          </div>
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </div>

        <DialogFooter className="p-4 border-t bg-muted/10">
          <Button
            variant="secondary"
            type="button"
            onClick={() => onOpenChange(false)}
          >
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const resolver = zodResolver(posFormSchema) as unknown as Resolver<POSFormValues>;

export default function NuevaVentaPage() {
  const { toast } = useToast();
  const router = useRouter();

  const [currentInventoryItems, setCurrentInventoryItems] = useState<
    InventoryItem[]
  >([]);
  const [allCategories, setAllCategories] = useState<InventoryCategory[]>([]);
  const [allSuppliers, setAllSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isTicketDialogOpen, setIsTicketDialogOpen] = useState(false);
  const [saleForTicket, setSaleForTicket] = useState<SaleReceipt | null>(null);
  const [workshopInfo, setWorkshopInfo] = useState<any | null>(null);
  const ticketContentRef = useRef<HTMLDivElement>(null);

  const [isValidationDialogOpen, setIsValidationDialogOpen] = useState(false);
  const [validationIndex, setValidationIndex] = useState<number | null>(null);
  const [validationFolio, setValidationFolio] = useState("");
  const [validatedFolios, setValidatedFolios] = useState<
    Record<number, boolean>
  >({});

  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false);
  const [isAddingItem, setIsAddingItem] = useState(false);

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
    const unsubs = [
      inventoryService.onItemsUpdate((items) => {
        setCurrentInventoryItems(items);
        setIsLoading(false);
      }),
      inventoryService.onCategoriesUpdate(setAllCategories),
      inventoryService.onSuppliersUpdate(setAllSuppliers),
    ];

    const storedWorkshopInfo = localStorage.getItem("workshopTicketInfo");
    if (storedWorkshopInfo) {
      try {
        setWorkshopInfo(JSON.parse(storedWorkshopInfo));
      } catch (e) {
        console.error(e);
      }
    }

    return () => unsubs.forEach((unsub) => unsub && unsub());
  }, []);

  const handleCopyWhatsAppMessage = useCallback(() => {
    if (!saleForTicket) return;
    const workshopName = workshopInfo?.name || "nuestro taller";
    const message = `Hola ${
      saleForTicket.customerName || "Cliente"
    }, aquí tienes los detalles de tu compra en ${workshopName}.
Folio de Venta: ${saleForTicket.id}
Total: ${formatCurrency(saleForTicket.totalAmount)}
¡Gracias por tu preferencia!`;

    navigator.clipboard
      .writeText(message)
      .then(() => {
        toast({
          title: "Mensaje copiado",
          description: "El texto para WhatsApp ha sido copiado.",
        });
      })
      .catch(() => {
        toast({
          title: "No se pudo copiar",
          description: "Copia el texto manualmente desde el ticket.",
        });
      });
  }, [saleForTicket, workshopInfo, toast]);

  const handleSaleCompletion = async (values: POSFormValues) => {
    if (!db)
      return toast({ title: "Error de base de datos", variant: "destructive" });

    const authUserString = localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY);
    const currentUser: User | null = authUserString
      ? JSON.parse(authUserString)
      : null;

    if (!currentUser) {
      toast({
        title: "Error",
        description:
          "No se pudo identificar al usuario. Por favor, inicie sesión de nuevo.",
        variant: "destructive",
      });
      return;
    }

    const batch = writeBatch(db);

    try {
      const saleId = `SALE-${nanoid(8).toUpperCase()}`;
      await saleService.registerSale(
        saleId,
        values,
        currentInventoryItems,
        currentUser,
        batch
      );
      await batch.commit();

      const totalAmount = (values.items ?? []).reduce(
        (sum, item: any) => sum + (Number(item.totalPrice) || 0),
        0
      );
      const IVA_RATE = 0.16;
      const subTotal = totalAmount / (1 + IVA_RATE);
      const tax = totalAmount - subTotal;

      const newSaleReceipt: SaleReceipt = {
        id: saleId,
        saleDate: new Date().toISOString(),
        items: values.items.map(it => ({
          itemId: it.inventoryItemId ?? crypto.randomUUID(),
          itemName: it.itemName,
          quantity: it.quantity,
          total: it.totalPrice ?? (it.unitPrice ?? 0) * it.quantity,
        })),
        customerName: values.customerName,
        payments: (values.payments ?? []).map(p => ({
          method: p.method,
          amount: p.amount ?? 0,
          folio: p.folio,
        })),
        subTotal,
        tax,
        totalAmount,
        status: "Completado",
        registeredById: currentUser.id,
        registeredByName: currentUser.name,
      };

      toast({
        title: "Venta registrada",
        description: `La venta #${saleId} se ha completado.`,
      });

      setSaleForTicket(newSaleReceipt);
      setIsTicketDialogOpen(true);
    } catch (e) {
      console.error(e);
      toast({ title: "Error al registrar venta", variant: "destructive" });
    }
  };

  const handleNewInventoryItemCreated = async (
    formData: InventoryItemFormValues
  ): Promise<InventoryItem> => {
    const newItem = await inventoryService.addItem(formData);
    return newItem;
  };

  const handleDialogClose = () => {
    setIsTicketDialogOpen(false);
    setSaleForTicket(null);
    methods.reset();
    router.push("/pos");
  };

  const downloadCanvasPng = async (canvas: HTMLCanvasElement, name: string) => {
    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/png")
    );
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleCopyAsImage = useCallback(
    async (isForSharing: boolean = false) => {
      if (!ticketContentRef.current || !saleForTicket) return null;
      try {
        const canvas = await html2canvas(ticketContentRef.current, {
          scale: 2.5,
          backgroundColor: null,
        });

        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, "image/png")
        );
        if (!blob) throw new Error("No se pudo crear la imagen del ticket.");

        if (isForSharing) {
          return new File([blob], `ticket_${saleForTicket.id}.png`, {
            type: "image/png",
          });
        }

        const _ClipboardItem = (window as any).ClipboardItem ?? (globalThis as any).ClipboardItem;
        if (_ClipboardItem && navigator.clipboard && (navigator.clipboard as any).write) {
          await (navigator.clipboard as any).write([
            new _ClipboardItem({ "image/png": blob }),
          ]);
          toast({
            title: "Copiado",
            description: "La imagen del ticket ha sido copiada.",
          });
        } else {
          await downloadCanvasPng(canvas, `ticket_${saleForTicket.id}`);
          toast({
            title: "Descargado",
            description:
              "El ticket se descargó como imagen (el portapapeles no está disponible).",
          });
        }

        return null;
      } catch (e) {
        console.error("Error handling image:", e);
        toast({
          title: "Error",
          description: "No se pudo procesar la imagen del ticket.",
          variant: "destructive",
        });
        return null;
      }
    },
    [saleForTicket, toast]
  );

  const handleShareTicket = async () => {
    const imageFile = await handleCopyAsImage(true);
    if (imageFile && (navigator as any).share) {
      try {
        await (navigator as any).share({
          files: [imageFile],
          title: "Ticket de Venta",
          text: `Ticket de tu compra en ${workshopInfo?.name || "nuestro taller"}.`,
        });
      } catch (error) {
        if (!String(error).includes("AbortError")) {
          toast({
            title: "No se pudo compartir",
            description: "Copiando texto para WhatsApp como alternativa.",
          });
          handleCopyWhatsAppMessage();
        }
      }
    } else {
      handleCopyWhatsAppMessage();
    }
  };

  const handlePrint = () => {
    requestAnimationFrame(() => setTimeout(() => window.print(), 100));
  };

  const handleOpenValidateDialog = (index: number) => {
    setValidationIndex(index);
    setValidationFolio("");
    setIsValidationDialogOpen(true);
  };

  const handleConfirmValidation = () => {
    if (validationIndex === null) return;
    const originalFolio = watch(`payments.${validationIndex}.folio` as const);

    if (validationFolio === originalFolio) {
      setValidatedFolios((prev) => ({ ...prev, [validationIndex]: true }));
      toast({
        title: "Folio validado",
        description: "El folio coincide correctamente.",
      });
    } else {
      setValidatedFolios((prev) => {
        const newValidated = { ...prev };
        delete newValidated[validationIndex];
        return newValidated;
      });
      toast({
        title: "Error de validación",
        description: "Los folios no coinciden. Verifique por favor.",
        variant: "destructive",
      });
    }
    setIsValidationDialogOpen(false);
  };

  const handleOpenAddItemDialog = () => setIsAddItemDialogOpen(true);

  const handleSelectInventoryItem = (inv: InventoryItem) => {
    setIsAddingItem(true);
    try {
      const newRow = createPOSItemFromInventory(inv);
      const current = (getValues("items") as any[]) ?? [];
      const idx = current.findIndex(
        (r) =>
          (r?.inventoryItemId && r.inventoryItemId === (inv as any).id) ||
          r?.id === (inv as any).id
      );

      if (idx >= 0) {
        const updated = [...current];
        const row = { ...updated[idx] };
        const qty = Number(row.quantity ?? 1) + 1;
        const unitPrice = Number(row.unitPrice ?? newRow.unitPrice ?? 0);
        row.quantity = qty;
        row.totalPrice = unitPrice * qty;
        updated[idx] = row;
        setValue("items", updated as any, {
          shouldDirty: true,
          shouldTouch: true,
        });
        toast({
          title: "Cantidad actualizada",
          description: `Se incrementó la cantidad de "${row.itemName}".`,
        });
      } else {
        const updated = [...current, newRow];
        setValue("items", updated as any, {
          shouldDirty: true,
          shouldTouch: true,
        });
        toast({
          title: "Artículo añadido",
          description: `"${newRow.itemName}" agregado al ticket.`,
        });
      }
    } finally {
      setIsAddingItem(false);
      setIsAddItemDialogOpen(false);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center p-8 text-muted-foreground flex justify-center items-center">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Cargando...
      </div>
    );
  }

  return (
    <>
      <div className="bg-primary text-primary-foreground rounded-lg p-6 mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Registrar Nueva Venta
            </h1>
            <p className="text-primary-foreground/80 mt-1">
              Añada artículos y finalice la transacción para generar el ticket.
            </p>
          </div>
        </div>
      </div>

      <FormProvider {...methods}>
        <PosForm
          inventoryItems={currentInventoryItems}
          categories={allCategories}
          suppliers={allSuppliers}
          onSaleComplete={handleSaleCompletion}
          onInventoryItemCreated={handleNewInventoryItemCreated}
          onOpenValidateDialog={handleOpenValidateDialog}
          validatedFolios={validatedFolios}
          onOpenAddItemDialog={handleOpenAddItemDialog}
        />
      </FormProvider>

      <QuickAddItemDialog
        open={isAddItemDialogOpen}
        onOpenChange={setIsAddItemDialogOpen}
        inventoryItems={currentInventoryItems}
        onSelectItem={handleSelectInventoryItem}
      />

      {saleForTicket && (
        <UnifiedPreviewDialog
          open={isTicketDialogOpen}
          onOpenChange={handleDialogClose}
          title="Venta Completada"
          sale={saleForTicket}
          footerContent={
            <div className="flex w-full justify-end gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-12 w-12 bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200"
                      onClick={() => handleCopyAsImage(false)}
                    >
                      <Copy className="h-6 w-6" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Copiar imagen</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-12 w-12 bg-green-100 text-green-700 border-green-200 hover:bg-green-200"
                      onClick={handleShareTicket}
                    >
                      <Share2 className="h-6 w-6" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Compartir</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-12 w-12 bg-red-100 text-red-700 border-red-200 hover:bg-red-200"
                      onClick={handlePrint}
                    >
                      <Printer className="h-6 w-6" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Imprimir</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          }
        >
          <TicketContent
            ref={ticketContentRef}
            sale={saleForTicket}
            previewWorkshopInfo={workshopInfo || undefined}
          />
        </UnifiedPreviewDialog>
      )}

      <AlertDialog
        open={isValidationDialogOpen}
        onOpenChange={setIsValidationDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Validar folio</AlertDialogTitle>
            <AlertDialogDescription>
              Para evitar errores, por favor ingrese nuevamente el folio del
              voucher o referencia.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="folio-validation-input">Reingresar folio</Label>
            <Input
              id="folio-validation-input"
              value={validationFolio}
              onChange={(e) => setValidationFolio(e.target.value)}
              className="mt-2"
              autoFocus
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmValidation}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
