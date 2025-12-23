
// src/app/(app)/finanzas/components/movimientos-content.tsx

"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type {
  SaleReceipt,
  ServiceRecord,
  InventoryItem,
  Payment,
  CashDrawerTransaction,
  PaymentMethod,
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
  ShoppingCart,
  Wrench,
  Wallet,
  CreditCard,
  Landmark,
  LineChart,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { parseDate } from "@/lib/forms";
import { cashService } from "@/lib/services/cash.service";
import { SortableTableHeader } from "@/components/shared/SortableTableHeader";
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";


interface DateRange {
  from: Date | undefined;
  to?: Date | undefined;
}

// --- Tipos UI ---
type MovementOrigin = "payment" | "ledger";
interface Movement {
  id: string;
  origin: MovementOrigin;
  date: Date | null;
  folio: string;
  type: "Venta" | "Servicio" | "Entrada" | "Salida";
  client: string;
  method?: Payment["method"];  // solo para pagos
  total: number;               // siempre en positivo para UI
  isRefund?: boolean;          // pagos negativos
  description?: string;
}

const sortOptions = [
  { value: "date_desc", label: "Más Reciente" },
  { value: "date_asc", label: "Más Antiguo" },
  { value: "total_desc", label: "Monto (Mayor a Menor)" },
  { value: "total_asc", label: "Monto (Menor a Mayor)" },
];

const paymentMethodIcons: Partial<Record<PaymentMethod, React.ElementType>> = {
  Efectivo: Wallet,
  Tarjeta: CreditCard,
  "Tarjeta MSI": CreditCard,
  Transferencia: Landmark,
  "Efectivo+Transferencia": Wallet,
  "Tarjeta+Transferencia": CreditCard,
};

// === Helpers ===
const getPaymentDate = (p: Payment) =>
  parseDate((p as any).date || (p as any).paidAt || (p as any).createdAt);

const getAdvisorForService = (s: ServiceRecord): string => {
  const anyS = s as any;
  return (
    anyS.deliveredByName ||
    anyS.statusHistory?.find((h: any) => h?.status === "Entregado")?.userName ||
    anyS.advisorName ||
    anyS.assignedToName ||
    anyS.technicianName ||
    s.customerName ||
    "N/A"
  );
};

