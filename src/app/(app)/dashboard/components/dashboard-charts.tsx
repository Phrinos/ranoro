
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

// New interface for the second chart
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
  const [monthlyChartData, setMonthlyChartData] = React.useState<MonthlyChartData[]>([]);
  const [monthlyOperationsData, setMonthlyOperationsData] = React.useState<MonthlyOperationsData[]>([]); // New state
  const [serviceTypeChartData, setServiceTypeChartData] = React.useState<ServiceTypeChartData[]>([]);
  const [revenueSourceChartData, setRevenueSourceChartData] = React.useState<RevenueSourceChartData[]>([]);

  React.useEffect(() => {
    const now = new Date();
    
    // --- Data for Chart 1: Ingresos vs Ganancia ---
    const monthlyData: { [key: string]: { month: string, revenue: number, profit: number } } = {};

    // --- Data for Chart 2: Servicios vs Ventas ---
    const monthlyOpsData: { [key: string]: { month: string, services: number, sales: number } } = {};

    for (let i = 5; i >= 0; i--) {
        const date = subMonths(now, i);
        const monthKey = format(date, "yyyy-MM");
        const monthLabel = format(date, "MMM", { locale: es });
        
        monthlyData[monthKey] = { month: monthLabel, revenue: 0, profit: 0 };
        monthlyOpsData[monthKey] = { month: monthLabel, services: 0, sales: 0 };
    }

    placeholderServiceRecords.forEach(service => {
        if (service.status !== 'Completado') return;
        const date = parseISO(service.deliveryDateTime || service.serviceDate);
        if(!isValid(date)) return;
        
        const monthKey = format(date, "yyyy-MM");
        if (monthlyData[monthKey]) {
            // Chart 1 data
            monthlyData[monthKey].revenue += service.totalCost || 0;
            const profit = (service.totalCost || 0) - (service.totalSuppliesCost || 0);
            monthlyData[monthKey].profit += isFinite(profit) ? profit : 0;
            
            // Chart 2 data
            monthlyOpsData[monthKey].services += 1;
        }
    });

    placeholderSales.forEach(sale => {
        const date = parseISO(sale.saleDate);
        if(!isValid(date)) return;
        
        const monthKey = format(date, "yyyy-MM");
        if (monthlyData[monthKey]) {
            // Chart 1 data
            monthlyData[monthKey].revenue += sale.totalAmount;
            monthlyData[monthKey].profit += calculateSaleProfit(sale, placeholderInventory);
            
            // Chart 2 data
            monthlyOpsData[monthKey].sales += 1;
        }
    });

    setMonthlyChartData(Object.values(monthlyData));
    setMonthlyOperationsData(Object.values(monthlyOpsData)); // Set new state
    
    // --- Data for Pie Charts ---
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
    
    const totalServiceRevenue = placeholderServiceRecords
        .filter(s => s.status === 'Completado')
        .reduce((sum, s) => sum + (s.totalCost || 0), 0);
    const totalPosRevenue = placeholderSales.reduce((sum, s) => sum + s.totalAmount, 0);
    setRevenueSourceChartData([
        { source: 'Servicios', value: totalServiceRevenue, fill: 'hsl(var(--chart-1))' },
        { source: 'Ventas POS', value: totalPosRevenue, fill: 'hsl(var(--chart-2))' },
    ]);

  }, []);
  
  const formatCurrency = (value: number) => `$${new Intl.NumberFormat('es-MX', {notation: "compact", compactDisplay: "short"}).format(value)}`;
  
  const monthlyChartConfig = {
    revenue: { label: "Ingresos", color: "hsl(var(--chart-1))" },
    profit: { label: "Ganancia", color: "hsl(var(--chart-2))" },
  } satisfies ChartConfig;

  // New chart config
  const monthlyOpsChartConfig = {
    services: { label: "Servicios", color: "hsl(var(--chart-1))" },
    sales: { label: "Ventas", color: "hsl(var(--chart-2))" },
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
      <Card>
        <CardHeader>
          <CardTitle>Ingresos vs. Ganancia (Últimos 6 Meses)</CardTitle>
          <CardDescription>Evolución mensual de ingresos brutos y ganancia neta.</CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0">
            <div className="flex w-full items-center justify-center gap-x-8 gap-y-2 text-sm text-muted-foreground flex-wrap mb-4">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "var(--color-revenue)" }} />
                  <div className="font-medium">Ingresos</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "var(--color-profit)" }} />
                  <div className="font-medium">Ganancia</div>
                </div>
            </div>
            <div className="h-[250px] w-full">
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
      
      {/* New Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Servicios vs. Ventas (Últimos 6 Meses)</CardTitle>
          <CardDescription>Volumen de operaciones completadas mensualmente.</CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0">
            <div className="flex w-full items-center justify-center gap-x-8 gap-y-2 text-sm text-muted-foreground flex-wrap mb-4">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "var(--color-services)" }} />
                  <div className="font-medium">Servicios</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "var(--color-sales)" }} />
                  <div className="font-medium">Ventas</div>
                </div>
            </div>
            <div className="h-[250px] w-full">
                <ChartContainer config={monthlyOpsChartConfig}>
                <LineChart accessibilityLayer data={monthlyOperationsData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                    <YAxis tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => value.toString()} allowDecimals={false} />
                    <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                    <Line dataKey="services" type="monotone" stroke="var(--color-services)" strokeWidth={3} dot={{ r: 5 }} activeDot={{ r: 7 }} name="Servicios" />
                    <Line dataKey="sales" type="monotone" stroke="var(--color-sales)" strokeWidth={3} dot={{ r: 5 }} activeDot={{ r: 7 }} name="Ventas" />
                </LineChart>
                </ChartContainer>
            </div>
        </CardContent>
      </Card>

      <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
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
            <div className="h-[150px] w-full">
              <ChartContainer config={serviceTypeChartConfig} className="mx-auto aspect-square h-full">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
                  <Pie data={serviceTypeChartData} dataKey="value" nameKey="name" innerRadius={30} strokeWidth={2} />
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
            <div className="h-[150px] w-full">
              <ChartContainer config={revenueSourceChartConfig} className="mx-auto aspect-square h-full">
                  <PieChart>
                      <ChartTooltip content={<ChartTooltipContent nameKey="source" hideLabel formatter={(value) => typeof value === 'number' ? formatCurrency(value) : value.toString()}/>} />
                      <Pie data={revenueSourceChartData} dataKey="value" nameKey="source" innerRadius={30} strokeWidth={2} />
                  </PieChart>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
