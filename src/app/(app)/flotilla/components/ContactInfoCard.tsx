// src/app/(app)/flotilla/components/ContactInfoCard.tsx
"use client";

import React from 'react';
import type { Driver } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Phone, Home, AlertTriangle, Edit } from 'lucide-react';

interface ContactInfoCardProps {
  driver: Driver;
  onEdit?: () => void;
}

export function ContactInfoCard({ driver, onEdit }: ContactInfoCardProps) {
  const contactInfo = [
    { icon: User, label: "Nombre Completo", value: driver.name },
    { icon: Phone, label: "Teléfono", value: driver.phone },
    { icon: AlertTriangle, label: "Tel. Emergencia", value: driver.emergencyPhone },
    { icon: Home, label: "Dirección", value: driver.address },
  ];

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle>Información de Contacto</CardTitle>
          <CardDescription>Datos personales del conductor.</CardDescription>
        </div>
        {onEdit && (
          <Button variant="outline" size="icon" onClick={onEdit}>
            <Edit className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {contactInfo.map(item => (
          <div key={item.label} className="flex items-start justify-between text-sm">
            <div className="flex items-center gap-3">
              <item.icon className="h-5 w-5 text-muted-foreground" />
              <span className="text-muted-foreground">{item.label}</span>
            </div>
            <span className="font-semibold text-right">{item.value || 'N/A'}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
