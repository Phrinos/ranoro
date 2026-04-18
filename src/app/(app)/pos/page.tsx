
// src/app/(app)/pos/page.tsx

"use client";

import { withSuspense } from "@/lib/withSuspense";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import React, {
  useState,
  useEffect,
  useCallback,
  Suspense,
  lazy,
  useRef,
} from "react";

import { Loader2, PlusCircle, Printer, Copy, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { SaleReceipt, InventoryItem, User, ServiceRecord, InventoryCategory, Supplier } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { inventoryService, saleService, serviceService, adminService } from "@/lib/services";
import { AUTH_USER_LOCALSTORAGE_KEY } from "@/lib/placeholder-data";
import { UnifiedPreviewDialog } from "@/components/shared/unified-preview-dialog";
import { TicketContent } from "@/app/(app)/ticket/components";
import { formatCurrency } from "@/lib/utils";
import html2canvas from "html2canvas";
import { usePermissions } from "@/hooks/usePermissions";
import {
  Tooltip,
  TooltipProvider,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const VentasPosContent = lazy(() => import("./components/ventas-pos-content"));
const PaymentDetailsDialog = lazy(() =>
  import("@/components/shared/PaymentDetailsDialog").then((module) => ({
    default: module.PaymentDetailsDialog,
  }))
);
const ViewSaleDialog = lazy(() => import("./components/view-sale-dialog").then(m => ({ default: m.ViewSaleDialog })));

function PageInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const userPermissions = usePermissions();

  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [allSales, setAllSales] = useState<SaleReceipt[]>([]);
  const [allInventory, setAllInventory] = useState<InventoryItem[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allServices, setAllServices] = useState<ServiceRecord[]>([]);
  const [allCategories, setAllCategories] = useState<InventoryCategory[]>([]);
  const [allSuppliers, setAllSuppliers] = useState<Supplier[]>([]);


  const [isReprintDialogOpen, setIsReprintDialogOpen] = useState(false);
  const [saleForReprint, setSaleForReprint] = useState<SaleReceipt | null>(null);
  const [isViewSaleDialogOpen, setIsViewSaleDialogOpen] = useState(false);
  const [viewingSale, setViewingSale] = useState<SaleReceipt | null>(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);

  const [workshopInfo, setWorkshopInfo] = useState<any | null>(null);
  const ticketContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsLoading(true);
    try {
      const authUserString = localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY);
      if (authUserString) setCurrentUser(JSON.parse(authUserString));
      const storedWorkshopInfo = localStorage.getItem("workshopTicketInfo");
      if (storedWorkshopInfo) setWorkshopInfo(JSON.parse(storedWorkshopInfo));
    } catch (e) {
      // Ignore parsing errors
    }

    const unsubs = [
      saleService.onSalesUpdate(setAllSales),
      inventoryService.onItemsUpdate(setAllInventory),
      serviceService.onServicesUpdate(setAllServices),
      adminService.onUsersUpdate(setAllUsers),
      inventoryService.onCategoriesUpdate(setAllCategories),
      inventoryService.onSuppliersUpdate((data) => {
          setAllSuppliers(data);
          setIsLoading(false);
      }),
    ];
    return () => unsubs.forEach((u) => u && u());
  }, []);

  const handleReprintTicket = useCallback((sale: SaleReceipt) => {
    setSaleForReprint(sale);
    setIsReprintDialogOpen(true);
  }, []);

  const handleViewSale = useCallback((sale: SaleReceipt) => {
    setViewingSale(sale);
    setIsViewSaleDialogOpen(true);
  }, []);

  useEffect(() => {
    const saleIdToShow = searchParams.get("saleId");
    if (saleIdToShow && allSales.length > 0) {
      const sale = allSales.find((s) => s.id === saleIdToShow);
      if (sale) {
        handleViewSale(sale);
        router.replace("/pos", { scroll: false });
      }
    }
  }, [searchParams, allSales, router, handleViewSale]);

  const handleDeleteSale = useCallback(async (saleId: string) => {
    await saleService.deleteSale(saleId, currentUser);
    toast({ title: "Venta Eliminada", description: "La venta ha sido eliminada permanentemente.", variant: "destructive" });
  }, [currentUser, toast]);

  const handleCancelSale = useCallback(async (saleId: string, reason: string) => {
    await saleService.cancelSale(saleId, reason, currentUser);
    toast({ title: "Venta Cancelada", description: `La venta #${saleId.slice(-6)} ha sido cancelada.` });
  }, [currentUser, toast]);

  const handleEditPayment = useCallback((sale: SaleReceipt) => {
    setViewingSale(sale);
    setIsPaymentDialogOpen(true);
  }, []);

  const handlePaymentUpdate = async (saleId: string, paymentDetails: any) => {
    await saleService.updateSale(saleId, { payments: paymentDetails.payments });
    toast({ title: "Pago Actualizado" });
    setIsPaymentDialogOpen(false);
  };

  const handleSendWhatsapp = useCallback((record: SaleReceipt | ServiceRecord) => {
    const isSale = 'totalAmount' in record;
    const folio = record.id?.slice(-6) ?? '';
    const total = isSale
      ? formatCurrency((record as SaleReceipt).totalAmount)
      : formatCurrency((record as ServiceRecord).totalCost ?? 0);
    const name = (record as any).customerName || 'Cliente';
    const shopName = workshopInfo?.name || 'nuestro taller';
    const text = `Hola ${name}, gracias por tu visita a ${shopName}.\nFolio: ${folio}\nTotal: ${total}\n¡Gracias por tu preferencia!`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }, [workshopInfo]);

  const handleCopyTicketAsImage = useCallback(
    async (isForSharing: boolean = false) => {
      if (!ticketContentRef.current || !saleForReprint) return null;
      try {
        const canvas = await html2canvas(ticketContentRef.current, { scale: 2.5, backgroundColor: null, useCORS: true });
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
        if (!blob) throw new Error("No se pudo crear el blob de la imagen.");

        if (isForSharing) {
          return new File([blob], `ticket_venta_${saleForReprint.id}.png`, { type: "image/png" });
        } else {
          // Fallback defensivo compatible con Firefox/Safari
          const _ClipboardItem = (window as any).ClipboardItem ?? (globalThis as any).ClipboardItem;
          if (_ClipboardItem && (navigator.clipboard as any)?.write) {
            await (navigator.clipboard as any).write([new _ClipboardItem({ "image/png": blob })]);
            toast({ title: "Copiado", description: "La imagen del ticket ha sido copiada." });
          } else {
            toast({ title: "No disponible", description: "Portapapeles de imágenes no disponible en este navegador." });
          }
          return null;
        }
      } catch (e) {
        console.error("Error al manejar la imagen:", e);
        toast({ title: "Error", description: "No se pudo procesar la imagen del ticket.", variant: "destructive" });
        return null;
      }
    },
    [saleForReprint, toast]
  );

  const handleCopyWhatsAppMessage = useCallback(() => {
    if (!saleForReprint) return;
    const message = `Hola ${saleForReprint.customerName || "Cliente"}, aquí tienes un resumen de tu compra en ${
      workshopInfo?.name || "nuestro taller"
    }.
Folio: ${saleForReprint.id}
Total: ${formatCurrency(saleForReprint.totalAmount)}
¡Gracias por tu preferencia!`;

    navigator.clipboard.writeText(message).then(() => {
      toast({ title: "Mensaje Copiado", description: "El mensaje para WhatsApp ha sido copiado." });
    });
  }, [saleForReprint, workshopInfo, toast]);

  const handleShareTicket = async () => {
    const imageFile = await handleCopyTicketAsImage(true);
    if (imageFile && (navigator as any).share) {
      try {
        await (navigator as any).share({ files: [imageFile], title: "Ticket de Venta", text: `Ticket de tu compra en ${workshopInfo?.name || "nuestro taller"}.` });
      } catch (error) {
        if (!String(error).includes("AbortError")) {
          toast({ title: "No se pudo compartir", description: "Copiando texto para WhatsApp como alternativa.", variant: "default" });
          handleCopyWhatsAppMessage();
        }
      }
    } else {
      handleCopyWhatsAppMessage();
    }
  };

  const handlePrintTicket = () => {
    requestAnimationFrame(() => setTimeout(() => window.print(), 100));
  };

  const pageActions = userPermissions.has('pos:create_sale') ? (
    <Button asChild className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90">
      <Link href="/pos/nuevo">
        <PlusCircle className="mr-2 h-4 w-4" />Nueva Venta
      </Link>
    </Button>
  ) : null;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <Suspense fallback={<div className="h-40 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>}>
          <VentasPosContent
            pageActions={pageActions}
            allSales={allSales}
            allInventory={allInventory}
            allUsers={allUsers}
            allServices={allServices}
            currentUser={currentUser}
            onReprintTicket={handleReprintTicket}
            onViewSale={handleViewSale}
            onDeleteSale={handleDeleteSale}
            onEditPayment={handleEditPayment}
            onCancelSale={handleCancelSale}
          />
        </Suspense>
      </div>

      <Suspense fallback={null}>
        {saleForReprint && (
          <UnifiedPreviewDialog
            open={isReprintDialogOpen}
            onOpenChange={setIsReprintDialogOpen}
            title={`Ticket Venta #${saleForReprint.id.slice(-6)}`}
            sale={saleForReprint}
            footerContent={
              <div className="flex w-full justify-end gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="icon" className="h-12 w-12 bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200" onClick={() => handleCopyTicketAsImage(false)}>
                        <Copy className="h-6 w-6" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Copiar Imagen</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="icon" className="h-12 w-12 bg-green-100 text-green-700 border-green-200 hover:bg-green-200" onClick={handleShareTicket}>
                        <Share2 className="h-6 w-6" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Compartir</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="icon" className="h-12 w-12 bg-red-100 text-red-700 border-red-200 hover:bg-red-200" onClick={handlePrintTicket}>
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
            <TicketContent ref={ticketContentRef} sale={saleForReprint} previewWorkshopInfo={workshopInfo || undefined} />
          </UnifiedPreviewDialog>
        )}

        {viewingSale && (
          <ViewSaleDialog
            open={isViewSaleDialogOpen}
            onOpenChange={setIsViewSaleDialogOpen}
            sale={viewingSale}
            inventory={allInventory}
            users={allUsers}
            categories={allCategories}
            suppliers={allSuppliers}
            onCancelSale={handleCancelSale}
            onDeleteSale={handleDeleteSale}
            onPaymentUpdate={handlePaymentUpdate}
            onSendWhatsapp={() => handleSendWhatsapp(viewingSale)}
            currentUser={currentUser}
          />
        )}

        {viewingSale && isPaymentDialogOpen && (
          <PaymentDetailsDialog
            open={isPaymentDialogOpen}
            onOpenChange={setIsPaymentDialogOpen}
            record={viewingSale}
            onConfirm={handlePaymentUpdate as any}
            recordType="sale"
          />
        )}
      </Suspense>
    </>
  );
}

export default withSuspense(PageInner, null);