function MovimientosTabContent({
  allSales,
  allServices,
  allInventory, // sin uso aquí
  allExpenses,
  dateRange,
  onDateRangeChange,
}: {
  allSales: SaleReceipt[];
  allServices: ServiceRecord[];
  allInventory: InventoryItem[];
  allExpenses: any[];
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
    // 1) PAGOS de SERVICIOS (todos los métodos)
    const servicePaymentMovs: Movement[] = (allServices || [])
      .filter((s) => s.status !== "Cancelado" && s.status !== "Cotizacion")
      .flatMap((s) => {
        const pays = (s as any).payments as Payment[] | undefined;
        if (!Array.isArray(pays)) return [];
        const advisor = getAdvisorForService(s);
        return pays
          .filter((p) => typeof p?.amount === "number" && !Number.isNaN(p.amount))
          .map((p, idx) => {
            const d = getPaymentDate(p) || parseDate(s.deliveryDateTime || new Date().toISOString()) || parseDate(s.serviceDate || new Date().toISOString());
            const amt = Number(p.amount) || 0;
            const isRefund = amt < 0;
            const folio = s.folio || s.id.slice(-6);
            return {
              id: `${s.id}-svc-pay-${idx}`,
              origin: "payment",
              date: d || null,
              folio: s.id,
              type: "Servicio",
              client: advisor,
              method: p.method,
              total: Math.abs(amt),
              isRefund,
              description: `Pago Servicio #${folio}`,
            } as Movement;
          });
      });

    // 2) PAGOS de VENTAS (todos los métodos)
    const salePaymentMovs: Movement[] = (allSales || [])
      .filter((s) => s.status !== "Cancelado")
      .flatMap((s) => {
        const pays = (s as any).payments as Payment[] | undefined;
        if (!Array.isArray(pays)) return [];
        const customer = s.customerName || "Cliente Mostrador";
        return pays
          .filter((p) => typeof p?.amount === "number" && !Number.isNaN(p.amount))
          .map((p, idx) => {
            const d = getPaymentDate(p) || parseDate(s.saleDate as any);
            const amt = Number(p.amount) || 0;
            const isRefund = amt < 0;
            const folio = s.id.slice(-6);
            return {
              id: `${s.id}-sale-pay-${idx}`,
              origin: "payment",
              date: d || null,
              folio: s.id,
              type: "Venta",
              client: customer,
              method: p.method,
              total: Math.abs(amt),
              isRefund,
              description: `Pago Venta #${folio}`,
            } as Movement;
          });
      });

    // 3) ASIENTOS de CAJA (ledger) – Solo manuales para evitar duplicados
    const ledgerMovs: Movement[] = (cashTransactions || [])
      .filter(t => t.relatedType === 'Manual')
      .map((t) => ({
        id: t.id,
        origin: "ledger",
        date: parseDate((t as any).date || (t as any).createdAt) || null,
        folio: t.id,
        type: t.type === "in" || t.type === "Entrada" ? "Entrada" : "Salida",
        client: (t as any).userName || (t as any).user || "Sistema",
        total: Math.abs(Number(t.amount) || 0),
        description: (t as any).description || (t as any).concept || "",
    }));

    return [...salePaymentMovs, ...servicePaymentMovs, ...ledgerMovs];
  }, [allSales, allServices, cashTransactions]);

  const { paginatedData, fullFilteredData, ...tableManager } = useTableManager<Movement>({
    initialData: mergedMovements,
    searchKeys: ["folio", "client", "description"],
    dateFilterKey: "date",
    initialSortOption: "date_desc",
  });

  const onDateRangeChangeCallback = tableManager.onDateRangeChange;
  useEffect(() => {
    if (onDateRangeChangeCallback) {
        onDateRangeChangeCallback(dateRange);
    }
  }, [dateRange, onDateRangeChangeCallback]);

  // ---- KPI: Ingresos = pagos positivos (todos métodos); Egresos = Salidas de caja (ledger) ----
  const summary = useMemo(() => {
    const rows = fullFilteredData;
    const ingresos = rows
      .filter((m) => m.origin === "payment" && !m.isRefund)
      .reduce((sum, m) => sum + (m.total || 0), 0);

    const ingresosEfectivo = rows
      .filter((m) => m.origin === "payment" && !m.isRefund && m.method === 'Efectivo')
      .reduce((sum, m) => sum + (m.total || 0), 0);
      
    const egresosCaja = rows
      .filter((m) => m.origin === "ledger" && (m.type === "Salida" || m.type === "out"))
      .reduce((sum, m) => sum + (m.total || 0), 0);

    const neto = ingresos - egresosCaja;
    return {
      totalMovements: rows.length,
      totalIncome: ingresos,
      cashIncome: ingresosEfectivo,
      totalOutcome: egresosCaja,
      netBalance: neto,
    };
  }, [fullFilteredData]);

  const handleRowClick = (m: Movement) => {
    if (m.origin === "payment") {
      if (m.type === "Servicio") window.open(`/servicios/${m.folio}`, "_blank");
      if (m.type === "Venta") window.open(`/pos?saleId=${m.folio}`, "_blank");
    }
    // ledger no navega
  };

  const handleSort = (key: string) => {
    const isAsc = tableManager.sortOption === `${key}_asc`;
    tableManager.onSortOptionChange(`${key}_${isAsc ? "desc" : "asc"}`);
  };

  return (
    <div className="space-y-6">
      <TableToolbar
        {...tableManager}
        searchPlaceholder="Buscar por folio, usuario/asesor, descripción..."
        sortOptions={sortOptions}
        dateRange={dateRange}
        onDateRangeChange={onDateRangeChange}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-600">Ingresos en Efectivo</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.cashIncome)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-600">Ingresos (todos los métodos)</CardTitle>
            <ArrowRight className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.totalIncome)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-600">Egresos de Caja</CardTitle>
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
              <TableHeader className="bg-background">
                <TableRow className="hover:bg-transparent">
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
                  <SortableTableHeader
                    sortKey="method"
                    label="Método"
                    onSort={handleSort}
                    currentSort={tableManager.sortOption}
                    className="text-right"
                  />
                </TableRow>
              </TableHeader>

              <TableBody>
                {paginatedData.length > 0 ? (
                  paginatedData.map((m) => {
                    const badgeVariant =
                      m.type === "Venta"
                        ? "secondary"
                        : m.type === "Servicio"
                        ? "outline"
                        : m.type === "Entrada"
                        ? "success"
                        : "destructive";

                    const amountClass =
                      m.origin === "ledger"
                        ? m.type === "Entrada"
                          ? "text-green-600"
                          : "text-red-600"
                        : m.isRefund
                        ? "text-red-600"
                        : "text-green-600";

                    return (
                      <TableRow
                        key={m.id}
                        onClick={() => handleRowClick(m)}
                        className={
                          m.origin === "payment" && (m.type === "Venta" || m.type === "Servicio")
                            ? "cursor-pointer"
                            : ""
                        }
                      >
                        <TableCell>
                          {m.date && isValid(m.date)
                            ? format(m.date, "dd MMM yyyy, HH:mm", { locale: es })
                            : "N/A"}
                        </TableCell>

                        <TableCell>
                          <Badge variant={badgeVariant}>
                            {m.type === "Venta" && <ShoppingCart className="h-3 w-3 mr-1" />}
                            {m.type === "Servicio" && <Wrench className="h-3 w-3 mr-1" />}
                            {m.type === "Entrada" && <ArrowRight className="h-3 w-3 mr-1" />}
                            {m.type === "Salida" && <ArrowLeft className="h-3 w-3 mr-1" />}
                            {m.type}
                          </Badge>
                        </TableCell>

                        <TableCell>{m.client}</TableCell>

                        <TableCell>{m.description || "Movimiento de caja"}</TableCell>

                        <TableCell className={`text-right font-semibold ${amountClass}`}>
                          {formatCurrency(m.total)}
                        </TableCell>
                         <TableCell className="text-right">
                          {m.method || ''}
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No se encontraron movimientos.
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

export default MovimientosTabContent;
