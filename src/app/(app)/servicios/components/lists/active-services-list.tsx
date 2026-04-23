// src/app/(app)/servicios/components/lists/active-services-list.tsx
"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { ServiceRecord, Vehicle, User } from "@/types";
import { ServiceListCard } from "../cards/service-list-card";
import { DailyEarnings } from "../shared/daily-earnings";
import { serviceService } from "@/lib/services";
import { startOfDay, endOfDay, isWithinInterval, isValid, compareAsc, compareDesc } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { parseDate } from "@/lib/forms";
import { Loader2 } from "lucide-react";

const TZ = "America/Mexico_City";

interface ActiveServicesListProps {
  vehicles: Vehicle[];
  personnel: User[];
  currentUser: User | null;
  onView: (service: ServiceRecord) => void;
  onShowTicket: (service: ServiceRecord) => void;
  onComplete: (service: ServiceRecord) => void;
}

const STATUS_ORDER: Record<string, number> = {
  "En Taller": 1,
  "Agendado": 2,
  "Entregado": 3,
};

function getServiceDate(service: ServiceRecord): Date | null {
  switch (service.status) {
    case "Agendado": return parseDate(service.appointmentDateTime);
    case "En Taller": return parseDate(service.receptionDateTime);
    case "Entregado": return parseDate(service.deliveryDateTime);
    default: return parseDate(service.serviceDate);
  }
}

export function ActiveServicesList({
  vehicles,
  personnel,
  currentUser,
  onView,
  onShowTicket,
  onComplete,
}: ActiveServicesListProps) {
  const router = useRouter();
  const [activeData, setActiveData] = useState<ServiceRecord[]>([]);
  const [todayDelivered, setTodayDelivered] = useState<ServiceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const nowZ = toZonedTime(new Date(), TZ);
  const todayStart = startOfDay(nowZ);
  const todayEnd = endOfDay(nowZ);

  useEffect(() => {
    setIsLoading(true);
    const unsubs: (() => void)[] = [];

    unsubs.push(
      serviceService.onActiveServicesUpdate((data) => {
        setActiveData(data);
        setIsLoading(false);
      })
    );

    const startIso = startOfDay(toZonedTime(new Date(), TZ)).toISOString();
    const endIso = endOfDay(toZonedTime(new Date(), TZ)).toISOString();
    unsubs.push(
      serviceService.onHistoricalServicesUpdate(startIso, endIso, (data) => {
        setTodayDelivered(data.filter((s) => s.status === "Entregado"));
      }, "deliveryDateTime")
    );

    return () => unsubs.forEach((u) => u());
  }, []);

  const allServices = useMemo(
    () => [...activeData, ...todayDelivered],
    [activeData, todayDelivered]
  );

  const sorted = useMemo(() => {
    const filtered = allServices.filter((s) => {
      if (s.status === "En Taller") return true;

      const apptDate = parseDate(s.appointmentDateTime);
      if (
        s.status === "Agendado" &&
        apptDate &&
        isValid(apptDate) &&
        isWithinInterval(toZonedTime(apptDate, TZ), { start: todayStart, end: todayEnd })
      )
        return true;

      const delDate = parseDate(s.deliveryDateTime);
      if (
        s.status === "Entregado" &&
        delDate &&
        isValid(delDate) &&
        isWithinInterval(toZonedTime(delDate, TZ), { start: todayStart, end: todayEnd })
      )
        return true;

      return false;
    });

    return [...filtered].sort((a, b) => {
      const pa = STATUS_ORDER[a.status] ?? 9;
      const pb = STATUS_ORDER[b.status] ?? 9;
      if (pa !== pb) return pa - pb;
      const da = getServiceDate(a);
      const db2 = getServiceDate(b);
      if (da && db2) return compareDesc(da, db2);
      return 0;
    });
  }, [allServices, todayStart, todayEnd]);

  const handleEdit = useCallback(
    (serviceId: string) => router.push(`/servicios/${serviceId}`),
    [router]
  );

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <DailyEarnings services={allServices} />
      <Card>
        <CardHeader>
          <CardTitle>Servicios Activos del Día</CardTitle>
          <CardDescription>En taller, agendados para hoy y entregados hoy.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sorted.length > 0 ? (
            sorted.map((s) => (
              <ServiceListCard
                key={s.id}
                service={s}
                vehicle={vehicles.find((v) => v.id === s.vehicleId)}
                personnel={personnel}
                currentUser={currentUser}
                onEdit={() => handleEdit(s.id)}
                onView={() => onView(s)}
                onShowTicket={() => onShowTicket(s)}
              />
            ))
          ) : (
            <p className="text-center text-muted-foreground py-10">
              No hay servicios activos para hoy.
            </p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
