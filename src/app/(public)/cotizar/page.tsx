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
import type { VehiclePriceList } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { AnimatedDiv } from '../landing/AnimatedDiv';

// Normaliza y capitaliza un string para consistencia.
const normalizeString = (str?: string): string => {
    if (!str) return '';
    return str.trim().toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
};

function CotizadorPageComponent() {
  const searchParams = useSearchParams();
  const serviceQuery = searchParams.get('service');
  
  const [priceLists, setPriceLists] = useState<VehiclePriceList[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [selectedMake, setSelectedMake] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedService, setSelectedService] = useState<string>(serviceQuery || '');
  
  const [result, setResult] = useState<{ price: number; time: number; } | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = inventoryService.onPriceListsUpdate((data) => {
      setPriceLists(data);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const makes = useMemo(() => {
    const uniqueMakes = [...new Set(priceLists.map(p => normalizeString(p.make)))];
    return uniqueMakes.sort();
  }, [priceLists]);
  
  const models = useMemo(() => {
    if (!selectedMake) return [];
    return [...new Set(priceLists
        .filter(p => normalizeString(p.make) === selectedMake)
        .map(p => p.model))]
        .sort();
  }, [priceLists, selectedMake]);

  const years = useMemo(() => {
    if (!selectedModel) return [];
    const allYears = priceLists
      .filter(p => normalizeString(p.make) === selectedMake && p.model === selectedModel)
      .flatMap(p => p.years);
    return [...new Set(allYears)].sort((a, b) => b - a);
  }, [priceLists, selectedMake, selectedModel]);
  
  const services = useMemo(() => {
    if (!selectedYear) return [];
    const allServices = priceLists
        .filter(p => 
            normalizeString(p.make) === selectedMake && 
            p.model === selectedModel && 
            p.years.includes(Number(selectedYear))
        )
        .flatMap(p => p.services.map(s => s.serviceName));
    return [...new Set(allServices)].sort();
  }, [priceLists, selectedMake, selectedModel, selectedYear]);

  // Handlers para resetear selecciones dependientes
  const handleMakeChange = (make: string) => {
      setSelectedMake(make);
      setSelectedModel('');
      setSelectedYear('');
      setSelectedService('');
      setResult(null);
  }
  const handleModelChange = (model: string) => {
      setSelectedModel(model);
      setSelectedYear('');
      setSelectedService('');
      setResult(null);
  }
  const handleYearChange = (year: string) => {
      setSelectedYear(year);
      setSelectedService('');
      setResult(null);
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearching(true);
    setResult(null);
    setSearchError(null);

    setTimeout(() => {
      const list = priceLists.find(p => 
        normalizeString(p.make) === selectedMake && 
        p.model === selectedModel && 
        p.years.includes(Number(selectedYear))
      );
      const service = list?.services.find(s => s.serviceName === selectedService);
      
      if (service) {
        setResult({ price: service.customerPrice, time: service.estimatedTimeHours || 2 });
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
                             <Select value={selectedService} onValueChange={setSelectedService} disabled={!selectedYear}>
                                <SelectTrigger><SelectValue placeholder={!selectedYear ? 'Primero elige un año' : 'Selecciona el Servicio...'} /></SelectTrigger>
                                <SelectContent>{services.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
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
                                <p className="text-sm text-green-700">Tiempo estimado de servicio: {result.time} horas</p>
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
