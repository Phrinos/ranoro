// src/app/(app)/flotilla/components/PersonalInfoCard.tsx
"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Driver } from "@/types";

export function PersonalInfoCard({ driver }: { driver?: Driver }) {
  const d: any = driver;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Conductor</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">Nombre</span>
          <span className="font-medium">{d?.name ?? "—"}</span>
        </div>

        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">Teléfono</span>
          <span className="font-medium">{d?.phone ?? "—"}</span>
        </div>

        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">Licencia</span>
          <span className="font-medium">{d?.licenseNumber ?? "—"}</span>
        </div>

        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">Estatus</span>
          <span className="font-medium">{d?.status ?? "—"}</span>
        </div>
      </CardContent>
    </Card>
  );
}
