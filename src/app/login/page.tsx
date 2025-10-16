
// src/app/login/page.tsx
"use client";

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import Image from "next/image";
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { auth } from '@/lib/firebaseClient.js';
import { signInWithEmailAndPassword } from 'firebase/auth';

export default function LoginPage() {
  const [emailLogin, setEmailLogin] = useState('');
  const [passwordLogin, setPasswordLogin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);

    if (!emailLogin.trim() || !passwordLogin.trim()) {
      toast({
        title: "Campos Incompletos",
        description: "Por favor, ingrese su correo y contraseña.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    try {
      if (!auth) throw new Error("Firebase Auth no está inicializado.");
      
      const userCredential = await signInWithEmailAndPassword(auth, emailLogin, passwordLogin);
      const idToken = await userCredential.user.getIdToken();

      // Envía el token al servidor para crear la cookie de sesión
      await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: idToken }),
      });
      
      toast({ title: 'Inicio de Sesión Exitoso', description: `¡Bienvenido de nuevo!` });

      const nextUrl = searchParams.get('next') || '/dashboard';
      router.push(nextUrl);
      
    } catch (error: any) {
      console.error("Error en inicio de sesión:", error);
      const errorMessage = error.code === 'auth/invalid-credential' 
          ? 'Las credenciales son incorrectas. Verifique su correo y contraseña.'
          : 'Ocurrió un error inesperado al intentar iniciar sesión.';
      toast({ title: 'Error al Iniciar Sesión', description: errorMessage, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    } 
  };
  
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <Card className="mx-auto w-full max-w-sm border-none shadow-none">
          <CardHeader className="text-center">
            <Link href="/" className="mb-4 inline-block relative w-[180px] h-[45px] mx-auto">
              <Image
                  src="/ranoro-logo.png"
                  alt="Ranoro Logo"
                  fill
                  style={{objectFit: 'contain'}}
                  sizes="180px"
                  priority
                  data-ai-hint="ranoro logo"
              />
            </Link>
            <CardDescription className="text-center pt-4">
                Ingresa tus credenciales para acceder al sistema.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4 pt-4">
                <div className="grid gap-2 text-left">
                    <Label htmlFor="email-login">Correo Electrónico</Label>
                    <Input id="email-login" type="email" placeholder="usuario@ranoro.mx" required value={emailLogin} onChange={(e) => setEmailLogin(e.target.value)} disabled={isLoading} />
                </div>
                <div className="grid gap-2 text-left">
                    <Label htmlFor="password-login">Contraseña</Label>
                    <Input id="password-login" type="password" placeholder="••••••••" required value={passwordLogin} onChange={(e) => setPasswordLogin(e.target.value)} disabled={isLoading} />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Ingresar al Sistema
                </Button>
            </form>
          </CardContent>
        </Card>
    </div>
  );
}
