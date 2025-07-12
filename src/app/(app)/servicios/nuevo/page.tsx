
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from 'lucide-react';
import { operationsService } from '@/lib/services';
import type { User } from '@/types';
import { AUTH_USER_LOCALSTORAGE_KEY } from '@/lib/placeholder-data';
import { nanoid } from 'nanoid';

// This page now acts as a "creator" that immediately generates a new service record
// and then redirects to the main service history page to edit it.
export default function NuevoServicioRedirectPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(true);

  useEffect(() => {
    const createAndRedirect = async () => {
      try {
        const authUserString = localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY);
        const currentUser: User | null = authUserString ? JSON.parse(authUserString) : null;
        
        if (!currentUser) {
            throw new Error("No se pudo identificar al usuario.");
        }

        const newServiceId = nanoid();
        const newServiceData = {
          id: newServiceId,
          status: 'Cotizacion',
          quoteDate: new Date().toISOString(),
          serviceDate: new Date().toISOString(),
          serviceItems: [],
          serviceAdvisorId: currentUser.id,
          serviceAdvisorName: currentUser.name,
          serviceAdvisorSignatureDataUrl: currentUser.signatureDataUrl || '',
        };

        // Create the document in Firestore
        await operationsService.saveService(newServiceData);

        // Redirect to the history page with parameters to open the new service in edit mode
        router.push(`/servicios/historial?id=${newServiceId}&edit=true`);
        
      } catch (error) {
        console.error("Failed to create new service:", error);
        toast({
          title: 'Error al Crear',
          description: 'No se pudo crear el nuevo registro. Redireccionando al dashboard.',
          variant: 'destructive',
        });
        router.push('/dashboard');
      }
    };

    createAndRedirect();
  }, [router, toast]);

  return (
    <div className="flex h-64 w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-3 text-lg">Creando nuevo registro...</span>
    </div>
  );
}
