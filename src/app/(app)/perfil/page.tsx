
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

const USER_LOCALSTORAGE_KEY = 'appUsers';
const AUTH_USER_LOCALSTORAGE_KEY = 'authUser';

const profileSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres."),
  email: z.string().email("Ingrese un correo electrónico válido."),
  phone: z.string().optional(),
  currentPassword: z.string().optional(), // Not used for validation here, for potential future use
  newPassword: z.string().min(6, "La nueva contraseña debe tener al menos 6 caracteres.").optional().or(z.literal('')),
  confirmNewPassword: z.string().optional().or(z.literal('')),
}).refine(data => {
  if (data.newPassword && !data.confirmNewPassword) {
    return false; // Confirm password is required if new password is set
  }
  if (data.newPassword && data.confirmNewPassword && data.newPassword !== data.confirmNewPassword) {
    return false; // Passwords must match
  }
  return true;
}, {
  message: "Las contraseñas nuevas no coinciden o falta la confirmación.",
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
    if (typeof window !== 'undefined') {
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
        router.push('/login'); // Redirect if not authenticated
      }
      setIsLoading(false);
    }
  }, [form, router]);

  const onSubmit = (data: ProfileFormValues) => {
    if (!currentUser) return;

    const updatedUser: User = {
      ...currentUser,
      name: data.name,
      email: data.email,
      phone: data.phone || undefined,
    };

    if (data.newPassword) {
      updatedUser.password = data.newPassword; // In a real app, hash this
    }

    // Update authUser in localStorage
    localStorage.setItem(AUTH_USER_LOCALSTORAGE_KEY, JSON.stringify(updatedUser));

    // Update user in appUsers list in localStorage
    const storedUsersString = localStorage.getItem(USER_LOCALSTORAGE_KEY);
    let appUsers: User[] = storedUsersString ? JSON.parse(storedUsersString) : [];
    const userIndex = appUsers.findIndex(u => u.id === currentUser.id);
    if (userIndex !== -1) {
      appUsers[userIndex] = updatedUser;
    } else {
      // This case should ideally not happen if user is authenticated
      appUsers.push(updatedUser);
    }
    localStorage.setItem(USER_LOCALSTORAGE_KEY, JSON.stringify(appUsers));

    toast({
      title: "Perfil Actualizado",
      description: "Tu información ha sido actualizada exitosamente.",
    });
    form.reset({ // Reset password fields after successful submission
        ...form.getValues(),
        newPassword: '',
        confirmNewPassword: '',
        currentPassword: ''
    });
  };

  if (isLoading) {
    return <div className="container mx-auto py-8 text-center">Cargando perfil...</div>;
  }

  if (!currentUser) {
     // Should be redirected by useEffect, but as a fallback
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
                    <FormControl><Input type="email" {...field} /></FormControl>
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
