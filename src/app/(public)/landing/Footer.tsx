"use client";
import React from 'react';
import Link from 'next/link';
import Image from "next/image";
import { Icon } from '@iconify/react';

export function Footer() {
    return (
        <footer className="bg-[#09090b] text-white print:hidden border-t border-white/5 relative overflow-hidden">
            {/* Soft decorative glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-2xl h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
            
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 lg:gap-8 mb-16">
                    <div className="col-span-1 lg:col-span-2">
                        <Link href="/" className="relative inline-block w-[160px] h-[45px] transition-transform hover:scale-105 duration-300">
                            <Image
                              src="/ranoro-logo.png"
                              alt="Ranoro Logo"
                              fill
                              style={{objectFit: 'contain'}}
                              sizes="160px"
                              priority
                            />
                        </Link>
                        <p className="mt-6 text-slate-400 max-w-sm font-light leading-relaxed">
                          La experiencia y tecnología que tu vehículo merece, concentrada en un solo lugar. Más de 7 años garantizando la seguridad en el camino.
                        </p>
                        <div className="flex gap-4 mt-8">
                             <a href="https://www.facebook.com/ranoromecanica" target="_blank" rel="noopener noreferrer" className="h-10 w-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-[#1877F2] hover:text-white transition-all text-slate-300" aria-label="Facebook de Ranoro">
                                <Icon icon="simple-icons:facebook" className="w-5 h-5"/>
                             </a>
                             <a href="https://www.instagram.com/ranoromecanica" target="_blank" rel="noopener noreferrer" className="h-10 w-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-gradient-to-br hover:from-[#f09433] hover:to-[#bc1888] hover:text-white transition-all text-slate-300" aria-label="Instagram de Ranoro">
                                <Icon icon="simple-icons:instagram" className="w-5 h-5"/>
                             </a>
                             <a href="https://wa.me/524491425323" target="_blank" rel="noopener noreferrer" className="h-10 w-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-[#25D366] hover:text-white transition-all text-slate-300" aria-label="WhatsApp de Ranoro">
                                <Icon icon="simple-icons:whatsapp" className="w-5 h-5"/>
                             </a>
                        </div>
                    </div>

                    <div>
                        <h4 className="font-semibold text-white tracking-wider uppercase text-sm mb-6 flex items-center gap-2">
                            <Icon icon="solar:widget-3-bold-duotone" className="text-primary w-4 h-4"/> Servicios
                        </h4>
                        <ul className="space-y-4">
                            <li><Link href="#services" className="text-slate-400 hover:text-primary transition-colors text-sm font-medium">Mecánica General</Link></li>
                            <li><Link href="#services" className="text-slate-400 hover:text-primary transition-colors text-sm font-medium">Hojalatería y Pintura</Link></li>
                            <li><Link href="#services" className="text-slate-400 hover:text-primary transition-colors text-sm font-medium">Diagnóstico Avanzado</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-semibold text-white tracking-wider uppercase text-sm mb-6 flex items-center gap-2">
                            <Icon icon="solar:info-circle-bold-duotone" className="text-primary w-4 h-4"/> Nosotros
                        </h4>
                        <ul className="space-y-4">
                            <li><Link href="#why-ranoro" className="text-slate-400 hover:text-primary transition-colors text-sm font-medium">¿Por qué Ranoro?</Link></li>
                            <li><Link href="#testimonials" className="text-slate-400 hover:text-primary transition-colors text-sm font-medium">Testimonios</Link></li>
                            <li><Link href="#location" className="text-slate-400 hover:text-primary transition-colors text-sm font-medium">Ubicación y Horarios</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-semibold text-white tracking-wider uppercase text-sm mb-6 flex items-center gap-2">
                            <Icon icon="solar:shield-check-bold-duotone" className="text-primary w-4 h-4"/> Legal
                        </h4>
                        <ul className="space-y-4">
                            <li><Link href="/legal/terminos" className="text-slate-400 hover:text-primary transition-colors text-sm font-medium">Términos de Servicio</Link></li>
                            <li><Link href="/legal/privacidad" className="text-slate-400 hover:text-primary transition-colors text-sm font-medium">Políticas de Privacidad</Link></li>
                            <li><Link href="/login" className="text-slate-400 hover:text-primary transition-colors text-sm font-medium">Acceso Administrativo</Link></li>
                        </ul>
                    </div>
                </div>

                <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
                    <p className="text-slate-500 text-sm font-medium">
                        © {new Date().getFullYear()} Servicio Profesional Ranoro Taller. Todos los derechos reservados.
                    </p>
                    <p className="text-slate-500 text-sm font-medium flex items-center gap-1">
                        Desarrollado con <Icon icon="solar:heart-bold" className="text-red-500 w-4 h-4 mx-1"/> por 
                        <a href="https://valdelamar.com.mx" target="_blank" rel="noopener noreferrer" className="text-slate-300 hover:text-white transition-colors ml-1 font-semibold">
                            Arturo Valdelamar
                        </a>
                    </p>
                </div>
            </div>
        </footer>
    );
}
