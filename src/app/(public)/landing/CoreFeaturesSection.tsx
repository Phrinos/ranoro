
"use client";
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AnimatedDiv } from './AnimatedDiv';
import { Icon } from '@iconify/react';
import { Wrench, Package, DollarSign, Truck } from 'lucide-react';

const features = [
    { name: "Gestión de Servicios", icon: Wrench, description: "Desde la cita hasta la facturación, todo en un solo flujo de trabajo." },
    { name: "Control de Inventario", icon: Package, description: "Maneja tu stock, proveedores y compras de forma inteligente." },
    { name: "Finanzas Claras", icon: DollarSign, description: "Reportes de ingresos y rentabilidad para tomar decisiones informadas." },
    { name: "Módulo de Flotillas", icon: Truck, description: "Administra rentas, pagos y mantenimientos de tus flotillas de vehículos." },
];

export function CoreFeaturesSection() {
    return (
        <section id="features" className="py-20 md:py-28 bg-muted/50">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <AnimatedDiv className="text-center max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-extrabold">Funciones Diseñadas para Ti</h2>
            </AnimatedDiv>
            <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {features.map(feature => (
                <AnimatedDiv key={feature.name}>
                  <Card className="h-full">
                    <CardHeader>
                      <feature.icon className="h-10 w-10 text-primary mb-2"/>
                      <CardTitle>{feature.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">{feature.description}</p>
                    </CardContent>
                  </Card>
                </AnimatedDiv>
              ))}
            </div>
          </div>
        </section>
    );
}
