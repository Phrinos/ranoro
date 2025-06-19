
"use client";

import { useParams, useRouter } from 'next/navigation';
import { placeholderTechnicians, placeholderTechnicianMonthlyPerformance } from '@/lib/placeholder-data';
import type { Technician, TechnicianMonthlyPerformance } from '@/types';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Archive, Edit, ShieldAlert } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { TechnicianDialog } from '../components/technician-dialog';
import type { TechnicianFormValues } from '../components/technician-form';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export default function TechnicianDetailPage() {
  const params = useParams();
  const technicianId = params.id as string;
  const { toast } = useToast();
  const router = useRouter();

  const [technician, setTechnician] = useState<Technician | null | undefined>(undefined);
  const [performance, setPerformance] = useState<TechnicianMonthlyPerformance[]>([]);
  
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  useEffect(() => {
    const foundTechnician = placeholderTechnicians.find(t => t.id === technicianId);
    setTechnician(foundTechnician || null);

    if (foundTechnician) {
      const techPerformance = placeholderTechnicianMonthlyPerformance.filter(p => p.technicianId === foundTechnician.id);
      setPerformance(techPerformance);
    }
  }, [technicianId]);

  const handleSaveEditedTechnician = async (formData: TechnicianFormValues) => {
    if (!technician) return;

    const updatedTechnicianData: Partial<Technician> = {
        ...formData,
        hireDate: formData.hireDate ? new Date(formData.hireDate).toISOString().split('T')[0] : undefined,
        monthlySalary: Number(formData.monthlySalary)
    };
    
    const updatedTechnician = { ...technician, ...updatedTechnicianData } as Technician;
    setTechnician(updatedTechnician);

    const pIndex = placeholderTechnicians.findIndex(t => t.id === updatedTechnician.id);
    if (pIndex !== -1) {
      placeholderTechnicians[pIndex] = updatedTechnician;
    }

    setIsEditDialogOpen(false);
    toast({
      title: "Técnico Actualizado",
      description: `Los datos del técnico ${updatedTechnician.name} han sido actualizados.`,
    });
  };

  if (technician === undefined) {
    return <div className="container mx-auto py-8 text-center">Cargando datos del técnico...</div>;
  }

  if (!technician) {
    return (
      <div className="container mx-auto py-8 text-center">
         <ShieldAlert className="mx-auto h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold">Técnico no encontrado</h1>
        <p className="text-muted-foreground">No se pudo encontrar un técnico con el ID: {technicianId}.</p>
        <Button asChild className="mt-6">
          <Link href="/tecnicos">Volver a Técnicos</Link>
        </Button>
      </div>
    );
  }
  
  const hireDateFormatted = technician.hireDate ? format(parseISO(technician.hireDate), "dd MMMM yyyy", { locale: es }) : 'N/A';

  return (
    <div className="container mx-auto py-8">
      <PageHeader
        title={`${technician.name} - ${technician.area}`}
        description={`ID Técnico: ${technician.id}`}
      />

      <Tabs defaultValue="details" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-2 lg:w-1/3 mb-6">
          <TabsTrigger value="details" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Detalles</TabsTrigger>
          <TabsTrigger value="performance" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Rendimiento Mensual</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <div className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Datos del Técnico</CardTitle>
                <Button variant="outline" size="sm" onClick={() => setIsEditDialogOpen(true)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </Button>
              </CardHeader>
              <CardContent className="space-y-2">
                <p><strong>ID:</strong> {technician.id}</p>
                <p><strong>Nombre:</strong> {technician.name}</p>
                <p><strong>Área:</strong> {technician.area}</p>
                <p><strong>Especialidad:</strong> {technician.specialty}</p>
                <p><strong>Teléfono:</strong> {technician.contactInfo || 'N/A'}</p>
                <p><strong>Fecha de Contratación:</strong> {hireDateFormatted}</p>
                <p><strong>Sueldo Mensual:</strong> ${technician.monthlySalary ? technician.monthlySalary.toLocaleString('es-ES') : 'N/A'}</p>
                {technician.notes && (
                  <div className="pt-2">
                    <p className="font-semibold">Notas:</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{technician.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          <div className="mt-8 flex justify-start">
            <Button variant="outline">
              <Archive className="mr-2 h-4 w-4" />
              Archivar Técnico
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Rendimiento Mensual</CardTitle>
              <CardDescription>Desglose del rendimiento del técnico por mes.</CardDescription>
            </CardHeader>
            <CardContent>
              {performance.length > 0 ? (
                <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mes</TableHead>
                      <TableHead className="text-right">Nº Servicios</TableHead>
                      <TableHead className="text-right">Ingresos Generados</TableHead>
                      <TableHead className="text-right">Ganancia</TableHead>
                      <TableHead className="text-right">Penalizaciones</TableHead>
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
                <p className="text-muted-foreground">No hay historial de rendimiento para este técnico.</p>
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
