
"use client";

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, PieChart, Pie, Cell, TooltipProps 
} from 'recharts';
import type { ServiceRecord, SaleReceipt, InventoryItem, MonthlyFixedExpense, User as Personnel } from '@/types';
import { format, parseISO, startOfMonth, subMonths, isValid, endOfMonth, isWithinInterval, getDaysInMonth, differenceInDays, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { parseDate } from '@/lib/forms';

// --- Data Processing Functions ---

const processFinancialChartData = (
    services: ServiceRecord[], 
    sales: SaleReceipt[], 
    inventory: InventoryItem[], 
    fixedExpenses: MonthlyFixedExpense[], 
    personnel: Personnel[]
) => {
    const dataByMonth: { 
        [key: string]: { 
            name: string;
            ingresos: number;
            costoInsumos: number;
            gananciaBruta: number;
            gastosFijos: number;
            utilidadNeta: number;
        } 
    } = {};
    const now = new Date();

    for (let i = 2; i >= 0; i--) {
        const date = subMonths(now, i);
        const monthKey = format(date, 'yyyy-MM');
        const monthName = format(date, 'MMM yy', { locale: es });
        dataByMonth[monthKey] = { name: monthName, ingresos: 0, costoInsumos: 0, gananciaBruta: 0, gastosFijos: 0, utilidadNeta: 0 };
    }
    
    const inventoryMap = new Map(inventory.map(i => [i.id, i]));

    // 1. Procesar servicios completados con la lógica de cálculo correcta
    services.forEach(service => {
        if (service.status !== 'Entregado') return;

        const completionDate =
            parseDate(service.deliveryDateTime || '') ??
            parseDate(service.serviceDate) ??
            parseDate(service.receptionDateTime || '');

        if (completionDate && isValid(completionDate)) {
            const monthKey = format(completionDate, 'yyyy-MM');
            if (dataByMonth[monthKey]) {
                const grossRevenue =
                    (Array.isArray(service.payments) && service.payments.length > 0
                        ? service.payments.reduce((s, p) => s + (Number(p.amount) || 0), 0)
                        : Number(service.totalCost) || 0);
                
                const costOfGoods = service.serviceItems?.reduce((totalCost, item) => {
                    const itemSuppliesCost = item.suppliesUsed?.reduce((supplySum, supply) => {
                        return supplySum + ((supply.unitPrice || 0) * (supply.quantity || 0));
                    }, 0) || 0;
                    return totalCost + itemSuppliesCost;
                }, 0) || 0;

                dataByMonth[monthKey].ingresos += grossRevenue;
                dataByMonth[monthKey].costoInsumos += costOfGoods;
            }
        }
    });

    // 2. Procesar ventas del POS con la lógica de costo correcta
    sales.forEach(sale => {
        if (sale.status === 'Cancelado' || !sale.saleDate) return;
        const saleDate = parseDate(sale.saleDate);
        if (saleDate && isValid(saleDate)) {
            const monthKey = format(saleDate, 'yyyy-MM');
            if (dataByMonth[monthKey]) {
                const income = sale.totalAmount;
                const costOfGoods = sale.items.reduce((sum, item) => {
                    const inventoryItem = inventoryMap.get(item.inventoryItemId || '');
                    const itemUnitCost = inventoryItem?.unitPrice ?? 0;
                    return sum + (itemUnitCost * item.quantity);
                }, 0);
                
                dataByMonth[monthKey].ingresos += income;
                dataByMonth[monthKey].costoInsumos += costOfGoods;
            }
        }
    });
    
    const totalMonthlyFixedSalaries = personnel.filter(p => !p.isArchived).reduce((sum, p) => sum + (p.monthlySalary || 0), 0);
    const totalOtherFixedExpenses = fixedExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const totalMonthlyFixedExpenses = totalMonthlyFixedSalaries + totalOtherFixedExpenses;

    // 3. Calcular Ganancia Bruta, Gastos Fijos y Utilidad Neta
    Object.keys(dataByMonth).forEach(monthKey => {
        const monthData = dataByMonth[monthKey];
        monthData.gananciaBruta = monthData.ingresos - monthData.costoInsumos;
        
        const [year, month] = monthKey.split('-').map(Number);
        const monthStartDate = new Date(year, month - 1, 1);
        
        if (monthStartDate > now) {
            monthData.gastosFijos = 0; // Mes futuro, sin gastos aún.
        } else if (monthStartDate.getFullYear() === now.getFullYear() && monthStartDate.getMonth() === now.getMonth()) {
            // Mes actual: aplicar prorrata
            const daysInMonth = getDaysInMonth(monthStartDate);
            const dayOfMonth = now.getDate();
            const expenseFactor = dayOfMonth / daysInMonth;
            monthData.gastosFijos = totalMonthlyFixedExpenses * expenseFactor;
        } else {
            // Meses pasados: aplicar el 100% de los gastos fijos
            monthData.gastosFijos = totalMonthlyFixedExpenses;
        }
        
        monthData.utilidadNeta = monthData.gananciaBruta - monthData.gastosFijos;
    });

    return Object.values(dataByMonth);
};


const processOperationalChartData = (services: ServiceRecord[], sales: SaleReceipt[]) => {
    const dataByMonth: { [key: string]: any } = {};
    const now = new Date();
    const serviceTypeCounts: { [key: string]: number } = {};

    for (let i = 2; i >= 0; i--) {
        const date = subMonths(now, i);
        const monthKey = format(date, 'yyyy-MM');
        const monthName = format(date, 'MMM yy', { locale: es });
        dataByMonth[monthKey] = { name: monthName };
    }

    services.forEach(s => {
        if (s.status !== 'Entregado') return;
        const opDate = parseDate(s.deliveryDateTime || '') ?? parseDate(s.serviceDate);
        if (opDate && isValid(opDate)) {
            const monthKey = format(opDate, 'yyyy-MM');
            if (dataByMonth[monthKey]) {
                const type = s.serviceType || 'Servicio General';
                dataByMonth[monthKey][type] = (dataByMonth[monthKey][type] || 0) + 1;
                serviceTypeCounts[type] = (serviceTypeCounts[type] || 0) + 1;
            }
        }
    });

    sales.forEach(s => {
        if (s.status === 'Cancelado' || !s.saleDate) return;
        const opDate = parseDate(s.saleDate);
        if (opDate && isValid(opDate)) {
            const monthKey = format(opDate, 'yyyy-MM');
            if (dataByMonth[monthKey]) {
                const type = 'Ventas POS';
                dataByMonth[monthKey][type] = (dataByMonth[monthKey][type] || 0) + 1;
                serviceTypeCounts[type] = (serviceTypeCounts[type] || 0) + 1;
            }
        }
    });
    
    const allServiceTypes = Object.keys(serviceTypeCounts);
    Object.values(dataByMonth).forEach(monthData => {
        allServiceTypes.forEach(type => {
            if (!monthData[type]) {
                monthData[type] = 0;
            }
        });
    });
    
    const pieData = Object.entries(serviceTypeCounts)
        .map(([name, value]) => ({ name, value }))
        .sort((a,b) => b.value - a.value);

    return { lineData: Object.values(dataByMonth), pieData };
};

// --- Optimized Chart Components (Sin cambios aquí) ---

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#00C49F', '#FFBB28', '#FF8042', '#0088FE'];

const CustomPieTooltip = ({ active, payload }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border p-2 rounded-md shadow-lg">
          <p className="font-bold">{`${payload[0].name} : ${payload[0].value}`}</p>
        </div>
      );
    }
    return null;
};

