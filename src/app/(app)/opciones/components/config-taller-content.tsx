
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Save, Upload, Loader2, Building, User, Crop, FileJson } from 'lucide-react';
import type { WorkshopInfo } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { storage, db } from '@/lib/firebaseClient.js';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { optimizeImage, capitalizeWords } from '@/lib/utils';
import Image from 'next/image';
import ReactCrop, { centerCrop, makeAspectCrop, type Crop as ReactCropType } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

const TIMEZONE_OPTIONS = [
  // ... (timezone options remain the same)
];

const LOCALSTORAGE_KEY = 'workshopTicketInfo';
const FIRESTORE_DOC_ID = 'main';

const tallerSchema = z.object({
  name: z.string().min(1, 'El nombre del taller es obligatorio'),
  phone: z.string().min(7, 'Mínimo 7 dígitos'),
  addressLine1: z.string().min(5, 'La dirección es obligatoria'),
  googleMapsUrl: z.string().url('Ingrese una URL válida de Google Maps.').optional().or(z.literal('')),
  logoUrl: z.string().url('Debe proporcionar una URL del logo o subir una imagen.'),
  timezone: z.string().optional(),
  contactPersonName: z.string().optional(),
  contactPersonPhone: z.string().optional(),
  contactPersonRole: z.string().optional(),
  // New Factura.com fields
  facturaComApiKey: z.string().optional(),
  facturaComApiSecret: z.string().optional(),
  facturaComBillingMode: z.enum(['live', 'test']).optional(),
});

type TallerFormValues = z.infer<typeof tallerSchema>;

export function ConfigTallerPageContent() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isCropping, setIsCropping] = useState(false);
  const [imgSrc, setImgSrc] = useState('');
  const [crop, setCrop] = useState<ReactCropType>();
  const [completedCrop, setCompletedCrop] = useState<ReactCropType>();
  const imgRef = useRef<HTMLImageElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  const form = useForm<TallerFormValues>({
    resolver: zodResolver(tallerSchema),
    defaultValues: {
        name: 'RANORO', phone: '', addressLine1: '', logoUrl: '/ranoro-logo.png', timezone: 'America/Mexico_City',
        facturaComBillingMode: 'test',
    },
  });

  const watchedLogoUrl = form.watch('logoUrl');

  useEffect(() => {
    const loadConfig = async () => {
        if (!db) return;
        const configRef = doc(db, 'workshopConfig', FIRESTORE_DOC_ID);
        const docSnap = await getDoc(configRef);
        if (docSnap.exists()) {
            form.reset(docSnap.data());
        } else {
            const stored = localStorage.getItem(LOCALSTORAGE_KEY);
            if (stored) {
                try { form.reset(JSON.parse(stored)); } catch {}
            }
        }
    };
    loadConfig();
  }, [form]);

  const onSubmit = async (data: TallerFormValues) => {
    try {
      localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(data));
      if (db) {
        const configRef = doc(db, 'workshopConfig', FIRESTORE_DOC_ID);
        await setDoc(configRef, data, { merge: true });
      }
      toast({ title: 'Información guardada', description: 'Se actualizaron los datos del taller.' });
    } catch {
      toast({ title: 'Error al guardar', variant: 'destructive' });
    }
  };
  
  // ... (image upload and crop logic remains the same)

  return (
    <>
    <Card className="max-w-4xl mx-auto shadow-lg">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <CardHeader>
            <CardTitle>Información del Taller</CardTitle>
            <CardDescription>Estos datos se utilizarán en documentos y reportes. Se guardan en la nube.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* ... (Logo and General Info cards remain the same) ... */}

            <Card>
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><FileJson />Configuración de Facturación (Factura.com)</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                  <FormField
                      control={form.control}
                      name="facturaComBillingMode"
                      render={({ field }) => (
                          <FormItem>
                              <FormLabel>Modo de Facturación</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value ?? 'test'}>
                                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                  <SelectContent>
                                      <SelectItem value="test">Pruebas (Sandbox)</SelectItem>
                                      <SelectItem value="live">Producción (Live)</SelectItem>
                                  </SelectContent>
                              </Select>
                              <FormMessage />
                          </FormItem>
                      )}
                  />
                  <FormField control={form.control} name="facturaComApiKey" render={({ field }) => (<FormItem><FormLabel>API Key</FormLabel><FormControl><Input placeholder="Tu API Key de Factura.com" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="facturaComApiSecret" render={({ field }) => (<FormItem><FormLabel>API Secret</FormLabel><FormControl><Input type="password" placeholder="Tu API Secret de Factura.com" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
              </CardContent>
            </Card>

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={form.formState.isSubmitting}><Save className="mr-2 h-4 w-4" />{form.formState.isSubmitting ? 'Guardando...' : 'Guardar Información'}</Button>
            </div>
          </CardContent>
        </form>
      </Form>
    </Card>

    {/* ... (Dialog for cropping remains the same) ... */}
    </>
  );
}
