"use client";

import Link from 'next/link';
import Image from "next/legacy/image";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Car, Wrench, BrainCircuit, Users, ShieldCheck, Drill, GitCommitHorizontal, CircleDotDashed, Truck, CheckCircle, MessageSquare } from 'lucide-react';

const services = [
  {
    icon: <Wrench className="h-8 w-8 text-primary" />,
    title: 'Cambio de Aceite',
    description: 'Mantenimiento esencial para la longevidad de tu motor.',
  },
  {
    icon: <BrainCircuit className="h-8 w-8 text-primary" />,
    title: 'Diagnóstico por Computadora',
    description: 'Tecnología de punta para detectar fallas con precisión milimétrica.',
  },
   {
    icon: <CircleDotDashed className="h-8 w-8 text-primary" />,
    title: 'Servicio de Frenos',
    description: 'Inspección y reparación completa para tu seguridad al volante.',
  },
  {
    icon: <GitCommitHorizontal className="h-8 w-8 text-primary" />,
    title: 'Revisión de Suspensión',
    description: 'Reparación de amortiguadores y componentes para un manejo suave.',
  },
  {
    icon: <Truck className="h-8 w-8 text-primary" />,
    title: 'Alineación y Balanceo',
    description: 'Evita el desgaste irregular de llantas y mejora la estabilidad.',
  },
  {
    icon: <ShieldCheck className="h-8 w-8 text-primary" />,
    title: 'Revisión de Motor',
    description: 'Análisis y diagnóstico para asegurar el corazón de tu vehículo.',
  },
];