const FinancialChart = React.memo(({ data }: { data: any[] }) => (
  <Card>
    <CardHeader>
      <CardTitle>Rendimiento del Taller (Últimos 3 Meses)</CardTitle>
      <CardDescription>Análisis de la rentabilidad y volumen de operaciones.</CardDescription>
    </CardHeader>
    <CardContent>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis tickFormatter={(value) => new Intl.NumberFormat('es-MX', { notation: 'compact', compactDisplay: 'short', style: 'currency', currency: 'MXN' }).format(value)} width={80} tick={{ fontSize: 12 }} />
          <Tooltip formatter={(value: number) => formatCurrency(value)} />
          <Legend />
          <Line type="monotone" dataKey="ingresos" stroke="#3b82f6" strokeWidth={2} name="Ingresos Totales" />
          <Line type="monotone" dataKey="costoInsumos" stroke="#f97316" strokeWidth={2} name="Costo de Insumos" />
          <Line type="monotone" dataKey="gananciaBruta" stroke="#84cc16" strokeWidth={2} name="Ganancia Bruta" />
          <Line type="monotone" dataKey="gastosFijos" stroke="#ef4444" strokeWidth={2} name="Gastos Fijos" />
          <Line type="monotone" dataKey="utilidadNeta" stroke="#16a34a" strokeWidth={3} name="Utilidad Neta" />
        </LineChart>
      </ResponsiveContainer>
    </CardContent>
  </Card>
));
FinancialChart.displayName = 'FinancialChart';

