
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
    const dataByMonth: { [key: string]: { name: string; ingresos: number; gastos: number; ganancia: number; } } = {};
    const now = new Date();

    // 1. Initialize the last 6 months
    for (let i = 5; i >= 0; i--) {
        const date = subMonths(now, i);
        const monthKey = format(date, 'yyyy-MM');
        const monthName = format(date, 'MMM yy', { locale: es }); // e.g., "ago 24"
        dataByMonth[monthKey] = { name: monthName, ingresos: 0, gastos: 0, ganancia: 0 };
    }

    // 2. Process all services and sales to calculate gross income and cost of goods
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
                // Accumulate cost of goods directly into gastos for now
                dataByMonth[monthKey].gastos += costOfGoods;
            }
        }
    });
    
    // 3. Calculate fixed expenses and final net profit for each month
    const totalMonthlyFixedExpenses = fixedExpenses.reduce((sum, exp) => sum + exp.amount, 0) + 
                                    personnel.filter(p => !p.isArchived).reduce((sum, p) => sum + (p.monthlySalary || 0), 0);

    Object.keys(dataByMonth).forEach(monthKey => {
        const [year, month] = monthKey.split('-').map(Number);
        const daysInMonth = getDaysInMonth(new Date(year, month - 1));
        const proportionalFixedExpenses = (totalMonthlyFixedExpenses / 30) * daysInMonth;

        // Add fixed expenses to the already accumulated cost of goods
        dataByMonth[monthKey].gastos += proportionalFixedExpenses;
        
        // Final net profit calculation
        dataByMonth[monthKey].ganancia = dataByMonth[monthKey].ingresos - dataByMonth[monthKey].gastos;
    });

    return Object.values(dataByMonth);
};


export function DashboardCharts({ services, sales, inventory, fixedExpenses, personnel }: DashboardChartsProps) {
  const chartData = useMemo(() => processChartData(services, sales, inventory, fixedExpenses, personnel), [services, sales, inventory, fixedExpenses, personnel]);

  return (
    <div className="grid gap-6 grid-cols-1">
      <Card>
        <CardHeader>
          <CardTitle>Rendimiento del Taller</CardTitle>
          <CardDescription>Análisis de la rentabilidad y volumen de operaciones.</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis tickFormatter={(value) => formatCurrency(value, {notation: 'compact'})}/>
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Legend />
              <Line type="monotone" dataKey="ingresos" stroke="#3b82f6" strokeWidth={2} name="Ingresos" />
              <Line type="monotone" dataKey="gastos" stroke="#ef4444" strokeWidth={2} name="Gastos" />
              <Line type="monotone" dataKey="ganancia" stroke="#22c55e" strokeWidth={2} name="Ganancia" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
