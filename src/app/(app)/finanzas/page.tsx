// src/app/(app)/finanzas/page.tsx
"use client";

import React, { useState, useMemo, useEffect, Suspense, lazy } from "react";
import { useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { calculateSaleProfit } from "@/lib/placeholder-data";
import type {
  MonthlyFixedExpense,
  InventoryItem,
  SaleReceipt,
  ServiceRecord,
  Personnel,
  Payment,
} from "@/types";
import {
  format,
  isWithinInterval,
  isValid,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  isSameDay,
  startOfMonth,
  endOfMonth,
  isAfter,
  differenceInDays,
  getDaysInMonth,
} from "date-fns";
import { es } from "date-fns/locale";
import {
  DollarSign,
  TrendingUp,
  Loader2,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import type { DateRange } from "react-day-picker";
import {
  serviceService,
  saleService,
  inventoryService,
  personnelService,
} from "@/lib/services";
import { parseDate } from "@/lib/forms";
import { TabbedPageLayout } from "@/components/layout/tabbed-page-layout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DatePickerWithRange } from "@/components/ui/date-picker-with-range";
import { calcEffectiveProfit } from "@/lib/money-helpers";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useIsMobile } from "@/hooks/use-mobile";


const EgresosContent = lazy(() =>
  import("./components/egresos-content").then((m) => ({ default: m.EgresosContent }))
);
const MovimientosTabContent = lazy(() =>
  import("./components/movimientos-content").then((m) => ({ default: m.default }))
);
const CajaContent = lazy(() => import("./components/caja-content"));

/** Helpers coherentes en todo el archivo **/

// Ingresos de una venta (fallbacks si algún legado usa otra propiedad)
const getSaleRevenue = (s: SaleReceipt) =>
  (typeof s.totalAmount === "number" ? s.totalAmount : 0) ??
  (typeof (s as any).total === "number" ? (s as any).total : 0);

// Ingresos de un servicio (fallbacks por esquemas viejos)
const getServiceRevenue = (s: ServiceRecord) => {
  const sr: any = s as any;
  return (
    (typeof sr.totalAmount === "number" ? sr.totalAmount : undefined) ??
    (typeof sr.totalCost === "number" ? sr.totalCost : undefined) ??
    (typeof sr.grandTotal === "number" ? sr.grandTotal : undefined) ??
    (typeof sr.total === "number" ? sr.total : undefined) ??
    (typeof sr.paymentSummary?.totalPaid === "number" ? sr.paymentSummary.totalPaid : 0) ??
    0
  );
};

// Utilidad de un servicio (preferimos el helper oficial; fallback si no lo tienes calculable)
const getServiceProfit = (s: ServiceRecord): number => {
  try {
    const p = calcEffectiveProfit(s);
    if (typeof p === "number" && !Number.isNaN(p)) return p;
  } catch {}
  // Fallback: Ingresos – insumos del taller (si existen)
  const revenue = getServiceRevenue(s);
  const supplies = (s as any).totalSuppliesWorkshopCost || 0;
  return revenue - (supplies || 0);
};

// --- Componente principal de la página de Finanzas ---
function FinanzasPageComponent({ tab }: { tab?: string }) {
  const defaultTab = tab || "resumen";
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const now = new Date();
    return { from: startOfMonth(now), to: endOfMonth(now) };
  });

  const [isLoading, setIsLoading] = useState(true);
  const [allSales, setAllSales] = useState<SaleReceipt[]>([]);
  const [allServices, setAllServices] = useState<ServiceRecord[]>([]);
  const [allInventory, setAllInventory] = useState<InventoryItem[]>([]);
  const [allPersonnel, setAllPersonnel] = useState<Personnel[]>([]);
  const [fixedExpenses, setFixedExpenses] = useState<MonthlyFixedExpense[]>([]);

  useEffect(() => {
    setIsLoading(true);
    const unsubs: (() => void)[] = [];

    const fetchData = async () => {
      try {
        await Promise.all([
          new Promise<void>((resolve) =>
            unsubs.push(
              saleService.onSalesUpdate((data) => {
                setAllSales(data);
                resolve();
              })
            )
          ),
          new Promise<void>((resolve) =>
            unsubs.push(
              serviceService.onServicesUpdate((data) => {
                setAllServices(data);
                resolve();
              })
            )
          ),
          new Promise<void>((resolve) =>
            unsubs.push(
              inventoryService.onItemsUpdate((data) => {
                setAllInventory(data);
                resolve();
              })
            )
          ),
          new Promise<void>((resolve) =>
            unsubs.push(
              personnelService.onPersonnelUpdate((data) => {
                setAllPersonnel(data);
                resolve();
              })
            )
          ),
          new Promise<void>((resolve) =>
            unsubs.push(
              inventoryService.onFixedExpensesUpdate((data) => {
                setFixedExpenses(data);
                resolve();
              })
            )
          ),
        ]);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    return () => unsubs.forEach((unsub) => unsub());
  }, []);

  const financialSummary = useMemo(() => {
    const emptyState = {
      monthYearLabel: "Cargando...",
      totalOperationalIncome: 0,
      totalIncomeFromSales: 0,
      totalIncomeFromServices: 0,
      totalProfitFromSales: 0,
      totalProfitFromServices: 0,
      totalCostOfGoods: 0,
      totalOperationalProfit: 0,
      totalTechnicianSalaries: 0,
      totalAdministrativeSalaries: 0,
      totalFixedExpenses: 0,
      totalBaseExpenses: 0,
      totalVariableCommissions: 0,
      netProfit: 0,
      isProfitableForCommissions: false,
      serviceIncomeBreakdown: {} as Record<
        string,
        { income: number; profit: number; count: number }
      >,
      totalInventoryValue: 0,
      totalUnitsSold: 0,
    };

    if (isLoading) {
      return emptyState;
    }

    const dateFilter =
      dateRange || { from: new Date("2000-01-01"), to: new Date("2100-01-01") };
    if (!dateFilter.from) {
      return emptyState;
    }

    const from = startOfDay(dateFilter.from);
    const to = dateFilter.to ? endOfDay(dateFilter.to) : endOfDay(from);
    const interval = { start: from, end: to };

    const salesInRange = allSales.filter((s) => {
      const sDate = parseDate(s.saleDate);
      return s.status !== "Cancelado" && sDate && isValid(sDate) && isWithinInterval(sDate, interval);
    });

    const servicesInRange = allServices.filter((s) => {
      const dateToParse = s.deliveryDateTime || s.serviceDate;
      if (!dateToParse) return false;
      const parsedDate = parseDate(dateToParse);
      const isCancelled = s.status === "Cancelado";
      const isQuote = s.status === "Cotizacion";
      return !isCancelled && !isQuote && parsedDate && isValid(parsedDate) && isWithinInterval(parsedDate, interval);
    });

    // === INGRESOS ===
    const totalIncomeFromSales = salesInRange.reduce((sum, s) => sum + getSaleRevenue(s), 0);
    const totalIncomeFromServices = servicesInRange.reduce((sum, s) => sum + getServiceRevenue(s), 0);
    const totalOperationalIncome = totalIncomeFromSales + totalIncomeFromServices;

    // === UTILIDADES (por coherencia, mismas bases que COGS) ===
    const totalProfitFromSales = salesInRange.reduce(
      (sum, s) => sum + (calculateSaleProfit(s, allInventory) || 0),
      0
    );
    const totalProfitFromServices = servicesInRange.reduce(
      (sum, s) => sum + getServiceProfit(s),
      0
    );

    // === COGS coherente (y nunca negativo por datos inconsistentes) ===
    const cogsSales = Math.max(0, totalIncomeFromSales - totalProfitFromSales);
    const cogsServices = Math.max(0, totalIncomeFromServices - totalProfitFromServices);
    const totalCostOfGoods = cogsSales + cogsServices;

    // === GANANCIA BRUTA OPERATIVA (debe cuadrar con utilidades) ===
    const totalOperationalProfit = totalOperationalIncome - totalCostOfGoods;

    // --- EGRESOS FIJOS PROPORCIONALES ---
    const daysInPeriod = differenceInDays(to, from) + 1;
    const daysInMonthOfPeriod = getDaysInMonth(from);
    const periodFactor = daysInPeriod / daysInMonthOfPeriod;

    const totalBaseSalaries = allPersonnel
      .filter((p) => !p.isArchived)
      .reduce((sum, person) => sum + (person.monthlySalary || 0), 0);

    const totalOtherFixedExpenses = fixedExpenses
      .filter((expense) => {
        const createdAt = parseDate(expense.createdAt);
        return !createdAt || !isValid(createdAt) || !isAfter(createdAt, to);
      })
      .reduce((sum, expense) => sum + expense.amount, 0);

    const proportionalBaseExpenses =
      (totalBaseSalaries + totalOtherFixedExpenses) * periodFactor;

    // La ganancia neta no incluye comisiones.
    const netProfit = totalOperationalProfit - proportionalBaseExpenses;

    // --- DETALLE POR TIPO (mismas fórmulas del estado) ---
    const serviceIncomeBreakdown: Record<
      string,
      { income: number; profit: number; count: number }
    > = {};

    if (salesInRange.length > 0) {
      serviceIncomeBreakdown["Venta"] = {
        income: totalIncomeFromSales,
        profit: totalProfitFromSales,
        count: salesInRange.length,
      };
    }

    servicesInRange.forEach((s) => {
      const type = s.serviceType || "Servicio General";
      if (!serviceIncomeBreakdown[type])
        serviceIncomeBreakdown[type] = { income: 0, profit: 0, count: 0 };
      serviceIncomeBreakdown[type].income += getServiceRevenue(s);
      serviceIncomeBreakdown[type].profit += getServiceProfit(s);
      serviceIncomeBreakdown[type].count += 1;
    });

    // Métricas adicionales (inventario/unidades) – sin afectar el estado
    const totalUnitsSold =
      salesInRange.reduce(
        (sum, s) => sum + s.items.reduce((count, item) => count + item.quantity, 0),
        0
      ) +
      servicesInRange.reduce((sum, s) => {
        const items = (s.serviceItems || []).flatMap((si: any) => si.suppliesUsed || []);
        return sum + items.reduce((cnt: number, su: any) => cnt + (su.quantity || 0), 0);
      }, 0);

    const totalInventoryValue = allInventory
      .filter((item) => !item.isService)
      .reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

    const dateLabel = dateRange?.from
      ? dateRange.to && !isSameDay(dateRange.from, dateRange.to)
        ? `${format(dateRange.from, "dd MMM", { locale: es })} - ${format(
            dateRange.to,
            "dd MMM, yyyy",
            { locale: es }
          )}`
        : format(dateRange.from, "dd 'de' MMMM, yyyy", { locale: es })
      : "Todo el historial";

    return {
      monthYearLabel: dateLabel,
      totalOperationalIncome,
      totalIncomeFromSales,
      totalIncomeFromServices,
      totalProfitFromSales,
      totalProfitFromServices,
      totalCostOfGoods,
      totalOperationalProfit,
      totalTechnicianSalaries: totalBaseSalaries,
      totalAdministrativeSalaries: 0,
      totalFixedExpenses: totalOtherFixedExpenses,
      totalBaseExpenses: proportionalBaseExpenses,
      totalVariableCommissions: 0,
      netProfit,
      isProfitableForCommissions: false,
      serviceIncomeBreakdown,
      totalInventoryValue,
      totalUnitsSold,
    };
  }, [
    dateRange,
    isLoading,
    allSales,
    allServices,
    allInventory,
    allPersonnel,
    fixedExpenses,
  ]);

  const tabs = [
    {
      value: "resumen",
      label: "Resumen Financiero",
      content: (
        <div className="space-y-6">
           <Card>
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <DollarSign className="h-6 w-6 text-primary" />
                Estado de Resultados
              </CardTitle>
              <CardDescription>
                Resumen de pérdidas y ganancias para el periodo: {financialSummary.monthYearLabel}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-base">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Ingresos Operativos Totales:</span>
                  <span className="font-semibold text-lg">
                    {formatCurrency(financialSummary.totalOperationalIncome)}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">(-) Costo Total de Insumos:</span>
                  <span className="font-semibold text-lg text-orange-500">
                    -{formatCurrency(financialSummary.totalCostOfGoods)}
                  </span>
                </div>

                <hr className="my-2 border-dashed" />
                <div className="flex justify-between items-center font-bold text-xl pt-1">
                  <span className="text-foreground">(=) Ganancia Bruta Operativa:</span>
                  <span className="text-xl text-green-600">
                    {formatCurrency(financialSummary.totalOperationalProfit)}
                  </span>
                </div>
              </div>

              <hr className="my-4 border-border" />

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">(-) Gastos Fijos (Proporcionales):</span>
                  <span className="font-semibold text-lg text-red-500">
                    -{formatCurrency(financialSummary.totalBaseExpenses)}
                  </span>
                </div>

                <hr className="my-2 border-dashed" />
                <div className="flex justify-between items-center font-bold text-2xl pt-1">
                  <span className="text-foreground">(=) Utilidad Neta del Periodo:</span>
                  <span
                    className={cn(
                      "text-2xl",
                      financialSummary.netProfit >= 0 ? "text-green-600" : "text-red-600"
                    )}
                  >
                    {formatCurrency(financialSummary.netProfit)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <TrendingUp className="h-6 w-6 text-green-500" />
                  Ingresos y Ganancia
                </CardTitle>
                <CardDescription>Detalle por tipo de operación</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-base">
                <div className="grid grid-cols-4 gap-4 font-semibold text-sm text-muted-foreground border-b pb-2">
                  <div className="col-span-1">Categoría</div>
                  <div className="col-span-1 text-right">Ops.</div>
                  <div className="col-span-1 text-right">Ingresos</div>
                  <div className="col-span-1 text-right">Ganancia</div>
                </div>
                <div className="space-y-3 text-sm">
                  {Object.entries(financialSummary.serviceIncomeBreakdown).map(
                    ([type, data]) => (
                      <div key={type} className="grid grid-cols-4 gap-4 items-center">
                        <div className="col-span-1 font-semibold">{type}</div>
                        <div className="col-span-1 text-right font-medium">{data.count}</div>
                        <div className="col-span-1 text-right font-medium">
                          {formatCurrency(data.income)}
                        </div>
                        <div className="col-span-1 text-right font-medium text-green-600">
                          {formatCurrency(data.profit)}
                        </div>
                      </div>
                    )
                  )}
                </div>
              </CardContent>
            </Card>

            <Suspense fallback={<Loader2 className="animate-spin" />}>
              <EgresosContent
                financialSummary={financialSummary}
                fixedExpenses={fixedExpenses}
                personnel={allPersonnel}
                onExpensesUpdated={(updated) => setFixedExpenses([...updated])}
              />
            </Suspense>
          </div>
        </div>
      ),
    },
    {
      value: "movimientos",
      label: "Movimientos",
      content: (
        <Suspense fallback={<div className="p-8 text-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
          <MovimientosTabContent
            allSales={allSales}
            allServices={allServices}
            allInventory={allInventory}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
          />
        </Suspense>
      ),
    },
    {
      value: "caja",
      label: "Caja",
      content: (
        <Suspense fallback={<div className="p-8 text-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
          <CajaContent />
        </Suspense>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex h-64 justify-center items-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <TabbedPageLayout
      title="Finanzas"
      description={
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-2">
            <p className="text-primary-foreground/80">Analiza el rendimiento y las operaciones de tu taller.</p>
            <div className="w-full sm:w-auto">
                <DatePickerWithRange date={dateRange} onDateChange={setDateRange} />
            </div>
        </div>
      }
      activeTab={activeTab}
      onTabChange={setActiveTab}
      tabs={tabs}
      isMobile={isMobile}
    />
  );
}

function FinanzasPageWrapper() {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") as string | undefined;

  return <FinanzasPageComponent tab={tab} />;
}

export default function FinanzasPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 w-full items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }
    >
      <FinanzasPageWrapper />
    </Suspense>
  );
}
