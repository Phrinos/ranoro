// src/app/(app)/flotilla/components/FinancialInfoCard.tsx
"use client";

import React from 'react';
import type { Driver, Vehicle } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FileText, DollarSign, Car } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';

interface FinancialInfoCardProps {
  driver: Driver;
}

export function FinancialInfoCard({ driver }: FinancialInfoCardProps) {
  const financialInfo = [
    { icon: FileText, label: "Fecha de Contrato", value: driver.contractDate ? format(parseISO(driver.contractDate), "dd MMM yyyy", { locale: es }) : 'N/A' },
    { icon: DollarSign, label: "Depósito Requerido", value: formatCurrency(driver.requiredDepositAmount) },
    { icon: DollarSign, label: "Depósito Entregado", value: formatCurrency(driver.depositAmount) },
  ];

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Información Financiera y Contrato</CardTitle>
        <CardDescription>Detalles del acuerdo y estado financiero.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          {financialInfo.map(item => (
            <div key={item.label} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-3">
                <item.icon className="h-5 w-5 text-muted-foreground" />
                <span className="text-muted-foreground">{item.label}</span>
              </div>
              <span className="font-semibold">{item.value || '$0.00'}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
