

"use client";

import { useState, useMemo, useEffect, useCallback, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusCircle, UserCheck, UserX, Search } from "lucide-react";
import { PersonnelTable } from "./personnel-table";
import { PersonnelDialog } from "./personnel-dialog";
import type { User, Technician, ServiceRecord, AdministrativeStaff, SaleReceipt, MonthlyFixedExpense, Personnel, AppRole } from '@/types';
import type { PersonnelFormValues } from "./personnel-form";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency } from "@/lib/utils";
import { Loader2, DollarSign as DollarSignIcon, CalendarIcon as CalendarDateIcon, BadgeCent, Edit, User as UserIcon, TrendingDown, DollarSign, AlertCircle, ArrowUpCircle, ArrowDownCircle, Coins, BarChart2, Wallet, Wrench, Landmark, LayoutGrid, CalendarDays, FileText, Receipt, Package, Truck, Settings, Shield, LineChart, Printer, Copy, MessageSquare, ChevronRight, ListFilter, Badge } from 'lucide-react';
import Link from 'next/link';
import type { DateRange } from 'react-day-picker';
import { personnelService, operationsService, inventoryService, adminService } from '@/lib/services';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, startOfDay, endOfDay, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';


export function PersonalPageComponent({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const { toast } = useToast();
  const defaultTab = searchParams?.tab as string || 'personal';
  const [activeTab, setActiveTab] = useState(defaultTab);
  
  const [allPersonnel, setAllPersonnel] = useState<Personnel[]>([]);
  const [appRoles, setAppRoles] = useState<AppRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  
  const [isPersonnelDialogOpen, setIsPersonnelDialogOpen] = useState(false);
  const [editingPersonnel, setEditingPersonnel] = useState<Personnel | null>(null);


  useEffect(() => {
    setIsLoading(true);
    const unsubs: (() => void)[] = [
      personnelService.onPersonnelUpdate((data) => {
          setAllPersonnel(data);
          setIsLoading(false);
      }),
      adminService.onRolesUpdate(setAppRoles)
    ];

    return () => unsubs.forEach(unsub => unsub());
  }, []);

  const handleOpenDialog = (personnel?: Personnel | null) => {
    setEditingPersonnel(personnel || null);
    setIsPersonnelDialogOpen(true);
  };
  
  const handleSavePersonnel = async (data: PersonnelFormValues, id?: string) => {
    try {
      await personnelService.savePersonnel(data, id);
      toast({ title: `Personal ${id ? 'actualizado' : 'creado'} con éxito.` });
      setIsPersonnelDialogOpen(false);
    } catch (e) {
      console.error(e);
      toast({ title: "Error al guardar", variant: "destructive" });
    }
  };
  
  const handleArchivePersonnel = async (personnel: Personnel) => {
    try {
        await personnelService.archivePersonnel(personnel.id, !personnel.isArchived);
        toast({ title: `Personal ${!personnel.isArchived ? 'archivado' : 'restaurado'}.` });
    } catch(e) {
        toast({title: "Error al archivar", variant: "destructive"});
    }
  };

  const filteredPersonnel = useMemo(() => {
    let items = allPersonnel.filter(p => showArchived ? !!p.isArchived : !p.isArchived);
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      items = items.filter(p => 
          p.name.toLowerCase().includes(lowerSearch) || 
          p.roles.some(r => r.toLowerCase().includes(lowerSearch))
      );
    }
    return items.sort((a,b) => a.name.localeCompare(b.name));
  }, [allPersonnel, showArchived, searchTerm]);

  if (isLoading) { return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>; }
  
  return (
    <>
      <div className="bg-primary text-primary-foreground rounded-lg p-6 mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Personal</h1>
          <p className="text-primary-foreground/80 mt-1">Administra la información, roles y rendimiento de todo tu personal.</p>
      </div>

      <Card>
        <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <CardTitle>Lista de Personal</CardTitle>
                  <CardDescription>Visualiza y gestiona a todo el personal del taller.</CardDescription>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Button className="w-full sm:w-auto" onClick={() => handleOpenDialog()}><PlusCircle className="mr-2 h-4 w-4" />Nuevo Personal</Button>
                </div>
            </div>
              <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-2 w-full">
              <div className="relative flex-1 sm:flex-initial w-full sm:w-auto">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input type="search" placeholder="Buscar por nombre o rol..." className="pl-8 w-full sm:w-[250px] lg:w-[300px] bg-background" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
              <Button variant="outline" className="w-full sm:w-auto bg-background" onClick={() => setShowArchived(!showArchived)}>
                {showArchived ? <UserCheck className="mr-2 h-4 w-4" /> : <UserX className="mr-2 h-4 w-4" />}
                {showArchived ? "Ver Activos" : "Ver Archivados"}
              </Button>
              </div>
        </CardHeader>
        <CardContent>
          <PersonnelTable 
            personnel={filteredPersonnel}
            onEdit={handleOpenDialog}
            onArchive={handleArchivePersonnel}
          />
        </CardContent>
      </Card>
      
      <PersonnelDialog
        open={isPersonnelDialogOpen}
        onOpenChange={setIsPersonnelDialogOpen}
        personnel={editingPersonnel}
        onSave={handleSavePersonnel}
        appRoles={appRoles.filter(r => r.name !== 'Superadministrador')}
      />
    </>
  );
}
