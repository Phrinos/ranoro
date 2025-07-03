import { savePublicDocument as savePublicDocumentAction } from "@/app/s/[id]/actions";
import { sanitizeObjectForFirestore } from '@/lib/placeholder-data';
import type { QuoteRecord, ServiceRecord, Vehicle, WorkshopInfo } from "@/types";

export const savePublicDocument = async (
  type: 'quote' | 'service',
  data: QuoteRecord | ServiceRecord,
  vehicle: Vehicle | null,
  workshopInfo: WorkshopInfo | {}
): Promise<{ success: boolean; error?: string }> => {
  if (!data.publicId) {
    const errorMsg = 'Documento no tiene ID público para guardar.';
    console.warn(`Public save skipped: ${errorMsg}`);
    return { success: false, error: errorMsg };
  }
   if (!vehicle) {
    const errorMsg = 'No se ha seleccionado un vehículo para el documento público.';
    console.warn(`Public save skipped: ${errorMsg}`);
    return { success: false, error: errorMsg };
  }

  const collectionName = type === 'quote' ? 'publicQuotes' : 'publicServices';

  const fullPublicData = sanitizeObjectForFirestore({
    ...data,
    vehicle,
    workshopInfo,
  });

  try {
    const result = await savePublicDocumentAction(collectionName, data.publicId, fullPublicData);
    if (!result.success) {
      const isAuthError = result.error?.includes('Could not refresh access token');
      const errorMessage = isAuthError
        ? "No se pudo autenticar con el servidor. El enlace para compartir podría no funcionar. Contacta al administrador."
        : (result.error || "Ocurrió un error desconocido al guardar el documento público.");
      return { success: false, error: errorMessage };
    }
    console.log(`Public ${type} document ${data.publicId} saved successfully.`);
    return { success: true };
  } catch (e) {
    const errorMessage = `Fallo en la comunicación con el servidor. Error: ${e instanceof Error ? e.message : String(e)}`;
    console.error(`Failed to save public ${type} document:`, e);
    return { success: false, error: errorMessage };
  }
};
