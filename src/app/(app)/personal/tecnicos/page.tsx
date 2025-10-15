
// src/app/(app)/personal/tecnicos/page.tsx
"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function TecnicosPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestión de Técnicos</CardTitle>
        <CardDescription>
          Este es el nuevo módulo de técnicos. La funcionalidad será implementada aquí.
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
