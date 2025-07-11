
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebaseClient.js';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import Image from "next/image";
import { AUTH_USER_LOCALSTORAGE_KEY } from '@/lib/placeholder-data';
import type { User as RanoroUser } from '@/types';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(true); // Start loading to check auth state
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    // Check if user is already logged in on initial load
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY)) {
        router.push('/dashboard');
      } else {
        setIsLoading(false); // Only stop loading if there's no user
      }
    });
    return () => unsubscribe();
  }, [router]);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);

    if (!auth || !db) {
        toast({ title: 'Error de Configuración', description: 'La autenticación o la base de datos no está disponible.', variant: 'destructive' });
        setIsLoading(false);
        return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // --- CRITICAL STEP: Fetch user profile data and store it BEFORE redirecting ---
      const userDocRef = doc(db, "database", "main");
      const docSnap = await getDoc(userDocRef);

      if (docSnap.exists()) {
        const allUsers = docSnap.data().users as RanoroUser[];
        const ranoroUser = allUsers.find(u => u.id === user.uid);
        
        if (ranoroUser) {
          localStorage.setItem(AUTH_USER_LOCALSTORAGE_KEY, JSON.stringify(ranoroUser));
          toast({ title: '¡Bienvenido!', description: 'Has iniciado sesión correctamente.' });
          router.push('/dashboard'); // Now it's safe to redirect
        } else {
          throw new Error("User profile not found in main database.");
        }
      } else {
        throw new Error("Main data document not found.");
      }
      
    } catch (error: any) {
      console.error("Error de inicio de sesión:", error);
      let errorMessage = 'Las credenciales son incorrectas o hubo un error al cargar tu perfil.';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
          errorMessage = 'El correo o la contraseña son incorrectos.';
      } else if (error.code === 'auth/too-many-requests') {
          errorMessage = 'Demasiados intentos fallidos. Por favor, inténtalo de nuevo más tarde.';
      }
      toast({
        title: 'Error de Inicio de Sesión',
        description: errorMessage,
        variant: 'destructive',
      });
      setIsLoading(false);
    } 
  };
  
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-1 text-center">
            <Image
                src="/ranoro-logo.png"
                alt="Ranoro Logo"
                width={200}
                height={50}
                className="mx-auto dark:invert"
                style={{ width: "auto", height: "auto" }}
                data-ai-hint="ranoro logo"
            />
          <CardTitle className="text-2xl pt-4">Iniciar Sesión</CardTitle>
          <CardDescription>Ingresa tu correo y contraseña para acceder al sistema.</CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="usuario@ranoro.mx"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full" type="submit" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isLoading ? 'Ingresando...' : 'Ingresar'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
