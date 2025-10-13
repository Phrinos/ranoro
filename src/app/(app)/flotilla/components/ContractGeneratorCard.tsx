// src/app/(app)/flotilla/components/ContractGeneratorCard.tsx
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
  vehicle: Vehicle | null; // Acepta el vehículo (puede ser null)
  onEdit: () => void;
}

export function ContractGeneratorCard({ driver, vehicle, onEdit }: ContractGeneratorCardProps) {

  const financialInfo = [
    { icon: FileText, label: "Fecha de Contrato", value: driver.contractDate ? format(parseISO(driver.contractDate), "dd MMM yyyy", { locale: es }) : 'N/A' },
    { icon: DollarSign, label: "Depósito Requerido", value: formatCurrency(driver.requiredDepositAmount) },
    { icon: DollarSign, label: "Depósito Entregado", value: formatCurrency(driver.depositAmount) },
  ];

  // Construir el objeto de datos para el contrato
  const leaseData: LeaseContractInput | null = useMemo(() => {
    if (!vehicle) return null; // No generar datos si no hay vehículo

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
          <CardTitle>Contrato y Datos Financieros</CardTitle>
          <CardDescription>Información del contrato y depósitos.</CardDescription>
        </div>
        <Button variant="outline" size="icon" onClick={onEdit}>
          <Edit className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {financialInfo.map(item => (
            <div key={item.label} className="flex items-center justify-between text-sm py-2 border-b last:border-b-0">
              <div className="flex items-center gap-3">
                <item.icon className="h-5 w-5 text-muted-foreground" />
                <span className="text-muted-foreground">{item.label}</span>
              </div>
              <span className="font-semibold">{item.value || '$0.00'}</span>
            </div>
          ))}
        </div>
        <div className="p-4 border-2 border-dashed rounded-lg text-center mt-4">
            {leaseData ? (
                <>
                    <p className="text-sm text-muted-foreground mb-4">
                        El conductor y el vehículo asignado están listos. Puedes generar el contrato de arrendamiento.
                    </p>
                    <GenerateLeaseButton data={leaseData} />
                </>
            ) : (
                <div className='text-center'>
                    <AlertCircle className="mx-auto h-8 w-8 text-amber-500 mb-2" />
                    <p className="text-sm text-amber-600 font-semibold">
                        Se requiere un vehículo asignado para generar el contrato.
                    </p>
                </div>
            )}
        </div>
      </CardContent>
    </Card>
  );
}
