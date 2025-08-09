
"use client";

import React from 'react';
import Image from 'next/image';
import { AnimatedDiv } from './AnimatedDiv';

const logos = [
  { src: '/logos/taller1.png', alt: 'Taller 1' },
  { src: '/logos/taller2.png', alt: 'Taller 2' },
  { src: '/logos/taller3.png', alt: 'Taller 3' },
  { src: '/logos/taller4.png', alt: 'Taller 4' },
  { src: '/logos/taller5.png', alt: 'Taller 5' },
];

export function LatamWorkshops() {
  return (
    <div className="py-12 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <AnimatedDiv>
          <p className="text-center text-sm font-semibold text-gray-500 uppercase tracking-wider mb-8">
            Con la confianza de los mejores talleres de LATAM
          </p>
          <div className="relative w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,white_10%,white_90%,transparent)]">
            <div className="flex animate-scroll">
              {[...logos, ...logos].map((logo, index) => (
                <div key={index} className="flex-shrink-0 mx-6" style={{ width: '150px' }}>
                  <div className="relative h-20">
                    <Image
                      src={logo.src}
                      alt={logo.alt}
                      fill
                      style={{ objectFit: 'contain' }}
                      className="grayscale hover:grayscale-0 transition-all duration-300"
                      sizes="150px"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </AnimatedDiv>
      </div>
    </div>
  );
}
