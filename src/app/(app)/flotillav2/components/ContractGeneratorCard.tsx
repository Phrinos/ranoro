"use client";

import React, { useMemo } from 'react';
import type { Driver, Vehicle } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Edit, DollarSign, AlertCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

import GenerateLeaseButton from '@/components/contracts/GenerateLeaseButton';
import type { LeaseContractInput } from '@/lib/contracts/types';

interface ContractGeneratorCardProps {
  driver: Driver;
  vehicle: Vehicle | null;
  onEdit: () => void;
}

export function ContractGeneratorCard({ driver, vehicle, onEdit }: ContractGeneratorCardProps) {
  const leaseData: LeaseContractInput | null = useMemo(() => {
    if (!vehicle) return null;

    return {
      signDate: new Date(),
      startDate: driver.contractDate ? parseISO(driver.contractDate) : new Date(),
      endDate: null, 
      dailyRate: vehicle.dailyRentalCost ?? 0,
      deposit: driver.requiredDepositAmount ?? 0,
      place: "Aguascalientes, Aguascalientes",
      lessor: {
        companyName: "GRUPO CASA DE NOBLES VALDELAMAR S.A. DE C.V.",
        name: "Arturo Federico Ángel Mojica Valdelamar",
        address: "Avenida Convención de 1914 No 1421, Col. Jardines de la Convención, C.P. 20267, Aguascalientes, Aguascalientes, México.",
        phone: "4491425323",
        representativeName: "Arturo Federico Ángel Mojica Valdelamar",
        representativeTitle: "Representante Legal / Administrador Único",
      },
      lessee: {
        name: driver.name ?? "",
        address: driver.address ?? "",
        phone: driver.phone ?? "",
      },
      vehicle: {
        make: vehicle.make ?? "NO ESPECIFICADO",
        model: vehicle.model ?? "NO ESPECIFICADO",
        year: vehicle.year ?? new Date().getFullYear(),
        color: vehicle.color ?? "NO ESPECIFICADO",
        plates: vehicle.licensePlate ?? "SIN PLACAS",
        vin: vehicle.vin ?? "NO ESPECIFICADO",
        engine: (vehicle as any).engine ?? "NO ESPECIFICADO",
      },
    };
  }, [driver, vehicle]);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle>Contrato</CardTitle>
          <CardDescription>Generación de documentos legales.</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {leaseData ? (
            <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                    El sistema está listo para generar el contrato de arrendamiento vinculando a <strong>{driver.name}</strong> con la unidad <strong>{vehicle?.licensePlate}</strong>.
                </p>
                <GenerateLeaseButton data={leaseData} />
            </div>
        ) : (
            <div className='flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800'>
                <AlertCircle className="h-5 w-5" />
                <p className="text-sm font-medium">Asigna un vehículo para habilitar la generación del contrato.</p>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
