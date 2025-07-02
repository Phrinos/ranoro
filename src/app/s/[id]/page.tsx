
import { PublicServiceSheetClientView } from './page-content';
import type { ServiceRecord, Vehicle, WorkshopInfo } from '@/types';
import { adminDb } from '@/lib/firebaseAdmin';

type FetchedData = {
    service: ServiceRecord | null;
    vehicle: Vehicle | null;
    workshopInfo: WorkshopInfo | null;
    error: string | null;
}

export default async function PublicServiceSheetPage({ params }: { params: { id: string } }) {
    const publicId = params.id as string;
    let data: FetchedData = { service: null, vehicle: null, workshopInfo: null, error: null };

    if (!publicId) {
        data.error = "No se proporcionó un ID de servicio en el enlace.";
    } else if (!adminDb) {
        console.error("Firebase Admin SDK is not initialized. Public page cannot fetch data.");
        data.error = "La conexión con la base de datos del servidor no está configurada. Este enlace no funcionará.";
    } else {
        try {
            const serviceRef = adminDb.collection('publicServices').doc(publicId);
            const docSnap = await serviceRef.get();

            if (docSnap.exists) {
                const docData = docSnap.data();
                if (docData) {
                    const serviceData = docData as ServiceRecord & { vehicle?: Vehicle };
                    data.service = serviceData;
                    data.vehicle = serviceData.vehicle || null;
                    data.workshopInfo = serviceData.workshopInfo || null;
                } else {
                    data.error = `El documento de servicio con ID "${publicId}" está vacío.`;
                }
            } else {
                data.error = `La hoja de servicio con ID "${publicId}" no se encontró.`;
            }
        } catch (err) {
            console.error("Error fetching public service sheet on server:", err);
            data.error = "Ocurrió un error al cargar la hoja de servicio desde el servidor.";
        }
    }

    return <PublicServiceSheetClientView initialData={data} />;
}
