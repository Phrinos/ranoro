
"use client";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Search,
  ListFilter,
  CalendarIcon as CalendarDateIcon,
  Receipt,
  ShoppingCart,
  DollarSign,
  Filter as FilterIcon,
  Printer,
  PlusCircle,
  Copy,
} from "lucide-react";
import { SalesTable } from "./components/sales-table";
import { PrintTicketDialog } from "@/components/ui/print-ticket-dialog";
import { TicketContent } from "@/components/ticket-content";
import {
  placeholderSales,
  placeholderInventory,
  calculateSaleProfit,
  persistToFirestore,
  hydrateReady, // <- NUEVO
  AUTH_USER_LOCALSTORAGE_KEY,
} from "@/lib/placeholder-data";
import type { SaleReceipt, PaymentMethod, User } from "@/types";
import {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import {
  format,
  parseISO,
  compareAsc,
  compareDesc,
  isWithinInterval,
  isValid,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
} from "date-fns";
import { es } from 'date-fns/locale';
import type { DateRange } from "react-day-picker";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { ViewSaleDialog } from "./components/view-sale-dialog";

// -------------------- Tipos --------------------

type SaleSortOption =
  | "date_desc"
  | "date_asc"
  | "total_desc"
  | "total_asc"
  | "customer_asc"
  | "customer_desc";

// ==================== Componente ====================

export default function POSPage() {
  const { toast } = useToast();
  
  // Forzar re–renderes cuando las colecciones placeholder cambian
  const [version, setVersion] = useState(0);

  // --------  Esperar a que Firestore hidrate datos --------
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    hydrateReady.then(() => setHydrated(true));
  }, []);

  // -------------------- Refs y estados UI --------------------
  const ticketContentRef = useRef<HTMLDivElement>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [sortOption, setSortOption] = useState<SaleSortOption>("date_desc");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<
    PaymentMethod | "all"
  >("all");

  const [isReprintDialogOpen, setIsReprintDialogOpen] = useState(false);
  const [selectedSaleForReprint, setSelectedSaleForReprint] =
    useState<SaleReceipt | null>(null);

  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<SaleReceipt | null>(null);

  // -------------------- Ventas filtradas y ordenadas --------------------

  const filteredAndSortedSales = useMemo(() => {
    if (!hydrated) return [] as SaleReceipt[];

    let list = [...placeholderSales];

    // 1. Rango de fechas
    if (dateRange?.from) {
      list = list.filter((sale) => {
        const date = parseISO(sale.saleDate);
        if (!isValid(date)) return false;
        const from = startOfDay(dateRange.from!);
        const to = dateRange.to
          ? endOfDay(dateRange.to)
          : endOfDay(dateRange.from!);
        return isWithinInterval(date, { start: from, end: to });
      });
    }

    // 2. Búsqueda de texto
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (s) =>
          s.id.toLowerCase().includes(q) ||
          (s.customerName && s.customerName.toLowerCase().includes(q)) ||
          s.items.some((i) => i.itemName.toLowerCase().includes(q))
      );
    }

    // 3. Filtro por método de pago
    if (paymentMethodFilter !== "all") {
      list = list.filter((s) => s.paymentMethod === paymentMethodFilter);
    }

    // 4. Ordenamiento
    list.sort((a, b) => {
      switch (sortOption) {
        case "date_asc":
          return compareAsc(parseISO(a.saleDate), parseISO(b.saleDate));
        case "date_desc":
          return compareDesc(parseISO(a.saleDate), parseISO(b.saleDate));
        case "total_asc":
          return a.totalAmount - b.totalAmount;
        case "total_desc":
          return b.totalAmount - a.totalAmount;
        case "customer_asc":
          return (a.customerName || "").localeCompare(b.customerName || "");
        case "customer_desc":
          return (b.customerName || "").localeCompare(a.customerName || "");
        default:
          return 0;
      }
    });

    return list;
  }, [searchTerm, dateRange, sortOption, paymentMethodFilter, hydrated]);

  // -------------------- Datos resumidos --------------------

  const summaryData = useMemo(() => {
    if (!hydrated) {
      return {
        totalSalesCount: 0,
        totalRevenue: 0,
        mostSoldItem: null as { name: string; quantity: number } | null,
        totalProfit: 0,
      };
    }

    const active = filteredAndSortedSales.filter((s) => s.status !== "Cancelado");
    const totalSalesCount = active.length;
    const totalRevenue = active.reduce((sum, s) => sum + s.totalAmount, 0);
    const totalProfit = active.reduce(
      (sum, s) => sum + calculateSaleProfit(s, placeholderInventory),
      0
    );

    // Artículo más vendido
    let mostSoldItem: { name: string; quantity: number } | null = null;
    if (totalSalesCount > 0) {
      const counter: Record<string, { name: string; quantity: number }> = {};
      active.forEach((sale) => {
        sale.items.forEach((it) => {
          // Use item ID as the key to avoid name collisions
          if (!counter[it.inventoryItemId]) {
            // Use item ID as the key to avoid name collisions
            counter[it.inventoryItemId] = { name: it.itemName, quantity: 0 };
          }
          counter[it.inventoryItemId].quantity += it.quantity;
        });
      });

      let maxQuantity = 0;
      let topItemId: string | null = null;

      for (const itemId in counter) {
        if (counter[itemId].quantity > maxQuantity) {
          maxQuantity = counter[itemId].quantity;
          topItemId = itemId;
        }
      }

      if (topItemId) {
        mostSoldItem = counter[topItemId];
      }
    }

    return { totalSalesCount, totalRevenue, mostSoldItem, totalProfit };
  }, [filteredAndSortedSales, hydrated, placeholderInventory]);

  // -------------------- Handlers --------------------

  const paymentMethodsForFilter: (PaymentMethod | "all")[] = [
    "all",
    "Efectivo",
    "Tarjeta",
    "Transferencia",
    "Efectivo+Transferencia",
    "Tarjeta+Transferencia",
  ];
  
  const setDateToToday = () => setDateRange({ from: startOfDay(new Date()), to: endOfDay(new Date()) });
  const setDateToThisWeek = () => setDateRange({ from: startOfWeek(new Date(), { weekStartsOn: 1 }), to: endOfWeek(new Date(), { weekStartsOn: 1 }) });
  const setDateToThisMonth = () => setDateRange({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) });


  const handleReprintSale = useCallback((sale: SaleReceipt) => {
    setSelectedSaleForReprint(sale);
    setIsReprintDialogOpen(true);
  }, []);

  const handleCancelSale = useCallback(
    (saleId: string, reason: string) => {
      const authUserString = localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY);
      const currentUser: User | null = authUserString ? JSON.parse(authUserString) : null;

      if (!reason.trim()) {
          toast({ title: "Error", description: "Debe proporcionar un motivo para la cancelación.", variant: "destructive" });
          return;
      }
      
      const idx = placeholderSales.findIndex((s) => s.id === saleId);
      if (idx === -1) {
        toast({
          title: "Error",
          description: "Venta no encontrada para cancelar.",
          variant: "destructive",
        });
        return;
      }
      const sale = placeholderSales[idx];
      if (sale.status === "Cancelado") {
        toast({
          title: "Acción no válida",
          description: "Esta venta ya ha sido cancelada.",
          variant: "default",
        });
        return;
      }
      sale.status = "Cancelado";
      sale.cancellationReason = reason;
      sale.cancelledBy = currentUser?.name || 'Usuario desconocido';

      sale.items.forEach((it) => {
        const invIdx = placeholderInventory.findIndex((inv) => inv.id === it.inventoryItemId);
        if (invIdx !== -1 && !placeholderInventory[invIdx].isService) {
          placeholderInventory[invIdx].quantity += it.quantity;
        }
      });

      setVersion((v) => v + 1);
      persistToFirestore(["sales", "inventory"]);

      toast({
        title: "Venta Cancelada",
        description: `La venta ${saleId} ha sido cancelada y el stock restaurado.`,
      });
      setIsViewDialogOpen(false);
    },
    [toast]
  );
  
  const handleCopyAsImage = async () => {
    if (!ticketContentRef.current) {
        toast({ title: "Error", description: "No se encontró el contenido del ticket.", variant: "destructive" });
        return;
    }
    try {
        const html2canvas = (await import('html2canvas')).default;
        const canvas = await html2canvas(ticketContentRef.current, {
            useCORS: true,
            backgroundColor: '#ffffff',
            scale: 2.5, 
        });
        canvas.toBlob(async (blob) => {
            if (blob) {
                try {
                    await navigator.clipboard.write([
                        new ClipboardItem({ 'image/png': blob })
                    ]);
                    toast({ title: "Copiado", description: "La imagen del ticket ha sido copiada." });
                } catch (clipboardErr) {
                    console.error('Clipboard API error:', clipboardErr);
                    toast({ title: "Error de Copiado", description: "Tu navegador no pudo copiar la imagen. Intenta imprimir.", variant: "destructive" });
                }
            } else {
                 toast({ title: "Error de Conversión", description: "No se pudo convertir el ticket a imagen.", variant: "destructive" });
            }
        }, 'image/png');
    } catch (e) {
        console.error("html2canvas error:", e);
        toast({ title: "Error de Captura", description: "No se pudo generar la imagen del ticket.", variant: "destructive" });
    }
  };

  // -------------------- Render --------------------

  if (!hydrated) {
    return <p className="p-6 text-sm text-muted-foreground">Cargando datos…</p>;
  }

  return (
    <>
      {/* ---- Tarjetas resumen ---- */}
      <div className="mb-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Ventas
            </CardTitle>
            <Receipt className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">
              {summaryData.totalSalesCount}
            </div>
            <p className="text-xs text-muted-foreground">
              Ventas completadas en el rango
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ingresos y Ganancias
            </CardTitle>
            <DollarSign className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">
              ${summaryData.totalRevenue.toLocaleString("es-MX")}
            </div>
            <p className="text-xs text-muted-foreground">
              Ganancia: $
              {summaryData.totalProfit.toLocaleString("es-MX", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Artículo Más Vendido
            </CardTitle>
            <ShoppingCart className="h-5 w-5 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div
              className="text-lg font-bold font-headline truncate"
              title={summaryData.mostSoldItem?.name}
            >
              {summaryData.mostSoldItem
                ? `${summaryData.mostSoldItem.name} (${summaryData.mostSoldItem.quantity} uds.)`
                : "N/A"}
            </div>
            <p className="text-xs text-muted-foreground">En el rango seleccionado</p>
          </CardContent>
        </Card>
      </div>

      <PageHeader
        title="Punto de Venta"
        description="Consulta, filtra y ordena todas las ventas de mostrador."
        actions={
          <Button asChild>
            <Link href="/pos/nuevo">
              <PlusCircle className="mr-2 h-4 w-4" />
              Nueva Venta
            </Link>
          </Button>
        }
      />

      {/* ---- Filtros ---- */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex gap-2">
                <Button variant="secondary" onClick={setDateToToday}>Hoy</Button>
                <Button variant="secondary" onClick={setDateToThisWeek}>Esta Semana</Button>
                <Button variant="secondary" onClick={setDateToThisMonth}>Este Mes</Button>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full sm:w-auto justify-start text-left font-normal",
                    !dateRange && "text-muted-foreground"
                  )}
                >
                  <CalendarDateIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "LLL dd, y", { locale: es })} -{" "}
                        {format(dateRange.to, "LLL dd, y", { locale: es })}
                      </>
                    ) : (
                      format(dateRange.from, "LLL dd, y", { locale: es })
                    )
                  ) : (
                    <span>Seleccione rango</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                  locale={es}
                />
              </PopoverContent>
            </Popover>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar por ID, cliente, artículo..."
                className="w-full rounded-lg bg-white pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto bg-white">
                  <ListFilter className="mr-2 h-4 w-4" />
                  Ordenar por
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Ordenar por</DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={sortOption}
                  onValueChange={(v) => setSortOption(v as SaleSortOption)}
                >
                  <DropdownMenuRadioItem value="date_desc">Fecha (Más Reciente)</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="date_asc">Fecha (Más Antiguo)</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="total_desc">Monto Total (Mayor a Menor)</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="total_asc">Monto Total (Menor a Mayor)</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="customer_asc">Cliente (A-Z)</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="customer_desc">Cliente (Z-A)</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto bg-white">
                  <FilterIcon className="mr-2 h-4 w-4" />
                  Filtrar Pago
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Método de Pago</DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={paymentMethodFilter}
                  onValueChange={(v) => setPaymentMethodFilter(v as PaymentMethod | "all")}
                >
                  {paymentMethodsForFilter.map((m) => (
                    <DropdownMenuRadioItem key={m} value={m}>
                      {m === "all" ? "Todos" : m}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </div>


      {/* ---- Tabla ---- */}
      <SalesTable
        sales={filteredAndSortedSales}
        onReprintTicket={handleReprintSale}
        inventoryItems={placeholderInventory}
        onEditSale={(sale) => {
          setSelectedSale(sale);
          setIsViewDialogOpen(true);
        }}
      />

      {/* ---- Diálogo imprimir ---- */}
      {isReprintDialogOpen && selectedSaleForReprint && (
        <PrintTicketDialog
          open={isReprintDialogOpen}
          onOpenChange={setIsReprintDialogOpen}
          title="Reimprimir Ticket de Venta"
          onDialogClose={() => setIsReprintDialogOpen(false)}
          dialogContentClassName="printable-content"
          footerActions={
            <div className="flex gap-2">
                <Button variant="outline" onClick={handleCopyAsImage}>
                    <Copy className="mr-2 h-4 w-4"/> Copiar Imagen
                </Button>
                <Button onClick={() => window.print()}>
                  <Printer className="mr-2 h-4 w-4" /> Imprimir Ticket
                </Button>
            </div>
          }
        >
          <TicketContent ref={ticketContentRef} sale={selectedSaleForReprint} />
        </PrintTicketDialog>
      )}

      {/* ---- Diálogo ver / cancelar ---- */}
      {isViewDialogOpen && selectedSale && (
        <ViewSaleDialog
          open={isViewDialogOpen}
          onOpenChange={setIsViewDialogOpen}
          sale={selectedSale}
          onCancelSale={handleCancelSale}
        />
      )}
    </>
  );
}
