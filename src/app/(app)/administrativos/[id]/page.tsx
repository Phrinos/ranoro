
"use client";

import { useParams, useRouter } from 'next/navigation';
import { placeholderAdministrativeStaff } from '@/lib/placeholder-data';
import type { AdministrativeStaff } from '@/types';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Archive, Edit, ShieldAlert, CalendarDays, Phone, DollarSign, StickyNote, Percent } from 'lucide-react'; // Added Percent
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AdministrativeStaffDialog } from '../components/administrative-staff-dialog';
import type { AdministrativeStaffFormValues } from '../components/administrative-staff-form';
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


export default function AdministrativeStaffDetailPage() {
  const params = useParams();
  const staffId = params.id as string;
  const { toast } = useToast();
  const router = useRouter();

  const [staffMember, setStaffMember] = useState<AdministrativeStaff | null | undefined>(undefined);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  useEffect(() => {
    const foundStaff = placeholderAdministrativeStaff.find(s => s.id === staffId);
    setStaffMember(foundStaff || null);
  }, [staffId]);

  const handleSaveEditedStaff = async (formData: AdministrativeStaffFormValues) => {
    if (!staffMember) return;

    const updatedStaffData: Partial<AdministrativeStaff> = {
        ...formData,
        hireDate: formData.hireDate ? new Date(formData.hireDate).toISOString().split('T')[0] : undefined,
        monthlySalary: Number(formData.monthlySalary) || undefined,
        commissionRate: formData.commissionRate ? Number(formData.commissionRate) : undefined,
    };
    
    const updatedStaffMember = { ...staffMember, ...updatedStaffData } as AdministrativeStaff;
    setStaffMember(updatedStaffMember);

    const pIndex = placeholderAdministrativeStaff.findIndex(s => s.id === updatedStaffMember.id);
    if (pIndex !== -1) {
      placeholderAdministrativeStaff[pIndex] = updatedStaffMember;
    }

    setIsEditDialogOpen(false);
    toast({
      title: "Staff Administrativo Actualizado",
      description: `Los datos de ${updatedStaffMember.name} han sido actualizados.`,
    });
  };

  const handleArchiveStaff = () => {
    if (!staffMember) return;
    const staffIndex = placeholderAdministrativeStaff.findIndex(s => s.id === staffMember.id);
    if (staffIndex > -1) {
      placeholderAdministrativeStaff[staffIndex].isArchived = true;
    }
    toast({
      title: "Staff Archivado",
      description: `El registro de ${staffMember.name} ha sido archivado.`,
    });
    router.push('/administrativos'); 
  };


  if (staffMember === undefined) {
    return <div className="container mx-auto py-8 text-center">Cargando datos del staff...</div>;
  }

  if (!staffMember) {
    return (
      <div className="container mx-auto py-8 text-center">
         <ShieldAlert className="mx-auto h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold">Staff Administrativo no encontrado</h1>
        <p className="text-muted-foreground">No se pudo encontrar un registro con el ID: {staffId}.</p>
        <Button asChild className="mt-6">
          <Link href="/administrativos">Volver a Staff Administrativo</Link>
        </Button>
      </div>
    );
  }
  
  const hireDateFormatted = staffMember.hireDate ? format(parseISO(staffMember.hireDate), "dd MMMM yyyy", { locale: es }) : 'N/A';

  return (
    <div className="container mx-auto py-8">
      <PageHeader
        title={`${staffMember.name} - ${staffMember.roleOrArea}`}
        description={`ID Staff: ${staffMember.id}`}
      />

        <Card className="shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Datos del Miembro del Staff Administrativo</CardTitle>
            <Button variant="outline" size="sm" onClick={() => setIsEditDialogOpen(true)}>
                <Edit className="mr-2 h-4 w-4" />
                Editar
            </Button>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                <div><strong className="text-muted-foreground">ID:</strong> {staffMember.id}</div>
                <div><strong className="text-muted-foreground">Nombre:</strong> {staffMember.name}</div>
                <div><strong className="text-muted-foreground">Rol/Área:</strong> {staffMember.roleOrArea}</div>
                <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground"/>
                    <strong className="text-muted-foreground">Teléfono:</strong> {staffMember.contactInfo || 'N/A'}
                </div>
                <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-muted-foreground"/>
                    <strong className="text-muted-foreground">Fecha de Contratación:</strong> {hireDateFormatted}
                </div>
                <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground"/>
                    <strong className="text-muted-foreground">Sueldo Mensual:</strong> ${staffMember.monthlySalary ? staffMember.monthlySalary.toLocaleString('es-ES', {minimumFractionDigits: 2}) : 'N/A'}
                </div>
                <div className="flex items-center gap-2">
                    <Percent className="h-4 w-4 text-muted-foreground"/>
                    <strong className="text-muted-foreground">Comisión:</strong> {staffMember.commissionRate !== undefined ? `${(staffMember.commissionRate * 100).toFixed(1)}%` : 'N/A'}
                </div>
                {staffMember.notes && (
                <div className="md:col-span-2 pt-2 flex items-start gap-2">
                    <StickyNote className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0"/>
                    <div>
                        <p className="font-semibold text-muted-foreground">Notas:</p>
                        <p className="text-sm text-foreground whitespace-pre-wrap">{staffMember.notes}</p>
                    </div>
                </div>
                )}
            </CardContent>
        </Card>

        <div className="mt-8 flex justify-start">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" >
                  <Archive className="mr-2 h-4 w-4" />
                  Archivar Miembro del Staff
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Estás seguro de archivar este registro de staff?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción marcará el registro de {staffMember.name} como archivado y lo ocultará de las listas principales. Podrás recuperarlo desde la vista de "Archivados".
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleArchiveStaff} className="bg-destructive hover:bg-destructive/90">
                    Sí, Archivar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

      {staffMember && (
         <AdministrativeStaffDialog
            open={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
            staffMember={staffMember}
            onSave={handleSaveEditedStaff}
          />
      )}
    </div>
  );
}

