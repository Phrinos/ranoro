
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from "@/components/ui/button";
import { Badge } from '@/components/ui/badge';
import { CheckCircle, BrainCircuit, Wrench, Package, LineChart } from 'lucide-react';
import Image from "next/image";
import { cn } from '@/lib/utils';

const tabData = [
  {
    id: 'servicios',
    title: 'Servicios',
    content: {
      heading: 'Gestión de Servicios Simplificada',
      text: 'Desde la recepción del vehículo hasta la entrega, sigue cada paso. Crea órdenes de trabajo, asigna técnicos, y mantén a tus clientes informados con un solo clic.',
      list: [
        'Órdenes de trabajo digitales con checklist y fotos.',
        'Historial completo por cliente y vehículo.',
        'Comunicación con clientes vía WhatsApp (Add-on).',
      ],
      image: {
        src: '/A1.png',
        alt: 'Vista de la interfaz de gestión de servicios',
        hint: 'dashboard interface'
      }
    }
  },
  {
    id: 'inventario',
    title: 'Inventario y POS',
    content: {
      heading: 'Inventario y Punto de Venta Integrados',
      text: 'Controla tus refacciones y consumibles. Nuestro sistema te alerta sobre stock bajo y te permite facturar servicios y productos desde un mismo lugar.',
      list: [
        'Altas y bajas automáticas al usar refacciones en servicios.',
        'Punto de Venta (POS) para cobros rápidos y facturación CFDI.',
        'Sugerencias de compra basadas en la demanda.',
      ],
      image: {
        src: '/A2.png',
        alt: 'Vista de la interfaz de control de inventario',
        hint: 'inventory software'
      }
    }
  },
  {
    id: 'ia',
    title: 'Inteligencia Artificial',
    content: {
      heading: 'Decisiones Potenciadas con IA',
      text: 'Deja que la inteligencia artificial trabaje para ti. Ranoro analiza tus datos para darte recomendaciones que aumentan tu rentabilidad y eficiencia.',
      list: [
        'Sugerencias de precios para maximizar ganancias.',
        'Análisis de capacidad para optimizar la agenda.',
        'Ranking de refacciones por rentabilidad y rotación.',
      ],
      image: {
        src: '/A3.png',
        alt: 'Dashboard con insights de inteligencia artificial',
        hint: 'AI dashboard'
      }
    }
  },
  {
    id: 'reportes',
    title: 'Reportes y Finanzas',
    content: {
      heading: 'Reportes Financieros al Instante',
      text: 'Conoce la salud de tu negocio en tiempo real. Genera reportes financieros, de ventas y KPIs clave para tomar el control de tus finanzas.',
      list: [
        'Dashboards interactivos con tus métricas más importantes.',
        'Exporta tus datos a PDF y Excel con un solo clic.',
        'Conciliaciones y cortes de caja para una contabilidad clara.',
      ],
      image: {
        src: '/A4.png',
        alt: 'Dashboard financiero con gráficos',
        hint: 'financial dashboard'
      }
    }
  }
];

export function FeaturesSection() {
    const [activeTab, setActiveTab] = React.useState('servicios');

    return (
        <section id="features" className="py-20 md:py-28 bg-gray-50 dark:bg-gray-900/50">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center max-w-3xl mx-auto">
                    <Badge variant="secondary">Todo en un solo lugar</Badge>
                    <h2 className="text-3xl md:text-4xl font-extrabold text-foreground mt-4">Una plataforma para cada necesidad de tu taller</h2>
                    <p className="mt-4 text-lg text-muted-foreground">
                        Controla cada aspecto de tu negocio con módulos diseñados específicamente para la operación automotriz.
                    </p>
                </div>

                <div className="mt-12 max-w-5xl mx-auto">
                    <div className="flex flex-wrap justify-center border-b border-gray-200">
                        {tabData.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "py-4 px-6 block font-medium text-center border-b-2 transition-colors duration-300 focus:outline-none",
                                    activeTab === tab.id
                                        ? 'border-primary text-primary'
                                        : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
                                )}
                            >
                                {tab.title}
                            </button>
                        ))}
                    </div>
                    
                    <div className="mt-10">
                        {tabData.map(tab => (
                            <div key={tab.id} style={{ display: activeTab === tab.id ? 'block' : 'none' }}>
                                <div className="grid md:grid-cols-2 gap-12 items-center">
                                    <div>
                                        <h3 className="text-2xl font-bold text-foreground">{tab.content.heading}</h3>
                                        <p className="mt-4 text-muted-foreground">{tab.content.text}</p>
                                        <ul className="mt-6 space-y-3">
                                            {tab.content.list.map((item, index) => (
                                                <li key={index} className="flex items-start">
                                                    <CheckCircle className="h-6 w-6 text-green-500 mr-3 mt-1 shrink-0" />
                                                    <span>{item}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div className="bg-white p-4 rounded-2xl shadow-lg">
                                        <Image
                                            src={tab.content.image.src}
                                            alt={tab.content.image.alt}
                                            width={600}
                                            height={400}
                                            className="rounded-xl"
                                            data-ai-hint={tab.content.image.hint}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}

// Keeping the original DashboardCharts component empty as requested
export function DashboardCharts() {
  return null;
}
