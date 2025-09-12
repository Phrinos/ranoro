// src/app/(app)/flotilla/components/PaperworkCard.tsx
"use client";

import React, { useState } from 'react';
import type { Vehicle, Paperwork } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Edit, Trash2, Calendar } from 'lucide-react';
import { format, isPast } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface PaperworkCardProps {
  vehicle: Vehicle;
  onAdd: () => void;
  onEdit: (paperwork: Paperwork) => void;
  onDelete: (paperworkId: string) => void;
}

export function PaperworkCard({ vehicle, onAdd, onEdit, onDelete }: PaperworkCardProps) {
  const sortedPaperwork = (vehicle.paperwork || []).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle>Trámites Pendientes</CardTitle>
          <CardDescription>Vencimientos y recordatorios importantes.</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={onAdd}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Añadir Trámite
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sortedPaperwork.length > 0 ? (
            sortedPaperwork.map(item => (
              <div key={item.id} className="flex items-center justify-between p-2 rounded-md border">
                <div className="flex items-center gap-3">
                   <Calendar className={cn("h-5 w-5", isPast(new Date(item.dueDate)) ? "text-destructive" : "text-muted-foreground")} />
                   <div>
                     <p className="font-semibold text-sm">{item.name}</p>
                     <p className={cn("text-xs", isPast(new Date(item.dueDate)) ? "text-destructive" : "text-muted-foreground")}>
                       Vence: {format(new Date(item.dueDate), "dd MMM yyyy", { locale: es })}
                     </p>
                   </div>
                </div>
                <div className="flex items-center gap-1">
                   <Button variant="ghost" size="icon" onClick={() => onEdit(item)}><Edit className="h-4 w-4" /></Button>
                   <Button variant="ghost" size="icon" className="text-destructive" onClick={() => onDelete(item.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No hay trámites pendientes.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
