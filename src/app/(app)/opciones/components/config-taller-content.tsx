

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
import { Save, Upload, Loader2, Building, User, Crop, Globe, FileJson } from 'lucide-react';
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
  // Americas
  { value: 'America/Mexico_City', label: '(GMT-6) Ciudad de México (CST/CDT)' },
  { value: 'America/Cancun', label: '(GMT-5) Cancún (EST)' },
  { value: 'America/Tijuana', label: '(GMT-8) Tijuana (PST/PDT)' },
  { value: 'America/Bogota', label: '(GMT-5) Bogotá, Lima, Quito' },
  { value: 'America/Santiago', label: '(GMT-4) Santiago (CLT/CLST)' },
  { value: 'America/Buenos_Aires', label: '(GMT-3) Buenos Aires (ART)' },
  { value: 'America/Caracas', label: '(GMT-4) Caracas (VET)' },
  { value: 'America/Los_Angeles', label: '(GMT-8) Los Ángeles (PST/PDT)' },
  { value: 'America/New_York', label: '(GMT-5) Nueva York (EST/EDT)' },
  // Europe
  { value: 'Europe/Madrid', label: '(GMT+1) Madrid, París (CET/CEST)' },
];

const LOCALSTORAGE_KEY = 'workshopTicketInfo';
const FIRESTORE_DOC_ID = 'main'; // Document ID for the single config

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
    },
  });

  const watchedLogoUrl = form.watch('logoUrl');

  useEffect(() => {
    // Load config from Firestore first, then fallback to localStorage
    const loadConfig = async () => {
        if (!db) return;
        const configRef = doc(db, 'workshopConfig', FIRESTORE_DOC_ID);
        const docSnap = await getDoc(configRef);
        if (docSnap.exists()) {
            form.reset(docSnap.data());
        } else {
            const stored = localStorage.getItem(LOCALSTORAGE_KEY);
            if (stored) {
                try {
                    form.reset(JSON.parse(stored));
                } catch { /* ignore parsing errors */ }
            }
        }
    };
    loadConfig();
  }, [form]);

  const onSubmit = async (data: TallerFormValues) => {
    try {
      // 1. Save to localStorage for quick UI updates
      localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(data));
      
      // 2. Save to Firestore for persistence
      if (db) {
        const configRef = doc(db, 'workshopConfig', FIRESTORE_DOC_ID);
        await setDoc(configRef, data, { merge: true });
      }

      toast({ title: 'Información guardada', description: 'Se actualizaron los datos del taller.', duration: 3000 });
    } catch {
      toast({ title: 'Error al guardar', variant: 'destructive', duration: 3000 });
    }
  };

  const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setCrop(undefined);
      const reader = new FileReader();
      reader.addEventListener('load', () => setImgSrc(reader.result?.toString() || ''));
      reader.readAsDataURL(e.target.files[0]);
      setIsCropping(true);
    }
    if (e.target) e.target.value = '';
  };
  
  const handleCropComplete = () => {
    if (!previewCanvasRef.current) return toast({ title: 'Error de recorte', variant: 'destructive' });
    const canvas = previewCanvasRef.current;
    const croppedDataUrl = canvas.toDataURL('image/png');
    uploadCroppedImage(croppedDataUrl);
  };
  
  const uploadCroppedImage = async (dataUrl: string) => {
    if (!storage) return toast({ title: 'Error de Configuración', variant: 'destructive' });

    setIsUploading(true);
    setIsCropping(false);
    toast({ title: 'Subiendo imagen...', description: 'Por favor, espere.' });
    
    try {
      const storageRef = ref(storage, `workshop-logos/main-logo-${Date.now()}.png`);
      const optimizedUrl = await optimizeImage(dataUrl, 400, 0.9, 'image/png'); // Ensure PNG for transparency
      await uploadString(storageRef, optimizedUrl, 'data_url');
      const downloadURL = await getDownloadURL(storageRef);
      form.setValue('logoUrl', downloadURL, { shouldDirty: true });
      toast({ title: '¡Logo actualizado!', description: 'La nueva imagen se ha cargado correctamente.' });
    } catch (error) {
      toast({ title: 'Error al subir', variant: 'destructive' });
    } finally {
      setIsUploading(false);
      setImgSrc('');
    }
  };


  useEffect(() => {
    if (!completedCrop || !previewCanvasRef.current || !imgRef.current) return;
    const image = imgRef.current;
    const canvas = previewCanvasRef.current;
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No 2d context');

    canvas.width = Math.floor(completedCrop.width * scaleX);
    canvas.height = Math.floor(completedCrop.height * scaleY);
    
    ctx.drawImage(
      image,
      completedCrop.x * scaleX, completedCrop.y * scaleY,
      completedCrop.width * scaleX, completedCrop.height * scaleY,
      0, 0,
      canvas.width, canvas.height
    );
  }, [completedCrop]);
  
  function centerAspectCrop(mediaWidth: number, mediaHeight: number, aspect: number): ReactCropType {
    return centerCrop(makeAspectCrop({ unit: '%', width: 90 }, aspect, mediaWidth, mediaHeight), mediaWidth, mediaHeight);
  }

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { width, height } = e.currentTarget;
    setCrop(centerAspectCrop(width, height, 16 / 9));
  }


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
            <Card>
              <CardHeader><CardTitle className="text-lg">Logo del Taller</CardTitle></CardHeader>
              <CardContent className="flex flex-col md:flex-row items-center gap-6">
                <div className="w-48 h-48 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted/50 shrink-0 relative">
                  {watchedLogoUrl ? <Image src={watchedLogoUrl} alt="Logo del Taller" fill style={{objectFit: 'contain'}} sizes="192px" /> : <Building className="h-16 w-16 text-muted-foreground" />}
                </div>
                <div className="space-y-2 flex-grow">
                  <FormLabel>Subir Nuevo Logo</FormLabel>
                  <Button type="button" variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                    {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                    {isUploading ? 'Subiendo...' : 'Seleccionar Imagen'}
                  </Button>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/png, image/jpeg, image/webp" onChange={onSelectFile} />
                  <FormMessage>{form.formState.errors.logoUrl?.message}</FormMessage>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Building/>Datos Generales</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nombre del Taller</FormLabel><FormControl><Input placeholder="Mi Taller Mecánico" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="addressLine1" render={({ field }) => (<FormItem><FormLabel>Dirección</FormLabel><FormControl><Input placeholder="Calle Principal 123, Colonia" {...field} onChange={(e) => field.onChange(capitalizeWords(e.target.value))} /></FormControl><FormMessage /></FormItem>)} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="phone" render={({ field }) => (<FormItem><FormLabel>Teléfono Principal</FormLabel><FormControl><Input placeholder="4491234567" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="timezone" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Zona Horaria del Taller</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Seleccione una zona horaria" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {TIMEZONE_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="googleMapsUrl" render={({ field }) => (<FormItem><FormLabel>Enlace de Google Maps (Opcional)</FormLabel><FormControl><Input placeholder="https://maps.app.goo.gl/..." {...field} /></FormControl><FormMessage /></FormItem>)} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><User/>Contacto Principal</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField control={form.control} name="contactPersonName" render={({ field }) => (<FormItem><FormLabel>Nombre</FormLabel><FormControl><Input placeholder="Juan Pérez" {...field} onChange={(e) => field.onChange(capitalizeWords(e.target.value))} /></FormControl></FormItem>)} />
                <FormField control={form.control} name="contactPersonPhone" render={({ field }) => (<FormItem><FormLabel>Teléfono</FormLabel><FormControl><Input placeholder="4497654321" {...field} /></FormControl></FormItem>)} />
                <FormField control={form.control} name="contactPersonRole" render={({ field }) => (<FormItem><FormLabel>Puesto</FormLabel><FormControl><Input placeholder="Gerente de Servicio" {...field} onChange={(e) => field.onChange(capitalizeWords(e.target.value))} /></FormControl></FormItem>)} />
              </CardContent>
            </Card>

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={form.formState.isSubmitting}><Save className="mr-2 h-4 w-4" />{form.formState.isSubmitting ? 'Guardando...' : 'Guardar Información'}</Button>
            </div>
          </CardContent>
        </form>
      </Form>
    </Card>

    <Dialog open={isCropping} onOpenChange={setIsCropping}>
        <DialogContent className="max-w-2xl">
            <DialogHeader>
                <DialogTitle>Recortar Imagen</DialogTitle>
            </DialogHeader>
            <div className="my-4">
              {imgSrc && (
                  <ReactCrop crop={crop} onChange={(_, percentCrop) => setCrop(percentCrop)} onComplete={(c) => setCompletedCrop(c)} aspect={16 / 9} minHeight={100}>
                    <img ref={imgRef} alt="Crop me" src={imgSrc} onLoad={onImageLoad} style={{ maxHeight: '70vh' }} />
                  </ReactCrop>
              )}
               {!!completedCrop && (<canvas ref={previewCanvasRef} className="hidden" />)}
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsCropping(false)}>Cancelar</Button>
                <Button onClick={handleCropComplete} disabled={!completedCrop?.width}>
                    <Crop className="mr-2 h-4 w-4"/>Recortar y Guardar
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </>
  );
}
