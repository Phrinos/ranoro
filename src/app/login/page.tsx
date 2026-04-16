"use client";

import React, { useState, Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Icon } from '@iconify/react';
import { auth, googleProvider } from "@/lib/firebaseClient";
import { signInWithPopup } from "firebase/auth";

function LoginPageContent() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    console.log("[AUTH-AUDIT] Login Page component mounted (Google Only).");
  }, []);

  const handleGoogleLogin = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      if (!auth || !googleProvider) throw new Error("Servicio de Google no disponible.");
      await signInWithPopup(auth, googleProvider);
      
      toast({
        title: "Autenticando...",
        description: "Validando permisos corporativos...",
      });

      const nextUrl = searchParams.get("next") || "/dashboard";
      router.push(nextUrl);
    } catch (error: any) {
      console.error("Google Auth Error", error);
      if (error?.code !== 'auth/popup-closed-by-user') {
        toast({
          title: "Error al entrar con Google",
          description: "Ocurrió un error al intentar vincular. Por favor intenta de nuevo.",
          variant: "destructive"
        });
      }
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 w-full overflow-hidden">
      
      {/* Lado Izquierdo - Imagen Decorativa */}
      <div className="relative hidden w-1/2 lg:block flex-shrink-0">
        <div className="absolute inset-0 bg-black/10 z-10" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10" />
        <Image
          src="/ranoro1.jpg"
          alt="Taller Mecánico y Flotilla"
          fill
          style={{ objectFit: "cover", objectPosition: "center" }}
          priority
          sizes="50vw"
          className="z-0"
        />
        <div className="absolute bottom-12 left-12 z-20 max-w-lg text-white">
          <h1 className="text-4xl font-extrabold tracking-tight mb-3">Sistemas Ranoro</h1>
          <p className="text-lg text-slate-200 opacity-90 leading-relaxed font-medium">
            Gestión inteligente de talleres, puntos de venta y administración de flotillas corporativas.
          </p>
        </div>
      </div>

      {/* Lado Derecho - Formulario de Login */}
      <div className="flex w-full items-center justify-center p-8 lg:w-1/2 relative bg-white lg:rounded-l-3xl shadow-2xl z-20">
        
        {/* Decals de fondo para look premium */}
        <div className="absolute top-[-10%] right-[-10%] w-[400px] h-[400px] bg-sky-100/50 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[300px] h-[300px] bg-indigo-100/40 rounded-full blur-[80px] pointer-events-none" />

        <div className="mx-auto w-full max-w-sm relative z-30">
          
          <div className="text-center mb-10">
            <Link
              href="/"
              className="inline-block relative w-[220px] h-[60px] mx-auto hover:opacity-90 transition-opacity mb-4"
            >
              <Image
                src="/ranoro-logo.png"
                alt="Ranoro Logo"
                fill
                style={{ objectFit: "contain" }}
                sizes="220px"
                priority
              />
            </Link>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 mb-2">Bienvenido</h2>
            <p className="text-slate-500 font-medium">
              Inicia sesión con tu cuenta corporativa
            </p>
          </div>

          <div className="space-y-6">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleGoogleLogin} 
              disabled={isLoading}
              className="w-full h-14 bg-white border border-slate-200 shadow-sm hover:shadow-md hover:bg-slate-50 text-slate-700 font-semibold gap-3 text-base transition-all duration-300"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
              ) : (
                <Icon icon="logos:google-icon" className="w-5 h-5" />
              )}
              {isLoading ? "Validando accesos..." : "Continuar con Google"}
            </Button>
            
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <p className="text-xs text-slate-500 text-center leading-relaxed font-medium">
                El acceso a esta plataforma está restringido. 
                Solo el personal con cuenta autorizada en la organización puede ingresar.
              </p>
            </div>
          </div>

        </div>

        <div className="absolute bottom-6 text-xs text-slate-400 font-medium text-center w-full max-w-sm left-1/2 -translate-x-1/2">
          &copy; {new Date().getFullYear()} Ranoro Systems. V 2.1.0
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen w-full items-center justify-center bg-white">
          <Loader2 className="h-8 w-8 animate-spin text-sky-600" />
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
