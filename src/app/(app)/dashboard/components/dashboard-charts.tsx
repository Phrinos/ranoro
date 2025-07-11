
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { useMemo } from 'react';
import { placeholderServiceRecords, placeholderSales, calculateSaleProfit, placeholderInventory } from '@/lib/placeholder-data';
import { format, subMonths, startOfMonth, endOfMonth, isValid, parseISO, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';

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
        <p className="text-blue-500">{`Ingresos: ${formatCurrencyForChart(payload[0].value)}`}</p>
        <p className="text-green-500">{`Ganancia: ${formatCurrencyForChart(payload[1].value)}`}</p>
      </div>
    );
  }
  return null;
};

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name }: any) => {
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


export function DashboardCharts() {
  const chartData = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, i) => subMonths(new Date(), i)).reverse();
    
    return months.map(monthDate => {
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      
      const servicesInMonth = placeholderServiceRecords.filter(s => {
        const d = s.deliveryDateTime ? parseISO(s.deliveryDateTime) : null;
        return s.status === 'Completado' && d && isValid(d) && isWithinInterval(d, { start: monthStart, end: monthEnd });
      });

      const salesInMonth = placeholderSales.filter(s => {
          const d = s.saleDate ? parseISO(s.saleDate) : null;
          return s.status !== 'Cancelado' && d && isValid(d) && isWithinInterval(d, {start: monthStart, end: monthEnd});
      });

      const serviceRevenue = servicesInMonth.reduce((sum, s) => sum + (s.totalCost || 0), 0);
      const serviceProfit = servicesInMonth.reduce((sum, s) => sum + (s.serviceProfit || 0), 0);
      
      const salesRevenue = salesInMonth.reduce((sum, s) => sum + s.totalAmount, 0);
      const salesProfit = salesInMonth.reduce((sum, s) => sum + calculateSaleProfit(s, placeholderInventory), 0);

      return {
        name: format(monthDate, 'MMM yy', { locale: es }),
        ingresos: serviceRevenue + salesRevenue,
        ganancia: serviceProfit + salesProfit,
      };
    });
  }, []);

  const serviceTypeDistribution = useMemo(() => {
    const distribution: { [key: string]: number } = {};
    placeholderServiceRecords.forEach(s => {
      if(s.status === 'Completado') {
        const type = s.serviceType || 'Servicio General';
        distribution[type] = (distribution[type] || 0) + 1;
      }
    });
    return Object.entries(distribution).map(([name, value]) => ({ name, value }));
  }, []);
  
  const revenueSourceData = useMemo(() => {
    const serviceRevenue = placeholderServiceRecords
      .filter(s => s.status === 'Completado')
      .reduce((sum, s) => sum + (s.totalCost || 0), 0);

    const posRevenue = placeholderSales
        .filter(s => s.status !== 'Cancelado')
        .reduce((sum, s) => sum + s.totalAmount, 0);

    return [{ name: 'Servicios', value: serviceRevenue }, { name: 'Ventas POS', value: posRevenue }];
  }, []);

  const PIE_COLORS = ['#3B82F6', '#10B981', '#F97316', '#8B5CF6', '#EC4899'];
  const PIE_COLORS_REVENUE = ['#3B82F6', '#10B981'];

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
                <Tooltip />
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
