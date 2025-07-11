
"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { storage } from '@/lib/firebaseClient.js';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SignatureDialog } from '@/app/(app)/servicios/components/signature-dialog';
import { Save, Signature, Loader2 } from 'lucide-react';
import type { User } from '@/types';
import { placeholderUsers, persistToFirestore, AUTH_USER_LOCALSTORAGE_KEY, defaultSuperAdmin } from '@/lib/placeholder-data';

const profileSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres."),
  email: z.string().email("Ingrese un correo electrónico válido."),
  phone: z.string().optional(),
  signatureDataUrl: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export function PerfilPageContent() {
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSignatureDialogOpen, setIsSignatureDialogOpen] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: '', email: '', phone: '', signatureDataUrl: '' },
  });

  useEffect(() => {
    const authUserString = localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY);
    const user = authUserString ? JSON.parse(authUserString) : defaultSuperAdmin;
    setCurrentUser(user);
    form.reset({
      name: user.name || '', email: user.email || '', phone: user.phone || '',
      signatureDataUrl: user.signatureDataUrl || '',
    });
    setIsLoading(false);
  }, [form]);

  const onSubmit = async (data: ProfileFormValues) => {
    if (!currentUser) return toast({ title: "Error", variant: "destructive" });

    const userIndex = placeholderUsers.findIndex(u => u.id === currentUser.id);
    if (userIndex === -1 && currentUser.id !== defaultSuperAdmin.id) {
        return toast({ title: "Error", description: "No se pudo encontrar el perfil de usuario.", variant: "destructive" });
    }

    const updatedUser: User = { 
        ...(userIndex > -1 ? placeholderUsers[userIndex] : defaultSuperAdmin), 
        name: data.name, 
        phone: data.phone || undefined, 
        signatureDataUrl: data.signatureDataUrl || undefined 
    };

    if (data.signatureDataUrl && data.signatureDataUrl.startsWith('data:image')) {
        if (!storage) return toast({ title: "Error de Almacenamiento", variant: "destructive" });
        try {
            const signatureRef = ref(storage, `user-signatures/${currentUser.id}.png`);
            await uploadString(signatureRef, data.signatureDataUrl, 'data_url', {contentType: 'image/png'});
            updatedUser.signatureDataUrl = await getDownloadURL(signatureRef);
        } catch (e) { toast({ title: "Error de Subida", variant: "destructive" }); }
    }
    
    if (userIndex > -1) {
        placeholderUsers[userIndex] = updatedUser; 
    } else {
        // If the user was the default admin and not in the list, add them.
        placeholderUsers.push(updatedUser);
    }

    try {
        await persistToFirestore(['users']);
        localStorage.setItem(AUTH_USER_LOCALSTORAGE_KEY, JSON.stringify(updatedUser));
        setCurrentUser(updatedUser); 
        toast({ title: "Perfil Actualizado" });
        form.reset({ ...form.getValues(), name: data.name, phone: data.phone || '', signatureDataUrl: updatedUser.signatureDataUrl || '' });
    } catch (e) { toast({ title: "Error de Guardado", variant: "destructive" }); }
  };

  if (isLoading) return <div className="flex items-center justify-center p-8"><Loader2 className="animate-spin h-8 w-8" /></div>;
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
              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}><Save className="mr-2 h-4 w-4" />{form.formState.isSubmitting ? "Guardando..." : "Guardar Cambios"}</Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      <SignatureDialog open={isSignatureDialogOpen} onOpenChange={setIsSignatureDialogOpen} onSave={(signature) => { form.setValue('signatureDataUrl', signature, { shouldDirty: true }); setIsSignatureDialogOpen(false); toast({ title: 'Firma Capturada' }); }}/>
    </>
  );
}
