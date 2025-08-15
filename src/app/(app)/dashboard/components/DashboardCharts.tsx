
"use client";

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, PieChart, Pie, Cell, TooltipProps 
} from 'recharts';
import type { ServiceRecord, SaleReceipt, InventoryItem, MonthlyFixedExpense, Personnel } from '@/types';
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
            gananciaBruta: number;
            gastosFijos: number;
            utilidadNeta: number;
        } 
    } = {};
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
        const date = subMonths(now, i);
        const monthKey = format(date, 'yyyy-MM');
        const monthName = format(date, 'MMM yy', { locale: es });
        dataByMonth[monthKey] = { name: monthName, ingresos: 0, gananciaBruta: 0, gastosFijos: 0, utilidadNeta: 0 };
    }

    const allOperations = [
        ...services.filter(s => s.status === 'Entregado' && s.deliveryDateTime),
        ...sales.filter(s => s.status !== 'Cancelado')
    ];

    allOperations.forEach(op => {
        const opDate = parseDate('deliveryDateTime' in op ? op.deliveryDateTime : op.saleDate);
        if (opDate && isValid(opDate)) {
            const monthKey = format(opDate, 'yyyy-MM');
            if (dataByMonth[monthKey]) {
                const income = 'totalCost' in op ? (op.totalCost || 0) : op.totalAmount;
                const costOfGoods = 'totalSuppliesWorkshopCost' in op 
                    ? (op.totalSuppliesWorkshopCost || 0) 
                    : ('items' in op ? op.items.reduce((sum, item) => sum + ((inventory.find(i => i.id === item.inventoryItemId)?.unitPrice || 0) * item.quantity), 0) : 0);
                
                dataByMonth[monthKey].ingresos += income;
                dataByMonth[monthKey].gananciaBruta += (income - costOfGoods);
            }
        }
    });
    
    const totalMonthlyFixedSalaries = personnel.filter(p => !p.isArchived).reduce((sum, p) => sum + (p.monthlySalary || 0), 0);
    const totalOtherFixedExpenses = fixedExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const totalMonthlyFixedExpenses = totalMonthlyFixedSalaries + totalOtherFixedExpenses;

    Object.keys(dataByMonth).forEach(monthKey => {
        const [year, month] = monthKey.split('-').map(Number);
        const monthStartDate = new Date(year, month - 1, 1);
        const daysInMonth = getDaysInMonth(monthStartDate);
        
        let expenseFactor = 1.0;
        if (isSameDay(startOfMonth(now), monthStartDate)) {
            expenseFactor = (differenceInDays(now, monthStartDate) + 1) / daysInMonth;
        }

        const proportionalFixedExpenses = totalMonthlyFixedExpenses * expenseFactor;
        dataByMonth[monthKey].gastosFijos = proportionalFixedExpenses;
        dataByMonth[monthKey].utilidadNeta = dataByMonth[monthKey].gananciaBruta - proportionalFixedExpenses;
    });

    return Object.values(dataByMonth);
};


const processOperationalChartData = (services: ServiceRecord[], sales: SaleReceipt[]) => {
    const dataByMonth: { [key: string]: any } = {};
    const now = new Date();
    const serviceTypeCounts: { [key: string]: number } = {};

    for (let i = 5; i >= 0; i--) {
        const date = subMonths(now, i);
        const monthKey = format(date, 'yyyy-MM');
        const monthName = format(date, 'MMM yy', { locale: es });
        dataByMonth[monthKey] = { name: monthName };
    }

    const allOperations = [
        ...services.map(s => ({ ...s, type: s.serviceType || 'Servicio General', date: s.deliveryDateTime || s.serviceDate })),
        ...sales.map(s => ({ ...s, type: 'Ventas POS', date: s.saleDate }))
    ];

    allOperations.forEach(op => {
        const opDate = parseDate(op.date);
        if (opDate && isValid(opDate)) {
            const monthKey = format(opDate, 'yyyy-MM');
            if (dataByMonth[monthKey]) {
                const type = op.type || 'Otro';
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

// --- Optimized Chart Components ---

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
      <CardTitle>Rendimiento del Taller (Últimos 6 Meses)</CardTitle>
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
          {Object.keys(data[0] || {}).filter(key => key !== 'name').map((key, index) => (
             <Line key={key} type="monotone" dataKey={key} stroke={COLORS[index % COLORS.length]} name={key} strokeWidth={2}/>
          ))}
        </LineChart>
      </ResponsiveContainer>
    </CardContent>
  </Card>
));
OperationsVolumeChart.displayName = 'OperationsVolumeChart';

const ServiceDistributionChart = React.memo(({ data }: { data: any[] }) => (
  <Card>
    <CardHeader>
      <CardTitle>Distribución de Tipos de Servicio</CardTitle>
      <CardDescription>Servicios más comunes en el período seleccionado.</CardDescription>
    </CardHeader>
    <CardContent>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie 
            data={data} 
            dataKey="value" 
            nameKey="name" 
            cx="50%" 
            cy="50%" 
            outerRadius={120} 
            labelLine={false}
            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
            fontSize={12}
            className="text-xs"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomPieTooltip />} />
        </PieChart>
      </ResponsiveContainer>
    </CardContent>
  </Card>
));
ServiceDistributionChart.displayName = 'ServiceDistributionChart';


// --- Main Component ---

export function DashboardCharts({ services, sales, inventory, fixedExpenses, personnel }: {
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
}
