
"use client";

import { useState, useMemo, useEffect } from 'react';
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { PlusCircle, ListFilter, Search, Users, DollarSign } from "lucide-react";
import { AdministrativeStaffTable } from "./components/administrative-staff-table";
import { AdministrativeStaffDialog } from "./components/administrative-staff-dialog";
import { placeholderAdministrativeStaff } from "@/lib/placeholder-data";
import type { AdministrativeStaff } from "@/types";
import type { AdministrativeStaffFormValues } from "./components/administrative-staff-form";
import { useToast } from "@/hooks/use-toast";
import { parseISO, compareAsc, compareDesc } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type StaffSortOption = 
  | "name_asc" | "name_desc"
  | "role_asc" | "role_desc"
  | "hireDate_asc" | "hireDate_desc"
  | "salary_asc" | "salary_desc";

export default function AdministrativosPage() {
  const { toast } = useToast();
  const [staffList, setStaffList] = useState<AdministrativeStaff[]>(placeholderAdministrativeStaff);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState<StaffSortOption>("name_asc");
  
  const handleSaveStaff = async (data: AdministrativeStaffFormValues) => {
    const newStaffMember: AdministrativeStaff = {
      id: `ADM${String(staffList.length + 1).padStart(3, '0')}${Date.now().toString().slice(-3)}`, 
      ...data,
      hireDate: data.hireDate ? new Date(data.hireDate).toISOString().split('T')[0] : undefined,
      monthlySalary: Number(data.monthlySalary) || undefined,
    };
    const updatedStaffList = [...staffList, newStaffMember];
    setStaffList(updatedStaffList);
    placeholderAdministrativeStaff.push(newStaffMember);
    toast({
        title: "Staff Creado",
        description: `${newStaffMember.name} ha sido agregado al staff administrativo.`,
    });
  };
  
  const filteredAndSortedStaff = useMemo(() => {
    let itemsToDisplay = [...staffList];
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      itemsToDisplay = itemsToDisplay.filter(staff =>
        staff.name.toLowerCase().includes(lowerSearchTerm) ||
        staff.roleOrArea.toLowerCase().includes(lowerSearchTerm) ||
        (staff.contactInfo && staff.contactInfo.toLowerCase().includes(lowerSearchTerm))
      );
    }
    
    itemsToDisplay.sort((a, b) => {
      switch (sortOption) {
        case 'name_asc': return a.name.localeCompare(b.name);
        case 'name_desc': return b.name.localeCompare(a.name);
        case 'role_asc': return a.roleOrArea.localeCompare(b.roleOrArea);
        case 'role_desc': return b.roleOrArea.localeCompare(a.roleOrArea);
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
  }, [staffList, searchTerm, sortOption]);

  const totalAdministrativeStaff = useMemo(() => staffList.length, [staffList]);
  const totalMonthlyAdministrativeSalaries = useMemo(() => {
    return staffList.reduce((sum, staff) => sum + (staff.monthlySalary || 0), 0);
  }, [staffList]);

  return (
    <>
      <PageHeader
        title="Staff Administrativo"
        description="Gestiona los perfiles del staff administrativo y sus roles."
      />

      <div className="mb-6 grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Staff Administrativo
            </CardTitle>
            <Users className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">{totalAdministrativeStaff}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Costo Total de Nómina Admin. (Mensual)
            </CardTitle>
            <DollarSign className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">${totalMonthlyAdministrativeSalaries.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</div>
          </CardContent>
        </Card>
      </div>


      <div className="mb-4 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="relative flex-1 w-full sm:w-auto">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
                type="search"
                placeholder="Buscar por nombre, rol..."
                className="pl-8 w-full sm:w-[300px]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
            <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex-1 sm:flex-initial">
                <ListFilter className="mr-2 h-4 w-4" />
                Ordenar
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>Ordenar por</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={sortOption} onValueChange={(value) => setSortOption(value as StaffSortOption)}>
                <DropdownMenuRadioItem value="name_asc">Nombre (A-Z)</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="name_desc">Nombre (Z-A)</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="role_asc">Rol/Área (A-Z)</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="role_desc">Rol/Área (Z-A)</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="hireDate_asc">Fecha Contratación (Antiguo a Nuevo)</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="hireDate_desc">Fecha Contratación (Nuevo a Antiguo)</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="salary_asc">Sueldo (Menor a Mayor)</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="salary_desc">Sueldo (Mayor a Menor)</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
            </DropdownMenuContent>
            </DropdownMenu>
            <AdministrativeStaffDialog
            trigger={
                <Button className="flex-1 sm:flex-initial">
                <PlusCircle className="mr-2 h-4 w-4" />
                Nuevo Staff Administrativo
                </Button>
            }
            onSave={handleSaveStaff}
            />
        </div>
      </div>

      <AdministrativeStaffTable staffList={filteredAndSortedStaff} />
    </>
  );
}
