"use client";

import React, { useState, Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Icon } from '@iconify/react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { auth, googleProvider } from "@/lib/firebaseClient";
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";

function LoginPageContent() {
  const [emailLogin, setEmailLogin] = useState("");
  const [passwordLogin, setPasswordLogin] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    console.log("[AUTH-AUDIT] Login Page component mounted.");
  }, []);

  const handleEmailLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isLoading) return;
    setIsLoading(true);

    const email = emailLogin.trim();
    const password = passwordLogin.trim();

    if (!email || !password) {
      toast({
        title: "Campos incompletos",
        description: "Ingresa tu correo y contraseña.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    try {
      if (!auth) throw new Error("Módulo Auth no disponible.");
      await signInWithEmailAndPassword(auth, email, password);
      
      toast({
        title: "Inicio de sesión exitoso",
        description: "¡Bienvenido de nuevo!",
      });

      const nextUrl = searchParams.get("next") || "/dashboard";
      router.push(nextUrl);
    } catch (error: any) {
      const code = error?.code ?? "unknown";
      let description = "No se pudo completar el acceso.";
      
      if (code === "auth/invalid-credential") description = "Correo o contraseña incorrectos.";
      else if (code === "auth/network-request-failed") description = "Fallo de red. Revisa tu conexión.";
      else if (code === "auth/too-many-requests") description = "Cuenta bloqueada temporalmente.";

      toast({
        title: "Error al entrar",
        description,
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

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

          // Redirect happens within useAuth if successful, otherwise it boots to /acceso-denegado
          const nextUrl = searchParams.get("next") || "/dashboard";
          router.push(nextUrl);
      } catch (error: any) {
          console.error("Google Auth Error", error);
          // If user closed the popup, don't show angry toast
          if (error?.code !== 'auth/popup-closed-by-user') {
              toast({
                  title: "Google Sync Falló",
                  description: "Ocurrió un error al intentar vincular con Google.",
                  variant: "destructive"
              });
          }
          setIsLoading(false);
      }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4 relative overflow-hidden">
      {/* Decals para look premium */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-sky-200/40 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-indigo-200/30 rounded-full blur-[100px] pointer-events-none" />

      <Card className="mx-auto w-full max-w-sm border border-slate-200 shadow-2xl bg-white/80 backdrop-blur-xl relative z-10 transition-all duration-300">
        <CardHeader className="text-center pb-2">
          <Link
            href="/"
            className="mb-6 inline-block relative w-[200px] h-[55px] mx-auto hover:opacity-90 transition-opacity"
          >
            <Image
              src="/ranoro-logo.png"
              alt="Ranoro Logo"
              fill
              style={{ objectFit: "contain" }}
              sizes="200px"
              priority
            />
          </Link>
          <CardDescription className="text-center text-slate-500 font-medium tracking-tight">
            Ingresa tus credenciales corporativas para acceder al panel de administración.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form
            onSubmit={handleEmailLogin}
            className="space-y-4 pt-4"
            autoComplete="on"
          >
            <div className="grid gap-2 text-left">
              <Label htmlFor="email-login" className="text-slate-700">Correo electrónico</Label>
              <Input
                id="email-login"
                type="email"
                placeholder="usuario@ranoro.mx"
                autoComplete="email"
                required
                value={emailLogin}
                onChange={(e) => setEmailLogin(e.target.value)}
                disabled={isLoading}
                className="bg-slate-50 border-slate-200 focus:bg-white transition-colors"
              />
            </div>

            <div className="grid gap-2 text-left">
              <div className="flex items-center justify-between">
                 <Label htmlFor="password-login" className="text-slate-700">Contraseña</Label>
                 <Link href="/recuperar" className="text-xs text-sky-600 hover:text-sky-800 font-medium">
                   ¿Olvidaste tu contraseña?
                 </Link>
              </div>
              <Input
                id="password-login"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                required
                value={passwordLogin}
                onChange={(e) => setPasswordLogin(e.target.value)}
                disabled={isLoading}
                className="bg-slate-50 border-slate-200 focus:bg-white transition-colors"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full font-bold shadow-md hover:shadow-lg transition-all" 
              disabled={isLoading}
            >
              {isLoading && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              )}
              {isLoading ? "Validando..." : "Entrar de forma Segura"}
            </Button>
          </form>

          {/* Separator */}
          <div className="my-6 flex items-center">
             <div className="flex-grow border-t border-slate-200"></div>
             <span className="mx-4 text-xs font-semibold text-slate-400 uppercase tracking-widest">O</span>
             <div className="flex-grow border-t border-slate-200"></div>
          </div>

          {/* Google SSO Button */}
          <div className="flex justify-center">
             <Button 
                type="button" 
                variant="outline" 
                onClick={handleGoogleLogin} 
                disabled={isLoading}
                className="w-14 h-14 rounded-full shadow-sm hover:shadow-md border-slate-200 bg-white group transition-all duration-300 transform hover:-translate-y-1"
             >
                 {isLoading ? (
                     <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                 ) : (
                     <Icon icon="logos:google-icon" className="w-6 h-6 group-hover:scale-110 transition-transform" />
                 )}
             </Button>
          </div>
          <p className="text-center text-[10px] text-slate-400 mt-4 leading-relaxed px-2">
             El acceso mediante Google está restringido al personal con cuentas previamente habilitadas.
          </p>

        </CardContent>
      </Card>
      
      {/* Footer minimalista */}
      <div className="absolute bottom-6 text-xs text-slate-400 font-medium">
         &copy; {new Date().getFullYear()} Ranoro Systems. V 2.1.0
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen w-full items-center justify-center bg-slate-50">
          <Loader2 className="h-8 w-8 animate-spin text-sky-600" />
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
