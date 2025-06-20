
"use client";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PlusCircle, ListFilter, TrendingUp, DollarSign as DollarSignIcon } from "lucide-react";
import { TechniciansTable } from "./components/technicians-table";
import { TechnicianDialog } from "./components/technician-dialog";
import { placeholderTechnicians, placeholderServiceRecords } from "@/lib/placeholder-data";
import type { Technician, ServiceRecord } from "@/types";
import { useState, useMemo } from "react";
import type { TechnicianFormValues } from "./components/technician-form";
import { parseISO, compareAsc, compareDesc, startOfMonth, endOfMonth, subMonths, isWithinInterval, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";

type TechnicianSortOption = 
  | "name_asc" | "name_desc"
  | "area_asc" | "area_desc"
  | "hireDate_asc" | "hireDate_desc"
  | "salary_asc" | "salary_desc";

type DateRangeOption = 'currentMonth' | 'lastMonth';

const chartConfig = {
  totalRevenue: {
    label: "Ingresos Totales",
    color: "hsl(var(--chart-1))",
    icon: DollarSignIcon,
  },
  totalProfit: {
    label: "Ganancia Total",
    color: "hsl(var(--chart-2))",
    icon: TrendingUp,
  },
} satisfies ChartConfig;

export default function TecnicosPage() {
  const [technicians, setTechnicians] = useState<Technician[]>(placeholderTechnicians);
  const [sortOption, setSortOption] = useState<TechnicianSortOption>("name_asc");
  const [dateRangeOption, setDateRangeOption] = useState<DateRangeOption>('currentMonth');

  const handleSaveTechnician = async (data: TechnicianFormValues) => {
    const newTechnician: Technician = {
      id: `T${String(technicians.length + 1).padStart(3, '0')}${Date.now().toString().slice(-3)}`, 
      ...data,
      hireDate: data.hireDate ? new Date(data.hireDate).toISOString().split('T')[0] : undefined,
      monthlySalary: Number(data.monthlySalary)
    };
    setTechnicians(prev => [...prev, newTechnician]);
    placeholderTechnicians.push(newTechnician);
  };

  const technicianPerformanceData = useMemo(() => {
    const now = new Date();
    let startDate: Date, endDate: Date;

    if (dateRangeOption === 'currentMonth') {
      startDate = startOfMonth(now);
      endDate = endOfMonth(now);
    } else { // lastMonth
      const lastMonthDate = subMonths(now, 1);
      startDate = startOfMonth(lastMonthDate);
      endDate = endOfMonth(lastMonthDate);
    }

    return technicians.map(tech => {
      const techServicesInRange = placeholderServiceRecords.filter(service => {
        const serviceDate = parseISO(service.serviceDate);
        return service.technicianId === tech.id && isWithinInterval(serviceDate, { start: startDate, end: endDate });
      });

      const totalRevenue = techServicesInRange.reduce((sum, service) => sum + service.totalCost, 0);
      const totalProfit = techServicesInRange.reduce((sum, service) => sum + (service.serviceProfit || 0), 0);
      
      return {
        name: tech.name,
        totalRevenue,
        totalProfit,
      };
    }).filter(data => data.totalRevenue > 0 || data.totalProfit > 0); // Only include techs with activity

  }, [technicians, dateRangeOption]);


  const sortedTechniciansForTable = useMemo(() => {
    let itemsToDisplay = [...technicians];
    
    itemsToDisplay.sort((a, b) => {
      switch (sortOption) {
        case 'name_asc': return a.name.localeCompare(b.name);
        case 'name_desc': return b.name.localeCompare(a.name);
        case 'area_asc': return a.area.localeCompare(b.area);
        case 'area_desc': return b.area.localeCompare(a.area);
        case 'hireDate_asc':
          if (!a.hireDate) return 1; 
          if (!b.hireDate) return -1;
          return compareAsc(parseISO(a.hireDate), parseISO(b.hireDate));
        case 'hireDate_desc':
          if (!a.hireDate) return 1;
          if (!b.hireDate) return -1;
          return compareDesc(parseISO(a.hireDate), parseISO(b.hireDate));
        case 'salary_asc': return (a.monthlySalary || 0) - (b.monthlySalary || 0);
        case 'salary_desc': return (b.monthlySalary || 0) - (a.monthlySalary || 0);
        default: return a.name.localeCompare(b.name);
      }
    });
    return itemsToDisplay;
  }, [technicians, sortOption]);


  return (
    <>
      <PageHeader
        title="Técnicos"
        description="Administra los perfiles y el rendimiento de los técnicos."
        actions={
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <ListFilter className="mr-2 h-4 w-4" />
                  Ordenar Tabla
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Ordenar tabla por</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={sortOption} onValueChange={(value) => setSortOption(value as TechnicianSortOption)}>
                  <DropdownMenuRadioItem value="name_asc">Nombre (A-Z)</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="name_desc">Nombre (Z-A)</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="area_asc">Área (A-Z)</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="area_desc">Área (Z-A)</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="hireDate_asc">Fecha Contratación (Antiguo a Nuevo)</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="hireDate_desc">Fecha Contratación (Nuevo a Antiguo)</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="salary_asc">Sueldo (Menor a Mayor)</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="salary_desc">Sueldo (Mayor a Menor)</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <TechnicianDialog
              trigger={
                <Button>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Nuevo Técnico
                </Button>
              }
              onSave={handleSaveTechnician}
            />
          </div>
        }
      />

      <Card className="mb-6">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div>
            <CardTitle>Rendimiento de Técnicos</CardTitle>
            <CardDescription>
              Ingresos totales y ganancia total generada por técnico en el período seleccionado.
            </CardDescription>
          </div>
          <Select value={dateRangeOption} onValueChange={(value) => setDateRangeOption(value as DateRangeOption)}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Seleccionar Rango" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="currentMonth">Este Mes</SelectItem>
              <SelectItem value="lastMonth">Mes Pasado</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {technicianPerformanceData.length > 0 ? (
            <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
              <BarChart data={technicianPerformanceData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  tickLine={false} 
                  axisLine={false} 
                  tickMargin={8} 
                  angle={-15}
                  textAnchor="end"
                  height={50}
                  interval={0} 
                />
                <YAxis 
                  tickFormatter={(value) => `$${value.toLocaleString('es-MX')}`}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="dot" />}
                />
                <Legend content={<ChartLegendContent />} />
                <Bar dataKey="totalRevenue" fill="var(--color-totalRevenue)" radius={4} name="Ingresos Totales" />
                <Bar dataKey="totalProfit" fill="var(--color-totalProfit)" radius={4} name="Ganancia Total" />
              </BarChart>
            </ChartContainer>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No hay datos de rendimiento para mostrar en el período seleccionado.
            </p>
          )}
        </CardContent>
      </Card>

      <TechniciansTable technicians={sortedTechniciansForTable} />
    </>
  );
}
    

    