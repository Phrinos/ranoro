

"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LineChart, Line, Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { formatCurrency, cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { ServiceTypeRecord } from '@/types';


const formatCurrencyForChart = (value: number) => {
  if (Math.abs(value) >= 1000) {
    return `$${(value / 1000).toFixed(0)}k`;
  }
  return `$${value.toFixed(0)}`;
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border shadow-sm p-3 rounded-md text-sm">
        <p className="label font-bold mb-2">{`${label}`}</p>
        {payload.map((pld: any) => (
            <div key={pld.dataKey} style={{ color: pld.color }} className="flex items-center">
              <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: pld.color }}></div>
              <span>{`${pld.name}: `}</span>
              <span className="font-semibold ml-1">
                {pld.dataKey === 'ingresos' || pld.dataKey === 'Ganancia Bruta' || pld.dataKey === 'costos' || pld.dataKey === 'gastos' || pld.dataKey === 'Mes Anterior' || pld.dataKey === 'Mes Actual'
                  ? formatCurrency(pld.value)
                  : pld.value.toLocaleString('es-MX')}
              </span>
            </div>
        ))}
      </div>
    );
  }
  return null;
};

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name, value }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    if (percent < 0.05) return null; // Don't render label if slice is too small
    return (
        <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="text-xs font-bold">
            {`${name} (${value})`}
        </text>
    );
};


interface DashboardChartsProps {
    financialChartData: { name: string; ingresos: number; 'Ganancia Bruta': number; gastos: number; }[];
    operationalChartData: { name: string; 'Ventas POS': number; [key: string]: number | string; }[];
    serviceTypeDistribution: { name: string; value: number }[];
    monthlyComparisonData: { name: string; 'Mes Anterior': number; 'Mes Actual': number; }[];
    allServiceTypes: ServiceTypeRecord[];
}


export function DashboardCharts({ financialChartData, operationalChartData, serviceTypeDistribution, monthlyComparisonData, allServiceTypes }: DashboardChartsProps) {
  const [activeFinancialKeys, setActiveFinancialKeys] = useState<string[]>(['ingresos', 'Ganancia Bruta', 'gastos']);
  
  const allOperationalKeys = ['Ventas POS', ...allServiceTypes.map(st => st.name)];
  const [activeOperationalKeys, setActiveOperationalKeys] = useState<string[]>(allOperationalKeys);

  const toggleFinancialKey = (key: string) => {
    setActiveFinancialKeys(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };
  
  const toggleOperationalKey = (key: string) => {
    setActiveOperationalKeys(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };
  
  const financialLineData = [
      { key: 'ingresos', name: 'Ingresos', color: '#3b82f6' }, // blue
      { key: 'Ganancia Bruta', name: 'Ganancia Bruta', color: '#22c55e' }, // green-500
      { key: 'gastos', name: 'Gastos', color: '#ef4444' }, // red-500
  ];
  
  const operationalLineColors = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F', '#FFBB28', '#FF8042'];
  const operationalLineData = allOperationalKeys.map((key, index) => ({
      key,
      name: key,
      color: operationalLineColors[index % operationalLineColors.length],
  }));

  return (
    <Tabs defaultValue="financiero" className="w-full mt-6">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="financiero">Financiero</TabsTrigger>
        <TabsTrigger value="operativo">Operativo</TabsTrigger>
      </TabsList>
      <TabsContent value="financiero" className="mt-6">
        <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-5">
            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle>Rendimiento del Taller</CardTitle>
                <CardDescription>Análisis de la rentabilidad y volumen de operaciones.</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={financialChartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis yAxisId="left" fontSize={12} tickLine={false} axisLine={false} tickFormatter={formatCurrencyForChart} />
                      <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'hsl(var(--muted))' }}/>
                      <Legend />
                      {activeFinancialKeys.includes('ingresos') && <Line yAxisId="left" type="monotone" dataKey="ingresos" stroke={financialLineData.find(d=>d.key==='ingresos')?.color} strokeWidth={2} name="Ingresos" dot={{ r: 4 }} activeDot={{ r: 6 }} />}
                      {activeFinancialKeys.includes('Ganancia Bruta') && <Line yAxisId="left" type="monotone" dataKey="Ganancia Bruta" stroke={financialLineData.find(d=>d.key==='Ganancia Bruta')?.color} strokeWidth={2} name="Ganancia Bruta" dot={{ r: 4 }} activeDot={{ r: 6 }} />}
                      {activeFinancialKeys.includes('gastos') && <Line yAxisId="left" type="monotone" dataKey="gastos" stroke={financialLineData.find(d=>d.key==='gastos')?.color} strokeWidth={2} name="Gastos" dot={{ r: 4 }} activeDot={{ r: 6 }} />}
                  </LineChart>
                </ResponsiveContainer>
                <div className="flex items-center justify-center gap-4 mt-4 text-sm flex-wrap">
                  {financialLineData.map(item => (
                      <div key={item.key} className="flex items-center space-x-2">
                          <Checkbox id={item.key} checked={activeFinancialKeys.includes(item.key)} onCheckedChange={() => toggleFinancialKey(item.key)} className="data-[state=checked]:bg-gray-400 data-[state=checked]:border-gray-400" />
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
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
                    <Legend />
                    <Bar dataKey="Mes Anterior" fill="hsl(var(--secondary-foreground))" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="Mes Actual" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
        </div>
      </TabsContent>
      <TabsContent value="operativo" className="mt-6">
        <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-5">
            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle>Volumen de Operaciones</CardTitle>
                <CardDescription>Cantidad de servicios y ventas a lo largo del tiempo.</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={operationalChartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis yAxisId="left" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false}/>
                      <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'hsl(var(--muted))' }}/>
                      <Legend />
                      {operationalLineData.map(line => (
                        activeOperationalKeys.includes(line.key) && (
                          <Line key={line.key} yAxisId="left" type="monotone" dataKey={line.key} stroke={line.color} strokeWidth={2} name={line.name} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                        )
                      ))}
                  </LineChart>
                </ResponsiveContainer>
                <div className="flex items-center justify-center gap-4 mt-4 text-sm flex-wrap">
                  {operationalLineData.map(item => (
                      <div key={item.key} className="flex items-center space-x-2">
                          <Checkbox id={item.key} checked={activeOperationalKeys.includes(item.key)} onCheckedChange={() => toggleOperationalKey(item.key)} className="data-[state=checked]:bg-gray-400 data-[state=checked]:border-gray-400"/>
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
                  <CardTitle>Distribución de Tipos de Servicio</CardTitle>
                  <CardDescription>Servicios más comunes en el período seleccionado.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                          <Pie
                              data={serviceTypeDistribution}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={renderCustomizedLabel}
                              outerRadius={100}
                              dataKey="value"
                              nameKey="name"
                          >
                          {serviceTypeDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={operationalLineColors[index % operationalLineColors.length]} />
                          ))}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                          <Legend />
                      </PieChart>
                  </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
      </TabsContent>
    </Tabs>
  );
}

    