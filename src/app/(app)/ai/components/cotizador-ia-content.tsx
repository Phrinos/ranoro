
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function CotizadorIaContent() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Cotizador IA</CardTitle>
        <CardDescription>
          Este es el nuevo cotizador. La funcionalidad será implementada aquí.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-center text-muted-foreground p-8">
          Próximamente...
        </p>
      </CardContent>
    </Card>
  );
}
