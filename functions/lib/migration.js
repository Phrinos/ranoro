"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.runDataUnification = void 0;
// functions/src/migration.ts
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
// Firebase Admin is initialized in index.ts, so we just get the instance here.
const db = admin.firestore();
/**
 * Normaliza una cadena para comparación (minúsculas, sin acentos, espacios simples).
 */
const normalizeString = (s) => (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
/**
 * Script de migración para unificar los datos de los servicios.
 * Se puede ejecutar llamando a la URL de la función.
 */
exports.runDataUnification = functions.https.onRequest(async (request, response) => {
    functions.logger.info("Iniciando migración de unificación de datos...", { structuredData: true });
    try {
        // 1. Obtener todos los usuarios y mapearlos para búsqueda rápida
        const usersSnapshot = await db.collection("users").get();
        const usersById = new Map();
        const usersByName = new Map();
        usersSnapshot.forEach((doc) => {
            const data = doc.data();
            const user = { id: doc.id, ...data };
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
            const updatePayload = {};
            // --- UNIFICACIÓN DEL ASESOR ---
            let advisorId = serviceData.serviceAdvisorId || serviceData.advisorId || serviceData.serviceAdvisor_id || serviceData.serviceAdvisor?.id;
            let advisorName = serviceData.serviceAdvisorName || serviceData.advisorName || serviceData.serviceAdvisor?.name;
            let advisorSignature = serviceData.serviceAdvisorSignatureDataUrl || serviceData.advisorSignatureDataUrl;
            if (advisorId && !advisorName) {
                const user = usersById.get(advisorId);
                if (user?.name)
                    advisorName = user.name;
            }
            else if (!advisorId && advisorName) {
                const user = usersByName.get(normalizeString(advisorName));
                if (user?.id)
                    advisorId = user.id;
            }
            if (advisorId && !advisorSignature) {
                const user = usersById.get(advisorId);
                if (user?.signatureDataUrl)
                    advisorSignature = user.signatureDataUrl;
            }
            if (advisorId !== undefined && advisorId !== serviceData.serviceAdvisorId) {
                updatePayload.serviceAdvisorId = advisorId ?? null;
                needsUpdate = true;
            }
            if (advisorName !== undefined && advisorName !== serviceData.serviceAdvisorName) {
                updatePayload.serviceAdvisorName = advisorName ?? null;
                needsUpdate = true;
            }
            if (advisorSignature !== undefined && advisorSignature !== serviceData.serviceAdvisorSignatureDataUrl) {
                updatePayload.serviceAdvisorSignatureDataUrl = advisorSignature ?? null;
                needsUpdate = true;
            }
            // --- UNIFICACIÓN DEL TÉCNICO ---
            let techId = serviceData.technicianId || serviceData.technician_id || serviceData.technician?.id;
            let techName = serviceData.technicianName || serviceData.technician?.name;
            if (techId && !techName) {
                const user = usersById.get(techId);
                if (user?.name)
                    techName = user.name;
            }
            else if (!techId && techName) {
                const user = usersByName.get(normalizeString(techName));
                if (user?.id)
                    techId = user.id;
            }
            if (techId !== undefined && techId !== serviceData.technicianId) {
                updatePayload.technicianId = techId ?? null;
                needsUpdate = true;
            }
            if (techName !== undefined && techName !== serviceData.technicianName) {
                updatePayload.technicianName = techName ?? null;
                needsUpdate = true;
            }
            // --- UNIFICACIÓN DEL TOTAL ---
            const totalCandidates = [serviceData.total, serviceData.totalCost, serviceData.Total, serviceData.serviceTotal];
            const currentTotal = totalCandidates.find(t => typeof t === 'number' && Number.isFinite(t));
            if (currentTotal !== undefined) {
                updatePayload.total = currentTotal;
                needsUpdate = true;
            }
            // --- LIMPIEZA DE CAMPOS LEGACY ---
            const legacyFields = ['advisorId', 'serviceAdvisor_id', 'advisorName', 'advisorSignatureDataUrl', 'technician_id', 'totalCost', 'Total', 'serviceTotal'];
            legacyFields.forEach(field => {
                if (serviceData[field] !== undefined && field !== 'total') { // Keep 'total'
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
        }
        else {
            const noChangesMsg = "Migración completada. No se encontraron servicios que necesiten actualización.";
            functions.logger.info(noChangesMsg);
            response.send(noChangesMsg);
        }
    }
    catch (error) {
        functions.logger.error("Error durante la migración:", error);
        response.status(500).send("Ocurrió un error durante la migración. Revisa los logs.");
    }
});
