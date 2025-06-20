
"use client";

import { useState, useMemo, useEffect } from 'react';
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PlusCircle, ListFilter, TrendingUp, DollarSign as DollarSignIcon, LineChart as LineChartIcon } from "lucide-react";
import { TechniciansTable } from "./components/technicians-table";
import { TechnicianDialog } from "./components/technician-dialog";
import { placeholderTechnicians, placeholderServiceRecords } from "@/lib/placeholder-data";
import type { Technician, ServiceRecord } from "@/types";
import type { TechnicianFormValues } from "./components/technician-form";
import { parseISO, compareAsc, compareDesc, startOfMonth, endOfMonth, subMonths, isWithinInterval, format, eachDayOfInterval, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";

type TechnicianSortOption = 
  | "name_asc" | "name_desc"
  | "area_asc" | "area_desc"
  | "hireDate_asc" | "hireDate_desc"
  | "salary_asc" | "salary_desc";

type ChartDateRangeOption = 'currentMonth' | 'lastMonth';

const lineChartConfig = {
  totalRevenue: {
    label: "Ingresos Totales",
    color: "hsl(var(--chart-1))", // Blue
  },
  totalProfit: {
    label: "Ganancia Total",
    color: "hsl(var(--chart-2))", // Green
  },
} satisfies ChartConfig;

interface DailyPerformanceData {
  dateLabel: string; // e.g., "1 Jul", "2 Jul"
  fullDate: string; // e.g., "2024-07-01" for sorting
  totalRevenue: number;
  totalProfit: number;
}

export default function TecnicosPage() {
  const [technicians, setTechnicians] = useState<Technician[]>(placeholderTechnicians);
  const [sortOption, setSortOption] = useState<TechnicianSortOption>("name_asc");
  
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string | undefined>(
    placeholderTechnicians.length > 0 ? placeholderTechnicians[0].id : undefined
  );
  const [chartDateRangeOption, setChartDateRangeOption] = useState<ChartDateRangeOption>('currentMonth');

  const handleSaveTechnician = async (data: TechnicianFormValues) => {
    const newTechnician: Technician = {
      id: `T${String(technicians.length + 1).padStart(3, '0')}${Date.now().toString().slice(-3)}`, 
      ...data,
      hireDate: data.hireDate ? new Date(data.hireDate).toISOString().split('T')[0] : undefined,
      monthlySalary: Number(data.monthlySalary)
    };
    const updatedTechnicians = [...technicians, newTechnician];
    setTechnicians(updatedTechnicians);
    placeholderTechnicians.push(newTechnician);
    if (!selectedTechnicianId && updatedTechnicians.length > 0) {
      setSelectedTechnicianId(updatedTechnicians[0].id);
    }
  };
  
  useEffect(() => {
    if (!selectedTechnicianId && technicians.length > 0) {
      setSelectedTechnicianId(technicians[0].id);
    }
  }, [technicians, selectedTechnicianId]);

  const lineChartData = useMemo((): DailyPerformanceData[] => {
    if (!selectedTechnicianId) return [];

    const now = new Date();
    let chartStartDate: Date, chartEndDate: Date;

    if (chartDateRangeOption === 'currentMonth') {
      chartStartDate = startOfMonth(now);
      chartEndDate = endOfMonth(now);
    } else { // lastMonth
      const lastMonthDate = subMonths(now, 1);
      chartStartDate = startOfMonth(lastMonthDate);
      chartEndDate = endOfMonth(lastMonthDate);
    }

    const daysInInterval = eachDayOfInterval({ start: chartStartDate, end: chartEndDate });
    
    const techServices = placeholderServiceRecords.filter(
      service => service.technicianId === selectedTechnicianId
    );

    const dailyData = daysInInterval.map(day => {
      const servicesOnDay = techServices.filter(service => {
        if (!service.serviceDate || !isValid(parseISO(service.serviceDate))) return false;
        return format(parseISO(service.serviceDate), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd');
      });

      const dailyRevenue = servicesOnDay.reduce((sum, service) => sum + service.totalCost, 0);
      const dailyProfit = servicesOnDay.reduce((sum, service) => sum + (service.serviceProfit || 0), 0);
      
      return {
        fullDate: format(day, 'yyyy-MM-dd'),
        dateLabel: format(day, 'd MMM', { locale: es }),
        totalRevenue: dailyRevenue,
        totalProfit: dailyProfit,
      };
    });
    
    return dailyData.sort((a,b) => compareAsc(parseISO(a.fullDate), parseISO(b.fullDate)));

  }, [selectedTechnicianId, chartDateRangeOption]);


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
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <LineChartIcon className="h-6 w-6 text-primary" />
              Rendimiento Diario del Técnico
            </CardTitle>
            <CardDescription>
              Ingresos totales y ganancia neta generados por día por el técnico seleccionado.
            </CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Select 
              value={selectedTechnicianId} 
              onValueChange={setSelectedTechnicianId}
              disabled={technicians.length === 0}
            >
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Seleccionar Técnico" />
              </SelectTrigger>
              <SelectContent>
                {technicians.map(tech => (
                  <SelectItem key={tech.id} value={tech.id}>{tech.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={chartDateRangeOption} onValueChange={(value) => setChartDateRangeOption(value as ChartDateRangeOption)}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Seleccionar Rango" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="currentMonth">Este Mes</SelectItem>
                <SelectItem value="lastMonth">Mes Pasado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {selectedTechnicianId && lineChartData.length > 0 ? (
            <ChartContainer config={lineChartConfig} className="min-h-[300px] w-full">
              <LineChart 
                data={lineChartData} 
                margin={{ top: 5, right: 20, left: 0, bottom: 5 }} 
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis 
                  dataKey="dateLabel" 
                  tickLine={false} 
                  axisLine={false} 
                  tickMargin={8} 
                  interval="preserveStartEnd" // Show more ticks if space allows
                />
                <YAxis 
                  tickFormatter={(value) => `$${value.toLocaleString('es-MX')}`}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  width={80}
                />
                <ChartTooltip
                  cursor={true}
                  content={<ChartTooltipContent 
                              indicator="dot" 
                              formatter={(value, name) => {
                                if (name === 'totalRevenue') {
                                  return `${(lineChartConfig.totalRevenue.label as string)}: $${Number(value).toLocaleString('es-MX')}`;
                                }
                                if (name === 'totalProfit') {
                                   return `${(lineChartConfig.totalProfit.label as string)}: $${Number(value).toLocaleString('es-MX')}`;
                                }
                                return `$${Number(value).toLocaleString('es-MX')}`;
                              }} 
                            />}
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Line 
                  type="monotone" 
                  dataKey="totalRevenue" 
                  stroke="var(--color-totalRevenue)" 
                  strokeWidth={2} 
                  dot={{ r: 4, fill: "var(--color-totalRevenue)" }}
                  activeDot={{ r: 6 }}
                  name={lineChartConfig.totalRevenue.label as string}
                />
                <Line 
                  type="monotone" 
                  dataKey="totalProfit" 
                  stroke="var(--color-totalProfit)" 
                  strokeWidth={2}
                  dot={{ r: 4, fill: "var(--color-totalProfit)" }}
                  activeDot={{ r: 6 }}
                  name={lineChartConfig.totalProfit.label as string}
                />
              </LineChart>
            </ChartContainer>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              { !selectedTechnicianId ? "Por favor, seleccione un técnico para ver su rendimiento." : 
                "No hay datos de rendimiento para el técnico y período seleccionados."}
            </p>
          )}
        </CardContent>
      </Card>

      <TechniciansTable technicians={sortedTechniciansForTable} />
    </>
  );
}
    

    


