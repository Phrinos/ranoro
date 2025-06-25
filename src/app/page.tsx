
"use client";

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Car, Wrench, BrainCircuit, Users, ShieldCheck, Drill, GitCommitHorizontal, CircleDotDashed, Truck, CheckCircle } from 'lucide-react';

const services = [
  {
    icon: <Wrench className="h-8 w-8 text-primary" />,
    title: 'Cambio de Aceite',
    description: 'Mantenimiento esencial para la longevidad de tu motor.',
  },
  {
    icon: <Drill className="h-8 w-8 text-primary" />,
    title: 'Afinación Clásica y Integral',
    description: 'Recupera la eficiencia y potencia original de tu vehículo.',
  },
  {
    icon: <CircleDotDashed className="h-8 w-8 text-primary" />,
    title: 'Frenos',
    description: 'Inspección y reparación completa del sistema de frenado para tu seguridad.',
  },
  {
    icon: <BrainCircuit className="h-8 w-8 text-primary" />,
    title: 'Diagnóstico por Computadora',
    description: 'Tecnología de punta para detectar fallas con precisión milimétrica.',
  },
  {
    icon: <GitCommitHorizontal className="h-8 w-8 text-primary" />,
    title: 'Suspensiones',
    description: 'Reparación de amortiguadores y componentes para un manejo suave.',
  },
  {
    icon: <Truck className="h-8 w-8 text-primary" />,
    title: 'Alineación y Balanceo',
    description: 'Evita el desgaste irregular de llantas y mejora la estabilidad.',
  },
];

export default function LandingPage() {
  return (
    <div className="bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/ranoro-logo.png"
              alt="Ranoro Logo"
              width={120}
              height={40}
              className="dark:invert"
              data-ai-hint="ranoro logo"
            />
          </Link>
          <nav className="flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link href="#servicios">Servicios</Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link href="#flotillas">Flotillas</Link>
            </Button>
            <Button asChild>
              <Link href="/login">Acceso a Empleados</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative h-[60vh] min-h-[400px] w-full">
          <Image
            src="/__fsh_user_images__/image.png"
            alt="Taller mecánico profesional"
            layout="fill"
            objectFit="cover"
            className="absolute z-0 opacity-20"
          />
          <div className="relative z-10 flex h-full flex-col items-center justify-center text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl font-headline">
              Confianza y Calidad para tu Vehículo
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
              En Ranoro, combinamos técnicos expertos, tecnología de punta y refacciones de calidad para ofrecerte el mejor servicio automotriz.
            </p>
            <div className="mt-8 flex gap-4">
              <Button size="lg" asChild>
                <Link href="/login">Agendar Cita</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="#servicios">Ver Servicios</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Services Section */}
        <section id="servicios" className="py-16 sm:py-24">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl font-headline">Nuestros Servicios</h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Soluciones integrales para el mantenimiento y reparación de tu auto.
              </p>
            </div>
            <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((service, index) => (
                <Card key={index} className="text-center shadow-lg hover:shadow-xl transition-shadow duration-300">
                  <CardHeader>
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                      {service.icon}
                    </div>
                    <CardTitle className="mt-4">{service.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{service.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Fleet Services Section */}
        <section id="flotillas" className="bg-muted py-16 sm:py-24">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
              <div>
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl font-headline">Servicio Especializado para Flotillas</h2>
                <p className="mt-4 text-lg text-muted-foreground">
                  Mantén tu flota operando en óptimas condiciones con nuestro programa de mantenimiento preventivo y correctivo. Ofrecemos planes personalizados, facturación centralizada y atención prioritaria para minimizar el tiempo de inactividad de tus unidades.
                </p>
                <ul className="mt-6 space-y-4 text-muted-foreground">
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 flex-shrink-0 text-primary" />
                    <span>Mantenimiento preventivo programado para reducir fallas inesperadas.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 flex-shrink-0 text-primary" />
                    <span>Reportes detallados y seguimiento del historial de cada unidad.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 flex-shrink-0 text-primary" />
                    <span>Precios competitivos y planes de pago adaptados a tu negocio.</span>
                  </li>
                </ul>
                <div className="mt-8">
                  <Button size="lg" asChild>
                    <Link href="/login">Contactar para Flotillas</Link>
                  </Button>
                </div>
              </div>
              <div className="flex justify-center">
                <Image
                  src="https://placehold.co/600x400.png"
                  alt="Servicio a flotillas"
                  width={600}
                  height={400}
                  className="rounded-lg shadow-xl"
                  data-ai-hint="fleet vehicles"
                />
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-background">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 py-8 md:flex-row md:px-6">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Ranoro Taller Automotriz. Todos los derechos reservados.
          </p>
          <div className="flex items-center gap-4">
             <Link href="/login" className="text-sm text-muted-foreground hover:text-primary">
                Acceso Empleados
              </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
