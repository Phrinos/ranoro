
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LineChart, Line, Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { formatCurrency } from '@/lib/utils';
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
                {pld.dataKey === 'ingresos' || pld.dataKey === 'ganancia' || pld.dataKey === 'costos'
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
    chartData: { name: string; ingresos: number; ganancia: number; costos: number; servicios: number; }[];
    serviceTypeDistribution: { name: string; value: number }[];
    monthlyComparisonData: { name: string; 'Mes Anterior': number; 'Mes Actual': number }[];
}


export function DashboardCharts({ chartData, serviceTypeDistribution, monthlyComparisonData }: DashboardChartsProps) {
  const PIE_COLORS = ['#3B82F6', '#10B981', '#F97316', '#8B5CF6', '#EC4899'];
  const [activeDataKeys, setActiveDataKeys] = useState<string[]>(['ingresos', 'ganancia']);

  const toggleDataKey = (key: string) => {
    setActiveDataKeys(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };
  
  const lineChartData = [
      { key: 'ingresos', name: 'Ingresos', color: 'hsl(var(--chart-1))' },
      { key: 'ganancia', name: 'Ganancia', color: 'hsl(var(--chart-2))' },
      { key: 'costos', name: 'Costos', color: 'hsl(var(--destructive))' },
      { key: 'servicios', name: 'Servicios', color: '#F97316' },
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
                <YAxis yAxisId="right" orientation="right" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip activeDataKeys={activeDataKeys} />} cursor={{ stroke: 'hsl(var(--muted))' }}/>
                <Legend />
                {activeDataKeys.includes('ingresos') && <Line yAxisId="left" type="monotone" dataKey="ingresos" stroke="hsl(var(--chart-1))" strokeWidth={2} name="Ingresos" dot={{ r: 4 }} activeDot={{ r: 6 }} />}
                {activeDataKeys.includes('ganancia') && <Line yAxisId="left" type="monotone" dataKey="ganancia" stroke="hsl(var(--chart-2))" strokeWidth={2} name="Ganancia" dot={{ r: 4 }} activeDot={{ r: 6 }} />}
                {activeDataKeys.includes('costos') && <Line yAxisId="left" type="monotone" dataKey="costos" stroke="hsl(var(--destructive))" strokeWidth={2} name="Costos" dot={{ r: 4 }} activeDot={{ r: 6 }} />}
                {activeDataKeys.includes('servicios') && <Line yAxisId="right" type="monotone" dataKey="servicios" stroke="#F97316" strokeWidth={2} name="Servicios" dot={{ r: 4 }} activeDot={{ r: 6 }} />}
            </LineChart>
          </ResponsiveContainer>
          <div className="flex items-center justify-center gap-4 mt-4 text-sm flex-wrap">
            {lineChartData.map(item => (
                <div key={item.key} className="flex items-center space-x-2">
                    <Checkbox id={item.key} checked={activeDataKeys.includes(item.key)} onCheckedChange={() => toggleDataKey(item.key)} />
                    <Label htmlFor={item.key} className="flex items-center cursor-pointer">
                        <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: item.color }}></div>
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
              <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} formatter={(val, name) => [name.toString().includes('Servicios') ? val : formatCurrency(val as number), name]}/>
              <Legend />
              <Bar dataKey="Mes Anterior" fill="hsl(var(--secondary))" radius={[0, 4, 4, 0]} />
              <Bar dataKey="Mes Actual" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
