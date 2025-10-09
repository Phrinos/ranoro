// functions/src/migration.ts
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Define an interface for the user data to satisfy TypeScript
interface UserData {
  name?: string;
  signatureDataUrl?: string;
  [key: string]: any; // Allow other properties
}

interface User extends UserData {
  id: string;
}

// Inicializa Firebase Admin si no se ha hecho antes
if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Normaliza una cadena para comparación (minúsculas, sin acentos, espacios simples).
 */
const normalizeString = (s?: string): string =>
  (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Script de migración para unificar los datos de los servicios.
 * Se puede ejecutar llamando a la URL de la función.
 */
export const runDataUnification = functions.https.onRequest(
  async (request, response) => {
    functions.logger.info("Iniciando migración de unificación de datos...", { structuredData: true });

    try {
      // 1. Obtener todos los usuarios y mapearlos para búsqueda rápida
      const usersSnapshot = await db.collection("users").get();
      const usersById = new Map<string, User>();
      const usersByName = new Map<string, User>();
      usersSnapshot.forEach((doc) => {
        const user: User = { id: doc.id, ...doc.data() as UserData };
        usersById.set(user.id, user);
        if (user.name) {
          usersByName.set(normalizeString(user.name), user);
        }
      });

      // 2. Obtener todos los registros de servicio
      const servicesSnapshot = await db.collection("serviceRecords").get();
      const batch = db.batch();
      let updatedCount = 0;

      // 3. Iterar sobre cada servicio para verificar y corregir
      servicesSnapshot.forEach((doc) => {
        const serviceData = doc.data();
        const serviceRef = doc.ref;
        let needsUpdate = false;
        const updatePayload: { [key: string]: any } = {};

        // --- UNIFICACIÓN DEL ASESOR ---
        let advisorId = serviceData.serviceAdvisorId || serviceData.advisorId || serviceData.serviceAdvisor_id;
        let advisorName = serviceData.serviceAdvisorName || serviceData.advisorName;
        let advisorSignature = serviceData.serviceAdvisorSignatureDataUrl || serviceData.advisorSignatureDataUrl;

        if (advisorId && !advisorName) {
            const user = usersById.get(advisorId);
            if (user?.name) advisorName = user.name;
        } else if (!advisorId && advisorName) {
            const user = usersByName.get(normalizeString(advisorName));
            if (user?.id) advisorId = user.id;
        }
        
        if(advisorId && !advisorSignature) {
            const user = usersById.get(advisorId);
            if(user?.signatureDataUrl) advisorSignature = user.signatureDataUrl;
        }
        
        // Compara y añade al payload
        if (advisorId !== serviceData.serviceAdvisorId) { updatePayload.serviceAdvisorId = advisorId || null; needsUpdate = true; }
        if (advisorName !== serviceData.serviceAdvisorName) { updatePayload.serviceAdvisorName = advisorName || null; needsUpdate = true; }
        if (advisorSignature !== serviceData.serviceAdvisorSignatureDataUrl) { updatePayload.serviceAdvisorSignatureDataUrl = advisorSignature || null; needsUpdate = true; }

        // --- UNIFICACIÓN DEL TÉCNICO ---
        let techId = serviceData.technicianId || serviceData.technician_id;
        let techName = serviceData.technicianName;

        if (techId && !techName) {
            const user = usersById.get(techId);
            if (user?.name) techName = user.name;
        } else if (!techId && techName) {
            const user = usersByName.get(normalizeString(techName));
            if (user?.id) techId = user.id;
        }
        
        if (techId !== serviceData.technicianId) { updatePayload.technicianId = techId || null; needsUpdate = true; }
        if (techName !== serviceData.technicianName) { updatePayload.technicianName = techName || null; needsUpdate = true; }

        // --- UNIFICACIÓN DEL TOTAL ---
        const totalCandidates = [serviceData.total, serviceData.totalCost, serviceData.Total];
        const currentTotal = totalCandidates.find(t => typeof t === 'number' && Number.isFinite(t));

        if (currentTotal !== undefined && serviceData.serviceTotal !== currentTotal) {
            updatePayload.serviceTotal = currentTotal;
            needsUpdate = true;
        }

        // --- LIMPIEZA DE CAMPOS LEGACY ---
        const legacyFields = ['advisorId', 'serviceAdvisor_id', 'advisorName', 'advisorSignatureDataUrl', 'technician_id', 'total', 'totalCost', 'Total'];
        legacyFields.forEach(field => {
            if (serviceData[field] !== undefined) {
                updatePayload[field] = admin.firestore.FieldValue.delete();
                needsUpdate = true;
            }
        });

        if (needsUpdate) {
          batch.update(serviceRef, updatePayload);
          updatedCount++;
        }
      });

      // 4. Ejecutar el lote de actualizaciones si hay cambios
      if (updatedCount > 0) {
        await batch.commit();
        const successMsg = `Migración completada. ${updatedCount} servicios fueron unificados.`;
        functions.logger.info(successMsg);
        response.send(successMsg);
      } else {
        const noChangesMsg = "Migración completada. No se encontraron servicios que necesiten actualización.";
        functions.logger.info(noChangesMsg);
        response.send(noChangesMsg);
      }
    } catch (error) {
      functions.logger.error("Error durante la migración:", error);
      response.status(500).send("Ocurrió un error durante la migración. Revisa los logs.");
    }
  }
);
