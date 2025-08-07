
"use client";

import React, { useState, useMemo, useCallback, Suspense, lazy } from "react";
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { List, Calendar as CalendarIcon, Loader2 } from "lucide-react";
import type { ServiceRecord, Vehicle, User } from '@/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const AgendaListContent = lazy(() => import('./agenda-list-content'));
const ServiceCalendar = lazy(() => import('./service-calendar'));

interface AgendaTabContentProps {
  services: ServiceRecord[];
  vehicles: Vehicle[];
  personnel: User[];
  onShowPreview: (service: ServiceRecord) => void;
}

export default function AgendaTabContent({
  services,
  vehicles,
  personnel,
  onShowPreview,
}: AgendaTabContentProps) {
  const router = useRouter();
  const [activeView, setActiveView] = useState('lista');

  return (
    <Tabs value={activeView} onValueChange={setActiveView} className="w-full">
      <div className="flex justify-end mb-4">
        <TabsList className="grid w-full grid-cols-2 max-w-[250px]">
          <TabsTrigger value="lista"><List className="mr-2 h-4 w-4" />Lista</TabsTrigger>
          <TabsTrigger value="calendario"><CalendarIcon className="mr-2 h-4 w-4" />Calendario</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="lista">
        <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>}>
          <AgendaListContent 
            services={services} 
            vehicles={vehicles}
            personnel={personnel}
            onShowPreview={onShowPreview}
          />
        </Suspense>
      </TabsContent>
      <TabsContent value="calendario">
        <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>}>
          <ServiceCalendar 
            services={services} 
            vehicles={vehicles}
            technicians={personnel}
            onServiceClick={(s) => router.push(`/servicios/${s.id}`)} 
          />
        </Suspense>
      </TabsContent>
    </Tabs>
  );
}
