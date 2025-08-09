
"use client";
import React from 'react';
import Image from "next/image";
import { AnimatedDiv } from './AnimatedDiv';

const logos = [
  { name: 'AutoPRO CDMX', src: '/logos/autopro.png' },
  { name: 'ServiExpress Bogotá', src: '/logos/serviexpress.png' },
  { name: 'Garaje Central Santiago', src: '/logos/garajecentral.png' },
  { name: 'Taller Rápido Lima', src: '/logos/rapido.png' },
  { name: 'Maestros del Motor', src: '/logos/maestros.png' },
  { name: 'Soluciones Automotrices', src: '/logos/soluciones.png' },
];

export function TrustedBySection() {
    return (
        <section className="py-12 bg-white">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <AnimatedDiv>
                    <p className="text-center text-sm font-semibold text-gray-500 uppercase tracking-wider">
                        Con la confianza de los mejores talleres de LATAM
                    </p>
                    <div className="mt-6 grid grid-cols-2 gap-8 md:grid-cols-3 lg:grid-cols-6">
                        {logos.map((logo) => (
                        <div key={logo.name} className="col-span-1 flex justify-center items-center">
                            <div className="relative h-12 w-32 grayscale transition-all duration-300 hover:grayscale-0">
                                <Image
                                    src={logo.src}
                                    alt={logo.name}
                                    fill
                                    style={{ objectFit: 'contain' }}
                                    sizes="128px"
                                />
                            </div>
                        </div>
                        ))}
                    </div>
                </AnimatedDiv>
            </div>
        </section>
    );
}
