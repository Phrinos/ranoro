"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebaseClient';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Mail } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

const recoverySchema = z.object({
  email: z.string().email("Ingrese un correo electrónico válido."),
});

type RecoveryFormValues = z.infer<typeof recoverySchema>;

export default function RecuperarPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const form = useForm<RecoveryFormValues>({
    resolver: zodResolver(recoverySchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: RecoveryFormValues) => {
    if (!auth) return;
    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, data.email);
      setIsSent(true);
      toast({ 
        title: "Correo Enviado", 
        description: "Revisa tu bandeja de entrada para restablecer tu contraseña." 
      });
    } catch (error: any) {
      console.error("Error sending reset email:", error);
      toast({ 
        title: "Error", 
        description: "No se pudo enviar el correo. Verifica que la dirección sea correcta o intenta más tarde.", 
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md shadow-lg border-none">
        <CardHeader className="text-center">
          <Link href="/" className="mb-4 inline-block relative w-[180px] h-[45px] mx-auto">
            <Image 
              src="/ranoro-logo.png" 
              alt="Ranoro Logo" 
              fill 
              style={{ objectFit: 'contain' }} 
              sizes="180px" 
            />
          </Link>
          <CardTitle className="text-2xl">Recuperar Contraseña</CardTitle>
          <CardDescription>
            {isSent 
              ? "Instrucciones enviadas correctamente." 
              : "Ingresa tu correo registrado para recibir un enlace de restablecimiento."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isSent ? (
            <div className="space-y-6 text-center">
              <div className="bg-green-50 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto">
                <Mail className="h-8 w-8 text-green-600" />
              </div>
              <p className="text-sm text-muted-foreground">
                Si el correo existe en nuestra base de datos, recibirás instrucciones en unos momentos. Revisa también tu carpeta de SPAM.
              </p>
              <Button asChild className="w-full">
                <Link href="/login">Volver al Inicio</Link>
              </Button>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Correo Electrónico</FormLabel>
                      <FormControl>
                        <Input 
                          type="email" 
                          placeholder="usuario@ranoro.mx" 
                          {...field} 
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Enviar Enlace
                </Button>
                <Button variant="ghost" asChild className="w-full" disabled={isLoading}>
                  <Link href="/login">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Volver al Login
                  </Link>
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
