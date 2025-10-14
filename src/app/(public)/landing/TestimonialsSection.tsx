"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { AnimatedDiv } from './AnimatedDiv';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@iconify/react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const testimonials = [
    { quote: "Precio justo y me explicaron todo el proceso. Muy transparentes.", author: "Carlos M." },
    { quote: "La pintura de mi puerta quedó como nueva, igualaron el color perfectamente.", author: "Laura R." },
    { quote: "Después de la afinación, mi auto gasta menos gasolina. Excelente servicio.", author: "Ernesto P." },
    { quote: "Llevé mi carro por un ruido en la suspensión y lo arreglaron el mismo día. ¡Impresionante!", author: "Sofía G." },
    { quote: "El diagnóstico por computadora fue rápido y preciso. Me ahorraron mucho dinero.", author: "Javier T." },
    { quote: "Tenía un golpe fuerte en la salpicadera y el trabajo de hojalatería fue impecable.", author: "Mariana V." },
    { quote: "Siempre amables y profesionales. Me mantienen informado con fotos por WhatsApp.", author: "Ricardo J." },
    { quote: "La garantía que ofrecen me dio mucha confianza. Se nota que respaldan su trabajo.", author: "Ana L." },
    { quote: "Repararon el plástico de mi fascia y quedó increíble. No tuve que comprar una nueva.", author: "David S." },
    { quote: "El mejor servicio de frenos que he recibido en Aguascalientes. Mi coche frena como nuevo.", author: "Verónica C." },
    { quote: "Me ayudaron con un problema eléctrico que otros dos talleres no pudieron resolver.", author: "Fernando A." },
    { quote: "Excelente atención al cliente. Son mi taller de confianza desde hace años.", author: "Gabriela E." },
    { quote: "El servicio de flotillas es muy eficiente. Siempre tienen mis unidades listas a tiempo.", author: "Transportes Veloz" },
    { quote: "El pulido y encerado dejó mi coche como de agencia. ¡Súper recomendado!", author: "Isabel N." },
    { quote: "Tenía un problema con el aire acondicionado y lo solucionaron rápido. ¡Gracias!", author: "Miguel H." },
    { quote: "Me encanta que me expliquen con detalle qué le hacen a mi coche. Genera mucha confianza.", author: "Patricia D." },
    { quote: "El personal es muy honesto. Me dijeron que una reparación podía esperar, en lugar de venderme algo innecesario.", author: "Óscar B." },
    { quote: "La calidad de la pintura es de primera. El acabado es perfecto y duradero.", author: "Mónica F." },
    { quote: "Mi auto se sobrecalentaba y encontraron la fuga en el sistema de enfriamiento que nadie más veía.", author: "Jorge Z." },
    { quote: "Me dieron un coche de cortesía mientras el mío estaba en reparación. ¡Un gran detalle!", author: "Adriana M." },
    { quote: "El cambio de amortiguadores hizo una diferencia enorme en la comodidad de mi auto.", author: "Luis Q." },
    { quote: "Son muy puntuales con los tiempos de entrega que prometen.", author: "Daniela R." },
    { quote: "Me salvaron con una reparación de emergencia en la dirección. Muy agradecida.", author: "Carolina P." },
    { quote: "Siempre utilizan refacciones de buena calidad. Se nota en el desempeño del coche.", author: "Andrés V." },
    { quote: "El trato es personalizado. Se acuerdan de mi coche y su historial.", author: "Raquel S." },
    { quote: "El taller está muy limpio y ordenado, algo que no se ve en todos lados.", author: "Marcos G." },
    { quote: "La comunicación por WhatsApp es súper práctica para autorizar trabajos y ver avances.", author: "Liliana T." },
    { quote: "Me repararon una abolladura sin necesidad de pintar. Un trabajo de artesanos.", author: "José C." },
    { quote: "Excelente relación calidad-precio. Sientes que tu dinero rinde.", author: "Paola I." },
    { quote: "Finalmente encontré un taller en Aguascalientes en el que puedo confiar ciegamente.", author: "Francisco L." },
];

const ITEMS_PER_PAGE = 4;

export function TestimonialsSection() {
    const [currentPage, setCurrentPage] = useState(0);
    const totalPages = Math.ceil(testimonials.length / ITEMS_PER_PAGE);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentPage((prevPage) => (prevPage + 1) % totalPages);
        }, 15000); // 15 seconds
        return () => clearInterval(timer);
    }, [totalPages]);
    
    const goToNextPage = () => {
        setCurrentPage((prevPage) => (prevPage + 1) % totalPages);
    };

    const goToPrevPage = () => {
        setCurrentPage((prevPage) => (prevPage - 1 + totalPages) % totalPages);
    };

    const currentTestimonials = testimonials.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE);

    return (
        <section id="testimonials" className="py-20 md:py-28 bg-white">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                 <AnimatedDiv className="text-center max-w-3xl mx-auto">
                    <h2 className="text-3xl md:text-4xl font-extrabold">Lo que dicen nuestros clientes</h2>
                </AnimatedDiv>
                <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-8 min-h-[450px]">
                    {currentTestimonials.map((testimonial, index) => (
                        <AnimatedDiv key={`${currentPage}-${index}`}>
                            <Card className="border-l-4 border-primary h-full shadow-lg hover:shadow-xl transition-shadow">
                                <CardContent className="p-6">
                                    <div className="flex gap-1 text-yellow-400 mb-2">
                                        {[...Array(5)].map((_, i) => (
                                            <Icon key={i} icon="twemoji:star" className="h-5 w-5"/>
                                        ))}
                                    </div>
                                    <blockquote className="text-lg italic text-muted-foreground">“{testimonial.quote}”</blockquote>
                                    <p className="mt-4 font-semibold text-right">— {testimonial.author}</p>
                                </CardContent>
                            </Card>
                        </AnimatedDiv>
                    ))}
                </div>

                <div className="flex justify-center items-center mt-8 gap-4">
                    <Button variant="outline" size="icon" onClick={goToPrevPage} aria-label="Anterior">
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground">
                        Página {currentPage + 1} de {totalPages}
                    </span>
                    <Button variant="outline" size="icon" onClick={goToNextPage} aria-label="Siguiente">
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>

                <AnimatedDiv className="text-center mt-12">
                    <Button asChild size="lg" variant="outline">
                        <Link href="https://share.google/oBweULXW1ADrwdoY8" target="_blank" rel="noopener noreferrer">
                            <Icon icon="logos:google-icon" className="mr-2 h-5 w-5"/>
                            Ver más reseñas en Google
                        </Link>
                    </Button>
                </AnimatedDiv>
                 <div className="mt-16 pt-10 border-t border-gray-200 flex flex-wrap justify-center items-center gap-x-8 gap-y-4">
                    <Badge variant="secondary" className="px-4 py-2 text-base">4.9 de 5 estrellas</Badge>
                    <Badge variant="secondary" className="px-4 py-2 text-base">100+ reseñas</Badge>
                    <Badge variant="secondary" className="px-4 py-2 text-base">15+ años de experiencia</Badge>
                    <Badge variant="secondary" className="px-4 py-2 text-base">5,000+ vehículos atendidos</Badge>
                </div>
            </div>
        </section>
    );
}
