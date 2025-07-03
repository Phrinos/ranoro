
"use client"

import * as React from "react"
import { Line, LineChart, Pie, PieChart, CartesianGrid, XAxis, YAxis, Legend } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { placeholderServiceRecords, placeholderSales, calculateSaleProfit, placeholderInventory, IVA_RATE } from "@/lib/placeholder-data"
import { subMonths, format, parseISO, isValid } from "date-fns"
import { es } from "date-fns/locale"

interface MonthlyChartData {
    month: string;
    revenue: number;
    profit: number;
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
  const [monthlyChartData, setMonthlyChartData] = React.useState<MonthlyChartData[]>([]);
  const [serviceTypeChartData, setServiceTypeChartData] = React.useState<ServiceTypeChartData[]>([]);
  const [revenueSourceChartData, setRevenueSourceChartData] = React.useState<RevenueSourceChartData[]>([]);

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
        if (service.status !== 'Completado' || !service.totalCost) return;
        const date = parseISO(service.deliveryDateTime || service.serviceDate);
        if(!isValid(date)) return;
        
        const monthKey = format(date, "yyyy-MM");
        if (monthlyData[monthKey]) {
            // Revenue is the total amount paid by the customer.
            monthlyData[monthKey].revenue += service.totalCost;
            
            // Profit is revenue minus cost of supplies.
            const profit = (service.totalCost || 0) - (service.totalSuppliesCost || 0);
            monthlyData[monthKey].profit += isFinite(profit) ? profit : 0;
        }
    });

    placeholderSales.forEach(sale => {
        const date = parseISO(sale.saleDate);
        if(!isValid(date)) return;
        
        const monthKey = format(date, "yyyy-MM");
        if (monthlyData[monthKey]) {
            // Revenue is the total amount paid by the customer.
            monthlyData[monthKey].revenue += sale.totalAmount;
            
            // Profit calculation is now correct in the helper function
            monthlyData[monthKey].profit += calculateSaleProfit(sale, placeholderInventory);
        }
    });

    setMonthlyChartData(Object.values(monthlyData));
    
    // Process data for service type chart
    const serviceTypeCounts: { [key: string]: number } = {};
    placeholderServiceRecords.forEach(service => {
        const type = service.serviceType || 'Servicio General';
        serviceTypeCounts[type] = (serviceTypeCounts[type] || 0) + 1;
    });

    const serviceTypeColors: Record<string, string> = {
        'Servicio General': "hsl(var(--chart-1))",
        'Cambio de Aceite': "hsl(var(--chart-2))",
        'Pintura': "hsl(var(--chart-3))",
    };
    
    setServiceTypeChartData(Object.entries(serviceTypeCounts).map(([name, value], index) => ({
      name,
      value,
      fill: serviceTypeColors[name] || `hsl(var(--chart-${(index % 5) + 1}))`
    })));
    
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
  
  const formatCurrency = (value: number) => `$${new Intl.NumberFormat('es-MX', {notation: "compact", compactDisplay: "short"}).format(value)}`;
  
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
  
  const serviceTypeChartConfig = serviceTypeChartData.reduce((acc, { name, fill }) => {
    acc[name] = { label: name, color: fill };
    return acc;
  }, {} as ChartConfig);

  const revenueSourceChartConfig = {
    'Servicios': { label: 'Servicios', color: "hsl(var(--chart-1))" },
    'Ventas POS': { label: 'Ventas POS', color: "hsl(var(--chart-2))" },
  } satisfies ChartConfig

  return (
    <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Ingresos vs. Ganancia (Últimos 6 Meses)</CardTitle>
          <CardDescription>Evolución mensual de ingresos brutos y ganancia neta.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="flex w-full items-center justify-center gap-x-8 gap-y-2 text-sm text-muted-foreground flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "var(--color-revenue)" }} />
                  <div className="font-medium">Ingresos</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "var(--color-profit)" }} />
                  <div className="font-medium">Ganancia</div>
                </div>
            </div>
            <div className="h-[350px] w-full">
                <ChartContainer config={monthlyChartConfig}>
                <LineChart accessibilityLayer data={monthlyChartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                    <YAxis tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => formatCurrency(value)} />
                    <ChartTooltip cursor={false} content={<ChartTooltipContent formatter={(value) => typeof value === 'number' ? formatCurrency(value) : value} />} />
                    <Line dataKey="revenue" type="monotone" stroke="var(--color-revenue)" strokeWidth={3} dot={{ r: 5 }} activeDot={{ r: 7 }} name="Ingresos" />
                    <Line dataKey="profit" type="monotone" stroke="var(--color-profit)" strokeWidth={3} dot={{ r: 5 }} activeDot={{ r: 7 }} name="Ganancia" />
                </LineChart>
                </ChartContainer>
            </div>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Tipo de Servicios</CardTitle>
            <CardDescription>Distribución de los servicios realizados.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col items-center justify-between p-4 pt-0">
            <div className="flex w-full items-center justify-center gap-x-4 gap-y-1 text-sm text-muted-foreground flex-wrap mb-4">
              {Object.entries(serviceTypeChartConfig).map(([key, config]) => {
                const item = serviceTypeChartData.find(d => d.name === config.label);
                return (
                  <div key={key} className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: config.color }} />
                    <span className="font-medium">{config.label} ({item?.value || 0})</span>
                  </div>
                )
              })}
            </div>
            <div className="h-[200px] w-full">
              <ChartContainer config={serviceTypeChartConfig} className="mx-auto aspect-square h-full">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
                  <Pie data={serviceTypeChartData} dataKey="value" nameKey="name" innerRadius={40} strokeWidth={2} />
                </PieChart>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Fuentes de Ingreso</CardTitle>
            <CardDescription>Comparativa entre servicios y ventas de mostrador.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col items-center justify-between p-4 pt-0">
            <div className="flex w-full items-center justify-center gap-x-4 gap-y-1 text-sm text-muted-foreground flex-wrap mb-4">
              {Object.entries(revenueSourceChartConfig).map(([key, config]) => {
                const item = revenueSourceChartData.find(d => d.source === config.label);
                return (
                  <div key={key} className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: config.color }} />
                    <span className="font-medium">{config.label} ({formatCurrency(item?.value || 0)})</span>
                  </div>
                )
              })}
            </div>
            <div className="h-[200px] w-full">
              <ChartContainer config={revenueSourceChartConfig} className="mx-auto aspect-square h-full">
                  <PieChart>
                      <ChartTooltip content={<ChartTooltipContent nameKey="source" hideLabel formatter={(value) => typeof value === 'number' ? formatCurrency(value) : value.toString()}/>} />
                      <Pie data={revenueSourceChartData} dataKey="value" nameKey="source" innerRadius={40} strokeWidth={2} />
                  </PieChart>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
