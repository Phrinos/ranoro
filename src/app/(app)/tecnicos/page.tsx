
"use client";

import { useState, useMemo, useEffect } from 'react';
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { PlusCircle, ListFilter, TrendingUp, DollarSign as DollarSignIcon, LineChart as LineChartIcon, CalendarIcon as CalendarDateIcon } from "lucide-react";
import { TechniciansTable } from "./components/technicians-table";
import { TechnicianDialog } from "./components/technician-dialog";
import { placeholderTechnicians, placeholderServiceRecords } from "@/lib/placeholder-data";
import type { Technician, ServiceRecord } from "@/types";
import type { TechnicianFormValues } from "./components/technician-form";
import { parseISO, compareAsc, compareDesc, startOfMonth, endOfMonth, subMonths, isWithinInterval, format, eachDayOfInterval, isValid, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import type { DateRange } from "react-day-picker";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { cn } from "@/lib/utils";

type TechnicianSortOption = 
  | "name_asc" | "name_desc"
  | "area_asc" | "area_desc"
  | "hireDate_asc" | "hireDate_desc"
  | "salary_asc" | "salary_desc";

const lineChartConfig = {
  totalRevenue: {
    label: "Ingresos Diarios",
    color: "hsl(var(--chart-1))", 
  },
  totalProfit: {
    label: "Ganancia Diaria",
    color: "hsl(var(--chart-2))", 
  },
} satisfies ChartConfig;

interface DailyPerformanceData {
  dateLabel: string; 
  fullDate: string; 
  totalRevenue: number;
  totalProfit: number;
}

interface AggregatedTechnicianPerformance {
  technicianId: string;
  technicianName: string;
  totalRevenue: number;
  totalProfit: number;
}

export default function TecnicosPage() {
  const [technicians, setTechnicians] = useState<Technician[]>(placeholderTechnicians);
  const [sortOption, setSortOption] = useState<TechnicianSortOption>("name_asc");
  
  const [selectedTechnicianIdForChart, setSelectedTechnicianIdForChart] = useState<string | undefined>(
    placeholderTechnicians.length > 0 ? placeholderTechnicians[0].id : undefined
  );
  const [filterDateRange, setFilterDateRange] = useState<DateRange | undefined>(() => {
    const now = new Date();
    return { from: startOfMonth(now), to: endOfMonth(now) };
  });

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
    if (!selectedTechnicianIdForChart && updatedTechnicians.length > 0) {
      setSelectedTechnicianIdForChart(updatedTechnicians[0].id);
    }
  };
  
  useEffect(() => {
    if (!selectedTechnicianIdForChart && technicians.length > 0) {
      setSelectedTechnicianIdForChart(technicians[0].id);
    }
  }, [technicians, selectedTechnicianIdForChart]);

  const aggregatedTechnicianPerformance = useMemo((): AggregatedTechnicianPerformance[] => {
    let dateFrom = filterDateRange?.from ? startOfDay(filterDateRange.from) : startOfMonth(new Date());
    let dateTo = filterDateRange?.to ? endOfDay(filterDateRange.to) : endOfMonth(new Date());
    if (filterDateRange?.from && !filterDateRange.to) {
        dateTo = endOfDay(filterDateRange.from);
    }


    return technicians.map(tech => {
      const techServices = placeholderServiceRecords.filter(service => {
        if (service.technicianId !== tech.id) return false;
        const serviceDate = parseISO(service.serviceDate);
        if (!isValid(serviceDate)) return false;
        return isWithinInterval(serviceDate, { start: dateFrom, end: dateTo });
      });

      const totalRevenue = techServices.reduce((sum, s) => sum + s.totalCost, 0);
      const totalProfit = techServices.reduce((sum, s) => sum + (s.serviceProfit || 0), 0);
      
      return {
        technicianId: tech.id,
        technicianName: tech.name,
        totalRevenue,
        totalProfit,
      };
    });
  }, [technicians, filterDateRange]);


  const lineChartData = useMemo((): DailyPerformanceData[] => {
    if (!selectedTechnicianIdForChart) return [];

    let chartStartDate: Date, chartEndDate: Date;

    if (filterDateRange?.from) {
      chartStartDate = startOfDay(filterDateRange.from);
      chartEndDate = filterDateRange.to ? endOfDay(filterDateRange.to) : endOfDay(filterDateRange.from);
    } else { 
      const now = new Date();
      chartStartDate = startOfMonth(now);
      chartEndDate = endOfMonth(now);
    }
    
    const daysInInterval = eachDayOfInterval({ start: chartStartDate, end: chartEndDate });
    
    const techServices = placeholderServiceRecords.filter(
      service => service.technicianId === selectedTechnicianIdForChart
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

  }, [selectedTechnicianIdForChart, filterDateRange]);


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

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };


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
              Rendimiento Diario del Técnico Seleccionado
            </CardTitle>
            <CardDescription>
              Visualiza ingresos y ganancias diarias para el técnico y rango de fechas elegidos.
              Predeterminado al mes actual si no se selecciona un rango.
            </CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Select 
              value={selectedTechnicianIdForChart} 
              onValueChange={setSelectedTechnicianIdForChart}
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
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full sm:w-[280px] justify-start text-left font-normal",
                    !filterDateRange && "text-muted-foreground"
                  )}
                >
                  <CalendarDateIcon className="mr-2 h-4 w-4" />
                  {filterDateRange?.from ? (
                    filterDateRange.to ? (
                      <>
                        {format(filterDateRange.from, "LLL dd, y", { locale: es })} -{" "}
                        {format(filterDateRange.to, "LLL dd, y", { locale: es })}
                      </>
                    ) : (
                      format(filterDateRange.from, "LLL dd, y", { locale: es })
                    )
                  ) : (
                    <span>Seleccione rango</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={filterDateRange?.from}
                  selected={filterDateRange}
                  onSelect={setFilterDateRange}
                  numberOfMonths={2}
                  locale={es}
                />
              </PopoverContent>
            </Popover>
          </div>
        </CardHeader>
        <CardContent>
          {selectedTechnicianIdForChart && lineChartData.length > 0 ? (
            <ChartContainer config={lineChartConfig} className="min-h-[300px] w-full">
              <LineChart 
                data={lineChartData} 
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }} 
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis 
                  dataKey="dateLabel" 
                  tickLine={false} 
                  axisLine={false} 
                  tickMargin={8} 
                  interval="preserveStartEnd"
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
                                const configEntry = lineChartConfig[name as keyof typeof lineChartConfig];
                                const label = configEntry?.label || name;
                                return `${label}: $${Number(value).toLocaleString('es-MX')}`;
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
              { !selectedTechnicianIdForChart ? "Por favor, seleccione un técnico para ver su rendimiento." : 
                "No hay datos de rendimiento para el técnico y período seleccionados."}
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Resumen de Rendimiento por Técnico (Rango Seleccionado)</CardTitle>
          <CardDescription>
            Totales de ingresos y ganancias para cada técnico basados en el rango de fechas seleccionado arriba.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {aggregatedTechnicianPerformance.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {aggregatedTechnicianPerformance.map(techPerf => (
                <Card key={techPerf.technicianId} className="shadow-sm border">
                  <CardHeader className="pb-3 pt-4">
                    <CardTitle className="text-base font-medium">{techPerf.technicianName}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm pb-4">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Ingresos Totales:</span>
                      <span className="font-semibold">{formatCurrency(techPerf.totalRevenue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Ganancia Total:</span>
                      <span className="font-semibold text-green-600">{formatCurrency(techPerf.totalProfit)}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">No hay datos de rendimiento para mostrar con el filtro actual.</p>
          )}
        </CardContent>
      </Card>


      <TechniciansTable technicians={sortedTechniciansForTable} />
    </>
  );
}
    

    




