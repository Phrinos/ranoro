
"use client";
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AnimatedDiv } from './AnimatedDiv';
import { Icon } from '@iconify/react';

export function CoreFeaturesSection() {
    return (
        <section id="features" className="py-20 md:py-28 bg-muted/50">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <AnimatedDiv className="text-center max-w-3xl mx-auto">
              <Badge variant="secondary" className="mb-4 px-4 py-2 text-base sm:px-6 sm:py-3 sm:text-lg">Todo en un solo lugar</Badge>
              <h2 className="text-3xl md:text-4xl font-extrabold">Funciones Diseñadas para Ti</h2>
            </AnimatedDiv>
            <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <AnimatedDiv><Card><CardHeader><Icon icon="mdi:wrench" className="h-8 w-8 text-primary"/><CardTitle>Gestión de Servicios</CardTitle></CardHeader><CardContent><p className="text-muted-foreground">Desde la cita hasta la entrega, todo en un solo flujo de trabajo.</p></CardContent></Card></AnimatedDiv>
              <AnimatedDiv><Card><CardHeader><Icon icon="mdi:package-variant-closed" className="h-8 w-8 text-primary"/><CardTitle>Control de Inventario</CardTitle></CardHeader><CardContent><p className="text-muted-foreground">Maneja tu stock, proveedores y compras de forma inteligente.</p></CardContent></Card></AnimatedDiv>
              <AnimatedDiv><Card><CardHeader><Icon icon="mdi:dollar" className="h-8 w-8 text-primary"/><CardTitle>Finanzas Claras</CardTitle></CardHeader><CardContent><p className="text-muted-foreground">Reportes de ingresos y rentabilidad para tomar decisiones informadas.</p></CardContent></Card></AnimatedDiv>
              <AnimatedDiv><Card><CardHeader><Icon icon="mdi:truck" className="h-8 w-8 text-primary"/><CardTitle>Módulo de Flotillas</CardTitle></CardHeader><CardContent><p className="text-muted-foreground">Administra rentas, pagos y mantenimientos de tus flotillas de vehículos.</p></CardContent></Card></AnimatedDiv>
            </div>
          </div>
        </section>
    );
}
