// src/app/(app)/flotilla/components/ContractGeneratorCard.tsx
"use client";

import React from 'react';
import type { Driver } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Edit, DollarSign } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface ContractGeneratorCardProps {
  driver: Driver;
  onEdit: () => void;
}

export function ContractGeneratorCard({ driver, onEdit }: ContractGeneratorCardProps) {

  const handleGenerateContract = () => {
    // Lógica para generar y mostrar el contrato.
    // Por ahora, podemos mostrar una alerta.
    alert("Funcionalidad para generar contrato en desarrollo. Se necesita el contenido del documento.");
  };

  const financialInfo = [
    { icon: FileText, label: "Fecha de Contrato", value: driver.contractDate ? format(parseISO(driver.contractDate), "dd MMM yyyy", { locale: es }) : 'N/A' },
    { icon: DollarSign, label: "Depósito Requerido", value: formatCurrency(driver.requiredDepositAmount) },
    { icon: DollarSign, label: "Depósito Entregado", value: formatCurrency(driver.depositAmount) },
  ];

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
            <p className="text-sm text-muted-foreground mb-4">
                Esta sección generará un contrato de arrendamiento listo para imprimir, reemplazando automáticamente los datos del conductor y del vehículo.
            </p>
            <Button onClick={handleGenerateContract}>
                <FileText className="mr-2 h-4 w-4" />
                Generar Contrato
            </Button>
        </div>
      </CardContent>
    </Card>
  );
}
