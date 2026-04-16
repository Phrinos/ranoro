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
exports.generateDailyVehicleStats = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const admin = __importStar(require("firebase-admin"));
const logger = __importStar(require("firebase-functions/logger"));
const db = admin.firestore();
exports.generateDailyVehicleStats = (0, scheduler_1.onSchedule)({
    schedule: "0 12 * * *", // 12:00 every day
    timeZone: "America/Mexico_City",
}, async () => {
    logger.info("Starting daily aggregate job for vehicles...");
    try {
        const snapshot = await db.collection("vehicles").get();
        const now = new Date();
        let recientes = 0;
        let vencidos = 0;
        let sinContacto = 0;
        const duplicateMap = new Map();
        snapshot.docs.forEach((doc) => {
            const data = doc.data();
            // Calcular fechas
            if (data.lastServiceDate) {
                const serviceDateStr = data.lastServiceDate;
                // Parse YYYY-MM-DD o formato similar (depende de cómo se guarde en Ranoro)
                const parts = serviceDateStr.split('-');
                if (parts.length === 3) {
                    const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                    if (!isNaN(d.getTime())) {
                        const diffTime = Math.abs(now.getTime() - d.getTime());
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        if (diffDays <= 60)
                            recientes++;
                        if (diffDays > 180)
                            vencidos++;
                    }
                }
                else {
                    // Intento directo si es timestamp u otro iso str
                    const d2 = new Date(serviceDateStr);
                    if (!isNaN(d2.getTime())) {
                        const diffTime = Math.abs(now.getTime() - d2.getTime());
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        if (diffDays <= 60)
                            recientes++;
                        if (diffDays > 180)
                            vencidos++;
                    }
                }
            }
            else {
                vencidos++;
            }
            // Contactos
            if (!data.ownerName || !data.ownerPhone) {
                sinContacto++;
            }
            // Para check duplicados
            if (data.licensePlate) {
                const p = data.licensePlate.trim().toUpperCase();
                if (p) {
                    const existing = duplicateMap.get(p) || [];
                    existing.push(doc.id);
                    duplicateMap.set(p, existing);
                }
            }
        });
        let dupsCount = 0;
        duplicateMap.forEach((ids) => {
            if (ids.length > 1) {
                dupsCount += ids.length;
            }
        });
        const stats = {
            total: snapshot.size,
            recientes,
            vencidos,
            sinContacto,
            dups: dupsCount,
            lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        };
        await db.doc("systemStats/vehicles").set(stats, { merge: true });
        logger.info("Daily vehicle stats successfully generated.", stats);
    }
    catch (err) {
        logger.error("Error generating daily vehicle stats:", err);
    }
});
