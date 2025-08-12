
"use client";
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AnimatedDiv } from './AnimatedDiv';
import Link from 'next/link';
import { Icon } from '@iconify/react';

const plans = [
    {
      name: "Básico",
      prices: { '150': '$299', '300': '$499', '600': '$699' },
      description: "Para talleres que inician su digitalización.",
      cta: "Empezar con Básico",
      features: [
        { text: "Gestión de servicios/clientes/vehículos", included: true },
        { text: "Inventario y POS", included: true },
        { text: "Reportes financieros y KPI", included: true },
      ],
    },
    {
      name: "Pro",
      prices: { '150': '$499', '300': '$699', '600': '$899' },
      description: "Para talleres que buscan crecer y optimizar.",
      isPopular: true,
      cta: "Obtener Plan Pro",
      features: [
        { text: "Todo en Básico", included: true },
        { text: "IA (mejoras de texto, sugerencia precios)", included: true, limited: true },
        { text: "Fotos en recepción (máx. 5)", included: true },
        { text: "Reporte fotográfico de inspección", included: true },
      ],
    },
    {
      name: "Premium",
      prices: { '150': '$999', '300': '$1,799', '600': '$2,499' },
      description: "La solución completa para talleres de alto volumen.",
      cta: "Empezar con Premium",
      features: [
        { text: "Todo en Básico", included: true },
        { text: "IA de análisis capacidad y compras", included: true },
        { text: "Migración asistida por IA", included: true },
        { text: "Soporte prioritario <4h", included: true },
        { text: "Fotos en recepción (máx. 10)", included: true },
      ],
    },
];

export function PricingSection() {
    const [vehicleVolume, setVehicleVolume] = useState('150');

    return (
        <section id="pricing" className="py-20 md:py-28 bg-white">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <AnimatedDiv className="text-center max-w-3xl mx-auto">
                    <Badge variant="secondary" className="mb-4 px-4 py-2 text-sm sm:text-base">Precios Claros y Escalables</Badge>
                    <h2 className="text-3xl md:text-4xl font-extrabold">Un plan para cada tamaño de taller</h2>
                    <p className="mt-4 text-lg text-foreground">
                        Elige el plan que mejor se adapte a tu volumen de trabajo. Todos los planes incluyen una prueba gratuita de 14 días.
                    </p>
                </AnimatedDiv>
                
                <AnimatedDiv className="mt-12 max-w-5xl mx-auto">
                    <div className="w-full max-w-md mx-auto">
                        <label htmlFor="vehicle-range" className="block text-center font-medium text-gray-700">Vehículos atendidos por mes: 
                            <span className="font-bold text-primary">
                                {vehicleVolume === '150' ? '0-150' : (vehicleVolume === '300' ? '151-300' : '301-600')}
                            </span>
                        </label>
                        <input id="vehicle-range" type="range" min="1" max="3" value={{'150': 1, '300': 2, '600': 3}[vehicleVolume] || 1} onChange={(e) => setVehicleVolume({1: '150', 2: '300', 3: '600'}[Number(e.target.value)] || '150')} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer mt-4" style={{ accentColor: 'hsl(var(--primary))' }}/>
                    </div>
                    
                    <div className="mt-10 grid lg:grid-cols-3 gap-8 items-start">
                       {plans.map((plan) => (
                            <AnimatedDiv key={plan.name}>
                                <Card className={`flex flex-col h-full ${plan.isPopular ? 'border-2 border-primary ring-4 ring-primary/20' : ''}`}>
                                    <CardHeader className="text-center">
                                        {plan.isPopular && <Badge>Más Popular</Badge>}
                                        <CardTitle className="text-2xl mt-2">{plan.name}</CardTitle>
                                        <p className="text-foreground mt-2">{plan.description}</p>
                                        <p className="mt-4"><span className="text-4xl font-extrabold">{plan.prices[vehicleVolume as keyof typeof plan.prices]}</span><span className="text-muted-foreground">/ mes</span></p>
                                    </CardHeader>
                                    <CardContent className="flex-grow">
                                        <ul className="space-y-4">
                                            {plan.features.map((feature, i) => (
                                                <li key={i} className="flex items-start gap-3">
                                                    <Icon icon="emojione:white-heavy-check-mark" className={`h-5 w-5 shrink-0 mt-1 ${!feature.included && 'opacity-30'}`} />
                                                    <span className={!feature.included ? 'text-muted-foreground line-through' : ''}>
                                                        {feature.text} {feature.limited && <span className="text-xs font-semibold">(Limitada)</span>}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    </CardContent>
                                    <div className="p-6 mt-auto">
                                        <Button className="w-full" variant={plan.isPopular ? 'default' : 'outline'}>{plan.cta}</Button>
                                    </div>
                                </Card>
                            </AnimatedDiv>
                       ))}
                    </div>
                </AnimatedDiv>

                <AnimatedDiv className="mt-16 pt-10 border-t border-gray-200 max-w-4xl mx-auto">
                    <h3 className="text-2xl font-bold text-center">Potencia tu plan con Add-ons</h3>
                    <div className="mt-8 grid md:grid-cols-2 gap-8">
                        <Card className="bg-white"><CardContent className="p-6"><h4 className="font-bold text-lg">SAT Completo</h4><p className="text-muted-foreground mt-2">Timbrado CFDI 4.0, cancelaciones, y más. Factura sin salir de Ranoro.</p><p className="mt-4 font-semibold text-primary">Desde $1.50 MXN por folio.</p></CardContent></Card>
                        <Card className="bg-white"><CardContent className="p-6"><h4 className="font-bold text-lg">Integración WhatsApp</h4><p className="text-muted-foreground mt-2">Envía notificaciones automáticas a tus clientes sobre el estado de su vehículo y chatea desde el panel.</p><p className="mt-4 font-semibold text-primary">Consulta precios.</p></CardContent></Card>
                    </div>
                </AnimatedDiv>
            </div>
        </section>
    );
}
