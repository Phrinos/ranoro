"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, AlertTriangle } from 'lucide-react';
import Image from "next/image";
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { auth, db } from '@/lib/firebaseClient';
import { 
  signInWithEmailAndPassword, 
  GoogleAuthProvider,
  signInWithPopup,
  type User as FirebaseUser
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { AUTH_USER_LOCALSTORAGE_KEY } from '@/lib/placeholder-data';
import type { User } from '@/types';
import { Icon } from '@iconify/react';

export default function LoginPage() {
  const [emailLogin, setEmailLogin] = useState('');
  const [passwordLogin, setPasswordLogin] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [googleIsLoading, setGoogleIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleUserSession = async (firebaseUser: FirebaseUser) => {
    if (!db) throw new Error("Firestore is not initialized.");
    
    const userDocRef = doc(db, 'users', firebaseUser.uid);
    const userDoc = await getDoc(userDocRef);
    
    let userData: User;
    if (userDoc.exists()) {
      userData = { id: firebaseUser.uid, ...userDoc.data() } as User;
    } else {
      // Create a new user profile in Firestore
      userData = {
        id: firebaseUser.uid,
        name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Nuevo Usuario',
        email: firebaseUser.email!,
        role: 'Admin', // Default role for new sign-ups
      };
      await setDoc(userDocRef, { 
        name: userData.name,
        email: userData.email,
        role: userData.role,
        createdAt: serverTimestamp() 
      });
      toast({ title: 'Perfil Creado', description: 'Hemos creado tu perfil de usuario en Ranoro.' });
    }
    
    localStorage.setItem(AUTH_USER_LOCALSTORAGE_KEY, JSON.stringify(userData));
    
    toast({ title: 'Inicio de Sesión Exitoso', description: `¡Bienvenido de nuevo, ${userData.name}!` });
    router.push('/dashboard');
  };

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
      await handleUserSession(userCredential.user);
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
  
  const handleGoogleSignIn = async () => {
    setGoogleIsLoading(true);
    try {
      if (!auth) throw new Error("Firebase Auth no está inicializado.");
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      await handleUserSession(result.user);
    } catch (error: any) {
      console.error("Error con Google Sign-In:", error);
      // Handle cases where the user closes the popup
      if (error.code !== 'auth/popup-closed-by-user') {
        toast({ title: "Error", description: "No se pudo iniciar sesión con Google.", variant: "destructive" });
      }
    } finally {
      setGoogleIsLoading(false);
    }
  };

  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2 xl:min-h-screen">
      <div className="lg:hidden relative h-48 sm:h-64 w-full bg-muted">
        <Image
            src="/login.png"
            alt="Ranoro Login"
            fill
            className="object-cover object-center"
            sizes="100vw"
            priority
            data-ai-hint="mechanic tools"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent"></div>
      </div>
      <div className="flex items-center justify-center py-12 lg:py-0">
        <Card className="mx-4 w-full sm:mx-auto sm:w-[420px] max-w-full animate-fade-in-up shadow-xl lg:shadow-none lg:border-none lg:animate-none">
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
            <p className="text-lg italic text-muted-foreground -mt-2">Tu Taller en una App</p>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-center pt-4">
                Ingresa tus credenciales para acceder al sistema.
            </CardDescription>
            <form onSubmit={handleLogin} className="space-y-4 pt-4">
                <div className="grid gap-2 text-left">
                    <Label htmlFor="email-login">Correo Electrónico</Label>
                    <Input id="email-login" type="email" placeholder="usuario@ranoro.mx" required value={emailLogin} onChange={(e) => setEmailLogin(e.target.value)} disabled={isLoading || googleIsLoading} />
                </div>
                <div className="grid gap-2 text-left">
                    <Label htmlFor="password-login">Contraseña</Label>
                    <Input id="password-login" type="password" required value={passwordLogin} onChange={(e) => setPasswordLogin(e.target.value)} disabled={isLoading || googleIsLoading} />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading || googleIsLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Ingresar al Sistema
                </Button>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">O</span>
                    </div>
                  </div>
                 <Button variant="outline" type="button" className="w-full" onClick={handleGoogleSignIn} disabled={isLoading || googleIsLoading}>
                    {googleIsLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Icon icon="flat-color-icons:google" className="h-5 w-5 mr-3" />}
                    <span>Continuar con Google</span>
                </Button>
            </form>
            <div className="mt-4 text-center text-sm text-muted-foreground">
              Al iniciar sesión aceptas nuestros{" "}
              <Link href="/legal/terminos" className="underline hover:text-primary">
                Términos de Servicio
              </Link> y {" "}
              <Link href="/legal/privacidad" className="underline hover:text-primary">
                Aviso de Privacidad
              </Link>.
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="hidden bg-muted lg:block relative overflow-hidden">
        <Image
          src="/login.png"
          alt="Ranoro Login"
          fill
          className="object-cover object-center"
          sizes="50vw"
          priority
          data-ai-hint="mechanic tools"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/30 to-transparent"></div>
      </div>
    </div>
  );
}
    