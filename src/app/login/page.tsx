
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
import { signInWithEmailAndPassword } from "firebase/auth";

function LoginPageContent() {
  const [emailLogin, setEmailLogin] = useState("");
  const [passwordLogin, setPasswordLogin] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    console.log("[AUTH-AUDIT] Login Page component mounted.");
    console.log("[AUTH-AUDIT] Auth object status:", auth ? "INITIALIZED" : "NULL");
  }, []);

  const handleLogin = async (event: React.FormEvent) => {
    console.log("[AUTH-AUDIT] handleLogin function triggered via Form Submit.");
    event.preventDefault();
    
    if (isLoading) {
      console.log("[AUTH-AUDIT] handleLogin aborted: already loading.");
      return;
    }
    
    setIsLoading(true);

    const email = emailLogin.trim();
    const password = passwordLogin.trim();

    console.log("[AUTH-AUDIT] Validating credentials format...");
    if (!email || !password) {
      console.warn("[AUTH-AUDIT] Validation failed: empty fields.");
      toast({
        title: "Campos incompletos",
        description: "Ingresa tu correo y contraseña.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    try {
      if (!auth) {
        throw new Error("El módulo Firebase Auth no está disponible en este momento.");
      }

      console.log("[AUTH-AUDIT] Attempting Firebase sign-in for:", email);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      console.log("[AUTH-AUDIT] Sign-in SUCCESS for UID:", userCredential.user.uid);
      
      toast({
        title: "Inicio de sesión exitoso",
        description: "¡Bienvenido de nuevo!",
      });

      const nextUrl = searchParams.get("next") || "/dashboard";
      console.log("[AUTH-AUDIT] Navigating to target URL:", nextUrl);
      
      router.push(nextUrl);
    } catch (error: any) {
      console.error("[AUTH-AUDIT] Login EXCEPTION detected:", error);
      
      const code = error?.code ?? "unknown";
      let description = "No se pudo completar el acceso. Verifica tu conexión.";
      
      if (code === "auth/invalid-credential") {
        description = "Correo o contraseña incorrectos.";
      } else if (code === "auth/network-request-failed") {
        description = "Fallo de red. Revisa si tienes internet o si el dominio está bloqueado.";
      } else if (code === "auth/too-many-requests") {
        description = "Cuenta bloqueada temporalmente por demasiados intentos.";
      }

      toast({
        title: "Error al entrar",
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

            <Button 
              type="submit" 
              className="w-full font-bold" 
              disabled={isLoading}
              onClick={() => console.log("[AUTH-AUDIT] Login Button CLICKED")}
            >
              {isLoading && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              )}
              {isLoading ? "Validando..." : "Ingresar al Sistema"}
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
