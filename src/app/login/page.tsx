
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

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const authUser = localStorage.getItem('authUser');
      if (authUser) {
        router.replace('/dashboard');
      }
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    await new Promise(resolve => setTimeout(resolve, 500));

    if (email === 'arturo@ranoro.mx' && password === 'CA1abaza') {
      const superAdminUser: User = {
        id: 'user_superadmin',
        name: 'Arturo Ranoro',
        email: 'arturo@ranoro.mx',
        role: 'superadmin',
        phone: '4491234567'
      };
      if (typeof window !== 'undefined') {
        localStorage.setItem('authUser', JSON.stringify(superAdminUser));
      }
      toast({ title: 'Inicio de Sesión Exitoso', description: `Bienvenido, ${superAdminUser.name}!` });
      router.push('/dashboard');
    } else {
      if (typeof window !== 'undefined') {
        const storedUsersString = localStorage.getItem('appUsers');
        const storedUsers: User[] = storedUsersString ? JSON.parse(storedUsersString) : [];
        const foundUser = storedUsers.find(u => u.email === email && u.password === password);

        if (foundUser) {
          localStorage.setItem('authUser', JSON.stringify(foundUser));
          toast({ title: 'Inicio de Sesión Exitoso', description: `Bienvenido, ${foundUser.name}!` });
          router.push('/dashboard');
        } else {
          setError('Correo electrónico o contraseña incorrectos.');
          toast({ title: 'Error de Inicio de Sesión', description: 'Credenciales inválidas.', variant: 'destructive' });
        }
      } else {
         setError('Correo electrónico o contraseña incorrectos.');
         toast({ title: 'Error de Inicio de Sesión', description: 'Credenciales inválidas.', variant: 'destructive' });
      }
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
          <p>Este es un sistema de gestión de taller.</p>
          <p>Contacte al administrador si tiene problemas.</p>
        </CardFooter>
      </Card>
    </div>
  );
}
