
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { auth } from "@/lib/firebaseClient";
import { signInWithEmailAndPassword, setPersistence, browserLocalPersistence } from "firebase/auth";

function LoginPageContent() {
  const [emailLogin, setEmailLogin] = useState("");
  const [passwordLogin, setPasswordLogin] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    console.log("[AUTH-AUDIT] Login Page mounted. Auth initialized:", !!auth);
  }, []);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isLoading) return;
    
    console.log("[AUTH-AUDIT] Starting login process...");
    setIsLoading(true);

    if (!emailLogin.trim() || !passwordLogin.trim()) {
      toast({
        title: "Campos incompletos",
        description: "Ingresa tu correo y contraseña.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    try {
      if (!auth) throw new Error("Firebase Auth no está inicializado.");

      // Forzar persistencia local para producción
      console.log("[AUTH-AUDIT] Setting persistence...");
      await setPersistence(auth, browserLocalPersistence);
      
      console.log("[AUTH-AUDIT] Attempting sign in with email:", emailLogin);
      await signInWithEmailAndPassword(auth, emailLogin, passwordLogin);

      console.log("[AUTH-AUDIT] Sign in success. Notifying user...");
      toast({
        title: "Inicio de sesión exitoso",
        description: "¡Bienvenido de nuevo!",
      });

      const nextUrl = searchParams.get("next") || "/dashboard";
      console.log("[AUTH-AUDIT] Redirecting to:", nextUrl);
      router.push(nextUrl);
    } catch (error: any) {
      console.error("[AUTH-AUDIT] Login error detected:", error);
      const code = error?.code ?? "";
      let description = "Ocurrió un error inesperado al intentar iniciar sesión.";
      
      if (code === "auth/invalid-credential") {
        description = "Las credenciales son incorrectas. Verifica tu correo y contraseña.";
      } else if (code === "auth/network-request-failed") {
        description = "Error de red. Revisa tu conexión a internet o el bloqueo de tu navegador.";
      } else if (code === "auth/unauthorized-domain") {
        description = "Este dominio (ranoro.mx) no está autorizado en la consola de Firebase.";
      } else if (code === "auth/too-many-requests") {
        description = "Demasiados intentos fallidos. La cuenta ha sido bloqueada temporalmente.";
      }

      toast({
        title: "Error al iniciar sesión",
        description: `${description} (${code})`,
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="mx-auto w-full max-w-sm border-none shadow-none">
        <CardHeader className="text-center">
          <Link
            href="/"
            className="mb-4 inline-block relative w-[180px] h-[45px] mx-auto"
          >
            <Image
              src="/ranoro-logo.png"
              alt="Ranoro Logo"
              fill
              style={{ objectFit: "contain" }}
              sizes="180px"
              priority
            />
          </Link>
          <CardDescription className="text-center pt-4">
            Ingresa tus credenciales para acceder al sistema.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form
            onSubmit={handleLogin}
            className="space-y-4 pt-4"
            autoComplete="on"
          >
            <div className="grid gap-2 text-left">
              <Label htmlFor="email-login">Correo electrónico</Label>
              <Input
                id="email-login"
                type="email"
                placeholder="usuario@ranoro.mx"
                autoComplete="email"
                inputMode="email"
                required
                value={emailLogin}
                onChange={(e) => setEmailLogin(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="grid gap-2 text-left">
              <Label htmlFor="password-login">Contraseña</Label>
              <Input
                id="password-login"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                required
                value={passwordLogin}
                onChange={(e) => setPasswordLogin(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              )}
              Ingresar al Sistema
            </Button>

            <p className="pt-2 text-center text-xs text-muted-foreground">
              ¿Olvidaste tu contraseña?{" "}
              <Link href="/recuperar" className="underline underline-offset-4">
                Recuperarla
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-full items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
