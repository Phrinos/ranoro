

"use client";

import { useParams, useRouter } from 'next/navigation';
import type { AdministrativeStaff } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Archive, Edit, ShieldAlert, CalendarDays, Phone, DollarSign, StickyNote, Percent, ArrowLeft } from 'lucide-react';
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
import { personnelService } from '@/lib/services';
import { Loader2 } from 'lucide-react';


export default function AdministrativeStaffDetailPage() {
  const params = useParams();
  const { toast } = useToast();
  const router = useRouter();
  
  const [staffMember, setStaffMember] = useState<AdministrativeStaff | null | undefined>(undefined);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const staffId = params.id as string; 

  useEffect(() => {
    const fetchStaff = async () => {
        const staff = await personnelService.getAdminStaffById(staffId);
        setStaffMember(staff || null);
    };
    fetchStaff();
  }, [staffId]);

  const handleSaveEditedStaff = async (formData: AdministrativeStaffFormValues) => {
    if (!staffMember) return;
    try {
        const updatedStaffMember = await personnelService.saveAdminStaff(formData, staffMember.id);
        setStaffMember(updatedStaffMember);
        setIsEditDialogOpen(false);
        toast({ title: "Staff Administrativo Actualizado" });
    } catch (e) {
        toast({ title: "Error al actualizar", variant: "destructive" });
    }
  };

  const handleArchiveStaff = async () => {
    if (!staffMember) return;
    try {
      await personnelService.archiveAdminStaff(staffMember.id, true);
      toast({ title: "Staff Archivado" });
      router.push('/personal?tab=administrativos'); 
    } catch (e) {
      toast({ title: "Error al archivar", variant: "destructive" });
    }
  };


  if (staffMember === undefined) {
    return <div className="container mx-auto py-8 text-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (!staffMember) {
    return (
      <div className="container mx-auto py-8 text-center">
         <ShieldAlert className="mx-auto h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold">Staff Administrativo no encontrado</h1>
        <Button asChild className="mt-6">
          <Link href="/personal?tab=administrativos">Volver a Staff Administrativo</Link>
        </Button>
      </div>
    );
  }
  
  const hireDateFormatted = staffMember.hireDate ? format(parseISO(staffMember.hireDate), "dd MMMM yyyy", { locale: es }) : 'N/A';

  return (
    <div className="container mx-auto py-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>{staffMember.name} - {staffMember.roleOrArea}</CardTitle>
          <CardDescription>ID Staff: {staffMember.id}</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 text-sm">
            <div className="flex flex-col space-y-1 md:col-span-2">
                <p className="text-sm font-medium text-muted-foreground">Nombre Completo</p>
                <p className="text-base font-semibold">{staffMember.name}</p>
            </div>
            <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Rol o Área</p>
                <p className="text-base font-semibold">{staffMember.roleOrArea}</p>
            </div>
            
            <div /> {/* Placeholder to ensure grid alignment */}

            <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-muted-foreground mt-1" />
                <div className="flex flex-col">
                    <p className="text-sm font-medium text-muted-foreground">Teléfono</p>
                    <p className="text-base font-semibold">{staffMember.contactInfo || 'N/A'}</p>
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
                    <p className="text-base font-semibold">${staffMember.monthlySalary ? staffMember.monthlySalary.toLocaleString('es-ES', {minimumFractionDigits: 2}) : 'N/A'}</p>
                </div>
            </div>
            <div className="flex items-start gap-3">
                <Percent className="h-5 w-5 text-muted-foreground mt-1" />
                <div className="flex flex-col">
                    <p className="text-sm font-medium text-muted-foreground">Tasa de Comisión</p>
                    <p className="text-base font-semibold">{staffMember.commissionRate !== undefined ? `${(staffMember.commissionRate * 100).toFixed(1)}%` : 'N/A'}</p>
                </div>
            </div>

            {staffMember.notes && (
            <div className="md:col-span-2 pt-4 flex items-start gap-3">
                <StickyNote className="h-5 w-5 text-muted-foreground mt-1 shrink-0"/>
                <div className="flex flex-col">
                    <p className="text-sm font-medium text-muted-foreground">Notas Adicionales</p>
                    <p className="text-base text-foreground whitespace-pre-wrap">{staffMember.notes}</p>
                </div>
            </div>
            )}
        </CardContent>
      </Card>

      <div className="mt-8 flex items-center justify-between">
        <Button variant="outline" className="bg-white text-black hover:bg-gray-100" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
        </Button>
        <div className="flex gap-2">
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
                      Esta acción marcará el registro de {staffMember.name} como archivado y lo ocultará de las listas principales. Podrás recuperarlo desde la vista de &quot;Archivados&quot;.
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
            <Button variant="outline" onClick={() => setIsEditDialogOpen(true)}>
            <Edit className="mr-2 h-4 w-4" />
            Editar
            </Button>
        </div>
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
