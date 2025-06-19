
"use client";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PlusCircle, ListFilter } from "lucide-react";
import { TechniciansTable } from "./components/technicians-table";
import { TechnicianDialog } from "./components/technician-dialog";
import { placeholderTechnicians } from "@/lib/placeholder-data";
import type { Technician } from "@/types";
import { useState, useMemo } from "react";
import type { TechnicianFormValues } from "./components/technician-form";
import { parseISO, compareAsc, compareDesc } from 'date-fns';

type TechnicianSortOption = 
  | "name_asc" | "name_desc"
  | "area_asc" | "area_desc"
  | "hireDate_asc" | "hireDate_desc"
  | "salary_asc" | "salary_desc";

export default function TecnicosPage() {
  const [technicians, setTechnicians] = useState<Technician[]>(placeholderTechnicians);
  const [sortOption, setSortOption] = useState<TechnicianSortOption>("name_asc");

  const handleSaveTechnician = async (data: TechnicianFormValues) => {
    const newTechnician: Technician = {
      id: `T${String(technicians.length + 1).padStart(3, '0')}`, 
      ...data,
      hireDate: data.hireDate ? new Date(data.hireDate).toISOString().split('T')[0] : undefined,
      monthlySalary: Number(data.monthlySalary)
    };
    setTechnicians(prev => [...prev, newTechnician]);
    placeholderTechnicians.push(newTechnician);
  };

  const sortedTechnicians = useMemo(() => {
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
                  Ordenar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Ordenar por</DropdownMenuLabel>
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
      <TechniciansTable technicians={sortedTechnicians} />
    </>
  );
}

    