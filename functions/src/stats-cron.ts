import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

const db = admin.firestore();

export const generateDailyVehicleStats = onSchedule(
  {
    schedule: "0 12 * * *", // 12:00 every day
    timeZone: "America/Mexico_City",
  },
  async () => {
    logger.info("Starting daily aggregate job for vehicles...");
    try {
      const snapshot = await db.collection("vehicles").get();
      
      const now = new Date();
      let recientes = 0;
      let vencidos = 0;
      let sinContacto = 0;
      
      const duplicateMap = new Map<string, string[]>();
      
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
              if (diffDays <= 60) recientes++;
              if (diffDays > 180) vencidos++;
            }
          } else {
              // Intento directo si es timestamp u otro iso str
              const d2 = new Date(serviceDateStr);
              if (!isNaN(d2.getTime())) {
                const diffTime = Math.abs(now.getTime() - d2.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays <= 60) recientes++;
                if (diffDays > 180) vencidos++;
              }
          }
        } else {
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
      
    } catch (err) {
      logger.error("Error generating daily vehicle stats:", err);
    }
  }
);
