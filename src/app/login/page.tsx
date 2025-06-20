
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from '@/hooks/use-toast';
import type { User } from '@/types';
import { AppLogo } from '@/components/icons'; 

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check if user is already authenticated
    if (typeof window !== 'undefined') {
      const authUser = localStorage.getItem('authUser');
      if (authUser) {
        router.replace('/dashboard'); // Use replace to avoid login page in history
      }
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));

    if (email === 'arturo@ranoro.mx' && password === 'CA1abaza') {
      const superAdminUser: User = {
        id: 'user_superadmin',
        name: 'Arturo Ranoro',
        email: 'arturo@ranoro.mx',
        role: 'superadmin',
      };
      if (typeof window !== 'undefined') {
        localStorage.setItem('authUser', JSON.stringify(superAdminUser));
      }
      toast({ title: 'Inicio de Sesión Exitoso', description: `Bienvenido, ${superAdminUser.name}!` });
      router.push('/dashboard');
    } else {
      // Check against other users (simulated)
      if (typeof window !== 'undefined') {
        const storedUsersString = localStorage.getItem('appUsers');
        const storedUsers: User[] = storedUsersString ? JSON.parse(storedUsersString) : [];
        const foundUser = storedUsers.find(u => u.email === email && u.password === password); // Password check is insecure here!
        
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
      <Card className="w-full max-w-sm shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <AppLogo className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold font-headline">Bienvenido a Ranoro</CardTitle>
          <CardDescription>Ingresa tus credenciales para acceder al sistema</CardDescription>
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
        <CardFooter className="text-center text-xs text-muted-foreground">
          <p>Este es un sistema de gestión de taller. <br/> Contacte al administrador si tiene problemas.</p>
        </CardFooter>
      </Card>
    </div>
  );
}

