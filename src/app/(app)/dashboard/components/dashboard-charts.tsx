
"use client";

import * as React from "react";
import {
  Line,
  LineChart,
  Pie,
  PieChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  placeholderServiceRecords,
  placeholderSales,
  calculateSaleProfit,
  placeholderInventory,
} from "@/lib/placeholder-data";
import { subMonths, format, parseISO, isValid } from "date-fns";
import { es } from "date-fns/locale";

interface MonthlyChartData {
  month: string;
  revenue: number;
  profit: number;
}

interface MonthlyOperationsData {
  month: string;
  services: number;
  sales: number;
}

interface ServiceTypeChartData {
  name: string;
  value: number;
  fill: string;
}

interface RevenueSourceChartData {
  source: string;
  value: number;
  fill: string;
}

export function DashboardCharts() {
  const [monthlyChartData, setMonthlyChartData] =
    React.useState<MonthlyChartData[]>([]);
  const [monthlyOperationsData, setMonthlyOperationsData] =
    React.useState<MonthlyOperationsData[]>([]);
  const [serviceTypeChartData, setServiceTypeChartData] =
    React.useState<ServiceTypeChartData[]>([]);
  const [revenueSourceChartData, setRevenueSourceChartData] =
    React.useState<RevenueSourceChartData[]>([]);

  React.useEffect(() => {
    const now = new Date();

    const monthlyData: Record<string, MonthlyChartData> = {};
    const monthlyOpsData: Record<string, MonthlyOperationsData> = {};

    for (let i = 5; i >= 0; i--) {
      const date = subMonths(now, i);
      const monthKey = format(date, "yyyy-MM");
      const monthLabel = format(date, "MMM", { locale: es });
      monthlyData[monthKey] = { month: monthLabel, revenue: 0, profit: 0 };
      monthlyOpsData[monthKey] = { month: monthLabel, services: 0, sales: 0 };
    }

    placeholderServiceRecords.forEach((service) => {
      if (service.status !== "Completado") return;
      const date = parseISO(service.deliveryDateTime || service.serviceDate);
      if (!isValid(date)) return;
      const monthKey = format(date, "yyyy-MM");
      if (monthlyData[monthKey]) {
        monthlyData[monthKey].revenue += service.totalCost || 0;
        const profit = (service.totalCost || 0) - (service.totalSuppliesCost || 0);
        monthlyData[monthKey].profit += isFinite(profit) ? profit : 0;
        monthlyOpsData[monthKey].services += 1;
      }
    });

    placeholderSales.forEach((sale) => {
      const date = parseISO(sale.saleDate);
      if (!isValid(date)) return;
      const monthKey = format(date, "yyyy-MM");
      if (monthlyData[monthKey]) {
        monthlyData[monthKey].revenue += sale.totalAmount;
        monthlyData[monthKey].profit += calculateSaleProfit(
          sale,
          placeholderInventory
        );
        monthlyOpsData[monthKey].sales += 1;
      }
    });

    setMonthlyChartData(Object.values(monthlyData));
    setMonthlyOperationsData(Object.values(monthlyOpsData));

    const serviceTypeCounts: Record<string, number> = {};
    placeholderServiceRecords.forEach((service) => {
      const type = service.serviceType || "Servicio General";
      serviceTypeCounts[type] = (serviceTypeCounts[type] || 0) + 1;
    });

    const serviceTypeColors: Record<string, string> = {
      "Servicio General": "hsl(var(--chart-1))",
      "Cambio de Aceite": "hsl(var(--chart-2))",
      Pintura: "hsl(var(--chart-3))",
    };

    setServiceTypeChartData(
      Object.entries(serviceTypeCounts).map(([name, value], index) => ({
        name,
        value,
        fill:
          serviceTypeColors[name] ||
          `hsl(var(--chart-${(index % 5) + 1}))`,
      }))
    );

    const totalServiceRevenue = placeholderServiceRecords
      .filter((s) => s.status === "Completado")
      .reduce((sum, s) => sum + (s.totalCost || 0), 0);
    const totalPosRevenue = placeholderSales.reduce(
      (sum, s) => sum + s.totalAmount,
      0
    );

    setRevenueSourceChartData([
      {
        source: "Servicios",
        value: totalServiceRevenue,
        fill: "hsl(var(--chart-1))",
      },
      {
        source: "Ventas POS",
        value: totalPosRevenue,
        fill: "hsl(var(--chart-2))",
      },
    ]);
  }, []);

  const formatCurrency = (value: number) =>
    `$${new Intl.NumberFormat("es-MX", {
      notation: "compact",
      compactDisplay: "short",
    }).format(value)}`;

  const formatNumber = (value: number) =>
    new Intl.NumberFormat("es-MX").format(value);

  const monthlyChartConfig: ChartConfig = {
    revenue: { label: "Ingresos", color: "hsl(var(--chart-1))" },
    profit: { label: "Ganancia", color: "hsl(var(--chart-2))" },
  };

  const monthlyOpsChartConfig: ChartConfig = {
    services: { label: "Servicios", color: "hsl(var(--chart-1))" },
    sales: { label: "Ventas", color: "hsl(var(--chart-2))" },
  };

  const serviceTypeChartConfig: ChartConfig = serviceTypeChartData.reduce(
    (acc, { name, fill }) => {
      acc[name] = { label: name, color: fill };
      return acc;
    },
    {} as ChartConfig
  );

  const revenueSourceChartConfig: ChartConfig = {
    Servicios: { label: "Servicios", color: "hsl(var(--chart-1))" },
    "Ventas POS": { label: "Ventas POS", color: "hsl(var(--chart-2))" },
  };

  return (
    <>
      <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2">
        {/* CHART 1 */}
        <Card>
          <CardHeader>
            <CardTitle>Ingresos vs. Ganancia</CardTitle>
            <CardDescription>
              Evolución mensual de ingresos brutos y ganancia neta.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="flex w-full items-center justify-center gap-x-8 gap-y-2 text-sm text-muted-foreground flex-wrap mb-4">
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: "var(--color-revenue)" }}
                />
                <span className="font-medium">Ingresos</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: "var(--color-profit)" }}
                />
                <span className="font-medium">Ganancia</span>
              </div>
            </div>
            <div className="h-[300px] w-full">
              <ChartContainer config={monthlyChartConfig}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={monthlyChartData}
                    margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="month"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tickFormatter={(v) => formatCurrency(Number(v))}
                    />
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent formatter={formatCurrency} />}
                    />
                    <Line
                      dataKey="revenue"
                      type="monotone"
                      stroke="var(--color-revenue)"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                      name="Ingresos"
                    />
                    <Line
                      dataKey="profit"
                      type="monotone"
                      stroke="var(--color-profit)"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                      name="Ganancia"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>

        {/* CHART 2 */}
        <Card>
          <CardHeader>
            <CardTitle>Servicios vs. Ventas</CardTitle>
            <CardDescription>
              Volumen de operaciones mensuales.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="flex w-full items-center justify-center gap-x-8 gap-y-2 text-sm text-muted-foreground flex-wrap mb-4">
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: "var(--color-services)" }}
                />
                <span className="font-medium">Servicios</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: "var(--color-sales)" }}
                />
                <span className="font-medium">Ventas</span>
              </div>
            </div>
            <div className="h-[300px] w-full">
              <ChartContainer config={monthlyOpsChartConfig}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={monthlyOperationsData}
                    margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="month"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tickFormatter={(v) => formatNumber(Number(v))}
                    />
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent formatter={formatNumber} />}
                    />
                    <Line
                      dataKey="services"
                      type="monotone"
                      stroke="var(--color-services)"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                      name="Servicios"
                    />
                    <Line
                      dataKey="sales"
                      type="monotone"
                      stroke="var(--color-sales)"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                      name="Ventas"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* PIE CHARTS ROW */}
      <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2">
        {/* PIE CHART 1 */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Distribución de Tipos de Servicio</CardTitle>
            <CardDescription>
              Servicios más comunes (histórico).
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 pb-0">
            <ChartContainer
              config={serviceTypeChartConfig}
              className="mx-auto aspect-square max-h-[250px]"
            >
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                <Pie
                  data={serviceTypeChartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  strokeWidth={5}
                  labelLine={false}
                  label={({
                    cy,
                    midAngle,
                    innerRadius,
                    outerRadius,
                    percent,
                  }) => {
                    const RADIAN = Math.PI / 180;
                    const radius =
                      innerRadius + (outerRadius - innerRadius) * 0.5;
                    const x = cy + radius * Math.cos(-midAngle * RADIAN);
                    const y = cy + radius * Math.sin(-midAngle * RADIAN);
                    return (
                      <text
                        x={x}
                        y={y}
                        fill="white"
                        textAnchor={x > cy ? "start" : "end"}
                        dominantBaseline="central"
                        className="text-xs font-bold"
                      >
                        {(percent * 100).toFixed(0)}%
                      </text>
                    );
                  }}
                />
              </PieChart>
            </ChartContainer>
          </CardContent>
          <CardContent className="flex justify-center p-4">
            <div className="flex w-full items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground flex-wrap">
              {serviceTypeChartData.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: item.fill }}
                  />
                  <span className="font-medium">{item.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* PIE CHART 2 */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Fuentes de Ingresos (Histórico)</CardTitle>
            <CardDescription>
              Comparativa de ingresos por servicios vs. ventas de mostrador.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 pb-0">
            <ChartContainer
              config={revenueSourceChartConfig}
              className="mx-auto aspect-square max-h-[250px]"
            >
              <PieChart>
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel formatter={formatCurrency} />}
                />
                <Pie
                  data={revenueSourceChartData}
                  dataKey="value"
                  nameKey="source"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  strokeWidth={5}
                />
              </PieChart>
            </ChartContainer>
          </CardContent>
          <CardContent className="flex justify-center p-4">
            <div className="flex w-full items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground flex-wrap">
              {revenueSourceChartData.map((item) => (
                <div key={item.source} className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: item.fill }}
                  />
                  <span className="font-medium">{item.source}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
