
"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Form } from '@/components/ui/form';
import { Save, Crop } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { storage, db } from '@/lib/firebaseClient.js';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { optimizeImage } from '@/lib/utils';
import Image from 'next/image';
import ReactCrop, { centerCrop, makeAspectCrop, type Crop as ReactCropType } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

import { InfoGeneralCard } from './config-taller/info-general-card';
import { ContactoAdicionalCard } from './config-taller/contacto-adicional-card';
import { FacturacionCard } from './config-taller/facturacion-card';

const FIRESTORE_DOC_ID = 'main';

const tallerSchema = z.object({
  name: z.string().min(1, 'El nombre del taller es obligatorio'),
  phone: z.string().min(7, 'Mínimo 7 dígitos'),
  addressLine1: z.string().min(5, 'La dirección es obligatoria'),
  googleMapsUrl: z.string().url('Ingrese una URL válida de Google Maps.').optional().or(z.literal('')),
  logoUrl: z.string().url('Debe proporcionar una URL del logo o subir una imagen.'),
  contactPersonName: z.string().optional(),
  contactPersonPhone: z.string().optional(),
  contactPersonRole: z.string().optional(),
  facturaComApiKey: z.string().optional(),
  facturaComApiSecret: z.string().optional(),
  facturaComBillingMode: z.enum(['live', 'test']).optional(),
});

type TallerFormValues = z.infer<typeof tallerSchema>;

const cleanObjectForFirestore = (obj: any) => {
    return Object.entries(obj).reduce((acc, [key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        acc[key] = value;
      }
      return acc;
    }, {} as any);
};

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

  const methods = useForm<TallerFormValues>({
    resolver: zodResolver(tallerSchema),
    defaultValues: { name: 'RANORO', phone: '', addressLine1: '', logoUrl: '/ranoro-logo.png'},
  });

  const watchedLogoUrl = methods.watch('logoUrl');

  useEffect(() => {
    const loadConfig = async () => {
        if (!db) return;
        const configRef = doc(db, 'workshopConfig', FIRESTORE_DOC_ID);
        try {
            const docSnap = await getDoc(configRef);
            if (docSnap.exists()) {
                methods.reset(docSnap.data() as TallerFormValues);
            }
        } catch (error) {
            console.error("Error loading workshop config:", error instanceof Error ? error.message : String(error));
            toast({ title: 'Error al cargar la configuración', variant: 'destructive' });
        }
    };
    loadConfig();
  }, [methods, toast]);

  const onSubmit = useCallback(async (data: TallerFormValues) => {
    try {
      const dataToSave = cleanObjectForFirestore(data);
      if (db) {
        const configRef = doc(db, 'workshopConfig', FIRESTORE_DOC_ID);
        await setDoc(configRef, dataToSave, { merge: true });
      }
      toast({ title: 'Información guardada', description: 'Se actualizó los datos del taller.' });
    } catch {
      toast({ title: 'Error al guardar', variant: 'destructive' });
    }
  }, [toast]);
  
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setImgSrc(String(reader.result));
        setIsCropping(true);
      });
      reader.readAsDataURL(e.target.files[0]);
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

  const handleCropComplete = useCallback(async () => {
    if (!previewCanvasRef.current || !imgRef.current || !completedCrop) return;
    
    const canvas = previewCanvasRef.current;
    const image = imgRef.current;
    
    setIsUploading(true);
    toast({ title: 'Subiendo logo...', description: 'Por favor, espere.' });

    try {
      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;
      canvas.width = completedCrop.width * scaleX;
      canvas.height = completedCrop.height * scaleY;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(image, completedCrop.x * scaleX, completedCrop.y * scaleY, completedCrop.width * scaleX, completedCrop.height * scaleY, 0, 0, canvas.width, canvas.height);
      const base64Image = canvas.toDataURL('image/png');

      const optimizedUrl = await optimizeImage(base64Image, 400);
      const storageRef = ref(storage, `workshop-logos/logo-${Date.now()}.png`);
      await uploadString(storageRef, optimizedUrl, 'data_url');
      const downloadURL = await getDownloadURL(storageRef);
      
      methods.setValue('logoUrl', downloadURL, { shouldDirty: true });
      toast({ title: '¡Logo actualizado!', description: 'La nueva imagen se ha cargado correctamente.' });
    } catch(e) {
      console.error(e instanceof Error ? e.message : String(e));
      toast({ title: "Error al subir", variant: "destructive" });
    } finally {
      setIsUploading(false);
      setIsCropping(false);
      setImgSrc('');
    }
  }, [completedCrop, methods, toast]);

  return (
    <>
      <FormProvider {...methods}>
        <Form {...methods}>
          <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-6">
            <InfoGeneralCard
              watchedLogoUrl={watchedLogoUrl}
              fileInputRef={fileInputRef as any}
              isUploading={isUploading}
              onFileChange={onFileChange}
            />
            <ContactoAdicionalCard />
            <FacturacionCard />
            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={methods.formState.isSubmitting || isUploading}>
                <Save className="mr-2 h-4 w-4" />
                {methods.formState.isSubmitting ? 'Guardando...' : 'Guardar Información'}
              </Button>
            </div>
          </form>
        </Form>
      </FormProvider>
      
      <Dialog open={isCropping} onOpenChange={setIsCropping}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Recortar Logo</DialogTitle>
          </DialogHeader>
          <div className="my-4 flex justify-center">
            {imgSrc && (
              <ReactCrop
                crop={crop}
                onChange={(c) => setCrop(c)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={16 / 6}
                minWidth={100}
              >
                <Image
                  ref={imgRef}
                  src={imgSrc}
                  alt="Imagen para recortar"
                  onLoad={onImageLoad}
                  width={600}
                  height={400}
                  style={{ maxHeight: '70vh', objectFit: 'contain' }}
                  sizes="100vw"
                />
              </ReactCrop>
            )}
          </div>
          <canvas ref={previewCanvasRef} className="hidden" />
          <DialogFooter>
            <Button onClick={handleCropComplete} disabled={isUploading}>
              <Crop className="mr-2 h-4 w-4" />
              Recortar y Subir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
