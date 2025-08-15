
"use client";

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import type { ServiceRecord, SaleReceipt } from '@/types';
import { format, parseISO, startOfMonth, subMonths, isValid, endOfMonth, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatCurrency } from '@/lib/utils';
import { parseDate } from '@/lib/forms';

interface DashboardChartsProps {
    services: ServiceRecord[];
    sales: SaleReceipt[];
}

const processChartData = (services: ServiceRecord[], sales: SaleReceipt[]) => {
    const dataByMonth: Record<string, { name: string, servicios: number, ventas: number, completados: number, creados: number }> = {};
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
        const date = subMonths(now, i);
        const monthKey = format(date, 'yyyy-MM');
        const monthName = format(date, 'MMM', { locale: es });
        dataByMonth[monthKey] = { name: monthName, servicios: 0, ventas: 0, completados: 0, creados: 0 };
    }

    services.forEach(service => {
        const serviceDate = parseDate(service.serviceDate);
        if (serviceDate && isValid(serviceDate)) {
            const monthKey = format(serviceDate, 'yyyy-MM');
            if (dataByMonth[monthKey]) {
                dataByMonth[monthKey].creados += 1;
                if(service.status === 'Entregado') {
                   dataByMonth[monthKey].servicios += service.totalCost || 0;
                   dataByMonth[monthKey].completados += 1;
                }
            }
        }
    });
    
    sales.forEach(sale => {
        const saleDate = parseDate(sale.saleDate);
        if (saleDate && isValid(saleDate)) {
            const monthKey = format(saleDate, 'yyyy-MM');
            if (dataByMonth[monthKey]) {
                dataByMonth[monthKey].ventas += sale.totalAmount;
            }
        }
    });

    return Object.values(dataByMonth);
};


export function DashboardCharts({ services, sales }: DashboardChartsProps) {
  const chartData = useMemo(() => processChartData(services, sales), [services, sales]);

  return (
    <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Ingresos Mensuales (Últimos 6 Meses)</CardTitle>
          <CardDescription>Evolución de los ingresos por servicios y ventas de mostrador.</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis tickFormatter={(value) => formatCurrency(value, {notation: 'compact'})}/>
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Legend />
              <Area type="monotone" dataKey="servicios" stackId="1" stroke="#8884d8" fill="#8884d8" name="Servicios" />
              <Area type="monotone" dataKey="ventas" stackId="1" stroke="#82ca9d" fill="#82ca9d" name="Ventas POS" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Volumen de Servicios (Últimos 6 Meses)</CardTitle>
          <CardDescription>Comparativa de servicios creados vs. completados en el mes.</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false}/>
              <Tooltip />
              <Legend />
              <Bar dataKey="creados" fill="#8884d8" name="Servicios Creados" />
              <Bar dataKey="completados" fill="#82ca9d" name="Servicios Completados" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

