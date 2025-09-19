
"use client";
import React from 'react';
import Link from 'next/link';
import Image from "next/image";

export function Footer() {
    return (
        <footer className="bg-gray-900 text-white">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8">
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
                        <p className="mt-4 text-gray-400 max-w-xs">El sistema operativo inteligente para talleres automotrices en Latinoamérica.</p>
                    </div>
                    <div><h4 className="font-semibold tracking-wider uppercase text-sm">Producto</h4><ul className="mt-4 space-y-3"><li><Link href="#features" className="text-gray-400 hover:text-white">Funciones</Link></li><li><Link href="#pricing" className="text-gray-400 hover:text-white">Precios</Link></li></ul></div>
                    <div><h4 className="font-semibold tracking-wider uppercase text-sm">Recursos</h4><ul className="mt-4 space-y-3"><li><Link href="#faq" className="text-gray-400 hover:text-white">FAQ</Link></li><li><a href="https://wa.me/524493930914" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white">Soporte</a></li><li><Link href="/facturar" className="text-gray-400 hover:text-white" target="_blank">Facturación</Link></li></ul></div>
                    <div><h4 className="font-semibold tracking-wider uppercase text-sm">Legal</h4><ul className="mt-4 space-y-3"><li><Link href="/legal/terminos" className="text-gray-400 hover:text-white">Términos y Condiciones</Link></li><li><Link href="/legal/privacidad" className="text-gray-400 hover:text-white">Aviso de Privacidad</Link></li></ul></div>
                    <div><h4 className="font-semibold tracking-wider uppercase text-sm">Contacto</h4><ul className="mt-4 space-y-3"><li><a href="mailto:hola@ranoro.mx" className="text-gray-400 hover:text-white">hola@ranoro.mx</a></li></ul></div>
                </div>
                <div className="mt-16 pt-8 border-t border-gray-700 text-center text-gray-500 text-xs">
                    <p>&copy; 2025 Ranoro: Sistema de Administracion Inteligente de Talleres.</p>
                    <p>Todos los derechos reservados.</p>
                </div>
            </div>
        </footer>
    );
}
