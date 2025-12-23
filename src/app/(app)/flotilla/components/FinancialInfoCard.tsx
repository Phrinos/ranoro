// src/app/(app)/flotilla/components/FinancialInfoCard.tsx
"use client";

import React from 'react';
import type { Driver } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, DollarSign, Edit } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { parseDate } from '@/lib/forms';


interface FinancialInfoCardProps {
  driver: Driver;
  onEdit: () => void;
}

export function FinancialInfoCard({ driver, onEdit }: FinancialInfoCardProps) {
  const contractDate = parseDate(driver.contractDate);

  const financialInfo = [
    { icon: FileText, label: "Fecha de Contrato", value: contractDate && isValid(contractDate) ? format(contractDate, "dd MMM yyyy", { locale: es }) : 'N/A' },
    { icon: DollarSign, label: "Depósito Requerido", value: formatCurrency(driver.requiredDepositAmount) },
    { icon: DollarSign, label: "Depósito Entregado", value: formatCurrency(driver.depositAmount) },
  ];

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle>Información Financiera y Contrato</CardTitle>
          <CardDescription>Detalles del acuerdo y estado financiero.</CardDescription>
        </div>
        <Button variant="outline" size="icon" onClick={onEdit}>
          <Edit className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {financialInfo.map(item => (
          <div key={item.label} className="flex items-center justify-between text-sm py-2 border-b last:border-b-0">
            <div className="flex items-center gap-3">
              <item.icon className="h-5 w-5 text-muted-foreground" />
              <span className="text-muted-foreground">{item.label}</span>
            </div>
            <span className="font-semibold">{item.value || '$0.00'}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
