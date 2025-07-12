
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import Image from "next/image";
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { capitalizeWords } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { auth, db } from '@/lib/firebaseClient';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { AUTH_USER_LOCALSTORAGE_KEY } from '@/lib/placeholder-data';
import type { User } from '@/types';

const GoogleIcon = () => (
  <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
    <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 126 23.4 172.9 61.9l-69.2 69.2c-20.3-19.6-48.8-31.8-79.7-31.8-62.3 0-113.5 51.6-113.5 115.6s51.2 115.6 113.5 115.6c69.2 0 98.6-46.4 103.3-72.2h-103.3v-91.1h199.1c1.2 10.8 1.8 22.3 1.8 34.9z"></path>
  </svg>
);


export default function LoginPage() {
  const [emailLogin, setEmailLogin] = useState('');
  const [passwordLogin, setPasswordLogin] = useState('');
  
  const [nameRegister, setNameRegister] = useState('');
  const [emailRegister, setEmailRegister] = useState('');
  const [passwordRegister, setPasswordRegister] = useState('');
  const [confirmPasswordRegister, setConfirmPasswordRegister] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    try {
      if (!auth || !db) throw new Error("Firebase no está inicializado.");
      const userCredential = await signInWithEmailAndPassword(auth, emailLogin, passwordLogin);
      const user = userCredential.user;

      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      let userData: User;
      if (userDoc.exists()) {
        userData = { id: user.uid, ...userDoc.data() } as User;
      } else {
        // Si el usuario existe en Auth pero no en Firestore, crea su perfil
        userData = {
          id: user.uid,
          name: user.displayName || user.email?.split('@')[0] || 'Usuario',
          email: user.email!,
          role: 'Admin', // Asigna un rol por defecto
        };
        await setDoc(userDocRef, { 
          name: userData.name,
          email: userData.email,
          role: userData.role,
          createdAt: new Date() 
        });
        toast({ title: 'Perfil Creado', description: 'Hemos creado tu perfil de usuario.' });
      }
      
      localStorage.setItem(AUTH_USER_LOCALSTORAGE_KEY, JSON.stringify(userData));
      
      toast({ title: 'Inicio de Sesión Exitoso' });
      router.push('/tablero');
    } catch (error: any) {
      console.error("Error en inicio de sesión:", error);
      const errorMessage = error.code === 'auth/invalid-credential' 
          ? 'Las credenciales son incorrectas.'
          : 'Ocurrió un error inesperado.';
      toast({
        title: 'Error al Iniciar Sesión',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    if (passwordRegister.length < 6) {
        toast({ title: "Contraseña Corta", description: "La contraseña debe tener al menos 6 caracteres.", variant: 'destructive' });
        return;
    }
    if (passwordRegister !== confirmPasswordRegister) {
        toast({ title: "Las contraseñas no coinciden", variant: 'destructive' });
        return;
    }
    setIsLoading(true);
    try {
      if (!auth || !db) throw new Error("Firebase no está inicializado.");
      const userCredential = await createUserWithEmailAndPassword(auth, emailRegister, passwordRegister);
      const user = userCredential.user;
      
      const newUserProfile: User = {
        id: user.uid,
        name: nameRegister,
        email: emailRegister,
        role: 'Admin', // Default role for new sign-ups
      };

      await setDoc(doc(db, 'users', user.uid), {
        name: newUserProfile.name,
        email: newUserProfile.email,
        role: newUserProfile.role,
        createdAt: new Date(),
      });
      
      localStorage.setItem(AUTH_USER_LOCALSTORAGE_KEY, JSON.stringify(newUserProfile));

      toast({ title: 'Registro Exitoso', description: `Bienvenido, ${nameRegister}.` });
      router.push('/tablero');
    } catch (error: any) {
        console.error("Error en registro:", error);
        const errorMessage = error.code === 'auth/email-already-in-use'
                ? 'Este correo electrónico ya está en uso.'
                : 'Ocurrió un error inesperado.';
        toast({
            title: 'Error al Registrarse',
            description: errorMessage,
            variant: 'destructive',
        });
    } finally {
        setIsLoading(false);
    }
  };
  
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      if (!auth || !db) throw new Error("Firebase no está inicializado.");
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      let userData: User;
      if (!userDoc.exists()) {
        userData = {
          id: user.uid,
          name: user.displayName || 'Usuario de Google',
          email: user.email!,
          role: 'Admin', // Default role
        };
        await setDoc(userDocRef, { ...userData, createdAt: new Date() });
      } else {
        userData = { id: user.uid, ...userDoc.data() } as User;
      }
      
      localStorage.setItem(AUTH_USER_LOCALSTORAGE_KEY, JSON.stringify(userData));

      toast({ title: "Inicio de Sesión Exitoso", description: `Bienvenido, ${user.displayName}.` });
      router.push('/tablero');
    } catch (error) {
      console.error("Error con Google Sign-In:", error);
      toast({ title: "Error", description: "No se pudo iniciar sesión con Google.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2 xl:min-h-screen">
      <div className="hidden bg-muted lg:block relative overflow-hidden">
        <Image
          src="/login.png"
          alt="Ranoro Login"
          fill
          className="object-cover object-center"
 sizes="(max-width: 768px) 100vw, 50vw"
 priority
        />
      </div>
      <div className="flex items-center justify-center py-12 bg-gray-50 dark:bg-gray-900">
        <Card className="mx-4 w-full sm:mx-auto sm:w-[420px] max-w-full animate-fade-in-up shadow-xl transition-all">
          <CardHeader className="text-center">
             <Link href="/" className="mb-4">
              <Image
                  src="/ranoro-logo.png"
                  alt="Ranoro Logo"
                  width={180}
                  height={45}
                  className="mx-auto h-auto dark:invert"
                  style={{width: 'auto', height: 'auto'}}
                  data-ai-hint="ranoro logo"
              />
            </Link>
          </CardHeader>
          <CardContent>
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
                  <TabsTrigger value="register">Registrarse</TabsTrigger>
                </TabsList>
                <TabsContent value="login">
                    <form onSubmit={handleLogin} className="space-y-4 pt-4">
                        <div className="grid gap-2 text-left">
                            <Label htmlFor="email-login">Correo Electrónico</Label>
                            <Input id="email-login" type="email" placeholder="usuario@ranoro.mx" required value={emailLogin} onChange={(e) => setEmailLogin(e.target.value)} disabled={isLoading} />
                        </div>
                        <div className="grid gap-2 text-left">
                            <Label htmlFor="password-login">Contraseña</Label>
                            <Input id="password-login" type="password" required value={passwordLogin} onChange={(e) => setPasswordLogin(e.target.value)} disabled={isLoading} />
                        </div>
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {isLoading ? 'Ingresando...' : 'Ingresar al Sistema'}
                        </Button>
                         <Button variant="outline" type="button" className="w-full" onClick={handleGoogleSignIn} disabled={isLoading}>
                          <GoogleIcon />
                          Continuar con Google
                        </Button>
                    </form>
                    <div className="mt-4 text-center text-sm">
                      Al iniciar sesión aceptas nuestros{" "}
                      <Link href="/legal/terminos" className="underline hover:text-primary">
                        Términos de Servicio
                      </Link> y {" "}
                      <Link href="/legal/privacidad" className="underline hover:text-primary">
                        Aviso de Privacidad
                      </Link>.
                    </div>
                </TabsContent>
                <TabsContent value="register">
                   <form onSubmit={handleRegister} className="space-y-4 pt-4">
                        <div className="grid gap-2 text-left">
                            <Label htmlFor="name-register">Nombre Completo</Label>
                            <Input id="name-register" type="text" placeholder="Ej: Juan Pérez" required value={nameRegister} onChange={(e) => setNameRegister(capitalizeWords(e.target.value))} disabled={isLoading}/>
                        </div>
                        <div className="grid gap-2 text-left">
                            <Label htmlFor="email-register">Correo Electrónico</Label>
                            <Input id="email-register" type="email" placeholder="nuevo.usuario@ranoro.mx" required value={emailRegister} onChange={(e) => setEmailRegister(e.target.value)} disabled={isLoading}/>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="grid gap-2 text-left">
                              <Label htmlFor="password-register">Contraseña</Label>
                              <Input id="password-register" type="password" required value={passwordRegister} onChange={(e) => setPasswordRegister(e.target.value)} disabled={isLoading}/>
                          </div>
                           <div className="grid gap-2 text-left">
                              <Label htmlFor="confirm-password-register">Confirmar Contraseña</Label>
                              <Input id="confirm-password-register" type="password" required value={confirmPasswordRegister} onChange={(e) => setConfirmPasswordRegister(e.target.value)} disabled={isLoading}/>
                          </div>
                        </div>
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {isLoading ? 'Registrando...' : 'Crear Cuenta'}
                        </Button>
                         <Button variant="outline" type="button" className="w-full" onClick={handleGoogleSignIn} disabled={isLoading}>
                          <GoogleIcon />
                          Registrarse con Google
                        </Button>
                    </form>
                     <div className="mt-4 text-center text-sm">
                        Al registrarte, aceptas nuestros{" "}
                        <Link href="/legal/terminos" className="underline hover:text-primary">
                          Términos de Servicio
                        </Link> y {" "}
                        <Link href="/legal/privacidad" className="underline hover:text-primary">
                          Aviso de Privacidad
                        </Link>.
                      </div>
                </TabsContent>
              </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
