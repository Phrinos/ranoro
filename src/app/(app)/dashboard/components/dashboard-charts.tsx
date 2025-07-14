
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { formatCurrency } from '@/lib/utils';

const formatCurrencyForChart = (value: number) => {
  if (Math.abs(value) > 1000) {
    return `$${(value / 1000).toFixed(1)}k`;
  }
  return `$${value.toFixed(0)}`;
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border shadow-sm p-2 rounded-md">
        <p className="label font-bold">{`${label}`}</p>
        <p className="text-blue-500">{`Ingresos: ${formatCurrency(payload[0].value)}`}</p>
        <p className="text-green-500">{`Ganancia: ${formatCurrency(payload[1].value)}`}</p>
      </div>
    );
  }
  return null;
};

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    if (percent < 0.05) return null; // Don't render label if slice is too small
    return (
        <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="text-xs font-bold">
            {`${name} (${(percent * 100).toFixed(0)}%)`}
        </text>
    );
};

interface DashboardChartsProps {
    chartData: { name: string; ingresos: number; ganancia: number }[];
    serviceTypeDistribution: { name: string; value: number }[];
}


export function DashboardCharts({ chartData, serviceTypeDistribution }: DashboardChartsProps) {
  const PIE_COLORS = ['#3B82F6', '#10B981', '#F97316', '#8B5CF6', '#EC4899'];

  return (
    <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 mt-6">
      <Card className="xl:col-span-2">
        <CardHeader>
          <CardTitle>Ingresos vs. Ganancia (Últimos 6 Meses)</CardTitle>
          <CardDescription>Análisis de la rentabilidad mensual de todas las operaciones.</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={formatCurrencyForChart} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))' }}/>
              <Legend />
              <Bar dataKey="ingresos" fill="hsl(var(--chart-1))" name="Ingresos" radius={[4, 4, 0, 0]} />
              <Bar dataKey="ganancia" fill="hsl(var(--chart-2))" name="Ganancia" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Distribución de Servicios</CardTitle>
          <CardDescription>Tipos de servicios completados más comunes.</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
                <Pie data={serviceTypeDistribution} cx="50%" cy="50%" labelLine={false} label={renderCustomizedLabel} outerRadius={100} dataKey="value" nameKey="name">
                  {serviceTypeDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [`${value} servicios`, "Total"]}/>
                <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

// Kept this for compatibility with the main page, though it's empty now
export function FeaturesSection() {
    return null;
}
