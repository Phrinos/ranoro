
"use client"

import * as React from "react"
import { Bar, BarChart, Pie, PieChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { placeholderServiceRecords, placeholderSales, calculateSaleProfit, IVA_RATE, placeholderInventory } from "@/lib/placeholder-data"
import { subMonths, format, startOfMonth, endOfMonth, isWithinInterval, parseISO } from "date-fns"
import { es } from "date-fns/locale"

export function DashboardCharts() {
  const [monthlyChartData, setMonthlyChartData] = React.useState<any[]>([]);
  const [serviceTypeChartData, setServiceTypeChartData] = React.useState<any[]>([]);
  const [revenueSourceChartData, setRevenueSourceChartData] = React.useState<any[]>([]);

  React.useEffect(() => {
    // Process data for monthly performance chart
    const now = new Date();
    const monthlyData: { [key: string]: { month: string, revenue: number, profit: number } } = {};
    for (let i = 5; i >= 0; i--) {
        const date = subMonths(now, i);
        const monthKey = format(date, "yyyy-MM");
        monthlyData[monthKey] = {
            month: format(date, "MMM", { locale: es }),
            revenue: 0,
            profit: 0
        };
    }

    placeholderServiceRecords.forEach(service => {
        if (service.status !== 'Completado') return;
        const date = parseISO(service.deliveryDateTime || service.serviceDate);
        const monthKey = format(date, "yyyy-MM");
        if (monthlyData[monthKey]) {
            monthlyData[monthKey].revenue += service.totalCost;
            monthlyData[monthKey].profit += service.serviceProfit || 0;
        }
    });

    placeholderSales.forEach(sale => {
        const date = parseISO(sale.saleDate);
        const monthKey = format(date, "yyyy-MM");
        if (monthlyData[monthKey]) {
            monthlyData[monthKey].revenue += sale.totalAmount;
            monthlyData[monthKey].profit += calculateSaleProfit(sale, placeholderInventory, IVA_RATE);
        }
    });

    setMonthlyChartData(Object.values(monthlyData));
    
    // Process data for service type chart
    const serviceTypeCounts: { [key: string]: number } = {
      'Servicio General': 0,
      'Cambio de Aceite': 0,
      'Pintura': 0,
    };
    placeholderServiceRecords.forEach(service => {
        const type = service.serviceType || 'Servicio General';
        if (serviceTypeCounts.hasOwnProperty(type)) {
            serviceTypeCounts[type]++;
        }
    });
    setServiceTypeChartData([
        { name: "General", value: serviceTypeCounts['Servicio General'], fill: "var(--color-general)" },
        { name: "Aceite", value: serviceTypeCounts['Cambio de Aceite'], fill: "var(--color-aceite)" },
        { name: "Pintura", value: serviceTypeCounts['Pintura'], fill: "var(--color-pintura)" }
    ]);
    
    // Process data for revenue source chart
    const totalServiceRevenue = placeholderServiceRecords
        .filter(s => s.status === 'Completado')
        .reduce((sum, s) => sum + s.totalCost, 0);
    const totalPosRevenue = placeholderSales.reduce((sum, s) => sum + s.totalAmount, 0);
    setRevenueSourceChartData([
        { source: 'Servicios', value: totalServiceRevenue, fill: 'var(--color-servicios)' },
        { source: 'Ventas POS', value: totalPosRevenue, fill: 'var(--color-ventas)' },
    ]);

  }, []);
  
  const formatCurrency = (value: any) => `$${new Intl.NumberFormat('es-MX').format(value)}`;
  
  const monthlyChartConfig = {
    revenue: {
      label: "Ingresos",
      color: "hsl(var(--chart-1))",
    },
    profit: {
      label: "Ganancia",
      color: "hsl(var(--chart-2))",
    },
  } satisfies ChartConfig;
  
  const serviceTypeChartConfig = {
      general: { label: "General", color: "hsl(var(--chart-1))" },
      aceite: { label: "Cambio de Aceite", color: "hsl(var(--chart-2))" },
      pintura: { label: "Pintura", color: "hsl(var(--chart-3))" },
  } satisfies ChartConfig;

  const revenueSourceChartConfig = {
    servicios: { label: 'Servicios', color: "hsl(var(--chart-1))" },
    ventas: { label: 'Ventas POS', color: "hsl(var(--chart-2))" },
  } satisfies ChartConfig

  return (
    <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Ingresos vs. Ganancia (Últimos 6 Meses)</CardTitle>
          <CardDescription>Comparativo mensual de ingresos brutos y ganancia neta.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={monthlyChartConfig}>
            <BarChart data={monthlyChartData}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="month"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
              />
              <YAxis
                tickFormatter={formatCurrency}
                tickLine={false}
                axisLine={false}
                tickMargin={10}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent formatter={formatCurrency} />}
              />
              <Legend />
              <Bar dataKey="revenue" fill="var(--color-revenue)" radius={4} name="Ingresos" />
              <Bar dataKey="profit" fill="var(--color-profit)" radius={4} name="Ganancia" />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Distribución de Servicios</CardTitle>
            <CardDescription>Tipos de servicios más comunes.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 pb-0">
            <ChartContainer config={serviceTypeChartConfig}>
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                <Pie data={serviceTypeChartData} dataKey="value" nameKey="name" />
              </PieChart>
            </ChartContainer>
          </CardContent>
           <CardContent className="flex-1 flex items-center justify-center p-4">
              <Legend content={({ payload }) => (
                <ul className="grid gap-2 text-sm">
                  {payload?.map((item, index) => item.payload && (
                    <li key={index} className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-muted-foreground">{item.name}</span>
                      <span className="font-medium">{item.value}</span>
                    </li>
                  ))}
                </ul>
              )} />
            </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Fuentes de Ingreso</CardTitle>
            <CardDescription>Comparativo de ingresos por servicios vs. ventas POS.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 pb-0">
            <ChartContainer
                config={revenueSourceChartConfig}
                className="mx-auto aspect-square max-h-[250px]"
            >
                <PieChart>
                    <ChartTooltip content={<ChartTooltipContent hideLabel formatter={formatCurrency} />} />
                    <Pie data={revenueSourceChartData} dataKey="value" nameKey="source" innerRadius={60} />
                </PieChart>
            </ChartContainer>
          </CardContent>
          <CardContent className="flex-1 flex items-center justify-center p-4">
            <Legend content={({ payload }) => (
              <ul className="grid gap-2 text-sm">
                {payload?.map((item, index) => item.payload && (
                  <li key={index} className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-muted-foreground">{item.payload.source}</span>
                    <span className="font-medium">{formatCurrency(item.payload.value)}</span>
                  </li>
                ))}
              </ul>
            )} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
