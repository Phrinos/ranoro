// src/app/login/components/user-auth-form.tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { auth, db } from "@/lib/firebaseClient";
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, type User as FirebaseUser } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { Icon } from '@iconify/react';
import { AUTH_USER_LOCALSTORAGE_KEY } from '@/lib/placeholder-data';
import type { User as RanoroUser } from '@/types';

const formSchema = z.object({
  email: z.string().email({ message: "Por favor, ingresa un correo válido." }),
  password: z.string().min(1, { message: "La contraseña es requerida." }),
});

type UserFormValues = z.infer<typeof formSchema>;

export function UserAuthForm() {
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);

  const form = useForm<UserFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "", password: "" },
  });
  
  const handleUserSession = async (firebaseUser: FirebaseUser) => {
    if (!db) throw new Error("Firestore is not initialized.");
    
    const userDocRef = doc(db, 'users', firebaseUser.uid);
    const userDoc = await getDoc(userDocRef);
    
    let userData: RanoroUser;
    if (userDoc.exists()) {
      userData = { id: firebaseUser.uid, ...userDoc.data() } as RanoroUser;
    } else {
      userData = {
        id: firebaseUser.uid,
        name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Nuevo Usuario',
        email: firebaseUser.email!,
        role: 'Admin', // Default role
      };
      await setDoc(userDocRef, { 
        name: userData.name, email: userData.email, role: userData.role, createdAt: serverTimestamp() 
      });
      toast({ title: 'Perfil Creado', description: 'Hemos creado tu perfil en Ranoro.' });
    }
    
    localStorage.setItem(AUTH_USER_LOCALSTORAGE_KEY, JSON.stringify(userData));
    toast({ title: 'Inicio de Sesión Exitoso', description: `¡Bienvenido, ${userData.name}!` });
    router.push('/dashboard');
  };

  async function onSubmit(data: UserFormValues) {
    if (!auth) return;
    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, data.email, data.password);
      await handleUserSession(userCredential.user);
    } catch (error: any) {
      toast({
        title: "Error de Autenticación",
        description: "El correo o la contraseña son incorrectos.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  const handleGoogleSignIn = async () => {
    if (!auth) return;
    setIsLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      await handleUserSession(result.user);
    } catch (error: any) {
      if (error.code !== 'auth/popup-closed-by-user') {
        toast({
          title: "Error con Google",
          description: "No se pudo iniciar sesión con Google. Intenta de nuevo.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid gap-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid gap-4">
            <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem><FormLabel>Email</FormLabel><FormControl><Input placeholder="nombre@ejemplo.com" type="email" autoComplete="email" disabled={isLoading} {...field} /></FormControl><FormMessage /></FormItem>
              )}
            />
            <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem>
                  <div className="flex items-center">
                    <FormLabel>Contraseña</FormLabel>
                    <Link href="#" className="ml-auto inline-block text-sm underline">¿Olvidaste tu contraseña?</Link>
                  </div>
                  <FormControl><Input type="password" disabled={isLoading} {...field} /></FormControl><FormMessage /></FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Iniciar Sesión
            </Button>
          </div>
        </form>
      </Form>
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">O continuar con</span>
        </div>
      </div>
      <Button variant="outline" type="button" disabled={isLoading} onClick={handleGoogleSignIn}>
        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Icon icon="flat-color-icons:google" className="mr-2 h-5 w-5"/>}
        Google
      </Button>
    </div>
  );
}
