
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { storage } from '@/lib/firebaseClient.js';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SignatureDialog } from '@/app/(app)/servicios/components/signature-dialog';
import { Save, Signature, Loader2 } from 'lucide-react';
import type { User } from '@/types';
import { AUTH_USER_LOCALSTORAGE_KEY } from '@/lib/placeholder-data';
import { adminService } from '@/lib/services';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { auth } from '@/lib/firebaseClient';
import { capitalizeWords } from '@/lib/utils';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import Image from 'next/image';

const profileSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres."),
  email: z.string().email("Ingrese un correo electrónico válido."),
  phone: z.string().optional(),
  signatureDataUrl: z.string().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().optional(),
  confirmNewPassword: z.string().optional(),
}).refine(data => {
  if (data.newPassword || data.currentPassword) {
      if(!data.newPassword || data.newPassword.length < 6) return false;
      if(data.newPassword !== data.confirmNewPassword) return false;
  }
  return true;
}, {
  message: "Las contraseñas no coinciden o la nueva es menor a 6 caracteres.",
  path: ["confirmNewPassword"],
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
    if (authUserString) {
        try {
            const user = JSON.parse(authUserString);
            setCurrentUser(user);
            form.reset({
              name: user.name || '', email: user.email || '', phone: user.phone || '',
              signatureDataUrl: user.signatureDataUrl || '',
            });
        } catch (error) {
            console.error("Failed to parse user from localStorage:", error instanceof Error ? error.message : String(error));
        }
    }
    setIsLoading(false);
  }, [form]);

  const onSubmit = useCallback(async (data: ProfileFormValues) => {
    if (!currentUser || !auth?.currentUser) {
        toast({ title: "Error", description: "Usuario no autenticado.", variant: "destructive" });
        return;
    }

    form.clearErrors();
    
    // Handle password change
    if (data.newPassword && data.currentPassword) {
      try {
        const user = auth.currentUser;
        const credential = EmailAuthProvider.credential(user.email!, data.currentPassword);
        await reauthenticateWithCredential(user, credential);
        await updatePassword(user, data.newPassword);
        toast({ title: "Contraseña Actualizada", description: "Tu contraseña ha sido cambiada exitosamente." });
      } catch (error) {
        toast({ title: "Error de Contraseña", description: "La contraseña actual es incorrecta.", variant: "destructive" });
        form.setError("currentPassword", { type: "manual", message: "Contraseña incorrecta." });
        return; 
      }
    }

    let signatureUrlToSave = data.signatureDataUrl;
    if (data.signatureDataUrl && data.signatureDataUrl.startsWith('data:image')) {
        if (!storage) return toast({ title: "Error de Configuración", description: "El almacenamiento no está disponible.", variant: "destructive" });
        try {
            const signatureRef = ref(storage, `user-signatures/${currentUser.id}.png`);
            await uploadString(signatureRef, data.signatureDataUrl, 'data_url', {contentType: 'image/png'});
            signatureUrlToSave = await getDownloadURL(signatureRef);
        } catch (e) {
            console.error("Error uploading signature:", e instanceof Error ? e.message : String(e));
            toast({ title: "Error al Subir Firma", variant: "destructive" });
            return;
        }
    }

    const updatedUser: Partial<User> = { 
        id: currentUser.id,
        name: data.name, 
        phone: data.phone || undefined, 
        signatureDataUrl: signatureUrlToSave || undefined 
    };
    
    try {
        const savedUser = await adminService.updateUserProfile(updatedUser as User);
        localStorage.setItem(AUTH_USER_LOCALSTORAGE_KEY, JSON.stringify(savedUser));
        setCurrentUser(savedUser); 
        toast({ title: "Perfil Actualizado", description: "Tu información se ha guardado correctamente." });
        form.reset({ ...form.getValues(), name: data.name, phone: data.phone || '', signatureDataUrl: savedUser.signatureDataUrl || '', newPassword: '', confirmNewPassword: '', currentPassword: '' });
    } catch (e) { 
        toast({ title: "Error al Guardar", description: "No se pudo actualizar el perfil.", variant: "destructive" });
    }
  }, [currentUser, form, toast]);

  if (isLoading) return <div className="flex items-center justify-center p-8"><Loader2 className="animate-spin h-8 w-8" /></div>;
  if (!currentUser) return <div className="p-8 text-center text-muted-foreground">Usuario no encontrado o no autenticado.</div>;

  return (
    <>
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="shadow-lg">
          <CardHeader><CardTitle>Mi Perfil</CardTitle><CardDescription>Actualiza tu información personal y de acceso.</CardDescription></CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nombre Completo</FormLabel><FormControl><Input {...field} value={field.value ?? ''} onChange={(e) => field.onChange(capitalizeWords(e.target.value))} /></FormControl><FormMessage /></FormItem>)}/>
                <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>Correo Electrónico</FormLabel><FormControl><Input type="email" {...field} value={field.value ?? ''} disabled /></FormControl><p className="text-[0.8rem] text-muted-foreground">El correo electrónico no se puede cambiar.</p></FormItem>)}/>
                <FormField control={form.control} name="phone" render={({ field }) => (<FormItem><FormLabel>Teléfono (Opcional)</FormLabel><FormControl><Input type="tel" {...field} value={field.value ?? ''} /></FormControl></FormItem>)}/>
                
                <Card className="pt-4 border-dashed"><CardContent className="space-y-2">
                  <Label>Firma Digital</Label>
                  <p className="text-sm text-muted-foreground">Esta firma se usará en los documentos que generes.</p>
                  <div className="mt-2 p-2 min-h-[100px] border rounded-md bg-muted/50 flex items-center justify-center">
                      {form.watch('signatureDataUrl') ? 
                          <Image src={form.watch('signatureDataUrl')!} alt="Firma guardada" className="max-w-[250px] max-h-[125px] object-contain" width={250} height={125}/> : 
                          <span className="text-sm text-muted-foreground">No hay firma guardada.</span>
                      }
                  </div>
                  <Button type="button" variant="outline" onClick={() => setIsSignatureDialogOpen(true)} className="w-full" aria-label={form.watch('signatureDataUrl') ? 'Cambiar Firma' : 'Capturar Firma'}>
                      <Signature className="mr-2 h-4 w-4" />{form.watch('signatureDataUrl') ? 'Cambiar Firma' : 'Capturar Firma'}
                  </Button>
                </CardContent></Card>

                <CardDescription className="pt-6 border-t">Cambiar contraseña (dejar en blanco para no modificar)</CardDescription>
                <FormField control={form.control} name="currentPassword" render={({ field }) => (<FormItem><FormLabel>Contraseña Actual</FormLabel><FormControl><Input type="password" {...field} autoComplete="current-password" placeholder="••••••••" /></FormControl><FormMessage /></FormItem>)}/>
                <FormField control={form.control} name="newPassword" render={({ field }) => (<FormItem><FormLabel>Nueva Contraseña</FormLabel><FormControl><Input type="password" {...field} autoComplete="new-password" placeholder="Mínimo 6 caracteres" /></FormControl><FormMessage /></FormItem>)}/>
                <FormField control={form.control} name="confirmNewPassword" render={({ field }) => (<FormItem><FormLabel>Confirmar Nueva Contraseña</FormLabel><FormControl><Input type="password" {...field} autoComplete="new-password" placeholder="Repite la nueva contraseña" /></FormControl><FormMessage /></FormItem>)}/>
                
                <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                  <Save className="mr-2 h-4 w-4" />{form.formState.isSubmitting ? "Guardando..." : "Guardar Cambios"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle>Apariencia</CardTitle>
                <CardDescription>Selecciona cómo se ve la interfaz.</CardDescription>
            </CardHeader>
            <CardContent>
                <ThemeToggle />
            </CardContent>
        </Card>
      </div>
      <SignatureDialog 
        open={isSignatureDialogOpen} 
        onOpenChange={setIsSignatureDialogOpen} 
        onSave={(signature) => { 
            form.setValue('signatureDataUrl', signature, { shouldDirty: true, shouldValidate: true }); 
            setIsSignatureDialogOpen(false); 
            toast({ title: 'Firma Capturada', description: 'La firma está lista para ser guardada.' }); 
        }}
      />
    </>
  );
}
