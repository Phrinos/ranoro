
"use client";

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from '@/hooks/use-toast';
import type { User } from '@/types';
import { Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getAuth, onAuthStateChanged, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { auth } from '@root/lib/firebaseClient.js';
import { placeholderUsers, persistToFirestore, AUTH_USER_LOCALSTORAGE_KEY } from '@/lib/placeholder-data';


const profileSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres."),
  email: z.string().email("Ingrese un correo electrónico válido."),
  phone: z.string().optional(),
  currentPassword: z.string().optional().or(z.literal('')),
  newPassword: z.string().optional().or(z.literal('')),
  confirmNewPassword: z.string().optional().or(z.literal('')),
}).refine(data => {
  if (data.newPassword || data.currentPassword) {
      if(!data.newPassword || data.newPassword.length < 6) return false;
      if(data.newPassword !== data.confirmNewPassword) return false;
  }
  return true;
}, {
  message: "Las contraseñas no coinciden o la nueva contraseña tiene menos de 6 caracteres.",
  path: ["confirmNewPassword"],
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function PerfilPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: '',
    },
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        if (firebaseUser) {
            const authUserString = localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY);
            if (authUserString) {
                const user: User = JSON.parse(authUserString);
                setCurrentUser(user);
                form.reset({
                  name: user.name,
                  email: user.email,
                  phone: user.phone || '',
                  newPassword: '',
                  confirmNewPassword: '',
                });
            } else {
                // AuthUser not in local storage, might need to fetch from DB
                // For now, redirecting to login to re-establish session
                router.push('/login');
            }
        } else {
            router.push('/login');
        }
        setIsLoading(false);
    });
    return () => unsubscribe();
  }, [form, router]);

  const onSubmit = async (data: ProfileFormValues) => {
    if (!currentUser || !auth.currentUser) {
      toast({ title: "Error", description: "No se ha encontrado un usuario autenticado.", variant: "destructive" });
      return;
    }

    // --- Update Password in Firebase ---
    if (data.newPassword && data.currentPassword) {
      try {
        const user = auth.currentUser;
        // Re-authenticate user before sensitive operations
        const credential = EmailAuthProvider.credential(user.email!, data.currentPassword);
        await reauthenticateWithCredential(user, credential);
        // If re-authentication is successful, update the password
        await updatePassword(user, data.newPassword);
        toast({ title: "Contraseña Actualizada", description: "Tu contraseña ha sido cambiada exitosamente." });
      } catch (error: any) {
        console.error("Password update error:", error);
        let message = "Ocurrió un error al cambiar la contraseña.";
        if (error.code === 'auth/wrong-password') {
            message = "La contraseña actual es incorrecta.";
        } else if (error.code === 'auth/too-many-requests') {
            message = 'Demasiados intentos fallidos. Inténtalo más tarde.';
        }
        toast({ title: "Error de Contraseña", description: message, variant: "destructive" });
        return; // Stop execution if password change fails
      }
    }

    // --- Update User Info in the main data array ---
    const userIndex = placeholderUsers.findIndex(u => u.id === currentUser.id);
    if (userIndex === -1) {
      toast({ title: "Error", description: "No se pudo encontrar tu perfil en la base de datos local para actualizarlo.", variant: "destructive" });
      return;
    }

    const updatedUser: User = {
      ...placeholderUsers[userIndex],
      name: data.name,
      phone: data.phone || undefined,
    };
    
    placeholderUsers[userIndex] = updatedUser; // Update the in-memory master list

    // --- Persist all data to Firestore ---
    try {
        await persistToFirestore();
        // Also update the local storage for immediate UI feedback in the current session
        localStorage.setItem(AUTH_USER_LOCALSTORAGE_KEY, JSON.stringify(updatedUser));
        setCurrentUser(updatedUser); // Update local state
        
        toast({
            title: "Perfil Actualizado",
            description: "Tu información ha sido actualizada exitosamente.",
        });
        
        form.reset({ 
            ...form.getValues(),
            name: data.name,
            phone: data.phone,
            newPassword: '',
            confirmNewPassword: '',
            currentPassword: ''
        });

    } catch (e) {
        console.error("Failed to persist profile changes:", e);
        toast({ title: "Error de Guardado", description: "No se pudieron guardar los cambios en la base de datos.", variant: "destructive" });
    }
  };

  if (isLoading) {
    return <div className="container mx-auto py-8 text-center">Cargando perfil...</div>;
  }

  if (!currentUser) {
    return <div className="container mx-auto py-8 text-center">Usuario no autenticado.</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <PageHeader
        title="Mi Perfil"
        description="Actualiza tu información personal y de acceso."
      />
      <Card className="max-w-2xl mx-auto shadow-lg">
        <CardHeader>
          <CardTitle>Editar Información</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre Completo</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Correo Electrónico</FormLabel>
                    <FormControl><Input type="email" {...field} disabled /></FormControl>
                    <FormDescription>El correo electrónico no se puede cambiar.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono (Opcional)</FormLabel>
                    <FormControl><Input type="tel" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <CardDescription>Cambiar contraseña (dejar en blanco para no modificar)</CardDescription>
               <FormField
                control={form.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contraseña Actual (requerida para cambiarla)</FormLabel>
                    <FormControl><Input type="password" {...field} placeholder="••••••••" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nueva Contraseña</FormLabel>
                    <FormControl><Input type="password" {...field} placeholder="••••••••" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmNewPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmar Nueva Contraseña</FormLabel>
                    <FormControl><Input type="password" {...field} placeholder="••••••••" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                <Save className="mr-2 h-4 w-4" />
                {form.formState.isSubmitting ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
