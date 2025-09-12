// src/app/(app)/flotilla/conductores/[id]/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, User, Phone, Home, AlertTriangle, FileText, DollarSign } from 'lucide-react';
import { personnelService } from '@/lib/services';
import type { Driver } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export default function FlotillaConductorProfilePage() {
  const params = useParams();
  const driverId = params.id as string;
  const router = useRouter();
  const { toast } = useToast();
  
  const [driver, setDriver] = useState<Driver | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!driverId) return;
    
    personnelService.getDriverById(driverId).then(data => {
      if (data) {
        setDriver(data);
      } else {
        toast({ title: "Error", description: "Conductor no encontrado.", variant: "destructive" });
        router.push('/flotilla/conductores');
      }
      setIsLoading(false);
    });
  }, [driverId, router, toast]);

  const handleEdit = () => {
    toast({ title: "Función en desarrollo", description: "Pronto podrás editar los datos del conductor." });
  };

  const InfoCard = ({ title, items }: { title: string; items: { icon: React.ElementType; label: string; value?: string | number | null }[] }) => (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {items.map((item, index) => (
          <div key={index} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-3">
              <item.icon className="h-5 w-5 text-muted-foreground" />
              <span>{item.label}</span>
            </div>
            <span className="font-semibold">{item.value || 'N/A'}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );

  return (
    <>
      <PageHeader
        title={isLoading ? <Skeleton className="h-8 w-1/2" /> : `Perfil de ${driver?.name}`}
        description="Información detallada del conductor."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => router.push('/flotilla/conductores')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Button>
            <Button onClick={handleEdit}>
              <Edit className="mr-2 h-4 w-4" />
              Editar
            </Button>
          </div>
        }
      />
      <div className="p-1 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {isLoading ? (
          <>
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </>
        ) : driver && (
          <>
            <InfoCard title="Información de Contacto" items={[
              { icon: User, label: "Nombre Completo", value: driver.name },
              { icon: Phone, label: "Teléfono", value: driver.phone },
              { icon: AlertTriangle, label: "Tel. Emergencia", value: driver.emergencyPhone },
              { icon: Home, label: "Dirección", value: driver.address },
            ]} />
            <InfoCard title="Información Financiera y de Contrato" items={[
              { icon: FileText, label: "Fecha de Contrato", value: driver.contractDate ? format(parseISO(driver.contractDate), "dd MMM yyyy", { locale: es }) : 'N/A' },
              { icon: DollarSign, label: "Depósito Requerido", value: formatCurrency(driver.requiredDepositAmount) },
              { icon: DollarSign, label: "Depósito Entregado", value: formatCurrency(driver.depositAmount) },
            ]} />
          </>
        )}
      </div>
    </>
  );
}
