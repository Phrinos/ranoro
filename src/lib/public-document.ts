import { savePublicDocument as savePublicDocumentAction } from "@/app/s/[id]/actions";
import { sanitizeObjectForFirestore } from '@/lib/placeholder-data';
import type { QuoteRecord, ServiceRecord, Vehicle, WorkshopInfo } from "@/types";

export const savePublicDocument = async (
  type: 'quote' | 'service',
  data: QuoteRecord | ServiceRecord,
  vehicle: Vehicle | null,
  workshopInfo: WorkshopInfo | {}
) => {
  if (!data.publicId || !vehicle) {
    console.warn(`Public save skipped: Missing publicId or vehicle data.`);
    return;
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
      throw new Error(result.error);
    }
    console.log(`Public ${type} document ${data.publicId} saved successfully.`);
  } catch (e) {
    console.error(`Failed to save public ${type} document:`, e);
    throw new Error(`No se pudo guardar el documento público. El enlace compartido podría no funcionar. Error: ${e instanceof Error ? e.message : String(e)}`);
  }
};
