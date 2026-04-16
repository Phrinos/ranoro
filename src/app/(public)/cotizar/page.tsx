
"use client";
import { withSuspense } from "@/lib/withSuspense";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import React, { useState, useEffect, useCallback, Suspense, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Car, Wrench, AlertTriangle } from 'lucide-react';
import { inventoryService } from '@/lib/services';
import { formatCurrency } from '@/lib/utils';
import { AnimatedDiv } from '../landing/AnimatedDiv';
import type { VehicleMake } from '@/lib/data/vehicle-database-types';

const normalizeString = (str?: string): string => {
    if (!str) return '';
    return str.trim().toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
};

function PageInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const serviceQuery = searchParams.get('service');
  
  const [vehicleDb, setVehicleDb] = useState<VehicleMake[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [selectedMake, setSelectedMake] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedEngine, setSelectedEngine] = useState<string>('');
  const [selectedService, setSelectedService] = useState<string>(serviceQuery || '');
  
  const [result, setResult] = useState<{ price: number; } | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = inventoryService.onVehicleDataUpdate((data) => {
      setVehicleDb(data as VehicleMake[]);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const makes = useMemo(() => vehicleDb.map(m => m.make).sort(), [vehicleDb]);
  
  const models = useMemo(() => {
    if (!selectedMake) return [];
    const makeData = vehicleDb.find(m => m.make === selectedMake);
    return makeData ? makeData.models.map(model => model.name).sort() : [];
  }, [vehicleDb, selectedMake]);

  const years = useMemo(() => {
    if (!selectedModel) return [];
    const makeData = vehicleDb.find(m => m.make === selectedMake);
    const modelData = makeData?.models.find(m => m.name === selectedModel);
    if (!modelData) return [];
    const yearSet = new Set<number>();
    modelData.generations.forEach(g => {
      for (let y = g.startYear; y <= g.endYear; y++) yearSet.add(y);
    });
    return Array.from(yearSet).sort((a, b) => b - a);
  }, [vehicleDb, selectedMake, selectedModel]);
  
  const engines = useMemo(() => {
    if (!selectedYear) return [];
    const makeData = vehicleDb.find(m => m.make === selectedMake);
    const modelData = makeData?.models.find(m => m.name === selectedModel);
    const year = Number(selectedYear);
    const generation = modelData?.generations.find(g => year >= g.startYear && year <= g.endYear);
    return generation ? generation.engines.map((e: any) => e.name).sort() : [];
  }, [vehicleDb, selectedMake, selectedModel, selectedYear]);

  const services = useMemo(() => {
    if (!selectedEngine) return [];
    return [
        { id: 'afinacionIntegral', name: 'Afinación Integral' },
        { id: 'cambioAceite', name: 'Cambio de Aceite' },
        { id: 'balatasDelanteras', name: 'Frenos Delanteros' },
        { id: 'balatasTraseras', name: 'Frenos Traseros' },
    ];
  }, [selectedEngine]);
  
  const handleMakeChange = (make: string) => {
      setSelectedMake(make);
      setSelectedModel('');
      setSelectedYear('');
      setSelectedEngine('');
      setSelectedService('');
      setResult(null);
  }
  const handleModelChange = (model: string) => {
      setSelectedModel(model);
      setSelectedYear('');
      setSelectedEngine('');
      setSelectedService('');
      setResult(null);
  }
  const handleYearChange = (year: string) => {
      setSelectedYear(year);
      setSelectedEngine('');
      setSelectedService('');
      setResult(null);
  }
  const handleEngineChange = (engine: string) => {
      setSelectedEngine(engine);
      setSelectedService('');
      setResult(null);
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
        <header className="sticky top-0 z-40 w-full border-b bg-background">
            <div className="container mx-auto flex h-20 items-center justify-between px-4 md:px-6">
                <Link href="/" className="relative w-[140px] h-[40px]">
                    <Image
                    src="/ranoro-logo.png"
                    alt="Ranoro Logo"
                    fill
                    style={{ objectFit: 'contain' }}
                    className="dark:invert"
                    priority
                    sizes="(max-width: 768px) 120px, 140px"
                    data-ai-hint="ranoro logo"
                    />
                </Link>
            </div>
        </header>
        <main className="flex-1 py-8 md:py-12 lg:py-16">
            <div className="container mx-auto max-w-2xl px-4 md:px-6">
                 <Card className="relative overflow-hidden">
                    <CardHeader className="text-center">
                      <Car className="mx-auto h-12 w-12 text-primary" />
                      <CardTitle className="text-2xl mt-4">Cotizador Inteligente</CardTitle>
                      <CardDescription>
                        Obtén un estimado para el servicio de tu vehículo en segundos.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="py-12">
                       <div className="flex flex-col items-center justify-center text-center space-y-4">
                           <Wrench className="h-16 w-16 text-muted-foreground/30 mb-4" />
                           <h3 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                               Cotizador en Mantenimiento
                           </h3>
                           <p className="text-muted-foreground max-w-sm">
                               Estamos actualizando nuestro sistema de cotizaciones para ofrecerte precios más precisos y opciones personalizadas.
                           </p>
                           <Button asChild className="mt-8 relative overflow-hidden group">
                               <Link href="https://wa.me/524491425323?text=Hola,%20me%20gustar%C3%ADa%20una%20cotizaci%C3%B3n" target="_blank" rel="noopener noreferrer">
                                   <span className="relative z-10 font-semibold tracking-wide">Cotizar por WhatsApp</span>
                                   <div className="absolute inset-0 bg-primary/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out" />
                               </Link>
                           </Button>
                       </div>
                    </CardContent>
                 </Card>
            </div>
        </main>
    </div>
  );
}

export default withSuspense(PageInner, null);
