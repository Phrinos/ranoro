
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Save, Upload, Loader2, Building, MapPin, User, Phone, Briefcase } from 'lucide-react';
import type { WorkshopInfo } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { storage } from '@/lib/firebaseClient.js';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { optimizeImage } from '@/lib/utils';
import Image from 'next/image';

const LOCALSTORAGE_KEY = "workshopInfo"; // Use a distinct key

const tallerSchema = z.object({
  name: z.string().min(1, "El nombre del taller es obligatorio"),
  phone: z.string().min(7, "Mínimo 7 dígitos"),
  addressLine1: z.string().min(5, "La dirección es obligatoria"),
  googleMapsUrl: z.string().url("Ingrese una URL válida de Google Maps.").optional().or(z.literal('')),
  logoUrl: z.string().url("Debe proporcionar una URL del logo o subir una imagen.").optional().or(z.literal('')),
  contactPersonName: z.string().optional(),
  contactPersonPhone: z.string().optional(),
  contactPersonRole: z.string().optional(),
});

type TallerFormValues = z.infer<typeof tallerSchema>;

const defaultWorkshopInfo: Partial<WorkshopInfo> = {
  name: "Mi Taller",
  phone: "1234567890",
  addressLine1: "Calle Falsa 123, Colonia Centro",
  logoUrl: "/ranoro-logo.png",
};

export function ConfigTallerPageContent() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const form = useForm<TallerFormValues>({
    resolver: zodResolver(tallerSchema),
    defaultValues: defaultWorkshopInfo,
  });

  const watchedLogoUrl = form.watch('logoUrl');

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem(LOCALSTORAGE_KEY) : null;
    if (stored) {
      try {
        form.reset(JSON.parse(stored));
      } catch {
        form.reset(defaultWorkshopInfo);
      }
    }
  }, [form]);

  const onSubmit = (data: TallerFormValues) => {
    try {
      localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(data));
      toast({ title: "Información guardada", description: "Se actualizaron los datos del taller.", duration: 3000 });
    } catch {
      toast({ title: "Error al guardar", variant: "destructive", duration: 3000 });
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!storage) return toast({ title: "Error de Configuración", variant: "destructive" });

    setIsUploading(true);
    toast({ title: 'Subiendo imagen...', description: 'Por favor, espere.' });
    try {
      const optimizedDataUrl = await optimizeImage(file, 400); // 400px width for logo
      const storageRef = ref(storage, `workshop-logos/main-logo-${Date.now()}.png`);
      await uploadString(storageRef, optimizedDataUrl, 'data_url');
      const downloadURL = await getDownloadURL(storageRef);
      form.setValue('logoUrl', downloadURL, { shouldDirty: true });
      toast({ title: '¡Logo actualizado!', description: 'La nueva imagen se ha cargado correctamente.' });
    } catch (error) {
      toast({ title: 'Error al subir', variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className="max-w-4xl mx-auto shadow-lg">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <CardHeader>
            <CardTitle>Información del Taller</CardTitle>
            <CardDescription>Estos datos se utilizarán en documentos y reportes públicos.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Building/>Datos Generales</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nombre del Taller</FormLabel><FormControl><Input placeholder="Mi Taller Mecánico" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="addressLine1" render={({ field }) => (<FormItem><FormLabel>Dirección</FormLabel><FormControl><Input placeholder="Calle Principal 123, Colonia" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="phone" render={({ field }) => (<FormItem><FormLabel>Teléfono Principal</FormLabel><FormControl><Input placeholder="4491234567" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="googleMapsUrl" render={({ field }) => (<FormItem><FormLabel>Enlace de Google Maps (Opcional)</FormLabel><FormControl><Input placeholder="https://maps.app.goo.gl/..." {...field} /></FormControl><FormMessage /></FormItem>)} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><User/>Contacto Principal</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField control={form.control} name="contactPersonName" render={({ field }) => (<FormItem><FormLabel>Nombre</FormLabel><FormControl><Input placeholder="Juan Pérez" {...field} /></FormControl></FormItem>)} />
                <FormField control={form.control} name="contactPersonPhone" render={({ field }) => (<FormItem><FormLabel>Teléfono</FormLabel><FormControl><Input placeholder="4497654321" {...field} /></FormControl></FormItem>)} />
                <FormField control={form.control} name="contactPersonRole" render={({ field }) => (<FormItem><FormLabel>Puesto</FormLabel><FormControl><Input placeholder="Gerente de Servicio" {...field} /></FormControl></FormItem>)} />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader><CardTitle className="text-lg">Logo del Taller</CardTitle></CardHeader>
              <CardContent className="flex flex-col md:flex-row items-center gap-6">
                <div className="w-48 h-48 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted/50 shrink-0">
                  {watchedLogoUrl ? <Image src={watchedLogoUrl} alt="Logo del Taller" width={180} height={180} className="object-contain" /> : <Building className="h-16 w-16 text-muted-foreground" />}
                </div>
                <div className="space-y-2 flex-grow">
                  <FormLabel>Subir Nuevo Logo</FormLabel>
                  <Button type="button" variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                    {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                    {isUploading ? "Subiendo..." : "Seleccionar Imagen"}
                  </Button>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/png, image/jpeg, image/webp" onChange={handleImageUpload} />
                  <FormDescription>Se recomienda una imagen cuadrada con fondo transparente (PNG).</FormDescription>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={form.formState.isSubmitting}><Save className="mr-2 h-4 w-4" />{form.formState.isSubmitting ? "Guardando..." : "Guardar Información"}</Button>
            </div>
          </CardContent>
        </form>
      </Form>
    </Card>
  );
}
