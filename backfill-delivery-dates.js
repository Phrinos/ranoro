
import { collection, getDocs, query, where, writeBatch, doc } from "firebase/firestore";
import { db } from "@/lib/firebaseClient";
import { parseDate } from "@/lib/forms";

async function backfillDeliveryDateTime() {
  console.log("Iniciando backfill para fechas de entrega...");
  const q = query(
    collection(db, "serviceRecords"),
    where("status", "==", "Entregado")
  );
  
  try {
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    let updates = 0;

    snap.forEach((d) => {
      const s = d.data();
      if (!s.deliveryDateTime) {
        const candidate =
          parseDate(s.completedAt) ||
          parseDate(s.closedAt) ||
          (Array.isArray(s.payments) && s.payments.length ? parseDate(s.payments[0]?.date) : null) ||
          parseDate(s.serviceDate) ||
          new Date();

        batch.update(doc(db, "serviceRecords", d.id), {
          deliveryDateTime: candidate.toISOString(),
        });
        updates++;
        console.log(`- Preparando actualización para ${d.id} con fecha ${candidate.toISOString()}`);
      }
    });

    if (updates > 0) {
      await batch.commit();
      console.log(`\nBackfill listo: ${updates} documentos actualizados.`);
    } else {
      console.log("\nNo se encontraron documentos que necesiten actualización.");
    }
  } catch (error) {
    console.error("Error durante el backfill:", error);
  }
}

// Para ejecutar esta función, podrías llamarla desde un botón en una página de administración interna.
// Ejemplo: <Button onClick={backfillDeliveryDateTime}>Correr Backfill</Button>
