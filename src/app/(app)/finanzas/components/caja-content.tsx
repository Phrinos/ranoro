// src/app/(app)/finanzas/components/caja-content.tsx
"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { DateRange } from "react-day-picker";
import type {
  SaleReceipt,
  ServiceRecord,
  CashDrawerTransaction,
  Payment,
  WorkshopInfo,
} from "@/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import {
  format,
  isValid,
  startOfDay,
  endOfDay,
  subDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
} from "date-fns";
import { es } from "date-fns/locale";
import {
  DollarSign,
  ArrowDown,
  ArrowUp,
  Loader2,
} from "lucide-react";
import { parseDate } from "@/lib/forms";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  cashService,
  saleService,
  serviceService,
} from "@/lib/services";
import { useToast } from "@/hooks/use-toast";
import { AUTH_USER_LOCALSTORAGE_KEY } from "@/lib/placeholder-data";
import { cn } from "@/lib/utils";
import { DatePickerWithRange } from "@/components/ui/date-picker-with-range";
import { SortableTableHeader } from "@/components/shared/SortableTableHeader";

const cashTransactionSchema = z.object({
  description: z.string().min(3, "La descripción debe tener al menos 3 caracteres."),
  amount: z.coerce.number().min(0.01, "El monto debe ser mayor a 0."),
});
type CashTransactionFormValues = z.infer<typeof cashTransactionSchema>;

// Para la tabla local
type EnhancedCashDrawerTransaction = CashDrawerTransaction & {
  fullDescription?: string;
};

// Helpers de pagos (ventas/servicios) -> efectivo
const getPaymentDate = (p: Payment) =>
  parseDate((p as any).date || (p as any).paidAt || (p as any).createdAt);

const isCashPayment = (p: Payment) => p?.method === "Efectivo" && typeof p?.amount === "number" && !Number.isNaN(p.amount);

// Normaliza la fecha de un movimiento de caja (ledger)
const getLedgerDate = (m: CashDrawerTransaction) => parseDate((m as any).date || (m as any).createdAt);