const OperationsVolumeChart = React.memo(({ data }: { data: any[] }) => (
  <Card>
    <CardHeader>
      <CardTitle>Volumen de Operaciones</CardTitle>
      <CardDescription>Cantidad de servicios y ventas a lo largo del tiempo.</CardDescription>
    </CardHeader>
    <CardContent>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend wrapperStyle={{fontSize: '0.8rem'}}/>
          {data.length > 0 && Object.keys(data[0] || {}).filter(key => key !== 'name').map((key, index) => (
             <Line key={key} type="monotone" dataKey={key} stroke={COLORS[index % COLORS.length]} name={key} strokeWidth={2}/>
          ))}
        </LineChart>
      </ResponsiveContainer>
    </CardContent>
  </Card>
));
OperationsVolumeChart.displayName = 'OperationsVolumeChart';

const ServiceDistributionChart = React.memo(({ data }: { data: any[] }) => {
  const grouped = React.useMemo(() => {
    if (!data?.length) return [];
    const total = data.reduce((s: number, d: any) => s + (d.value || 0), 0);
    const shown: any[] = [];
    let others = 0;
    for (const d of data) {
      const pct = total ? d.value / total : 0;
      if (pct < 0.04) others += d.value;
      else shown.push(d);
    }
    if (others > 0) shown.push({ name: "Otros", value: others });
    return shown;
  }, [data]);

  const renderLabel = (props: any) => {
    const { name, percent, cx, cy, outerRadius, midAngle } = props;
    if (!percent || percent < 0.05) return null;
    const RAD = Math.PI / 180;
    const r = outerRadius + 12;
    const x = cx + r * Math.cos(-midAngle * RAD);
    const y = cy + r * Math.sin(-midAngle * RAD);
    return (
      <text
        x={x}
        y={y}
        fill="#6b7280"
        fontSize={12}
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
      >
        {`${name} (${(percent * 100).toFixed(0)}%)`}
      </text>
    );
  };

  const series = grouped.length ? grouped : data;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Distribución de Tipos de Servicio</CardTitle>
        <CardDescription>Servicios más comunes en el período seleccionado.</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={320}>
          <PieChart margin={{ right: 140, left: 8, top: 8, bottom: 8 }}>
            <Pie
              data={series}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              minAngle={5}
              labelLine={false}
              label={renderLabel}
              isAnimationActive={false}
            >
              {series.map((entry: any, idx: number) => (
                <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
              ))}
            </Pie>
            <Legend
              layout="vertical"
              align="right"
              verticalAlign="middle"
              wrapperStyle={{ fontSize: 12 }}
            />
            <Tooltip content={<CustomPieTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
});
ServiceDistributionChart.displayName = "ServiceDistributionChart";


// --- Main Component ---

export const DashboardCharts = React.memo(function DashboardCharts({ services, sales, inventory, fixedExpenses, personnel }: {
    services: ServiceRecord[];
    sales: SaleReceipt[];
    inventory: InventoryItem[];
    fixedExpenses: MonthlyFixedExpense[];
    personnel: Personnel[];
}) {
  const financialData = useMemo(() => processFinancialChartData(services, sales, inventory, fixedExpenses, personnel), [services, sales, inventory, fixedExpenses, personnel]);
  const operationalData = useMemo(() => processOperationalChartData(services, sales), [services, sales]);

  return (
    <div className="grid gap-6 grid-cols-1">
      <FinancialChart data={financialData} />
      <OperationsVolumeChart data={operationalData.lineData} />
      <ServiceDistributionChart data={operationalData.pieData} />
    </div>
  );
});

DashboardCharts.displayName = 'DashboardCharts';
