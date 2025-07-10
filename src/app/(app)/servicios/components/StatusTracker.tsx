
"use client";

import React from 'react';
import type { ServiceRecord } from '@/types';
import { cn } from '@/lib/utils';

interface StatusTrackerProps {
  status: ServiceRecord['status'] | 'Cotizacion';
}

export const StatusTracker = ({ status }: StatusTrackerProps) => {
  const states = [
    { id: 'COTI', label: 'Cotización', statuses: ['Cotizacion'] },
    { id: 'AGEN', label: 'Agendado', statuses: ['Agendado'] },
    { id: 'SERV', label: 'En Taller', statuses: ['En Taller'] },
    { id: 'COMP', label: 'Entregado', statuses: ['Entregado'] },
  ];

  const getRank = (s: string) => {
    if (s === 'Cotizacion') return 0;
    if (s === 'Agendado') return 1;
    if (s === 'En Taller') return 2;
    if (s === 'Entregado') return 3;
    return -1; // For cancelled or other states
  };

  const currentRank = getRank(status);

  return (
    <div className="flex items-center justify-center space-x-1 my-1 w-full">
      {states.map((state, index) => {
        const isActive = currentRank >= index;

        return (
          <React.Fragment key={state.id}>
            {index > 0 && (
              <div className={cn("h-0.5 w-2 flex-grow rounded-full", isActive ? "bg-green-500" : "bg-muted")} />
            )}
            <div
              title={state.label}
              className={cn(
                "flex h-6 w-8 items-center justify-center rounded-md border text-[10px] font-bold transition-colors",
                isActive
                  ? "border-green-500 bg-green-500/10 text-green-600"
                  : "border-muted-foreground/20 bg-muted/50 text-muted-foreground/60"
              )}
            >
              {state.id}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};
