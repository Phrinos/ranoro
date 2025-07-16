

"use client";

import Link from 'next/link';
import Image from "next/image";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CheckCircle, Wrench, Package, LineChart, BrainCircuit, Rocket, Target, Users, BookOpen, Shield, DollarSign, DatabaseZap, Truck } from 'lucide-react';
import React, { useRef } from 'react';
import { useIntersectionObserver } from '@/hooks/use-intersection-observer';
import { cn } from '@/lib/utils';

const faqItems = [
    {
        question: "¿Puedo cambiar de plan en cualquier momento?",
        answer: "¡Claro! Puedes cambiar tu plan (subir o bajar) cuando lo necesites desde el panel de configuración de tu cuenta. El cobro se ajustará de forma prorrateada en tu siguiente ciclo de facturación."
    },
    {
        question: "¿Qué pasa cuando termina mi prueba gratuita?",
        answer: "Al finalizar tus 14 días de prueba, te pediremos que elijas un plan y añadas un método de pago para continuar usando Ranoro. No te cobraremos nada automáticamente. Si decides no continuar, tus datos se conservarán por 30 días antes de ser eliminados."
    },
    {
        question: "¿Cómo funciona la facturación del Add-on de SAT?",
        answer: "El Add-on de SAT funciona con un sistema de prepago de folios (timbres fiscales). Puedes comprar paquetes de folios directamente desde la plataforma. No hay cargos mensuales fijos, solo pagas por lo que usas."
    },
    {
        question: "¿Ofrecen soporte para la migración de datos?",
        answer: "Sí. Ofrecemos importación a través de plantillas de Excel para todos los planes. Para los clientes del plan Premium, ofrecemos una migración asistida por nuestro equipo y potenciada por IA para hacer el proceso lo más sencillo posible."
    }
];

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

const GeminiLogo = (props: React.SVGProps<SVGSVGElement>) => (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path d="M20 0L8.858 11.142L20 22.284L31.142 11.142L20 0Z" fill="#8E43E7"/>
        <path d="M20 40L8.858 28.858L20 17.716L31.142 28.858L20 40Z" fill="#6011C4"/>
        <path d="M4.429 15.571L0 20L4.429 24.429L8.858 20L4.429 15.571Z" fill="#C4B0F3"/>
    </svg>
);


const AnimatedDiv = ({ children, className }: { children: React.ReactNode, className?: string }) => {
    const ref = useRef<HTMLDivElement>(null);
    const isVisible = useIntersectionObserver(ref, { threshold: 0.1 });
    return (
        <div ref={ref} className={cn("transition-all duration-700", isVisible ? `opacity-100 translate-y-0` : "opacity-0 translate-y-5", className)}>
            {children}
        </div>
    );
};

