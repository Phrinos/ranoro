
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
      if (!auth) throw new Error("Firebase Auth no está inicializado.");
      await signInWithEmailAndPassword(auth, emailLogin, passwordLogin);
      toast({ title: 'Inicio de Sesión Exitoso', description: `¡Bienvenido de nuevo!` });
      router.push('/tablero');
    } catch (error: any) {
      console.error("Error en inicio de sesión:", error);
      toast({
        title: 'Error al Iniciar Sesión',
        description: error.code === 'auth/invalid-credential' 
          ? 'Las credenciales son incorrectas. Por favor, inténtalo de nuevo.'
          : 'Ocurrió un error inesperado. Por favor, inténtalo de nuevo.',
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
        toast({ title: "Las contraseñas no coinciden", description: "Por favor, verifique la confirmación de su contraseña.", variant: 'destructive' });
        return;
    }
    setIsLoading(true);
    try {
      if (!auth) throw new Error("Firebase Auth no está inicializado.");
      const userCredential = await createUserWithEmailAndPassword(auth, emailRegister, passwordRegister);
      const user = userCredential.user;
      
      await setDoc(doc(db, 'users', user.uid), {
        name: nameRegister,
        email: emailRegister,
        role: 'Admin', // o el rol por defecto que prefieras
        createdAt: new Date(),
      });

      toast({ title: 'Registro Exitoso', description: `Bienvenido, ${nameRegister}. Tu cuenta ha sido creada.` });
      router.push('/tablero');
    } catch (error: any) {
        console.error("Error en registro:", error);
        toast({
            title: 'Error al Registrarse',
            description: error.code === 'auth/email-already-in-use'
                ? 'Este correo electrónico ya está en uso.'
                : 'Ocurrió un error inesperado. Por favor, inténtalo de nuevo.',
            variant: 'destructive',
        });
    } finally {
        setIsLoading(false);
    }
  };
  
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      if (!auth) throw new Error("Firebase Auth no está inicializado.");
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if user already exists in Firestore
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        // Create a new user document in Firestore
        await setDoc(userDocRef, {
          name: user.displayName,
          email: user.email,
          role: 'Admin', // Default role
          createdAt: new Date(),
        });
      }

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
      <div className="hidden bg-muted lg:block relative">
        <Image
          src="/home.png"
          alt="Mecánico de Ranoro en un taller moderno"
          fill
          className="object-cover"
          priority
          data-ai-hint="mechanic workshop sportscar"
        />
      </div>
      <div className="flex items-start justify-center py-12 bg-gray-50 dark:bg-gray-900">
        <Card className="mx-4 w-full sm:mx-auto sm:w-[420px] max-w-full animate-fade-in-up shadow-xl transition-all">
          <CardHeader className="text-center">
             <Link href="/" className="mb-4">
              <Image
                  src="/ranoro-logo.png"
                  alt="Ranoro Logo"
                  width={180}
                  height={45}
                  className="mx-auto h-auto w-[180px] dark:invert"
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
                <TabsContent value="login" className="data-[state=inactive]:animate-out data-[state=inactive]:fade-out-0 data-[state=active]:animate-in data-[state=active]:fade-in-0">
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
                <TabsContent value="register" className="data-[state=inactive]:animate-out data-[state=inactive]:fade-out-0 data-[state=active]:animate-in data-[state=active]:fade-in-0">
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
