
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Car, Wrench } from 'lucide-react';
import { inventoryService } from '@/lib/services';
import type { VehiclePriceList } from '@/types';

function CotizadorPage() {
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

  useEffect(() => {
    const unsubscribe = inventoryService.onPriceListsUpdate((data) => {
      setPriceLists(data);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const makes = React.useMemo(() => [...new Set(priceLists.map(p => p.make))].sort(), [priceLists]);
  const models = React.useMemo(() => {
    if (!selectedMake) return [];
    return [...new Set(priceLists.filter(p => p.make === selectedMake).map(p => p.model))].sort();
  }, [priceLists, selectedMake]);
  const years = React.useMemo(() => {
    if (!selectedModel) return [];
    const allYears = priceLists
      .filter(p => p.make === selectedMake && p.model === selectedModel)
      .flatMap(p => p.years);
    return [...new Set(allYears)].sort((a, b) => b - a);
  }, [priceLists, selectedMake, selectedModel]);
  const services = React.useMemo(() => {
    if (!selectedYear) return [];
    const allServices = priceLists
        .filter(p => 
            p.make === selectedMake && 
            p.model === selectedModel && 
            p.years.includes(Number(selectedYear))
        )
        .flatMap(p => p.services.map(s => s.serviceName));
    return [...new Set(allServices)].sort();
  }, [priceLists, selectedMake, selectedModel, selectedYear]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearching(true);
    setResult(null);

    setTimeout(() => {
      const list = priceLists.find(p => 
        p.make === selectedMake && 
        p.model === selectedModel && 
        p.years.includes(Number(selectedYear))
      );
      const service = list?.services.find(s => s.serviceName === selectedService);
      
      if (service) {
        setResult({ price: service.customerPrice, time: service.estimatedTimeHours || 2 });
      } else {
        setResult(null); // Or show a "not found" message
      }
      setIsSearching(false);
    }, 1500);
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
                            <Select value={selectedMake} onValueChange={setSelectedMake}>
                                <SelectTrigger><SelectValue placeholder="Selecciona la Marca..." /></SelectTrigger>
                                <SelectContent>{makes.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                            </Select>
                            <Select value={selectedModel} onValueChange={setSelectedModel} disabled={!selectedMake}>
                                <SelectTrigger><SelectValue placeholder="Selecciona el Modelo..." /></SelectTrigger>
                                <SelectContent>{models.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                            </Select>
                            <Select value={selectedYear} onValueChange={setSelectedYear} disabled={!selectedModel}>
                                <SelectTrigger><SelectValue placeholder="Selecciona el Año..." /></SelectTrigger>
                                <SelectContent>{years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
                            </Select>
                             <Select value={selectedService} onValueChange={setSelectedService} disabled={!selectedYear}>
                                <SelectTrigger><SelectValue placeholder="Selecciona el Servicio..." /></SelectTrigger>
                                <SelectContent>{services.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                            </Select>
                            <Button type="submit" className="w-full" disabled={!selectedService || isSearching}>
                                {isSearching ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Buscando...</> : "Cotizar Ahora"}
                            </Button>
                         </form>
                       )}

                       {isSearching && <div className="text-center p-4 text-muted-foreground">Analizando nuestra base de datos...</div>}

                       {result && (
                         <div className="mt-6 p-6 bg-green-50 border-2 border-dashed border-green-200 rounded-lg text-center">
                            <h3 className="text-lg font-semibold text-green-800">Estimación de Costo</h3>
                            <p className="text-4xl font-bold text-green-600 my-2">${result.price.toLocaleString('es-MX')}</p>
                            <p className="text-sm text-green-700">Tiempo estimado de servicio: {result.time} horas</p>
                            <Button asChild className="mt-4"><Link href="https://wa.me/524491425323?text=Hola%2C%20me%20gustar%C3%ADa%20agendar%20una%20cita%20con%20la%20cotizaci%C3%B3n%20que%20obtuve.">Agendar por WhatsApp</Link></Button>
                         </div>
                       )}
                    </CardContent>
                 </Card>
            </div>
        </main>
    </div>
  );
}

export default CotizadorPage;
