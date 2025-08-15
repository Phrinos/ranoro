

"use client";

import React, { useState, useMemo, useEffect, useCallback, Suspense, lazy } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { PlusCircle, Search, ListFilter, ShieldCheck, User, ChevronRight, AlertTriangle, UserCheck, UserX } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AddVehicleToFleetDialog } from "./components/add-vehicle-to-fleet-dialog";
import { FineCheckDialog } from "./components/fine-check-dialog";
import type { User as AuthUser, Vehicle, Driver, RentalPayment } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, cn } from "@/lib/utils";
import { DriverDialog } from '../conductores/components/driver-dialog';
import type { DriverFormValues } from '../conductores/components/driver-form';
import Link from 'next/link';
import { inventoryService, personnelService, operationsService } from '@/lib/services';
import { Loader2 } from 'lucide-react';
import { AUTH_USER_LOCALSTORAGE_KEY } from '@/lib/placeholder-data';
import { TableToolbar } from '@/components/shared/table-toolbar';
import { TabbedPageLayout } from '@/components/layout/tabbed-page-layout';

const ConductoresTab = lazy(() => import('./components/conductores-tab').then(module => ({ default: module.ConductoresTab })));
const VehiculosFlotillaTab = lazy(() => import('./components/vehiculos-flotilla-tab').then(module => ({ default: module.VehiculosFlotillaTab })));

export default function FlotillaPage() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'conductores';

  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(defaultTab);
  
  const [allVehicles, setAllVehicles] = useState<Vehicle[]>([]);
  const [allDrivers, setAllDrivers] = useState<Driver[]>([]);

  useEffect(() => {
    setIsLoading(true);
    const unsubs = [
        inventoryService.onVehiclesUpdate(setAllVehicles),
        personnelService.onDriversUpdate((data) => {
            setAllDrivers(data);
            setIsLoading(false);
        }),
    ];
    
    return () => unsubs.forEach(unsub => unsub());
  }, []);

  if (isLoading) { return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>; }

  const tabs = [
    {
      value: "conductores",
      label: "Conductores",
      content: (
        <Suspense fallback={<Loader2 className="mx-auto my-8 h-8 w-8 animate-spin" />}>
          <ConductoresTab allDrivers={allDrivers} allVehicles={allVehicles} />
        </Suspense>
      )
    },
    {
      value: "vehiculos",
      label: "Vehículos",
      content: (
        <Suspense fallback={<Loader2 className="mx-auto my-8 h-8 w-8 animate-spin" />}>
          <VehiculosFlotillaTab allDrivers={allDrivers} allVehicles={allVehicles} />
        </Suspense>
      )
    }
  ];

  return (
    <Suspense fallback={<div className="flex h-64 w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <TabbedPageLayout
        title="Gestión de Flotilla"
        description="Administra vehículos y conductores de tu flotilla."
        activeTab={activeTab}
        onTabChange={setActiveTab}
        tabs={tabs}
      />
    </Suspense>
  );
}