export default function LandingPage() {
  const workshopPhone = "524491425323"; // Country code + phone number

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
              className="dark:invert h-auto"
            />
          </Link>
          <nav className="hidden md:flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link href="#servicios">Servicios</Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link href="#flotillas">Flotillas</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative h-[60vh] min-h-[400px] w-full">
          <Image
            src="/ranoro1.jpg"
            alt="Taller mecánico profesional"
            layout="fill"
            priority
            className="absolute z-0 opacity-20 object-cover"
          />
          <div className="relative z-10 flex h-full flex-col items-center justify-center text-center px-4">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl font-headline">
              Confianza y Calidad para tu Vehículo
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
              En Ranoro, combinamos técnicos expertos, tecnología de punta y refacciones de calidad para ofrecerte el mejor servicio automotriz.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <Button size="lg" asChild>
                <a 
                  href={`https://wa.me/${workshopPhone}?text=Hola%2C%20me%20gustar%C3%ADa%20agendar%20una%20cita.`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageSquare className="mr-2 h-5 w-5" />
                  Agendar Cita por WhatsApp
                </a>
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

        {/* Tuning Packages Section */}
        <section id="afinacion" className="bg-muted py-16 sm:py-24">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl font-headline">Paquetes de Afinación</h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Elige el paquete que mejor se adapta a las necesidades de tu vehículo.
              </p>
            </div>
            <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2 lg:max-w-4xl lg:mx-auto">
              <Card className="flex flex-col">
                <CardHeader>
                  <CardTitle className="text-2xl font-bold">Afinación Clásica</CardTitle>
                  <p className="text-3xl font-bold text-primary">Desde $1,999</p>
                </CardHeader>
                <CardContent className="flex-grow">
                  <ul className="space-y-3 text-left text-muted-foreground">
                    <li className="flex items-start gap-3"><CheckCircle className="h-5 w-5 text-green-500 mt-0.5 shrink-0" /><span>Cambio de aceite de motor</span></li>
                    <li className="flex items-start gap-3"><CheckCircle className="h-5 w-5 text-green-500 mt-0.5 shrink-0" /><span>Cambio de filtro de aire</span></li>
                    <li className="flex items-start gap-3"><CheckCircle className="h-5 w-5 text-green-500 mt-0.5 shrink-0" /><span>Cambio de filtro de gasolina</span></li>
                    <li className="flex items-start gap-3"><CheckCircle className="h-5 w-5 text-green-500 mt-0.5 shrink-0" /><span>Cambio de filtro de aceite</span></li>
                    <li className="flex items-start gap-3"><CheckCircle className="h-5 w-5 text-green-500 mt-0.5 shrink-0" /><span>Cambio de bujías</span></li>
                    <li className="flex items-start gap-3"><CheckCircle className="h-5 w-5 text-green-500 mt-0.5 shrink-0" /><span>Lavado de inyectores con boya</span></li>
                    <li className="flex items-start gap-3"><CheckCircle className="h-5 w-5 text-green-500 mt-0.5 shrink-0" /><span>Lavado de cuerpo de aceleración no electrónico</span></li>
                    <li className="flex items-start gap-3"><CheckCircle className="h-5 w-5 text-green-500 mt-0.5 shrink-0" /><span>Revisión y relleno de niveles hasta 250ml.</span></li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="flex flex-col border-primary border-2 ring-4 ring-primary/20">
                <CardHeader>
                  <CardTitle className="text-2xl font-bold">Afinación Integral</CardTitle>
                  <p className="text-3xl font-bold text-primary">Desde $2,999</p>
                </CardHeader>
                <CardContent className="flex-grow">
                   <ul className="space-y-3 text-left text-muted-foreground">
                    <li className="flex items-start gap-3"><CheckCircle className="h-5 w-5 text-green-500 mt-0.5 shrink-0" /><span>Cambio de aceite de motor</span></li>
                    <li className="flex items-start gap-3"><CheckCircle className="h-5 w-5 text-green-500 mt-0.5 shrink-0" /><span>Cambio de filtro de aire</span></li>
                    <li className="flex items-start gap-3"><CheckCircle className="h-5 w-5 text-green-500 mt-0.5 shrink-0" /><span>Cambio de filtro de gasolina</span></li>
                    <li className="flex items-start gap-3"><CheckCircle className="h-5 w-5 text-green-500 mt-0.5 shrink-0" /><span>Cambio de filtro de aceite</span></li>
                    <li className="flex items-start gap-3"><CheckCircle className="h-5 w-5 text-green-500 mt-0.5 shrink-0" /><span>Cambio de bujías</span></li>
                    <li className="flex items-start gap-3"><CheckCircle className="h-5 w-5 text-green-500 mt-0.5 shrink-0" /><span>Lavado de inyectores con laboratorio y ultrasonido</span></li>
                    <li className="flex items-start gap-3"><CheckCircle className="h-5 w-5 text-green-500 mt-0.5 shrink-0" /><span>Lavado de cuerpo de aceleración no electrónico y válvula IAC</span></li>
                    <li className="flex items-start gap-3"><CheckCircle className="h-5 w-5 text-green-500 mt-0.5 shrink-0" /><span>Calibración, rotación y alineación de llantas</span></li>
                    <li className="flex items-start gap-3"><CheckCircle className="h-5 w-5 text-green-500 mt-0.5 shrink-0" /><span>Lavado de motor</span></li>
                    <li className="flex items-start gap-3"><CheckCircle className="h-5 w-5 text-green-500 mt-0.5 shrink-0" /><span>Lavado y aspirado de vehículo</span></li>
                    <li className="flex items-start gap-3"><CheckCircle className="h-5 w-5 text-green-500 mt-0.5 shrink-0" /><span>Diagnostico por Computadora</span></li>
                    <li className="flex items-start gap-3"><CheckCircle className="h-5 w-5 text-green-500 mt-0.5 shrink-0" /><span>Revisión y relleno de niveles hasta 500ml.</span></li>
                    <li className="flex items-start gap-3"><CheckCircle className="h-5 w-5 text-green-500 mt-0.5 shrink-0" /><span>Revisión de puntos de seguridad</span></li>
                    <li className="flex items-start gap-3"><CheckCircle className="h-5 w-5 text-green-500 mt-0.5 shrink-0" /><span>Transporte de Cortesia</span></li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Fleet Services Section */}
        <section id="flotillas" className="bg-background py-16 sm:py-24">
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
                     <a
                      href={`https://wa.me/${workshopPhone}?text=Hola%2C%20me%20gustar%C3%ADa%20recibir%20informaci%C3%B3n%20sobre%20el%20servicio%20para%20flotillas.`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                       <MessageSquare className="mr-2 h-5 w-5" />
                      Contactar para Flotillas
                    </a>
                  </Button>
                </div>
              </div>
              <div className="flex justify-center">
                <Image
                  src="/ranoro2.jpg"
                  alt="Servicio a flotillas"
                  width={600}
                  height={400}
                  className="rounded-lg shadow-xl"
                />
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-background">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 py-8 md:flex-row md:px-6">
          <div className="text-center md:text-left">
            <p className="text-sm font-semibold">Sistema de Administración de Talleres Ranoro®</p>
            <p className="text-sm text-muted-foreground">Diseñado y Desarrollado por Arturo Valdelamar 4493930914</p>
          </div>
          <div className="text-center md:text-right">
             <Button variant="outline" asChild>
                <Link href="/login">Acceso</Link>
             </Button>
          </div>
        </div>
      </footer>
    </div>
  );
}
