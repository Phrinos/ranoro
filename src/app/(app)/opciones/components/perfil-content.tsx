
"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { auth, storage } from '@/lib/firebaseClient.js';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SignatureDialog } from '@/app/(app)/servicios/components/signature-dialog';
import { Save, Signature } from 'lucide-react';
import type { User } from '@/types';
import { placeholderUsers, persistToFirestore, AUTH_USER_LOCALSTORAGE_KEY } from '@/lib/placeholder-data';

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

export function PerfilPageContent() {
  const { toast } = useToast();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSignatureDialogOpen, setIsSignatureDialogOpen] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: '', email: '', phone: '', signatureDataUrl: '',
      currentPassword: '', newPassword: '', confirmNewPassword: '',
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
                  name: user.name || '', email: user.email || '', phone: user.phone || '',
                  signatureDataUrl: user.signatureDataUrl || '',
                  currentPassword: '', newPassword: '', confirmNewPassword: '',
                });
            } else { router.push('/login'); }
        } else { router.push('/login'); }
        setIsLoading(false);
    });
    return () => unsubscribe();
  }, [form, router]);

  const onSubmit = async (data: ProfileFormValues) => {
    if (!currentUser || !auth.currentUser) return toast({ title: "Error", variant: "destructive" });

    if (data.newPassword && data.currentPassword) {
      try {
        const credential = EmailAuthProvider.credential(auth.currentUser.email!, data.currentPassword);
        await reauthenticateWithCredential(auth.currentUser, credential);
        await updatePassword(auth.currentUser, data.newPassword);
        toast({ title: "Contraseña Actualizada" });
      } catch (error) {
        toast({ title: "Error de Contraseña", variant: "destructive" });
        return;
      }
    }

    const userIndex = placeholderUsers.findIndex(u => u.id === currentUser.id);
    if (userIndex === -1) return toast({ title: "Error", variant: "destructive" });

    const updatedUser: User = { ...placeholderUsers[userIndex], name: data.name, phone: data.phone || undefined, signatureDataUrl: data.signatureDataUrl || undefined };

    if (data.signatureDataUrl && data.signatureDataUrl.startsWith('data:image')) {
        if (!storage) return toast({ title: "Error de Almacenamiento", variant: "destructive" });
        try {
            const signatureRef = ref(storage, `user-signatures/${currentUser.id}.png`);
            await uploadString(signatureRef, data.signatureDataUrl, 'data_url', {contentType: 'image/png'});
            updatedUser.signatureDataUrl = await getDownloadURL(signatureRef);
        } catch (e) { toast({ title: "Error de Subida", variant: "destructive" }); }
    }
    
    placeholderUsers[userIndex] = updatedUser; 

    try {
        await persistToFirestore(['users']);
        localStorage.setItem(AUTH_USER_LOCALSTORAGE_KEY, JSON.stringify(updatedUser));
        setCurrentUser(updatedUser); 
        toast({ title: "Perfil Actualizado" });
        form.reset({ ...form.getValues(), name: data.name, phone: data.phone || '', signatureDataUrl: updatedUser.signatureDataUrl || '', newPassword: '', confirmNewPassword: '', currentPassword: '' });
    } catch (e) { toast({ title: "Error de Guardado", variant: "destructive" }); }
  };

  if (isLoading) return <div className="text-center">Cargando perfil...</div>;
  if (!currentUser) return <div className="text-center">Usuario no autenticado.</div>;

  return (
    <>
      <Card className="max-w-2xl mx-auto shadow-lg"><CardHeader><CardTitle>Mi Perfil</CardTitle><CardDescription>Actualiza tu información personal y de acceso.</CardDescription></CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nombre Completo</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
              <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>Correo Electrónico</FormLabel><FormControl><Input type="email" {...field} disabled /></FormControl><FormDescription>El correo electrónico no se puede cambiar.</FormDescription><FormMessage /></FormItem>)}/>
              <FormField control={form.control} name="phone" render={({ field }) => (<FormItem><FormLabel>Teléfono (Opcional)</FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem>)}/>
              <Card className="pt-4 mt-4 border-dashed"><CardContent className="space-y-2"><FormLabel>Firma del Asesor</FormLabel><FormDescription>Esta firma se usará en los documentos generados.</FormDescription><div className="mt-2 p-2 min-h-[100px] border rounded-md bg-muted/50 flex items-center justify-center">{form.watch('signatureDataUrl') ? <img src={form.watch('signatureDataUrl')!} alt="Firma guardada" style={{ maxWidth: '250px', maxHeight: '125px', objectFit: 'contain' }}/> : <span className="text-sm text-muted-foreground">No hay firma.</span>}</div><Button type="button" variant="outline" onClick={() => setIsSignatureDialogOpen(true)} className="w-full"><Signature className="mr-2 h-4 w-4" />{form.watch('signatureDataUrl') ? 'Cambiar Firma' : 'Capturar Firma'}</Button></CardContent></Card>
              <CardDescription className="pt-6">Cambiar contraseña (dejar en blanco para no modificar)</CardDescription>
              <FormField control={form.control} name="currentPassword" render={({ field }) => (<FormItem><FormLabel>Contraseña Actual</FormLabel><FormControl><Input type="password" {...field} placeholder="••••••••" /></FormControl><FormMessage /></FormItem>)}/>
              <FormField control={form.control} name="newPassword" render={({ field }) => (<FormItem><FormLabel>Nueva Contraseña</FormLabel><FormControl><Input type="password" {...field} placeholder="••••••••" /></FormControl><FormMessage /></FormItem>)}/>
              <FormField control={form.control} name="confirmNewPassword" render={({ field }) => (<FormItem><FormLabel>Confirmar Nueva Contraseña</FormLabel><FormControl><Input type="password" {...field} placeholder="••••••••" /></FormControl><FormMessage /></FormItem>)}/>
              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}><Save className="mr-2 h-4 w-4" />{form.formState.isSubmitting ? "Guardando..." : "Guardar Cambios"}</Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      <SignatureDialog open={isSignatureDialogOpen} onOpenChange={setIsSignatureDialogOpen} onSave={(signature) => { form.setValue('signatureDataUrl', signature, { shouldDirty: true }); setIsSignatureDialogOpen(false); toast({ title: 'Firma Capturada' }); }}/>
    </>
  );
}
