
"use client";

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import type { ServiceRecord, SaleReceipt, InventoryItem, MonthlyFixedExpense, Personnel } from '@/types';
import { format, parseISO, startOfMonth, subMonths, isValid, endOfMonth, isWithinInterval, getDaysInMonth, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatCurrency } from '@/lib/utils';
import { parseDate } from '@/lib/forms';
import { calculateSaleProfit } from '@/lib/placeholder-data';
import { calcEffectiveProfit } from '@/lib/money-helpers';

interface DashboardChartsProps {
    services: ServiceRecord[];
    sales: SaleReceipt[];
    inventory: InventoryItem[];
    fixedExpenses: MonthlyFixedExpense[];
    personnel: Personnel[];
}

const processChartData = (
    services: ServiceRecord[], 
    sales: SaleReceipt[], 
    inventory: InventoryItem[], 
    fixedExpenses: MonthlyFixedExpense[], 
    personnel: Personnel[]
) => {
    const dataByMonth: { [key: string]: { name: string; ingresos: number; gastos: number; ganancia: number; completados: number; creados: number; ticketPromedio: number; } } = {};
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
        const date = subMonths(now, i);
        const monthKey = format(date, 'yyyy-MM');
        const monthName = format(date, 'MMM', { locale: es });
        dataByMonth[monthKey] = { name: monthName, ingresos: 0, gastos: 0, ganancia: 0, completados: 0, creados: 0, ticketPromedio: 0 };
    }

    const servicesByMonth: { [key: string]: ServiceRecord[] } = {};

    services.forEach(service => {
        const serviceDate = parseDate(service.serviceDate);
        if (serviceDate && isValid(serviceDate)) {
            const monthKey = format(serviceDate, 'yyyy-MM');
            if (dataByMonth[monthKey]) {
                dataByMonth[monthKey].creados += 1;
                
                if(service.status === 'Entregado') {
                   const deliveryDate = parseDate(service.deliveryDateTime);
                   if (deliveryDate && isValid(deliveryDate)) {
                        const deliveryMonthKey = format(deliveryDate, 'yyyy-MM');
                        if (dataByMonth[deliveryMonthKey]) {
                            const income = service.totalCost || 0;
                            dataByMonth[deliveryMonthKey].ingresos += income;
                            dataByMonth[deliveryMonthKey].completados += 1;
                            
                            if (!servicesByMonth[deliveryMonthKey]) servicesByMonth[deliveryMonthKey] = [];
                            servicesByMonth[deliveryMonthKey].push(service);
                        }
                   }
                }
            }
        }
    });

    sales.forEach(sale => {
        const saleDate = parseDate(sale.saleDate);
        if (saleDate && isValid(saleDate)) {
            const monthKey = format(saleDate, 'yyyy-MM');
            if (dataByMonth[monthKey]) {
                dataByMonth[monthKey].ingresos += sale.totalAmount;
            }
        }
    });
    
    // Calculate expenses and profit for each month
    Object.keys(dataByMonth).forEach(monthKey => {
        const year = parseInt(monthKey.split('-')[0]);
        const month = parseInt(monthKey.split('-')[1]) - 1;
        const monthStart = new Date(year, month, 1);
        const daysInMonth = getDaysInMonth(monthStart);

        const servicesForProfit = servicesByMonth[monthKey] || [];
        const salesForProfit = sales.filter(s => {
            const d = parseDate(s.saleDate);
            return d && format(d, 'yyyy-MM') === monthKey;
        });
        
        const profitFromServices = servicesForProfit.reduce((acc, s) => acc + calcEffectiveProfit(s), 0);
        const profitFromSales = salesForProfit.reduce((acc, s) => acc + calculateSaleProfit(s, inventory), 0);
        
        const costOfGoods = (dataByMonth[monthKey].ingresos - (profitFromServices + profitFromSales));
        
        const totalBaseSalaries = personnel.filter(p => !p.isArchived).reduce((sum, person) => sum + (person.monthlySalary || 0), 0);
        const totalOtherFixed = fixedExpenses.reduce((sum, exp) => sum + exp.amount, 0);
        
        const proportionalFixedExpenses = ((totalBaseSalaries + totalOtherFixed) / 30) * daysInMonth;

        dataByMonth[monthKey].gastos = costOfGoods + proportionalFixedExpenses;
        dataByMonth[monthKey].ganancia = dataByMonth[monthKey].ingresos - dataByMonth[monthKey].gastos;

        if (dataByMonth[monthKey].completados > 0) {
          const totalRevenueFromServices = servicesForProfit.reduce((sum, s) => sum + (s.totalCost || 0), 0);
          dataByMonth[monthKey].ticketPromedio = totalRevenueFromServices / dataByMonth[monthKey].completados;
        }
    });

    return Object.values(dataByMonth);
};


export function DashboardCharts({ services, sales, inventory, fixedExpenses, personnel }: DashboardChartsProps) {
  const chartData = useMemo(() => processChartData(services, sales, inventory, fixedExpenses, personnel), [services, sales, inventory, fixedExpenses, personnel]);

  return (
    <div className="grid gap-6 grid-cols-1">
      <Card>
        <CardHeader>
          <CardTitle>Rendimiento Financiero (Últimos 6 Meses)</CardTitle>
          <CardDescription>Comparativa de ingresos, gastos y la ganancia neta mensual.</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis tickFormatter={(value) => formatCurrency(value, {notation: 'compact'})}/>
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Legend />
              <Area type="monotone" dataKey="ingresos" stackId="1" stroke="#82ca9d" fill="#82ca9d" name="Ingresos" />
              <Area type="monotone" dataKey="gastos" stackId="1" stroke="#ffc658" fill="#ffc658" name="Gastos" />
              <Area type="monotone" dataKey="ganancia" stackId="1" stroke="#8884d8" fill="#8884d8" name="Ganancia Neta" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
