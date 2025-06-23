"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image'; // Import next/image
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from '@/hooks/use-toast';
import type { User } from '@/types';
import { defaultSuperAdmin, USER_LOCALSTORAGE_KEY, AUTH_USER_LOCALSTORAGE_KEY } from '@/lib/placeholder-data';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'; // Firebase Auth
import { auth } from '../../../lib/firebaseClient'; // Your initialized auth instance

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
      // 1. Authenticate with Firebase
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // 2. If Firebase login is successful, find the user in our local user list to get roles etc.
      if (userCredential.user && typeof window !== 'undefined') {
        const storedUsersString = localStorage.getItem(USER_LOCALSTORAGE_KEY);
        let appUsers: User[] = [];
        try {
          appUsers = storedUsersString ? JSON.parse(storedUsersString) : [];
        } catch (err) {
          console.error("Error parsing users from localStorage:", err);
          appUsers = [];
        }
        
        // Ensure superadmin exists in the list for login purposes.
        if (!appUsers.some(u => u.email.toLowerCase() === defaultSuperAdmin.email.toLowerCase())) {
          appUsers.unshift(defaultSuperAdmin);
          localStorage.setItem(USER_LOCALSTORAGE_KEY, JSON.stringify(appUsers));
        }

        const foundAppUser = appUsers.find(
          u => u.email.toLowerCase() === email.toLowerCase()
        );

        if (foundAppUser) {
          // 3. Store our app-specific user object for the session
          localStorage.setItem(AUTH_USER_LOCALSTORAGE_KEY, JSON.stringify(foundAppUser));
          toast({
            title: 'Inicio de Sesión Exitoso',
            description: `Bienvenido, ${foundAppUser.name}!`,
          });
          router.push('/dashboard');
        } else {
          // This case is unlikely if user exists in Firebase Auth but not in our list,
          // but it's good to handle it.
          setError('Usuario autenticado pero no encontrado en el sistema. Contacte al administrador.');
           toast({
            title: 'Error de Sincronización de Usuario',
            description: 'Tu cuenta de Firebase no está registrada en la aplicación.',
            variant: 'destructive',
          });
        }
      }
    } catch (firebaseError: any) {
      console.error("Firebase Auth Error:", firebaseError.code);
      let friendlyMessage = 'Correo electrónico o contraseña incorrectos.';
      if (firebaseError.code === 'auth/invalid-credential' || firebaseError.code === 'auth/user-not-found' || firebaseError.code === 'auth/wrong-password') {
        friendlyMessage = 'Correo electrónico o contraseña incorrectos.';
      } else if (firebaseError.code === 'auth/invalid-email') {
         friendlyMessage = 'El formato del correo electrónico no es válido.';
      }
      setError(friendlyMessage);
      toast({
        title: 'Error de Inicio de Sesión',
        description: friendlyMessage,
        variant: 'destructive',
      });
    }

    setIsLoading(false);
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
          <CardDescription>Para ingresar usa el email: arturo@ranoro.mx y la contraseña: CA1abaza</CardDescription>
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
