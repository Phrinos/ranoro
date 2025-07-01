
"use client";

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useToast } from '@/hooks/use-toast';
import type { User } from '@/types';
import { Save, Signature } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { auth, storage } from '@root/lib/firebaseClient.js';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { placeholderUsers, persistToFirestore, AUTH_USER_LOCALSTORAGE_KEY } from '@/lib/placeholder-data';
import { SignatureDialog } from '@/app/(app)/servicios/components/signature-dialog';
import Image from 'next/image';


const profileSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres."),
  email: z.string().email("Ingrese un correo electrónico válido."),
  phone: z.string().optional(),
  signatureDataUrl: z.string().optional(),
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
  const [isSignatureDialogOpen, setIsSignatureDialogOpen] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      signatureDataUrl: '',
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
                  signatureDataUrl: user.signatureDataUrl || '',
                  newPassword: '',
                  confirmNewPassword: '',
                });
            } else {
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
        const credential = EmailAuthProvider.credential(user.email!, data.currentPassword);
        await reauthenticateWithCredential(user, credential);
        await updatePassword(user, data.newPassword);
        toast({ title: "Contraseña Actualizada", description: "Tu contraseña ha sido cambiada exitosamente." });
      } catch (error) {
        console.error("Password update error:", error);
        let message = "Ocurrió un error al cambiar la contraseña.";
        if (error instanceof Error && 'code' in error) {
            const firebaseError = error as { code: string };
            if (firebaseError.code === 'auth/wrong-password') {
                message = "La contraseña actual es incorrecta.";
            } else if (firebaseError.code === 'auth/too-many-requests') {
                message = 'Demasiados intentos fallidos. Inténtalo más tarde.';
            }
        }
        toast({ title: "Error de Contraseña", description: message, variant: "destructive" });
        return;
      }
    }

    const userIndex = placeholderUsers.findIndex(u => u.id === currentUser.id);
    if (userIndex === -1) {
      toast({ title: "Error", description: "No se pudo encontrar tu perfil en la base de datos local para actualizarlo.", variant: "destructive" });
      return;
    }

    const updatedUser: User = {
      ...placeholderUsers[userIndex],
      name: data.name,
      phone: data.phone || undefined,
      signatureDataUrl: data.signatureDataUrl || undefined,
    };
    
    // --- New Signature Upload Logic ---
    if (data.signatureDataUrl && data.signatureDataUrl.startsWith('data:image')) {
        if (!storage) {
            toast({ title: "Error de Almacenamiento", description: "Firebase Storage no está configurado.", variant: "destructive" });
            return;
        }
        try {
            const signatureRef = ref(storage, `user-signatures/${currentUser.id}.png`);
            await uploadString(signatureRef, data.signatureDataUrl, 'data_url');
            const downloadURL = await getDownloadURL(signatureRef);
            updatedUser.signatureDataUrl = downloadURL;
        } catch (storageError) {
            console.error("Error uploading signature:", storageError);
            toast({ title: "Error de Subida", description: "No se pudo guardar la firma en la nube.", variant: "destructive" });
        }
    }
    
    placeholderUsers[userIndex] = updatedUser; 

    try {
        await persistToFirestore(['users']);
        localStorage.setItem(AUTH_USER_LOCALSTORAGE_KEY, JSON.stringify(updatedUser));
        setCurrentUser(updatedUser); 
        
        toast({
            title: "Perfil Actualizado",
            description: "Tu información ha sido actualizada exitosamente.",
        });
        
        form.reset({ 
            ...form.getValues(),
            name: data.name,
            phone: data.phone || '',
            signatureDataUrl: updatedUser.signatureDataUrl || '', // Use the new URL
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
              
              <Card className="pt-4 mt-4 border-dashed">
                <CardContent className="space-y-2">
                  <FormLabel>Firma del Asesor</FormLabel>
                  <FormDescription>
                    Esta firma se usará en los documentos generados por ti, como las hojas de servicio.
                  </FormDescription>
                  <div className="mt-2 p-2 min-h-[100px] border rounded-md bg-muted/50 flex items-center justify-center">
                    {form.watch('signatureDataUrl') ? (
                      <Image
                        src={form.watch('signatureDataUrl')!}
                        alt="Firma guardada"
                        width={250}
                        height={125}
                        style={{ objectFit: 'contain' }}
                      />
                    ) : (
                      <span className="text-sm text-muted-foreground">No hay firma guardada.</span>
                    )}
                  </div>
                  <Button type="button" variant="outline" onClick={() => setIsSignatureDialogOpen(true)} className="w-full">
                    <Signature className="mr-2 h-4 w-4" />
                    {form.watch('signatureDataUrl') ? 'Cambiar Firma' : 'Capturar Firma'}
                  </Button>
                </CardContent>
              </Card>

              <CardDescription className="pt-6">Cambiar contraseña (dejar en blanco para no modificar)</CardDescription>
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
      
      <SignatureDialog
        open={isSignatureDialogOpen}
        onOpenChange={setIsSignatureDialogOpen}
        onSave={(signature) => {
          form.setValue('signatureDataUrl', signature, { shouldDirty: true });
          setIsSignatureDialogOpen(false);
          toast({ title: 'Firma Capturada', description: 'La nueva firma se guardará cuando actualices tu perfil.' });
        }}
      />
    </div>
  );
}
