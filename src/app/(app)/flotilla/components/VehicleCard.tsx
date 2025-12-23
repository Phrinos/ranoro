// src/app/(app)/flotilla/components/VehicleCard.tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Vehicle } from "@/types";

export function VehicleCard({ vehicle }: { vehicle: Vehicle }) {
  const router = useRouter();

  const handleCardClick = () => {
    router.push(`/flotilla/vehiculos/${vehicle.id}`);
  };

  return (
    <Card onClick={handleCardClick} className="cursor-pointer hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg">
            {vehicle.make} {vehicle.model}
          </CardTitle>
          <Badge>{vehicle.year}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">{vehicle.licensePlate}</p>
      </CardHeader>
      <CardContent>
        <p className="text-sm">
          Conductor:{" "}
          <span className="font-semibold">
            {vehicle.assignedDriverName || "Disponible"}
          </span>
        </p>
      </CardContent>
    </Card>
  );
}
