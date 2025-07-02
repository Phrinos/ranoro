
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from "next/legacy/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from '@/hooks/use-toast';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebaseClient.js';
import { AlertCircle, TestTube2 } from 'lucide-react';
import { defaultSuperAdmin, AUTH_USER_LOCALSTORAGE_KEY } from '@/lib/placeholder-data';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFirebaseConfigured, setIsFirebaseConfigured] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined' && !auth) {
      setIsFirebaseConfigured(false);
    }
  }, []);

  const handleDemoLogin = () => {
    localStorage.setItem(AUTH_USER_LOCALSTORAGE_KEY, JSON.stringify(defaultSuperAdmin));
    toast({
      title: 'Modo Demo Activado',
      description: 'Has iniciado sesión como Superadmin. No se guardarán datos en la nube.',
    });
    router.push('/dashboard');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFirebaseConfigured) return;

    setIsLoading(true);
    setError('');

    try {
      await signInWithEmailAndPassword(auth, email, password);
      
      toast({
        title: 'Inicio de Sesión Correcto',
        description: 'Redirigiendo al panel principal...',
      });
      router.push('/dashboard');

    } catch (firebaseError: any) {
      console.error("Firebase Auth Error:", firebaseError.code, firebaseError.message);
      let friendlyMessage = 'Ocurrió un error inesperado.';
      if (firebaseError.code === 'auth/invalid-credential' || firebaseError.code === 'auth/user-not-found' || firebaseError.code === 'auth/wrong-password') {
        friendlyMessage = 'Correo electrónico o contraseña incorrectos.';
      } else if (firebaseError.code === 'auth/invalid-email') {
         friendlyMessage = 'El formato del correo electrónico no es válido.';
      } else if (firebaseError.code === 'auth/too-many-requests') {
          friendlyMessage = 'Acceso bloqueado temporalmente debido a demasiados intentos. Intente más tarde.';
      }
      setError(friendlyMessage);
      toast({
        title: 'Error de Inicio de Sesión',
        description: friendlyMessage,
        variant: 'destructive',
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4">
      <div className="mb-8 text-center">
        <Link href="/">
          <svg
            viewBox="0 0 250 80"
            xmlns="http://www.w3.org/2000/svg"
            className="h-20 w-auto mx-auto"
          >
            <path
              d="M23.7,56.2H11.5V23.8h12.2c3.5,0,6.5,0.9,8.9,2.8c2.4,1.9,3.6,4.5,3.6,7.9c0,2.3-0.6,4.4-1.9,6.2s-3.1,3.1-5.3,4.1l9.6,11.4H35.8L27,45.3H23.7V56.2z M23.7,39.9h7.4c1.7,0,3-0.5,4-1.4c1-0.9,1.5-2.2,1.5-3.8c0-1.7-0.5-3-1.5-3.9c-1-0.9-2.3-1.4-4-1.4h-7.4V39.9z"
              className="fill-primary"
            />
            <text
              x="60"
              y="52"
              fontFamily="Inter, sans-serif"
              fontSize="40"
              fontWeight="800"
              letterSpacing="-1.5"
              className="fill-foreground"
            >
              RANORO
            </text>
          </svg>
        </Link>
        <p className="mt-3 text-lg font-medium text-foreground">
          ¡Tu taller en una App!
        </p>
      </div>
      <Card className="w-full max-w-sm shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold font-headline">Bienvenido a Ranoro</CardTitle>
          <CardDescription>Usa tus credenciales para ingresar al sistema.</CardDescription>
        </CardHeader>
        <CardContent>
          {!isFirebaseConfigured ? (
             <div className="space-y-4">
              <div className="text-center text-destructive bg-destructive/10 p-4 rounded-md flex flex-col items-center gap-2">
                <AlertCircle className="h-6 w-6" />
                <p className="font-bold">Firebase no configurado</p>
                <p className="text-sm mt-1">La aplicación se ejecutará en Modo Demo.</p>
              </div>
              <Button onClick={handleDemoLogin} className="w-full">
                  <TestTube2 className="mr-2 h-4 w-4" />
                  Ingresar en Modo Demo
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Correo Electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="usuario@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  placeholder="••••••••"
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Ingresando...' : 'Ingresar'}
              </Button>
            </form>
          )}
        </CardContent>
        <CardFooter className="flex flex-col items-center justify-center text-center text-xs text-muted-foreground">
          <p className="font-semibold">Sistema de Administración de Talleres Ranoro®</p>
          <p>Diseñado y Desarrollado por Arturo Valdelamar 4493930914</p>
        </CardFooter>
      </Card>
    </div>
  );
}
