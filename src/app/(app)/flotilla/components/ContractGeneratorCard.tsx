// src/app/(app)/flotilla/components/ContractGeneratorCard.tsx
"use client";

import React from 'react';
import type { Driver } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Edit } from 'lucide-react';

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

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle>Contrato del Conductor</CardTitle>
          <CardDescription>Genera el contrato de arrendamiento.</CardDescription>
        </div>
        <Button variant="outline" size="icon" onClick={onEdit}>
          <Edit className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="p-4 border-2 border-dashed rounded-lg text-center">
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
