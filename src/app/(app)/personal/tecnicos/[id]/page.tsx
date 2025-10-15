// src/app/(app)/personal/tecnicos/[id]/page.tsx
"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function TecnicoProfilePage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Perfil de Técnico</CardTitle>
        <CardDescription>
          Este es el perfil de un técnico. La funcionalidad será implementada aquí.
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