export default function LandingPage() {
  const [vehicleVolume, setVehicleVolume] = React.useState('150');

  return (
    <div className="bg-background text-foreground">
      <header className="sticky top-0 z-50 bg-white border-b">
        <div className="container mx-auto flex h-20 items-center justify-between px-4 md:px-6">
          <Link href="/" className="relative w-[140px] h-[40px]">
            <Image
              src="/ranoro-logo.png"
              alt="Ranoro Logo"
              fill
              style={{objectFit: 'contain'}}
              className="dark:invert"
              priority
              sizes="(max-width: 768px) 120px, 140px"
              data-ai-hint="ranoro logo"
            />
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            <Button variant="ghost" asChild><Link href="#features">Funciones</Link></Button>
            <Button variant="ghost" asChild><Link href="#benefits">Beneficios</Link></Button>
            <Button variant="ghost" asChild><Link href="#why-ranoro">Por qué Ranoro</Link></Button>
            <Button variant="ghost" asChild><Link href="#pricing">Precios</Link></Button>
            <Button variant="ghost" asChild><Link href="#testimonials">Testimonios</Link></Button>
            <Button variant="ghost" asChild><Link href="#faq">FAQ</Link></Button>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild>
                <Link href="/login">Registrarte / Iniciar Sesión</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="relative w-full h-[70vh] sm:h-[80vh] flex items-center justify-start text-left text-white overflow-hidden">
          <div className="absolute inset-0 z-0">
            <Image
              src="/home.png"
              alt="Taller mecánico moderno con un coche deportivo"
              fill
              className="object-cover object-center"
              priority
              sizes="100vw"
              data-ai-hint="mechanic workshop"
            />
            <div className="absolute inset-0 bg-black/60 bg-gradient-to-t from-black/70 via-black/40 to-transparent"></div>
          </div>
          <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8">
            <AnimatedDiv><Badge variant="secondary" className="mb-4 bg-white/10 text-white border-white/20 px-4 py-2 text-base sm:px-6 sm:py-3 sm:text-lg">La evolución de la gestión automotriz</Badge></AnimatedDiv>
            <AnimatedDiv><h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl text-shadow">
              El sistema operativo <span className="text-primary">inteligente</span><br/> para tu taller mecánico.
            </h1></AnimatedDiv>
            <AnimatedDiv><p className="mt-6 max-w-xl text-lg text-gray-200 text-shadow">
              Desde la recepción hasta la facturación, Ranoro centraliza tus operaciones y usa IA para que tomes decisiones más rentables.
            </p></AnimatedDiv>
            <AnimatedDiv><div className="mt-8 flex flex-col sm:flex-row justify-start items-start gap-4">
              <Button size="lg" asChild>
                <Link href="/login">Pruébalo gratis por 14 días</Link>
              </Button>
              <Button size="lg" variant="outline" className="bg-white/10 border-white/20 hover:bg-white/20" asChild>
                  <Link href="#features">Descubre las funciones</Link>
              </Button>
            </div></AnimatedDiv>
          </div>
        </section>

        <section className="py-12 bg-white">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <AnimatedDiv>
                <p className="text-center text-sm font-semibold text-gray-500 uppercase tracking-wider">
                    Con la confianza de los mejores talleres de LATAM
                </p>
              </AnimatedDiv>
            </div>
        </section>

        <section id="ai-power" className="bg-white pt-12 pb-20 md:pt-16 md:pb-28">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <AnimatedDiv className="text-center flex flex-col items-center">
                    <GeminiLogo className="mb-4" />
                    <h2 className="text-2xl font-bold tracking-tight text-gray-500">Impulsado por</h2>
                    <p className="text-5xl font-extrabold tracking-tight">
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-500 to-red-500">
                            Google Gemini
                        </span>
                    </p>
                    <p className="mt-4 text-lg max-w-2xl text-foreground">
                        Ranoro utiliza los modelos de IA más avanzados de Google para darte una ventaja competitiva.
                    </p>
                </AnimatedDiv>
                
                <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
                    <AnimatedDiv>
                        <Card className="h-full">
                            <CardHeader>
                                <BrainCircuit className="h-8 w-8 text-primary mb-2"/>
                                <CardTitle>Análisis y Diagnóstico</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground">La IA analiza el historial de servicios de vehículos similares para sugerir cotizaciones precisas y rentables, estimar tiempos de reparación y recomendar las refacciones necesarias para el trabajo.</p>
                            </CardContent>
                        </Card>
                    </AnimatedDiv>
                    <AnimatedDiv>
                        <Card className="h-full">
                            <CardHeader>
                                <Rocket className="h-8 w-8 text-primary mb-2"/>
                                <CardTitle>Optimización de Operaciones</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground">Ranoro predice la capacidad de tu taller basándose en las horas-hombre de tus técnicos y los servicios agendados, ayudándote a evitar cuellos de botella y maximizar la productividad.</p>
                            </CardContent>
                        </Card>
                    </AnimatedDiv>
                    <AnimatedDiv>
                        <Card className="h-full">
                            <CardHeader>
                                <CheckCircle className="h-8 w-8 text-primary mb-2"/>
                                <CardTitle>Comunicación Profesional</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground">Mejora automáticamente la redacción de notas y descripciones para el cliente, corrigiendo errores y usando un lenguaje claro y profesional, elevando la percepción de calidad de tu servicio.</p>
                            </CardContent>
                        </Card>
                    </AnimatedDiv>
                </div>
            </div>
        </section>
        
        <section id="features" className="py-20 md:py-28 bg-muted/50">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <AnimatedDiv className="text-center max-w-3xl mx-auto">
              <Badge variant="secondary" className="mb-4 px-4 py-2 text-base sm:px-6 sm:py-3 sm:text-lg">Todo en un solo lugar</Badge>
              <h2 className="text-3xl md:text-4xl font-extrabold">Funciones Diseñadas para Ti</h2>
            </AnimatedDiv>
            <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <AnimatedDiv><Card><CardHeader><Wrench className="h-8 w-8 text-primary"/><CardTitle>Gestión de Servicios</CardTitle></CardHeader><CardContent><p className="text-muted-foreground">Desde la cita hasta la entrega, todo en un solo flujo de trabajo.</p></CardContent></Card></AnimatedDiv>
              <AnimatedDiv><Card><CardHeader><Package className="h-8 w-8 text-primary"/><CardTitle>Control de Inventario</CardTitle></CardHeader><CardContent><p className="text-muted-foreground">Maneja tu stock, proveedores y compras de forma inteligente.</p></CardContent></Card></AnimatedDiv>
              <AnimatedDiv><Card><CardHeader><DollarSign className="h-8 w-8 text-primary"/><CardTitle>Finanzas Claras</CardTitle></CardHeader><CardContent><p className="text-muted-foreground">Reportes de ingresos y rentabilidad para tomar decisiones informadas.</p></CardContent></Card></AnimatedDiv>
              <AnimatedDiv><Card><CardHeader><Truck className="h-8 w-8 text-primary"/><CardTitle>Módulo de Flotillas</CardTitle></CardHeader><CardContent><p className="text-muted-foreground">Administra rentas, pagos y mantenimientos de tus flotillas de vehículos.</p></CardContent></Card></AnimatedDiv>
            </div>
          </div>
        </section>

        <section id="benefits" className="py-20 md:py-28 bg-white">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <AnimatedDiv className="text-center max-w-3xl mx-auto">
                    <Badge variant="secondary" className="mb-4 px-4 py-2 text-base sm:px-6 sm:py-3 sm:text-lg">Beneficios Claros</Badge>
                    <h2 className="text-3xl md:text-4xl font-extrabold">Resultados Tangibles para tu Taller</h2>
                </AnimatedDiv>
                <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 text-center">
                    <AnimatedDiv><Card><CardHeader><Users className="mx-auto h-10 w-10 text-primary mb-2"/><CardTitle>Sin personal extra</CardTitle></CardHeader><CardContent><p className="text-muted-foreground">Con tu equipo actual y Ranoro, cubres tareas de atención, comunicación y gestión eficientemente.</p></CardContent></Card></AnimatedDiv>
                    <AnimatedDiv><Card><CardHeader><LineChart className="mx-auto h-10 w-10 text-primary mb-2"/><CardTitle>Optimización de ingresos</CardTitle></CardHeader><CardContent><p className="text-muted-foreground">La comunicación proactiva incentiva visitas y servicios adicionales.</p></CardContent></Card></AnimatedDiv>
                    <AnimatedDiv><Card><CardHeader><CheckCircle className="mx-auto h-10 w-10 text-primary mb-2"/><CardTitle>Experiencia premium</CardTitle></CardHeader><CardContent><p className="text-muted-foreground">Tus clientes sentirán el trato de agencia: profesionalismo, tecnología y cuidado.</p></CardContent></Card></AnimatedDiv>
                    <AnimatedDiv><Card><CardHeader><Target className="mx-auto h-10 w-10 text-primary mb-2"/><CardTitle>Visión estratégica</CardTitle></CardHeader><CardContent><p className="text-muted-foreground">Datos utilizables que maximizan la rentabilidad y fidelización de tus clientes.</p></CardContent></Card></AnimatedDiv>
                </div>
            </div>
        </section>

        <section id="why-ranoro" className="py-20 md:py-28 bg-muted/50">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <AnimatedDiv className="text-center max-w-3xl mx-auto">
                <h2 className="text-3xl md:text-4xl font-extrabold">¿Por qué elegir Ranoro?</h2>
            </AnimatedDiv>
            <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <AnimatedDiv className="text-center"><BookOpen className="mx-auto h-10 w-10 text-primary mb-2"/><h4 className="font-bold text-lg">Enfoque vertical</h4><p className="text-muted-foreground mt-1">Diseñado exclusivamente para talleres, con herramientas pensadas para tu día a día.</p></AnimatedDiv>
              <AnimatedDiv className="text-center"><DatabaseZap className="mx-auto h-10 w-10 text-primary mb-2"/><h4 className="font-bold text-lg">Migración rápida</h4><p className="text-muted-foreground mt-1">Migra tu información fácil de tus sistemas actuales con nuestro onboarding guiado.</p></AnimatedDiv>
              <AnimatedDiv className="text-center"><DollarSign className="mx-auto h-10 w-10 text-primary mb-2"/><h4 className="font-bold text-lg">Precios accesibles</h4><p className="text-muted-foreground mt-1">Todo incluido sin compromisos ni aumento en nómina.</p></AnimatedDiv>
              <AnimatedDiv className="text-center"><Users className="mx-auto h-10 w-10 text-primary mb-2"/><h4 className="font-bold text-lg">Soporte continuo</h4><p className="text-muted-foreground mt-1">Estamos contigo siempre, con actualizaciones y mejoras constantes.</p></AnimatedDiv>
            </div>
          </div>
        </section>

        <section id="pricing" className="py-20 md:py-28 bg-white">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <AnimatedDiv className="text-center max-w-3xl mx-auto">
                    <Badge variant="secondary" className="mb-4 px-4 py-2 text-base sm:px-6 sm:py-3 sm:text-lg">Precios Claros y Escalables</Badge>
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
                                                    <CheckCircle className={`h-5 w-5 shrink-0 mt-1 ${feature.included ? 'text-green-500' : 'text-gray-300'}`} />
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

        <section id="testimonials" className="py-20 md:py-28 bg-muted/50">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
                 <AnimatedDiv className="text-center max-w-3xl mx-auto">
                    <h2 className="text-3xl md:text-4xl font-extrabold">Casos de Éxito</h2>
                    <p className="mt-4 text-lg text-foreground">Lo que nuestros clientes dicen sobre nosotros.</p>
                </AnimatedDiv>
                <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
                    <AnimatedDiv><Card className="border-l-4 border-primary">
                        <CardContent className="p-6">
                            <p className="text-lg italic">“Gracias a Ranoro, mi taller aumentó un 25 % su volumen de citas recurrentes, sin contratar más.”</p>
                            <p className="mt-4 font-semibold">— Ranoro - Aguascalientes</p>
                        </CardContent>
                    </Card></AnimatedDiv>
                     <AnimatedDiv><Card className="border-l-4 border-primary">
                        <CardContent className="p-6">
                            <p className="text-lg italic">“Las aprobaciones vía url durante los servicios nos ayudaron a incrementar nuestros ingresos en reparaciones unilaterales.”</p>
                            <p className="mt-4 font-semibold">— AutoPRO CDMX</p>
                        </CardContent>
                    </Card></AnimatedDiv>
                     <AnimatedDiv><Card className="border-l-4 border-primary">
                        <CardContent className="p-6">
                            <p className="text-lg italic">"Implementar el reporte fotográfico de seguridad nos ha dado una ventaja competitiva enorme. Los clientes se sienten más seguros."</p>
                            <p className="mt-4 font-semibold">— ServiExpress - Bogotá, Colombia</p>
                        </CardContent>
                    </Card></AnimatedDiv>
                     <AnimatedDiv><Card className="border-l-4 border-primary">
                        <CardContent className="p-6">
                            <p className="text-lg italic">"El análisis de inventario con IA nos ahorró miles en compras innecesarias. Ahora solo compramos lo que de verdad se necesita."</p>
                            <p className="mt-4 font-semibold">— Garaje Central - Santiago, Chile</p>
                        </CardContent>
                    </Card></AnimatedDiv>
                </div>
            </div>
        </section>

        <section id="get-started" className="py-20 md:py-28 bg-white">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
                 <AnimatedDiv className="text-center max-w-3xl mx-auto">
                    <h2 className="text-3xl md:text-4xl font-extrabold">Empieza hoy, sin complicaciones</h2>
                    <p className="mt-4 text-muted-foreground">Nuestro proceso de 4 pasos está diseñado para que transformes tu taller en menos de una hora.</p>
                </AnimatedDiv>
                <AnimatedDiv className="relative mt-16">
                    <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-200" aria-hidden="true"></div>
                    <div className="relative grid grid-cols-1 md:grid-cols-4 gap-8">
                        <div className="text-center"><div className="mx-auto h-12 w-12 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xl border-4 border-white">1</div><h4 className="mt-4 font-semibold">Regístrate</h4><p className="text-sm text-muted-foreground mt-1">Adapta Ranoro a tu taller.</p></div>
                        <div className="text-center"><div className="mx-auto h-12 w-12 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xl border-4 border-white">2</div><h4 className="mt-4 font-semibold">Activa</h4><p className="text-sm text-muted-foreground mt-1">configura metodos de pago y la informacion de tu taller</p></div>
                        <div className="text-center"><div className="mx-auto h-12 w-12 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xl border-4 border-white">3</div><h4 className="mt-4 font-semibold">Capacita</h4><p className="text-sm text-muted-foreground mt-1">Tu equipo listo en menos de 1 hora.</p></div>
                        <div className="text-center"><div className="mx-auto h-12 w-12 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xl border-4 border-white">4</div><h4 className="mt-4 font-semibold">Optimiza</h4><p className="text-sm text-muted-foreground mt-1">Comienza a optimizar tu flujo de trabajo.</p></div>
                    </div>
                </AnimatedDiv>
            </div>
        </section>


        <section id="faq" className="py-20 md:py-28 bg-muted/50">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
                <AnimatedDiv className="text-center">
                    <h2 className="text-3xl md:text-4xl font-extrabold">Preguntas Frecuentes</h2>
                    <p className="mt-4 text-lg text-foreground">Resolvemos tus dudas para que empieces con total confianza.</p>
                </AnimatedDiv>
                <AnimatedDiv className="w-full mt-12 space-y-4">
                  {faqItems.map((item, index) => (
                    <Accordion type="single" collapsible key={index}>
                        <AccordionItem value={`item-${index}`} className="bg-white rounded-xl border px-4 sm:px-6 shadow-sm">
                          <AccordionTrigger className="text-lg font-semibold text-left hover:no-underline">{item.question}</AccordionTrigger>
                          <AccordionContent className="text-base text-foreground">{item.answer}</AccordionContent>
                        </AccordionItem>
                    </Accordion>
                  ))}
                </AnimatedDiv>
            </div>
        </section>
        
        <section className="py-20 md:py-28 bg-gray-800 text-white">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl text-center">
                 <AnimatedDiv>
                    <h2 className="text-3xl md:text-4xl font-extrabold">¿Listo para profesionalizar tu taller?</h2>
                    <p className="mt-4 text-lg text-gray-300">
                        Dale a tus clientes la atención de una agencia, mejora tus ingresos y conserva tu equipo actual.
                    </p>
                    <Button size="lg" className="mt-8" asChild>
                        <Link href="https://wa.me/524493930914" target="_blank" rel="noopener noreferrer">Solicita una demo</Link>
                    </Button>
                 </AnimatedDiv>
            </div>
        </section>
      </main>

      <footer className="bg-gray-900 text-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8">
                <div className="col-span-2 lg:col-span-2">
                    <Link href="#" className="relative inline-block w-[140px] h-[40px]">
                        <Image
                          src="/ranoro-logo-negro.png"
                          alt="Ranoro Logo"
                          fill
                          style={{objectFit: 'contain'}}
                          sizes="140px"
                          data-ai-hint="ranoro logo"
                        />
                    </Link>
                    <p className="mt-4 text-gray-400 max-w-xs">El sistema operativo inteligente para talleres automotrices en Latinoamérica.</p>
                </div>
                <div><h4 className="font-semibold tracking-wider uppercase">Producto</h4><ul className="mt-4 space-y-3"><li><Link href="#features" className="text-gray-400 hover:text-white">Funciones</Link></li><li><Link href="#pricing" className="text-gray-400 hover:text-white">Precios</Link></li></ul></div>
                <div><h4 className="font-semibold tracking-wider uppercase">Recursos</h4><ul className="mt-4 space-y-3"><li><Link href="#faq" className="text-gray-400 hover:text-white">FAQ</Link></li><li><a href="https://wa.me/524493930914" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white">Soporte</a></li></ul></div>
                <div><h4 className="font-semibold tracking-wider uppercase">Legal</h4><ul className="mt-4 space-y-3"><li><Link href="/legal/terminos" className="text-gray-400 hover:text-white">Términos y Condiciones</Link></li><li><Link href="/legal/privacidad" className="text-gray-400 hover:text-white">Aviso de Privacidad</Link></li></ul></div>
                <div><h4 className="font-semibold tracking-wider uppercase">Contacto</h4><ul className="mt-4 space-y-3"><li><a href="mailto:hola@ranoro.mx" className="text-gray-400 hover:text-white">hola@ranoro.mx</a></li></ul></div>
            </div>
            <div className="mt-16 pt-8 border-t border-gray-700 text-center text-gray-500">
                <p>&copy; 2025 Ranoro: Sistema de Administracion Inteligente de Talleres.</p>
                <p>Todos los derechos reservados.</p>
            </div>
        </div>
    </footer>
    </div>
  );
}
