
"use client";
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BrainCircuit, Rocket, CheckCircle } from 'lucide-react';
import { AnimatedDiv } from './AnimatedDiv';
import { GeminiLogo } from './GeminiLogo';

export function AiFeaturesSection() {
    return (
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
    );
}
