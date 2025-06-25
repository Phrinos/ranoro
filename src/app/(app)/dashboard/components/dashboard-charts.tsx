
"use client"

import * as React from "react"
import { Line, LineChart, Pie, PieChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { placeholderServiceRecords, placeholderSales, calculateSaleProfit, placeholderInventory } from "@/lib/placeholder-data"
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
            monthlyData[monthKey].profit += calculateSaleProfit(sale, placeholderInventory);
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
        { name: "General", value: serviceTypeCounts['Servicio General'], fill: "hsl(var(--chart-1))" },
        { name: "Aceite", value: serviceTypeCounts['Cambio de Aceite'], fill: "hsl(var(--chart-2))" },
        { name: "Pintura", value: serviceTypeCounts['Pintura'], fill: "hsl(var(--chart-3))" }
    ]);
    
    // Process data for revenue source chart
    const totalServiceRevenue = placeholderServiceRecords
        .filter(s => s.status === 'Completado')
        .reduce((sum, s) => sum + s.totalCost, 0);
    const totalPosRevenue = placeholderSales.reduce((sum, s) => sum + s.totalAmount, 0);
    setRevenueSourceChartData([
        { source: 'Servicios', value: totalServiceRevenue, fill: 'hsl(var(--chart-1))' },
        { source: 'Ventas POS', value: totalPosRevenue, fill: 'hsl(var(--chart-2))' },
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
      General: { label: "General", color: "hsl(var(--chart-1))" },
      Aceite: { label: "Cambio de Aceite", color: "hsl(var(--chart-2))" },
      Pintura: { label: "Pintura", color: "hsl(var(--chart-3))" },
  } satisfies ChartConfig;

  const revenueSourceChartConfig = {
    Servicios: { label: 'Servicios', color: "hsl(var(--chart-1))" },
    'Ventas POS': { label: 'Ventas POS', color: "hsl(var(--chart-2))" },
  } satisfies ChartConfig

  return (
    <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Ingresos vs. Ganancia (Últimos 6 Meses)</CardTitle>
          <CardDescription>Evolución mensual de ingresos brutos y ganancia neta.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={monthlyChartConfig} className="h-[250px] w-full">
            <LineChart accessibilityLayer data={monthlyChartData} margin={{ left: 12, right: 12, top: 5 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => `$${new Intl.NumberFormat('es-MX', {notation: "compact", compactDisplay: "short"}).format(value)}`} />
              <ChartTooltip cursor={false} content={<ChartTooltipContent formatter={formatCurrency} />} />
              <Legend />
              <Line dataKey="revenue" type="monotone" stroke="var(--color-revenue)" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Ingresos" />
              <Line dataKey="profit" type="monotone" stroke="var(--color-profit)" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Ganancia" />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Distribución de Servicios</CardTitle>
            <CardDescription>Tipos de servicios más comunes.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex items-center justify-center pb-4">
            <ChartContainer config={serviceTypeChartConfig} className="mx-auto aspect-square max-h-[250px]">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                <Pie data={serviceTypeChartData} dataKey="value" nameKey="name" innerRadius={50} />
                <Legend content={({ payload }) => (
                  <ul className="grid gap-2 text-sm mt-4">
                    {payload?.map((item, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-muted-foreground">{item.value}</span>
                        <span className="font-medium">({item.payload.value})</span>
                      </li>
                    ))}
                  </ul>
                )} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Fuentes de Ingreso</CardTitle>
            <CardDescription>Comparativo de ingresos por servicios vs. ventas POS.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex items-center justify-center pb-4">
              <ChartContainer config={revenueSourceChartConfig} className="mx-auto aspect-square max-h-[250px]">
                  <PieChart>
                      <ChartTooltip content={<ChartTooltipContent hideLabel formatter={formatCurrency} />} />
                      <Pie data={revenueSourceChartData} dataKey="value" nameKey="source" innerRadius={50} />
                      <Legend content={({ payload }) => (
                        <ul className="grid gap-2 text-sm mt-4">
                          {payload?.map((item, index) => (
                            <li key={index} className="flex items-center gap-2">
                              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                              <span className="text-muted-foreground">{item.value}</span>
                              <span className="font-medium">{formatCurrency(item.payload.value)}</span>
                            </li>
                          ))}
                        </ul>
                      )} />
                  </PieChart>
              </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
