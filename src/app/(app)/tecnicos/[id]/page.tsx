

"use client";

import { useParams, useRouter } from 'next/navigation';
import type { Technician, TechnicianMonthlyPerformance } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Archive, Edit, ShieldAlert, User, Phone, CalendarDays, DollarSign, Percent, StickyNote, ArrowLeft, BarChart3, Loader2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { TechnicianDialog } from '../components/technician-dialog';
import type { TechnicianFormValues } from '../components/technician-form';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { personnelService } from '@/lib/services';
import { placeholderTechnicianMonthlyPerformance } from '@/lib/placeholder-data'; // Keep for now

export default function TechnicianDetailPage() {
  const params = useParams();
  const technicianId = params.id as string;
  const { toast } = useToast();
  const router = useRouter();

  const [technician, setTechnician] = useState<Technician | null | undefined>(undefined);
  const [performance, setPerformance] = useState<TechnicianMonthlyPerformance[]>([]);
  
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  useEffect(() => {
    const fetchTechnician = async () => {
        const tech = await personnelService.getTechnicianById(technicianId);
        setTechnician(tech || null);
        if (tech) {
            // TODO: Fetch real performance data when available
            const techPerformance = placeholderTechnicianMonthlyPerformance.filter(p => p.technicianId === tech.id);
            setPerformance(techPerformance);
        }
    };
    fetchTechnician();
  }, [technicianId]);

  const handleSaveEditedTechnician = async (formData: TechnicianFormValues) => {
    if (!technician) return;
    try {
        const updatedTechnician = await personnelService.saveTechnician(formData, technician.id);
        setTechnician(updatedTechnician);
        setIsEditDialogOpen(false);
        toast({ title: "Staff Técnico Actualizado" });
    } catch(e) {
        toast({ title: "Error al actualizar", variant: "destructive" });
    }
  };

  const handleArchiveTechnician = async () => {
    if (!technician) return;
    try {
        await personnelService.archiveTechnician(technician.id, true);
        toast({ title: "Staff Archivado" });
        router.push('/personal?tab=tecnicos');
    } catch(e) {
        toast({ title: "Error al archivar", variant: "destructive" });
    }
  };

  if (technician === undefined) {
    return <div className="container mx-auto py-8 text-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (!technician) {
    return (
      <div className="container mx-auto py-8 text-center">
         <ShieldAlert className="mx-auto h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold">Miembro del Staff Técnico no encontrado</h1>
        <Button asChild className="mt-6">
          <Link href="/personal?tab=tecnicos">Volver a Staff Técnico</Link>
        </Button>
      </div>
    );
  }
  
  const hireDateFormatted = technician.hireDate ? format(parseISO(technician.hireDate), "dd MMMM yyyy", { locale: es }) : 'N/A';

  return (
    <div className="container mx-auto py-8">
      <Tabs defaultValue="details" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-2 lg:w-1/3 mb-6">
          <TabsTrigger value="details" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Detalles</TabsTrigger>
          <TabsTrigger value="performance" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Rendimiento Mensual</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{technician.name} - {technician.area}</CardTitle>
                <CardDescription>ID Staff: {technician.id}</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 text-sm">
                <div className="flex flex-col space-y-1 md:col-span-2">
                    <p className="text-sm font-medium text-muted-foreground">Nombre Completo</p>
                    <p className="text-base font-semibold">{technician.name}</p>
                </div>
                <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Área de Trabajo</p>
                    <p className="text-base font-semibold">{technician.area}</p>
                </div>
                <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Especialidad</p>
                    <p className="text-base font-semibold">{technician.specialty}</p>
                </div>

                <div className="flex items-start gap-3">
                    <Phone className="h-5 w-5 text-muted-foreground mt-1" />
                    <div className="flex flex-col">
                        <p className="text-sm font-medium text-muted-foreground">Teléfono</p>
                        <p className="text-base font-semibold">{technician.contactInfo || 'N/A'}</p>
                    </div>
                </div>
                <div className="flex items-start gap-3">
                    <CalendarDays className="h-5 w-5 text-muted-foreground mt-1" />
                    <div className="flex flex-col">
                        <p className="text-sm font-medium text-muted-foreground">Fecha de Contratación</p>
                        <p className="text-base font-semibold">{hireDateFormatted}</p>
                    </div>
                </div>
                <div className="flex items-start gap-3">
                    <DollarSign className="h-5 w-5 text-muted-foreground mt-1" />
                    <div className="flex flex-col">
                        <p className="text-sm font-medium text-muted-foreground">Sueldo Mensual</p>
                        <p className="text-base font-semibold">${technician.monthlySalary ? technician.monthlySalary.toLocaleString('es-ES', {minimumFractionDigits: 2}) : 'N/A'}</p>
                    </div>
                </div>
                <div className="flex items-start gap-3">
                    <Percent className="h-5 w-5 text-muted-foreground mt-1" />
                    <div className="flex flex-col">
                        <p className="text-sm font-medium text-muted-foreground">Tasa de Comisión</p>
                        <p className="text-base font-semibold">{technician.commissionRate !== undefined ? `${(technician.commissionRate * 100).toFixed(1)}%` : 'N/A'}</p>
                    </div>
                </div>
                {technician.notes && (
                  <div className="md:col-span-2 pt-4 flex items-start gap-3">
                    <StickyNote className="h-5 w-5 text-muted-foreground mt-1 shrink-0"/>
                    <div className="flex flex-col">
                        <p className="text-sm font-medium text-muted-foreground">Notas Adicionales</p>
                        <p className="text-base text-foreground whitespace-pre-wrap">{technician.notes}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          <div className="mt-8 flex items-center justify-between">
            <Button variant="outline" className="bg-white text-black hover:bg-gray-100" onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver
            </Button>
            <div className="flex gap-2">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">
                      <Archive className="mr-2 h-4 w-4" />
                      Archivar Miembro del Staff
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Estás seguro de archivar este registro de staff?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta acción marcará el registro de {technician.name} como archivado y lo ocultará de las listas principales. Podrás recuperarlo desde la vista de "Archivados".
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleArchiveTechnician} className="bg-destructive hover:bg-destructive/90">
                        Sí, Archivar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <Button variant="outline" onClick={() => setIsEditDialogOpen(true)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Editar
                </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Rendimiento Mensual</CardTitle>
              <CardDescription>Desglose del rendimiento del miembro del staff técnico por mes.</CardDescription>
            </CardHeader>
            <CardContent>
              {performance.length > 0 ? (
                <div className="rounded-md border">
                <Table>
                  <TableHeader className="bg-black">
                    <TableRow>
                      <TableHead className="text-white">Mes</TableHead>
                      <TableHead className="text-right text-white">Nº Servicios</TableHead>
                      <TableHead className="text-right text-white">Ingresos Generados</TableHead>
                      <TableHead className="text-right text-white">Ganancia</TableHead>
                      <TableHead className="text-right text-white">Penalizaciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {performance.map(perf => (
                      <TableRow key={perf.id} >
                        <TableCell>{perf.monthYear}</TableCell>
                        <TableCell className="text-right">{perf.servicesCount}</TableCell>
                        <TableCell className="text-right">${perf.revenueGenerated.toLocaleString('es-ES')}</TableCell>
                        <TableCell className="text-right">${perf.earnings.toLocaleString('es-ES')}</TableCell>
                        <TableCell className="text-right">${perf.penalties.toLocaleString('es-ES')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                    <BarChart3 className="h-12 w-12 mb-2" />
                    <h3 className="text-lg font-semibold text-foreground">Sin Historial de Rendimiento</h3>
                    <p className="text-sm">No se ha registrado rendimiento para este técnico.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      {technician && (
         <TechnicianDialog
            open={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
            technician={technician}
            onSave={handleSaveEditedTechnician}
          />
      )}
    </div>
  );
}
