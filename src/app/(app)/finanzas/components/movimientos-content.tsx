// src/app/(app)/finanzas/components/movimientos-content.tsx
"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { DateRange } from "react-day-picker";
import type {
  SaleReceipt,
  ServiceRecord,
  InventoryItem,
  Payment,
  CashDrawerTransaction,
} from "@/types";
import { useTableManager } from "@/hooks/useTableManager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { format, isValid } from "date-fns";
import { es } from "date-fns/locale";
import { TableToolbar } from "@/components/shared/table-toolbar";
import {
  FileText,
  ShoppingCart,
  Wrench,
  Wallet,
  CreditCard,
  Send,
  LineChart,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Landmark,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { parseDate } from "@/lib/forms";
import { cashService } from "@/lib/services/cash.service";
import { SortableTableHeader } from "@/components/shared/SortableTableHeader";

interface Movement {
  id: string;
  date: Date | null;
  folio: string;
  type: "Venta" | "Servicio" | "Entrada" | "Salida";
  client: string;
  payments: Payment[];
  total: number;
  profit: number;
  description?: string;
}

const sortOptions = [
  { value: "date_desc", label: "Más Reciente" },
  { value: "date_asc", label: "Más Antiguo" },
  { value: "total_desc", label: "Monto (Mayor a Menor)" },
  { value: "total_asc", label: "Monto (Menor a Menor)" },
];

const paymentMethodIcons: Record<Payment["method"], React.ElementType> = {
  Efectivo: Wallet,
  Tarjeta: CreditCard,
  "Tarjeta MSI": CreditCard,
  Transferencia: Landmark,
};

// === Helpers ===
const getPaymentDate = (p: Payment) =>
  parseDate((p as any).date || (p as any).paidAt || (p as any).createdAt);
const isCashPayment = (p: Payment) => p?.method === "Efectivo" && typeof p?.amount === "number";
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

function MovimientosTabContent({
  allSales,
  allServices,
  allInventory, // no se usa aquí, se deja por firma pública
  dateRange,
  onDateRangeChange,
}: {
  allSales: SaleReceipt[];
  allServices: ServiceRecord[];
  allInventory: InventoryItem[];
  dateRange?: DateRange;
  onDateRangeChange: (range?: DateRange) => void;
}) {
  const router = useRouter();
  const [cashTransactions, setCashTransactions] = useState<CashDrawerTransaction[]>([]);

  useEffect(() => {
    const unsubscribe = cashService.onCashTransactionsUpdate(setCashTransactions);
    return () => unsubscribe();
  }, []);

  const mergedMovements = useMemo((): Movement[] => {
    // 1) Pagos en efectivo de SERVICIOS (por fecha del pago)
    const servicePaymentMovs: Movement[] = (allServices || [])
      .filter((s) => s.status !== "Cancelado" && s.status !== "Cotizacion")
      .flatMap((s) => {
        const pays = (s as any).payments as Payment[] | undefined;
        if (!Array.isArray(pays)) return [];
        return pays
          .filter(isCashPayment)
          .map((p, idx) => {
            const d = getPaymentDate(p) || parseDate(s.deliveryDateTime) || parseDate(s.serviceDate);
            const amt = Number(p.amount) || 0;
            const isRefund = amt < 0;
            return {
              id: `${s.id}-svc-cash-${idx}`,
              date: d || null,
              folio: s.id,
              type: isRefund ? "Salida" : "Servicio",
              client: s.customerName || "N/A",
              payments: [p],
              total: Math.abs(amt),
              profit: 0,
              description: isRefund ? "Reembolso efectivo (Servicio)" : "Pago en efectivo (Servicio)",
            } as Movement;
          });
      });

    // 2) Pagos en efectivo de VENTAS (por fecha del pago)
    const salePaymentMovs: Movement[] = (allSales || [])
      .filter((s) => s.status !== "Cancelado")
      .flatMap((s) => {
        const pays = (s as any).payments as Payment[] | undefined;
        if (!Array.isArray(pays)) return [];
        return pays
          .filter(isCashPayment)
          .map((p, idx) => {
            const d = getPaymentDate(p) || parseDate(s.saleDate);
            const amt = Number(p.amount) || 0;
            const isRefund = amt < 0;
            return {
              id: `${s.id}-sale-cash-${idx}`,
              date: d || null,
              folio: s.id,
              type: isRefund ? "Salida" : "Venta",
              client: s.customerName || "Cliente Mostrador",
              payments: [p],
              total: Math.abs(amt),
              profit: 0,
              description: isRefund ? "Reembolso efectivo (Venta)" : "Pago en efectivo (Venta)",
            } as Movement;
          });
      });

    // 3) Dedupe map: clave por (tipoBase [Venta/Servicio], folio, monto)
    //    Usamos la suma de pagos para excluir asientos de caja (ledger) que reflejen lo mismo.
    const paymentKeyCounts = new Map<string, number>();
    const baseKey = (tipoBase: "Venta" | "Servicio", folio: string, amount: number) =>
      `${tipoBase}|${folio}|${round2(Math.abs(amount))}`;

    // Cargamos conteos por clave (pagos positivos y reembolsos usan la misma clave con monto absoluto)
    for (const m of [...servicePaymentMovs, ...salePaymentMovs]) {
      // Para reembolsos, el relatedType del ledger igual será Venta/Servicio, por eso usamos el tipo base para la clave.
      const tipoBase = m.type === "Servicio" || m.description?.includes("(Servicio)") ? "Servicio" : "Venta";
      const k = baseKey(tipoBase as "Venta" | "Servicio", m.folio, m.total);
      paymentKeyCounts.set(k, (paymentKeyCounts.get(k) || 0) + 1);
    }

    // 4) Movimientos de CAJA (ledger). Excluir duplicados si traen relatedType/relatedId y monto igual.
    const ledgerMovsRaw: Movement[] = (cashTransactions || []).map((t) => ({
      id: t.id,
      date: parseDate((t as any).date || (t as any).createdAt) || null,
      folio: t.id,
      type: t.type === "Entrada" ? "Entrada" : "Salida",
      client: (t as any).userName || (t as any).user || "Sistema",
      payments: [],
      total: Number(t.amount) || 0,
      profit: 0,
      description: (t as any).description || (t as any).concept || "",
    }));

    const dedupedLedger: Movement[] = [];
    for (const mov of ledgerMovsRaw) {
      const t = cashTransactions.find((x) => x.id === mov.id);
      const relatedType = (t as any)?.relatedType as string | undefined; // "Venta" | "Servicio" | "Manual" | undefined
      const relatedId = (t as any)?.relatedId as string | undefined;

      if (relatedType && (relatedType === "Venta" || relatedType === "Servicio") && relatedId) {
        // candidate para dedupe
        const k = baseKey(relatedType, relatedId, mov.total);
        const remaining = paymentKeyCounts.get(k) || 0;
        if (remaining > 0) {
          // Hay un pago equivalente ya contado -> excluimos este asiento de la lista y bajamos contador
          paymentKeyCounts.set(k, remaining - 1);
          continue;
        }
      }
      dedupedLedger.push(mov);
    }

    return [...salePaymentMovs, ...servicePaymentMovs, ...dedupedLedger];
  }, [allSales, allServices, cashTransactions]);

  const { paginatedData, fullFilteredData, ...tableManager } = useTableManager<Movement>({
    initialData: mergedMovements,
    searchKeys: ["folio", "client", "description"],
    dateFilterKey: "date",
    initialSortOption: "date_desc",
    initialDateRange: dateRange,
  });

  useEffect(() => {
    if (tableManager.onDateRangeChange) {
      tableManager.onDateRangeChange(dateRange);
    }
  }, [dateRange, tableManager.onDateRangeChange]);

  const summary = useMemo(() => {
    const movements = fullFilteredData;
    const totalMovements = movements.length;
    const totalIncome = movements
      .filter((m) => ["Venta", "Servicio", "Entrada"].includes(m.type))
      .reduce((sum, m) => sum + (m.total || 0), 0);
    const totalOutcome = movements
      .filter((m) => m.type === "Salida")
      .reduce((sum, m) => sum + (m.total || 0), 0);
    const netBalance = totalIncome - totalOutcome;
    return { totalMovements, totalIncome, totalOutcome, netBalance };
  }, [fullFilteredData]);

  const handleRowClick = (movement: Movement) => {
    if (movement.type === "Servicio") {
      window.open(`/servicios/${movement.folio}`, "_blank");
    } else if (movement.type === "Venta") {
      window.open(`/pos?saleId=${movement.folio}`, "_blank");
    }
    // No action for 'Entrada' or 'Salida' manuales
  };

  const handleSort = (key: string) => {
    const isAsc = tableManager.sortOption === `${key}_asc`;
    tableManager.onSortOptionChange(`${key}_${isAsc ? "desc" : "asc"}`);
  };

  return (
    <div className="space-y-6">
      <TableToolbar
        {...tableManager}
        searchPlaceholder="Buscar por folio, cliente, descripción..."
        sortOptions={sortOptions}
        dateRange={dateRange}
        onDateRangeChange={onDateRangeChange}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium"># Movimientos</CardTitle>
            <LineChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalMovements}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-600">Ingresos Totales</CardTitle>
            <ArrowRight className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.totalIncome)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-600">Egresos Totales</CardTitle>
            <ArrowLeft className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.totalOutcome)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo del Periodo</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.netBalance)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHeader
                    sortKey="date"
                    label="Fecha"
                    onSort={handleSort}
                    currentSort={tableManager.sortOption}
                  />
                  <SortableTableHeader
                    sortKey="type"
                    label="Tipo"
                    onSort={handleSort}
                    currentSort={tableManager.sortOption}
                  />
                  <SortableTableHeader
                    sortKey="folio"
                    label="Folio/Ref."
                    onSort={handleSort}
                    currentSort={tableManager.sortOption}
                  />
                  <SortableTableHeader
                    sortKey="client"
                    label="Cliente/Usuario"
                    onSort={handleSort}
                    currentSort={tableManager.sortOption}
                  />
                  <SortableTableHeader
                    sortKey="description"
                    label="Descripción"
                    onSort={handleSort}
                    currentSort={tableManager.sortOption}
                  />
                  <SortableTableHeader
                    sortKey="total"
                    label="Monto"
                    onSort={handleSort}
                    currentSort={tableManager.sortOption}
                    className="text-right"
                  />
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.length > 0 ? (
                  paginatedData.map((m) => (
                    <TableRow
                      key={m.id}
                      onClick={() => handleRowClick(m)}
                      className={m.type === "Venta" || m.type === "Servicio" ? "cursor-pointer" : ""}
                    >
                      <TableCell>
                        {m.date && isValid(m.date)
                          ? format(m.date, "dd MMM yyyy, HH:mm", { locale: es })
                          : "N/A"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            m.type === "Venta"
                              ? "secondary"
                              : m.type === "Servicio"
                              ? "outline"
                              : m.type === "Entrada"
                              ? "success"
                              : "destructive"
                          }
                        >
                          {m.type === "Venta" && <ShoppingCart className="h-3 w-3 mr-1" />}
                          {m.type === "Servicio" && <Wrench className="h-3 w-3 mr-1" />}
                          {m.type === "Entrada" && <ArrowRight className="h-3 w-3 mr-1" />}
                          {m.type === "Salida" && <ArrowLeft className="h-3 w-3 mr-1" />}
                          {m.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono">{m.folio.slice(-6)}</TableCell>
                      <TableCell>{m.client}</TableCell>
                      <TableCell>{m.description || "N/A"}</TableCell>
                      <TableCell
                        className={`text-right font-semibold ${
                          ["Venta", "Servicio", "Entrada"].includes(m.type) ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {formatCurrency(m.total)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No se encontraron movimientos de efectivo.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between pt-2">
        <p className="text-sm text-muted-foreground">{tableManager.paginationSummary}</p>
        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            onClick={tableManager.goToPreviousPage}
            disabled={!tableManager.canGoPrevious}
            variant="outline"
            className="bg-card"
          >
            <ChevronLeft className="h-4 w-4" /> Anterior
          </Button>
          <Button
            size="sm"
            onClick={tableManager.goToNextPage}
            disabled={!tableManager.canGoNext}
            variant="outline"
            className="bg-card"
          >
            Siguiente <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

MovimientosTabContent.displayName = "MovimientosTabContent";

export default MovimientosTabContent;
