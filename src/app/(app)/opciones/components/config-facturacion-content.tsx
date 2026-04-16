"use client";

import React, { useEffect, useCallback } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebaseClient';
import { doc, getDoc, setDoc } from 'firebase/firestore';

import { FacturacionCard } from './config-taller/facturacion-card';

const FIRESTORE_DOC_ID = 'main';

const facturacionSchema = z.object({
  facturaComApiKey: z.string().optional(),
  facturaComApiSecret: z.string().optional(),
  facturaComBillingMode: z.enum(['live', 'test']).optional(),
});

type FacturacionFormInput = z.input<typeof facturacionSchema>;
type FacturacionFormValues = z.output<typeof facturacionSchema>;

const cleanObjectForFirestore = (obj: any) => {
    return Object.entries(obj).reduce((acc, [key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        acc[key] = value;
      }
      return acc;
    }, {} as any);
};

export function ConfigFacturacionPageContent() {
  const { toast } = useToast();

  const methods = useForm<FacturacionFormInput, any, FacturacionFormValues>({
    resolver: zodResolver(facturacionSchema),
    defaultValues: { facturaComBillingMode: 'test' },
  });

  useEffect(() => {
    const loadConfig = async () => {
        if (!db) return;
        const configRef = doc(db, 'workshopConfig', FIRESTORE_DOC_ID);
        try {
            const docSnap = await getDoc(configRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                methods.reset({
                  facturaComApiKey: data.facturaComApiKey || '',
                  facturaComApiSecret: data.facturaComApiSecret || '',
                  facturaComBillingMode: data.facturaComBillingMode || 'test',
                });
            }
        } catch (error) {
            console.error("Error loading billing config:", error instanceof Error ? error.message : String(error));
            toast({ title: 'Error al cargar la configuración de facturación', variant: 'destructive' });
        }
    };
    loadConfig();
  }, [methods, toast]);

  const onSubmit = useCallback(async (data: FacturacionFormValues) => {
    try {
      const dataToSave = cleanObjectForFirestore(data);
      if (db) {
        const configRef = doc(db, 'workshopConfig', FIRESTORE_DOC_ID);
        await setDoc(configRef, dataToSave, { merge: true });
      }
      toast({ title: 'Facturación guardada', description: 'Se actualizaron las credenciales de facturación.' });
    } catch {
      toast({ title: 'Error al guardar', variant: 'destructive' });
    }
  }, [toast]);
  
  return (
    <FormProvider {...methods}>
      <Form {...methods}>
        <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
          <FacturacionCard />
          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={methods.formState.isSubmitting}>
              <Save className="mr-2 h-4 w-4" />
              {methods.formState.isSubmitting ? 'Guardando...' : 'Guardar Información'}
            </Button>
          </div>
        </form>
      </Form>
    </FormProvider>
  );
}
