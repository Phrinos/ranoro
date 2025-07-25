
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
import { Save, Upload, Loader2, Building, User, Crop } from 'lucide-react';
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
    'America/Mexico_City',
    'America/Cancun',
    'America/Tijuana',
    'America/Hermosillo',
    'America/Mazatlan',
    'America/Chihuahua',
    'America/Monterrey',
    'America/Merida',
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
    defaultValues: { name: 'RANORO', phone: '', addressLine1: '', logoUrl: '/ranoro-logo.png', timezone: 'America/Mexico_City'},
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
      const dataToSave = cleanObjectForFirestore(data);
      localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(dataToSave));
      if (db) {
        const configRef = doc(db, 'workshopConfig', FIRESTORE_DOC_ID);
        await setDoc(configRef, dataToSave, { merge: true });
      }
      toast({ title: 'Información guardada', description: 'Se actualizaron los datos del taller.' });
    } catch {
      toast({ title: 'Error al guardar', variant: 'destructive' });
    }
  };
  
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.addEventListener('load', () => setImgSrc(String(reader.result)));
      reader.readAsDataURL(e.target.files[0]);
      setIsCropping(true);
    }
  };

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    const aspect = 16 / 6;
    const newCrop = centerCrop(
      makeAspectCrop({ unit: '%', width: 90 }, aspect, width, height),
      width, height
    );
    setCrop(newCrop);
  };

  const handleCropComplete = async () => {
    if (!previewCanvasRef.current || !imgRef.current) return;
    const canvas = previewCanvasRef.current;
    const image = imgRef.current;
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    const pixelCrop = completedCrop;

    if (!pixelCrop) return;

    canvas.width = pixelCrop.width * scaleX;
    canvas.height = pixelCrop.height * scaleY;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(
      image,
      pixelCrop.x * scaleX,
      pixelCrop.y * scaleY,
      pixelCrop.width * scaleX,
      pixelCrop.height * scaleY,
      0, 0,
      pixelCrop.width * scaleX,
      pixelCrop.height * scaleY
    );

    const base64Image = canvas.toDataURL('image/png');
    
    setIsUploading(true);
    toast({ title: 'Subiendo logo...', description: 'Por favor, espere.' });

    try {
      const optimizedUrl = await optimizeImage(base64Image, 400);
      const storageRef = ref(storage, `workshop-logos/logo-${Date.now()}.png`);
      await uploadString(storageRef, optimizedUrl, 'data_url');
      const downloadURL = await getDownloadURL(storageRef);
      form.setValue('logoUrl', downloadURL, { shouldDirty: true });
      toast({ title: '¡Logo actualizado!', description: 'La nueva imagen se ha cargado correctamente.' });
    } catch(e) {
      console.error(e);
      toast({ title: "Error al subir", variant: "destructive" });
    } finally {
      setIsUploading(false);
      setIsCropping(false);
    }
  };

  const cleanObjectForFirestore = (obj: any) => {
    return Object.entries(obj).reduce((acc, [key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        acc[key] = value;
      }
      return acc;
    }, {} as any);
  };

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
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Building/>Información General y Logo</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-4 items-center">
                    <div className="w-48 h-16 flex-shrink-0 bg-muted/50 rounded-md flex items-center justify-center border relative">
                        {watchedLogoUrl ? <Image src={watchedLogoUrl} alt="Logo del Taller" fill style={{objectFit:"contain"}} sizes="192px" data-ai-hint="workshop logo"/> : <p className="text-xs text-muted-foreground">Sin logo</p>}
                    </div>
                    <div className="w-full">
                      <FormLabel>Subir/Cambiar Logo</FormLabel>
                      <Button type="button" variant="outline" className="w-full mt-2" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>{isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Upload className="mr-2 h-4 w-4" />}{isUploading ? "Subiendo..." : "Seleccionar Imagen"}</Button>
                      <input type="file" ref={fileInputRef} className="hidden" accept="image/png, image/jpeg, image/webp" onChange={onFileChange} />
                    </div>
                  </div>
                  <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nombre del Taller</FormLabel><FormControl><Input {...field} onChange={(e) => field.onChange(capitalizeWords(e.target.value))} /></FormControl><FormMessage /></FormItem>)}/>
                  <FormField control={form.control} name="phone" render={({ field }) => (<FormItem><FormLabel>Teléfono de Contacto</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                  <FormField control={form.control} name="addressLine1" render={({ field }) => (<FormItem><FormLabel>Dirección</FormLabel><FormControl><Input placeholder="Calle, Número, Colonia, C.P." {...field} /></FormControl><FormMessage /></FormItem>)}/>
                   <FormField control={form.control} name="googleMapsUrl" render={({ field }) => (<FormItem><FormLabel>URL de Google Maps (Opcional)</FormLabel><FormControl><Input type="url" placeholder="https://maps.app.goo.gl/..." {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)}/>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><User/>Contacto Adicional (Opcional)</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="contactPersonName" render={({ field }) => ( <FormItem><FormLabel>Nombre</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl></FormItem> )}/>
                  <FormField control={form.control} name="contactPersonPhone" render={({ field }) => ( <FormItem><FormLabel>Teléfono</FormLabel><FormControl><Input {...field} value={field.value ?? ''}/></FormControl></FormItem> )}/>
                  <FormField control={form.control} name="contactPersonRole" render={({ field }) => ( <FormItem className="md:col-span-2"><FormLabel>Puesto</FormLabel><FormControl><Input placeholder="Gerente, Jefe de Taller, etc." {...field} value={field.value ?? ''}/></FormControl></FormItem> )}/>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader><CardTitle className="text-lg flex items-center gap-2">Configuración de Facturación (Factura.com)</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <FormField control={form.control} name="facturaComApiKey" render={({ field }) => (<FormItem><FormLabel>API Key</FormLabel><FormControl><Input type="password" placeholder="Tu API Key de Factura.com" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="facturaComApiSecret" render={({ field }) => (<FormItem><FormLabel>API Secret (Opcional)</FormLabel><FormControl><Input type="password" placeholder="Tu API Secret" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="facturaComBillingMode" render={({ field }) => (
                    <FormItem>
                    <FormLabel>Modo de Facturación</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                        <SelectItem value="test">Pruebas (Sandbox)</SelectItem>
                        <SelectItem value="live">Producción (Live)</SelectItem>
                        </SelectContent>
                    </Select>
                    </FormItem>
                )} />
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
          <DialogHeader><DialogTitle>Recortar Logo</DialogTitle></DialogHeader>
          <div className="my-4" style={{ display: 'flex', justifyContent: 'center' }}>
              {imgSrc && (
                  <ReactCrop
                      crop={crop}
                      onChange={c => setCrop(c)}
                      onComplete={(c) => setCompletedCrop(c)}
                      aspect={16 / 6}
                      minWidth={100}
                  >
                      <Image ref={imgRef} src={imgSrc} alt="Imagen para recortar" onLoad={onImageLoad} width={600} height={400} style={{maxHeight: "70vh"}}/>
                  </ReactCrop>
              )}
          </div>
          <canvas ref={previewCanvasRef} style={{ display: 'none' }} />
          <DialogFooter>
            <Button onClick={handleCropComplete} disabled={isUploading}><Crop className="mr-2 h-4 w-4" />Recortar y Subir</Button>
          </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}

