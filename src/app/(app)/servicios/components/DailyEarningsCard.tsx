
"use client";

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DollarSign } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { isToday, parseISO, isValid } from 'date-fns';
import type { ServiceRecord } from '@/types';
import { parseDate } from '@/lib/forms';

interface DailyEarningsCardProps {
  services: ServiceRecord[];
}

export function DailyEarningsCard({ services }: DailyEarningsCardProps) {
  const totalEarningsToday = useMemo(() => {
    return services.reduce((total, service) => {
      if (service.status === 'Entregado') {
        const deliveryDate = parseDate(service.deliveryDateTime);
        if (deliveryDate && isValid(deliveryDate) && isToday(deliveryDate)) {
          return total + (service.totalCost || 0);
        }
      }
      return total;
    }, 0);
  }, [services]);

  return (
    <Card className="mb-6">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Ingresos del Día</CardTitle>
        <DollarSign className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatCurrency(totalEarningsToday)}</div>
        <p className="text-xs text-muted-foreground">Total de servicios entregados hoy.</p>
      </CardContent>
    </Card>
  );
}
