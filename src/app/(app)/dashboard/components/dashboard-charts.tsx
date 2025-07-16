
"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LineChart, Line, Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { formatCurrency, cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

const formatCurrencyForChart = (value: number) => {
  if (Math.abs(value) >= 1000) {
    return `$${(value / 1000).toFixed(0)}k`;
  }
  return `$${value.toFixed(0)}`;
};

const CustomTooltip = ({ active, payload, label, activeDataKeys }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border shadow-sm p-3 rounded-md text-sm">
        <p className="label font-bold mb-2">{`${label}`}</p>
        {payload.map((pld: any) => (
          activeDataKeys.includes(pld.dataKey) && (
            <div key={pld.dataKey} style={{ color: pld.color }} className="flex items-center">
              <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: pld.color }}></div>
              <span>{`${pld.name}: `}</span>
              <span className="font-semibold ml-1">
                {pld.dataKey === 'ingresos' || pld.dataKey === 'ganancia' || pld.dataKey === 'costos' || pld.dataKey === 'gastos' || pld.dataKey === 'utilidadBruta' || pld.dataKey === 'utilidadNeta'
                  ? formatCurrency(pld.value)
                  : pld.value.toLocaleString('es-MX')}
              </span>
            </div>
          )
        ))}
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
    chartData: { name: string; ingresos: number; ganancia: number; costos: number; gastos: number; }[];
    serviceTypeDistribution: { name: string; value: number }[];
    monthlyComparisonData: { name: string; 'Mes Anterior': number; 'Mes Actual': number; 'Utilidad Bruta': number; 'Utilidad Neta': number }[];
}


export function DashboardCharts({ chartData, serviceTypeDistribution, monthlyComparisonData }: DashboardChartsProps) {
  const [activeDataKeys, setActiveDataKeys] = useState<string[]>(['ingresos', 'ganancia', 'gastos', 'costos']);

  const toggleDataKey = (key: string) => {
    setActiveDataKeys(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };
  
  const lineChartData = [
      { key: 'ingresos', name: 'Ingresos', color: '#3b82f6' }, // blue
      { key: 'ganancia', name: 'Ganancia', color: '#22c55e' }, // green
      { key: 'gastos', name: 'Gastos', color: '#ef4444' }, // red
      { key: 'costos', name: 'Costos', color: '#f97316' }, // orange
  ];

  return (
    <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-5 mt-6">
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle>Rendimiento del Taller</CardTitle>
          <CardDescription>Análisis de la rentabilidad y volumen de operaciones.</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis yAxisId="left" fontSize={12} tickLine={false} axisLine={false} tickFormatter={formatCurrencyForChart} />
                <Tooltip content={<CustomTooltip activeDataKeys={activeDataKeys} />} cursor={{ stroke: 'hsl(var(--muted))' }}/>
                <Legend />
                {activeDataKeys.includes('ingresos') && <Line yAxisId="left" type="monotone" dataKey="ingresos" stroke="#3b82f6" strokeWidth={2} name="Ingresos" dot={{ r: 4 }} activeDot={{ r: 6 }} />}
                {activeDataKeys.includes('ganancia') && <Line yAxisId="left" type="monotone" dataKey="ganancia" stroke="#22c55e" strokeWidth={2} name="Ganancia" dot={{ r: 4 }} activeDot={{ r: 6 }} />}
                {activeDataKeys.includes('gastos') && <Line yAxisId="left" type="monotone" dataKey="gastos" stroke="#ef4444" strokeWidth={2} name="Gastos" dot={{ r: 4 }} activeDot={{ r: 6 }} />}
                {activeDataKeys.includes('costos') && <Line yAxisId="left" type="monotone" dataKey="costos" stroke="#f97316" strokeWidth={2} name="Costos" dot={{ r: 4 }} activeDot={{ r: 6 }} />}
            </LineChart>
          </ResponsiveContainer>
          <div className="flex items-center justify-center gap-4 mt-4 text-sm flex-wrap">
            {lineChartData.map(item => (
                <div key={item.key} className="flex items-center space-x-2">
                    <Checkbox id={item.key} checked={activeDataKeys.includes(item.key)} onCheckedChange={() => toggleDataKey(item.key)} />
                    <Label htmlFor={item.key} className="flex items-center cursor-pointer">
                        <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: item.color, opacity: item.opacity || 1 }}></div>
                        {item.name}
                    </Label>
                </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Comparativo Mensual</CardTitle>
          <CardDescription>Rendimiento del mes actual vs. el anterior.</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyComparisonData} layout="vertical" margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => val > 1000 ? `${val/1000}k` : `${val}`} />
              <YAxis dataKey="name" type="category" fontSize={12} tickLine={false} axisLine={false} width={80} />
              <Tooltip
                cursor={{ fill: 'hsl(var(--muted))' }}
                formatter={(value: number, name: string, props) => {
                  const item = props.payload;
                  if (name === 'Utilidad Neta') {
                    // This is a custom check for the dynamic color display
                    return [<span className={value >= 0 ? 'text-green-600' : 'text-red-600'}>{formatCurrency(value)}</span>, name];
                  }
                   if (name === 'Mes Anterior' || name === 'Mes Actual') {
                    return [formatCurrency(value), name];
                  }
                  return [formatCurrency(value), name];
                }}
              />
              <Legend />
              <Bar dataKey="Mes Anterior" fill="hsl(var(--muted))" radius={[0, 4, 4, 0]} />
              <Bar dataKey="Mes Actual" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} />
              {monthlyComparisonData.map((entry, index) => {
                  const netProfit = entry['Utilidad Neta'];
                  if (netProfit !== 0) {
                      return <Bar key={`cell-${index}`} dataKey="Utilidad Neta" fill={netProfit >= 0 ? '#22c55e' : '#ef4444'} radius={[0, 4, 4, 0]} />;
                  }
                  return null;
              })}
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
