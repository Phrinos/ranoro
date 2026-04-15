// src/app/(app)/dashboard/components/DashboardCharts.tsx
"use client";

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import type { TooltipProps } from "recharts";
import type { ServiceRecord, SaleReceipt, InventoryItem, MonthlyFixedExpense, User as Personnel } from '@/types';
import { format, subMonths, isValid, getDaysInMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { parseDate } from '@/lib/forms';



const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#00C49F', '#FFBB28', '#FF8042', '#0088FE'];

const CustomPieTooltip = (props: TooltipProps<number, string>) => {
    const { active, payload } = props as any;
    if (active && payload && payload.length) {
      const value = Number(payload[0]?.value ?? 0);
      return (
        <div className="bg-background border p-2 rounded-md shadow-lg">
          <p className="font-bold">{`${payload[0].name} : ${value}`}</p>
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
          <Tooltip formatter={(value: any) => formatCurrency(Number(value ?? 0))} />
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


export const DashboardCharts = React.memo(function DashboardCharts({ 
    financialData,
    operationalData 
}: {
    financialData: any[];
    operationalData: { lineData: any[]; pieData: any[] };
}) {
  return (
    <div className="grid gap-6 grid-cols-1">
      <FinancialChart data={financialData} />
      <OperationsVolumeChart data={operationalData.lineData} />
      <ServiceDistributionChart data={operationalData.pieData} />
    </div>
  );
});

DashboardCharts.displayName = 'DashboardCharts';
