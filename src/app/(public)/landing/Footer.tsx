
"use client";
import React from 'react';
import Link from 'next/link';
import Image from "next/image";

export function Footer() {
    return (
        <footer className="bg-gray-900 text-white print:hidden">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
                    <div className="col-span-2 lg:col-span-2">
                        <Link href="/" className="relative inline-block w-[140px] h-[40px]">
                            <Image
                              src="/ranoro-logo.png"
                              alt="Ranoro Logo"
                              fill
                              style={{objectFit: 'contain'}}
                              sizes="140px"
                              data-ai-hint="ranoro logo"
                            />
                        </Link>
                        <p className="mt-4 text-gray-400 max-w-xs">
                          Taller mecánico, de hojalatería y pintura en Aguascalientes.
                        </p>
                    </div>
                    <div><h4 className="font-semibold tracking-wider uppercase text-sm">Servicios</h4><ul className="mt-4 space-y-3"><li><Link href="#services" className="text-gray-400 hover:text-white">Mecánica</Link></li><li><Link href="#services" className="text-gray-400 hover:text-white">Hojalatería</Link></li></ul></div>
                    <div><h4 className="font-semibold tracking-wider uppercase text-sm">Nosotros</h4><ul className="mt-4 space-y-3"><li><Link href="#why-ranoro" className="text-gray-400 hover:text-white">¿Por qué Ranoro?</Link></li><li><Link href="#location" className="text-gray-400 hover:text-white">Ubicación</Link></li></ul></div>
                    <div><h4 className="font-semibold tracking-wider uppercase text-sm">Legal</h4><ul className="mt-4 space-y-3"><li><Link href="/legal/terminos" className="text-gray-400 hover:text-white">Términos</Link></li><li><Link href="/legal/privacidad" className="text-gray-400 hover:text-white">Privacidad</Link></li></ul></div>
                </div>
                <div className="mt-8 border-t border-gray-800 pt-8 text-center text-gray-500 text-sm">
                    <p>© 2025 Servicio Profesional Ranoro Taller. Todos los derechos reservados.</p>
                    <p>Desarrollado por <a href="https://valdelamar.com.mx" target="_blank" rel="noopener noreferrer" className="hover:text-white">Arturo Valdelamar</a></p>
                </div>
            </div>
        </footer>
    );
}
