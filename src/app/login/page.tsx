
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from '@/hooks/use-toast';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@root/lib/firebaseClient.js';

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Step 1: Authenticate with Firebase. The AppLayout will handle the rest.
      await signInWithEmailAndPassword(auth, email, password);
      
      // On success, the onAuthStateChanged listener in AppLayout will fire.
      // We can just redirect to the dashboard.
      toast({
        title: 'Inicio de Sesión Correcto',
        description: 'Redirigiendo al panel principal...',
      });
      router.push('/dashboard');

    } catch (firebaseError: any) {
      console.error("Firebase Auth Error:", firebaseError.code, firebaseError.message);
      let friendlyMessage = 'Correo electrónico o contraseña incorrectos.';
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
      setIsLoading(false); // Only stop loading on error
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4">
      <div className="mb-8 text-center">
        <Image
          src="/ranoro-logo.png" 
          alt="Ranoro Logo"
          width={250} 
          height={80} 
          priority
          className="mx-auto"
          data-ai-hint="ranoro-logo"
        />
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
        </CardContent>
        <CardFooter className="flex flex-col items-center justify-center text-center text-xs text-muted-foreground">
          <p>Sistema de Administración de Taller</p>
          <p>Diseñado y Desarrollado por Arturo Valdelamar</p>
        </CardFooter>
      </Card>
    </div>
  );
}
