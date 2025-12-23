// src/app/(app)/flotilla/components/FineCheckCard.tsx
"use client";

import React from 'react';
import type { Vehicle, FineCheck } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Eye, AlertCircle, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const toTime = (d?: string | Date) => (d ? new Date(d).getTime() : 0);

interface FineCheckCardProps {
  vehicle: Vehicle;
  onAdd: () => void;
  onView: (fineCheck: FineCheck) => void;
}

export function FineCheckCard({ vehicle, onAdd, onView }: FineCheckCardProps) {
  const sortedChecks = (vehicle.fineChecks || []).sort((a, b) => toTime(b.checkDate) - toTime(a.checkDate));

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle>Revisión de Multas</CardTitle>
          <CardDescription>Historial de revisiones de multas.</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={onAdd}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Nueva Revisión
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sortedChecks.length > 0 ? (
            sortedChecks.slice(0, 5).map(item => (
              <div key={item.id} className="flex items-center justify-between p-2 rounded-md border cursor-pointer hover:bg-muted/50" onClick={() => onView(item)}>
                <div className="flex items-center gap-3">
                  {item.hasFines ? <AlertCircle className="h-5 w-5 text-destructive" /> : <CheckCircle className="h-5 w-5 text-green-600" />}
                  <div>
                    <p className="font-semibold text-sm">
                      Revisión del {item.checkDate ? format(new Date(item.checkDate), "dd MMM yyyy", { locale: es }) : "Sin fecha"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.hasFines ? `${item.fines?.length || 0} multa(s) encontrada(s)` : 'Sin multas'}
                    </p>
                  </div>
                </div>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No hay revisiones de multas.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
