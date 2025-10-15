// src/app/(public)/cotizar/page.tsx
"use client";

import React, { useState, useEffect, useCallback, Suspense, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Car, Wrench, AlertTriangle } from 'lucide-react';
import { inventoryService } from '@/lib/services';
import { formatCurrency } from '@/lib/utils';
import { AnimatedDiv } from '../landing/AnimatedDiv';
import type { VehicleMake, EngineData } from '@/lib/data/vehicle-database-types';

// Normaliza y capitaliza un string para consistencia.
const normalizeString = (str?: string): string => {
    if (!str) return '';
    return str.trim().toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
};

function CotizadorPageComponent() {
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
    return generation ? generation.engines.map(e => e.name).sort() : [];
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
  
  // Handlers para resetear selecciones dependientes
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
    setIsSearching(true);
    setResult(null);
    setSearchError(null);

    setTimeout(() => {
        const makeData = vehicleDb.find(m => m.make === selectedMake);
        const modelData = makeData?.models.find(m => m.name === selectedModel);
        const year = Number(selectedYear);
        const generation = modelData?.generations.find(g => year >= g.startYear && year <= g.endYear);
        const engineData = generation?.engines.find(e => e.name === selectedEngine);

        const serviceInfo = (engineData?.servicios as any)?.[selectedService];

        if (serviceInfo && serviceInfo.precioPublico) {
            setResult({ price: serviceInfo.precioPublico });
        } else {
            setSearchError("No se encontró una cotización para los criterios seleccionados. Por favor, contáctanos directamente.");
        }
        setIsSearching(false);
    }, 1000);
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
                <Button asChild variant="ghost">
                    <Link href="/login">¿Eres un taller?</Link>
                </Button>
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
                    <CardContent>
                       {isLoading ? <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div> : (
                         <form onSubmit={handleSubmit} className="space-y-4">
                            <Select value={selectedMake} onValueChange={handleMakeChange}>
                                <SelectTrigger><SelectValue placeholder="Selecciona la Marca..." /></SelectTrigger>
                                <SelectContent>{makes.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                            </Select>
                            <Select value={selectedModel} onValueChange={handleModelChange} disabled={!selectedMake}>
                                <SelectTrigger><SelectValue placeholder={!selectedMake ? 'Primero elige una marca' : 'Selecciona el Modelo...'} /></SelectTrigger>
                                <SelectContent>{models.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                            </Select>
                            <Select value={selectedYear} onValueChange={handleYearChange} disabled={!selectedModel}>
                                <SelectTrigger><SelectValue placeholder={!selectedModel ? 'Primero elige un modelo' : 'Selecciona el Año...'} /></SelectTrigger>
                                <SelectContent>{years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
                            </Select>
                             <Select value={selectedEngine} onValueChange={handleEngineChange} disabled={!selectedYear}>
                                <SelectTrigger><SelectValue placeholder={!selectedYear ? 'Primero elige un año' : 'Selecciona el Motor...'} /></SelectTrigger>
                                <SelectContent>{engines.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                            </Select>
                             <Select value={selectedService} onValueChange={setSelectedService} disabled={!selectedEngine}>
                                <SelectTrigger><SelectValue placeholder={!selectedEngine ? 'Primero elige un motor' : 'Selecciona el Servicio...'} /></SelectTrigger>
                                <SelectContent>{services.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                            </Select>
                            <Button type="submit" className="w-full h-12 text-lg" disabled={!selectedService || isSearching}>
                                {isSearching ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Buscando...</> : "Cotizar Ahora"}
                            </Button>
                         </form>
                       )}

                       {result && (
                         <AnimatedDiv>
                            <div className="mt-6 p-6 bg-green-50 border-2 border-dashed border-green-200 rounded-lg text-center">
                                <h3 className="text-lg font-semibold text-green-800">Estimación de Costo</h3>
                                <p className="text-4xl font-bold text-green-600 my-2">{formatCurrency(result.price)}</p>
                                <Button asChild className="mt-4"><Link href="https://wa.me/524491425323?text=Hola%2C%20me%20gustar%C3%ADa%20agendar%20una%20cita%20con%20la%20cotizaci%C3%B3n%20que%20obtuve.">Agendar por WhatsApp</Link></Button>
                            </div>
                         </AnimatedDiv>
                       )}

                       {searchError && (
                          <AnimatedDiv>
                            <div className="mt-6 p-6 bg-yellow-50 border-2 border-dashed border-yellow-200 rounded-lg text-center">
                              <AlertTriangle className="mx-auto h-8 w-8 text-yellow-600 mb-2" />
                              <h3 className="font-semibold text-yellow-800">No disponible</h3>
                              <p className="text-sm text-yellow-700">{searchError}</p>
                            </div>
                          </AnimatedDiv>
                       )}
                    </CardContent>
                 </Card>
            </div>
        </main>
    </div>
  );
}

export default function CotizadorPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}>
            <CotizadorPageComponent />
        </Suspense>
    );
}