export default function CajaContent() {
  const { toast } = useToast();
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<"Entrada" | "Salida">("Entrada");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const now = new Date();
    return { from: startOfMonth(now), to: endOfMonth(now) };
  });

  const [isLoading, setIsLoading] = useState(true);
  const [cashTransactions, setCashTransactions] = useState<CashDrawerTransaction[]>([]);
  const [allSales, setAllSales] = useState<SaleReceipt[]>([]);
  const [allServices, setAllServices] = useState<ServiceRecord[]>([]);
  const [isLoadingDocument, setIsLoadingDocument] = useState(false);
  const [workshopInfo, setWorkshopInfo] = useState<WorkshopInfo | null>(null);
  const [sortOption, setSortOption] = useState("date_desc");

  useEffect(() => {
    setIsLoading(true);
    const unsubs: Array<() => void> = [];

    unsubs.push(
      cashService.onCashTransactionsUpdate((transactions) => {
        setCashTransactions(transactions);
      })
    );

    // Suscribimos ventas y servicios para conciliación por PAGOS en efectivo
    unsubs.push(
      saleService.onSalesUpdate((sales) => {
        setAllSales(sales || []);
      })
    );
    unsubs.push(
      serviceService.onServicesUpdate((services) => {
        setAllServices(services || []);
      })
    );

    const storedWorkshopInfo = localStorage.getItem("workshopTicketInfo");
    if (storedWorkshopInfo) {
      try {
        setWorkshopInfo(JSON.parse(storedWorkshopInfo));
      } catch (e) {
        console.error("Failed to parse workshop info from localStorage", e);
      }
    }

    setIsLoading(false);
    return () => unsubs.forEach((u) => u && u());
  }, []);

  const form = useForm<CashTransactionFormValues>({
    resolver: zodResolver(cashTransactionSchema),
  });

  // --- Ordenado correcto (numérico para date/amount) ---
  const mergedCashMovements = useMemo(() => {
    const [key, direction] = (sortOption || "date_desc").split("_");
    const dir = direction === "asc" ? 1 : -1;

    const rows: EnhancedCashDrawerTransaction[] = (cashTransactions || []).map((t) => ({
      ...t,
      fullDescription: (t as any).fullDescription || t.description || (t as any).concept || "",
      description: t.description || (t as any).concept || "",
    }));

    return rows.sort((a, b) => {
      if (key === "date") {
        const da = getLedgerDate(a)?.getTime() ?? 0;
        const db = getLedgerDate(b)?.getTime() ?? 0;
        return (da - db) * dir;
      }
      if (key === "amount") {
        const aa = Number(a.amount) || 0;
        const ab = Number(b.amount) || 0;
        return (aa - ab) * dir;
      }
      const va = String((a as any)[key] ?? "");
      const vb = String((b as any)[key] ?? "");
      return va.localeCompare(vb, "es", { numeric: true }) * dir;
    });
  }, [cashTransactions, sortOption]);

  // --- Filtrado por periodo del libro de caja (ledger) ---
  const ledgerPeriod = useMemo(() => {
    if (!dateRange?.from) {
      return { movements: [] as EnhancedCashDrawerTransaction[], totalIn: 0, totalOut: 0, netBalance: 0 };
    }
    const from = startOfDay(dateRange.from);
    const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(from);

    const movements = mergedCashMovements.filter((m) => {
      const d = getLedgerDate(m);
      return d && isValid(d) && isWithinInterval(d, { start: from, end: to });
    });

    let totalIn = 0;
    let totalOut = 0;
    for (const m of movements) {
      if (m.type === "Entrada") totalIn += m.amount || 0;
      else if (m.type === "Salida") totalOut += m.amount || 0;
    }

    return { movements, totalIn, totalOut, netBalance: totalIn - totalOut };
  }, [mergedCashMovements, dateRange]);

  // --- Pagos en EFECTIVO detectados (Ventas/Servicios) por fecha de pago ---
  const detectedCash = useMemo(() => {
    if (!dateRange?.from) {
      return { totalIn: 0, totalOut: 0, netBalance: 0, count: 0 };
    }
    const from = startOfDay(dateRange.from);
    const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(from);

    let totalIn = 0;
    let totalOut = 0;
    let count = 0;

    // Ventas (no canceladas) -> pagos en efectivo dentro del rango
    (allSales || [])
      .filter((s) => s?.status !== "Cancelado")
      .forEach((s) => {
        const pays = (s as any).payments as Payment[] | undefined;
        if (!Array.isArray(pays)) return;
        pays.forEach((p) => {
          if (!isCashPayment(p)) return;
          const pd = getPaymentDate(p);
          if (!pd || !isValid(pd)) return;
          if (!isWithinInterval(pd, { start: from, end: to })) return;
          // Consideramos pagos positivos como ENTRADA; si tu sistema maneja reembolsos en negativo, aquí sumarían a Out
          const amt = Number(p.amount) || 0;
          if (amt >= 0) totalIn += amt;
          else totalOut += Math.abs(amt);
          count++;
        });
      });

    // Servicios (no cancelados ni cotización) -> pagos en efectivo dentro del rango
    (allServices || [])
      .filter((s) => s?.status !== "Cancelado" && s?.status !== "Cotizacion")
      .forEach((s) => {
        const pays = (s as any).payments as Payment[] | undefined;
        if (!Array.isArray(pays)) return;
        pays.forEach((p) => {
          if (!isCashPayment(p)) return;
          const pd = getPaymentDate(p);
          if (!pd || !isValid(pd)) return;
          if (!isWithinInterval(pd, { start: from, end: to })) return;
          const amt = Number(p.amount) || 0;
          if (amt >= 0) totalIn += amt;
          else totalOut += Math.abs(amt);
          count++;
        });
      });

    return { totalIn, totalOut, netBalance: totalIn - totalOut, count };
  }, [allSales, allServices, dateRange]);

  const handleOpenDialog = (type: "Entrada" | "Salida") => {
    setDialogType(type);
    form.reset();
    setIsDialogOpen(true);
  };

  const handleRowClick = async (movement: EnhancedCashDrawerTransaction) => {
    if (!movement.relatedId || !movement.relatedType) return;
    if (movement.relatedType === "Venta") {
      router.push(`/pos?saleId=${movement.relatedId}`);
    } else if (movement.relatedType === "Servicio") {
      router.push(`/servicios/${movement.relatedId}`);
    }
  };

  const handleTransactionSubmit = async (values: CashTransactionFormValues) => {
    const authUserString = localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY);
    const currentUser = authUserString ? JSON.parse(authUserString) : null;
    try {
      await cashService.addCashTransaction({
        type: dialogType,
        amount: values.amount,
        description: values.description,
        userId: currentUser?.id || "system",
        userName: currentUser?.name || "Sistema",
        relatedType: "Manual",
      });
      toast({ title: `Se registró una ${dialogType.toLowerCase()} de caja.` });
      setIsDialogOpen(false);
    } catch (e) {
      toast({
        title: "Error",
        description: "No se pudo registrar la transacción.",
        variant: "destructive",
      });
    }
  };

  const setPresetRange = (preset: "today" | "yesterday" | "week" | "month") => {
    const now = new Date();
    switch (preset) {
      case "today":
        setDateRange({ from: startOfDay(now), to: endOfDay(now) });
        break;
      case "yesterday":
        const yesterday = subDays(now, 1);
        setDateRange({ from: startOfDay(yesterday), to: endOfDay(yesterday) });
        break;
      case "week":
        setDateRange({
          from: startOfWeek(now, { weekStartsOn: 1 }),
          to: endOfWeek(now, { weekStartsOn: 1 }),
        });
        break;
      case "month":
        setDateRange({ from: startOfMonth(now), to: endOfMonth(now) });
        break;
    }
  };

  const handleSort = (key: string) => {
    const isAsc = sortOption === `${key}_asc`;
    setSortOption(`${key}_${isAsc ? "desc" : "asc"}`);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-semibold tracking-tight">Caja</h2>
        <div className="flex gap-2 items-center flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPresetRange("today")}
            className="bg-card"
          >
            Hoy
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPresetRange("yesterday")}
            className="bg-card"
          >
            Ayer
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPresetRange("week")}
            className="bg-card"
          >
            Semana
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPresetRange("month")}
            className="bg-card"
          >
            Mes
          </Button>
          <DatePickerWithRange date={dateRange} onDateChange={setDateRange} />
        </div>
      </div>

      {/* KPI Libro de Caja (ledger) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-600">
              Entradas Totales (Libro)
            </CardTitle>
            <ArrowUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(ledgerPeriod.totalIn)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-600">
              Salidas Totales (Libro)
            </CardTitle>
            <ArrowDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(ledgerPeriod.totalOut)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Balance del Periodo (Libro)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(ledgerPeriod.netBalance)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Conciliación con pagos en efectivo detectados */}
      <Card>
        <CardHeader>
          <CardTitle>Conciliación de Caja (Efectivo)</CardTitle>
          <CardDescription>
            Compara el libro de caja contra los pagos en efectivo registrados en Ventas/Servicios por fecha de pago.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Entradas detectadas (pagos en efectivo)</p>
            <p className="text-lg font-semibold text-green-600">
              {formatCurrency(detectedCash.totalIn)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Salidas detectadas (reembolsos/ajustes en efectivo)</p>
            <p className="text-lg font-semibold text-red-600">
              {formatCurrency(detectedCash.totalOut)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Diferencia (Libro – Detectado)</p>
            <p
              className={cn(
                "text-lg font-semibold",
                ledgerPeriod.netBalance - detectedCash.netBalance === 0
                  ? "text-green-600"
                  : "text-amber-600"
              )}
            >
              {formatCurrency(ledgerPeriod.netBalance - detectedCash.netBalance)}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button
          onClick={() => handleOpenDialog("Entrada")}
          variant="outline"
          className="text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700 bg-card"
        >
          <ArrowUp className="mr-2 h-4 w-4" /> Registrar Entrada
        </Button>
        <Button
          onClick={() => handleOpenDialog("Salida")}
          variant="outline"
          className="text-red-600 border-red-600 hover:bg-red-50 hover:text-red-700 bg-card"
        >
          <ArrowDown className="mr-2 h-4 w-4" /> Registrar Salida
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Movimientos de Caja del Periodo (Libro)</CardTitle>
          <CardDescription>
            Incluye servicios, ventas y registros manuales almacenados en el libro de caja.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHeader
                    sortKey="date"
                    label="Hora"
                    onSort={handleSort}
                    currentSort={sortOption}
                  />
                  <SortableTableHeader
                    sortKey="type"
                    label="Tipo"
                    onSort={handleSort}
                    currentSort={sortOption}
                  />
                  <SortableTableHeader
                    sortKey="relatedType"
                    label="Origen"
                    onSort={handleSort}
                    currentSort={sortOption}
                  />
                  <SortableTableHeader
                    sortKey="relatedId"
                    label="ID Movimiento/Folio"
                    onSort={handleSort}
                    currentSort={sortOption}
                  />
                  <SortableTableHeader
                    sortKey="description"
                    label="Descripción"
                    onSort={handleSort}
                    currentSort={sortOption}
                  />
                  <SortableTableHeader
                    sortKey="userName"
                    label="Usuario"
                    onSort={handleSort}
                    currentSort={sortOption}
                  />
                  <SortableTableHeader
                    sortKey="amount"
                    label="Monto"
                    onSort={handleSort}
                    currentSort={sortOption}
                    className="text-right"
                  />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingDocument && (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      <Loader2 className="mr-2 h-5 w-5 animate-spin inline-block" /> Cargando
                      documento...
                    </TableCell>
                  </TableRow>
                )}
                {!isLoadingDocument && ledgerPeriod.movements.length > 0 ? (
                  ledgerPeriod.movements.map((m: EnhancedCashDrawerTransaction) => (
                    <TableRow
                      key={m.id}
                      onClick={() => {
                        if (m.relatedId && m.relatedType) {
                          if (m.relatedType === "Venta") router.push(`/pos?saleId=${m.relatedId}`);
                          else if (m.relatedType === "Servicio") router.push(`/servicios/${m.relatedId}`);
                        }
                      }}
                      className={m.relatedId ? "cursor-pointer hover:bg-muted/50" : ""}
                    >
                      <TableCell>
                        {getLedgerDate(m) && isValid(getLedgerDate(m)!)
                          ? format(getLedgerDate(m)!, "dd MMM, HH:mm", { locale: es })
                          : "N/A"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={m.type === "Entrada" ? "success" : "destructive"}>
                          {m.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{m.relatedType || "Manual"}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {m.relatedId ? m.relatedId.slice(-6) : m.id.slice(-6)}
                      </TableCell>
                      <TableCell className="max-w-[280px] truncate">
                        {m.fullDescription}
                      </TableCell>
                      <TableCell>{m.userName}</TableCell>
                      <TableCell
                        className={cn(
                          "text-right font-semibold",
                          m.type === "Entrada" ? "text-green-600" : "text-red-600"
                        )}
                      >
                        {formatCurrency(m.amount || 0)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  !isLoadingDocument && (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        No se encontraron movimientos de caja para este periodo.
                      </TableCell>
                    </TableRow>
                  )
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md p-0">
          <DialogHeader className="p-6 pb-4">
            <DialogTitle>Registrar {dialogType} de Caja</DialogTitle>
            <DialogDescription>
              Añade una descripción y monto para registrar el movimiento.
            </DialogDescription>
          </DialogHeader>
          <div className="p-6 pt-0">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(handleTransactionSubmit)}
                id="cash-transaction-form"
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descripción</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={
                            dialogType === "Entrada"
                              ? "Ej: Fondo inicial"
                              : "Ej: Compra de papelería"
                          }
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Monto</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            {...field}
                            value={field.value ?? ""}
                            className="pl-8"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          </div>
          <DialogFooter className="p-6 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              form="cash-transaction-form"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? "Guardando..." : `Registrar ${dialogType}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
