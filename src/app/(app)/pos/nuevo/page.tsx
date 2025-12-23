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
import { Loader2, Copy, Printer, Share2 } from "lucide-react";
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
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
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
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { z } from "zod";

const normalize = (s?: string) =>
  (s ?? "").toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");

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
    const n = normalize(q);
    if (!n) return inventoryItems.slice(0, 200);
    return inventoryItems.filter((it) => {
      const haystack = [
        (it as any).name,
        (it as any).sku,
        (it as any).description,
        (it as any).brand,
        (it as any).categoryName,
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
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Buscar y añadir artículo</DialogTitle>
          <DialogDescription>
            Escribe para filtrar por nombre, SKU o descripción, y selecciona
            para agregar al ticket.
          </DialogDescription>
        </DialogHeader>

        <Command className="w-full border rounded-md">
          <CommandInput
            placeholder="Buscar artículo…"
            value={q}
            onValueChange={setQ}
          />
          <CommandList className="max-h-[360px] overflow-auto">
            <CommandEmpty>Sin resultados</CommandEmpty>
            <CommandGroup heading="Coincidencias">
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
                return (
                  <CommandItem
                    key={key}
                    value={label}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onSelectItem(it);
                      onOpenChange(false);
                    }}
                    className={cn(
                      "flex items-center justify-between cursor-pointer",
                      "[&[data-disabled]]:opacity-100 [&[data-disabled]]:pointer-events-auto"
                    )}
                  >
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate font-medium">{label}</span>
                      <span className="text-xs text-muted-foreground truncate">
                        {(it as any).sku ?? "Sin SKU"} ·{" "}
                        {(it as any).description ?? "—"}
                      </span>
                    </div>
                    <span className="shrink-0 text-sm tabular-nums">
                      {formatCurrency(price)}
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>

        <div className="mt-3 flex justify-end">
          <Button
            variant="secondary"
            type="button"
            onClick={() => onOpenChange(false)}
          >
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

type FormInput = z.input<typeof posFormSchema>;

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

  const resolver = zodResolver(posFormSchema) as unknown as Resolver<POSFormValues>;
  const methods = useForm<FormInput, any, POSFormValues>({
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

        if (ClipboardItem && navigator.clipboard && navigator.clipboard.write) {
          await navigator.clipboard.write([
            new ClipboardItem({ "image/png": blob }),
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
