
"use client";
import React from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AnimatedDiv } from './AnimatedDiv';

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

export function FaqSection() {
    return (
        <section id="faq" className="py-20 md:py-28 bg-muted/50">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
                <AnimatedDiv className="text-center">
                    <h2 className="text-3xl md:text-4xl font-extrabold">Preguntas Frecuentes</h2>
                    <p className="mt-4 text-base sm:text-lg text-foreground">Resolvemos tus dudas para que empieces con total confianza.</p>
                </AnimatedDiv>
                <AnimatedDiv className="w-full mt-12 space-y-4">
                  {faqItems.map((item, index) => (
                    <Accordion type="single" collapsible key={index}>
                        <AccordionItem value={`item-${index}`} className="bg-white rounded-xl border px-4 sm:px-6 shadow-sm">
                          <AccordionTrigger className="text-base sm:text-lg font-semibold text-left hover:no-underline">{item.question}</AccordionTrigger>
                          <AccordionContent className="text-sm sm:text-base text-foreground">{item.answer}</AccordionContent>
                        </AccordionItem>
                    </Accordion>
                  ))}
                </AnimatedDiv>
            </div>
        </section>
    );
}
