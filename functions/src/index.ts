// functions/src/index.ts
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import { firestore as AdminFS } from "firebase-admin";
import { startOfDay, endOfDay, format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import * as logger from "firebase-functions/logger";
import { onDocumentCreated } from "firebase-functions/v2/firestore";

admin.initializeApp();
const db = admin.firestore();

/**
 * Genera el cargo diario de renta para cada chofer con vehículo asignado.
 * Corre diario a las 03:00 AM (America/Mexico_City).
 */
export const generateDailyRentalCharges = onSchedule(
  {
    schedule: "0 3 * * *",
    timeZone: "America/Mexico_City",
    region: "us-central1",
  },
  async (_context) => {
    logger.info("Starting daily rental charge generation...");

    const timeZone = "America/Mexico_City";
    const now = toZonedTime(new Date(), timeZone);
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);

    const driversRef = db.collection("drivers");
    const activeDriversQuery = driversRef
      .where("isArchived", "==", false)
      .where("assignedVehicleId", "!=", null);

    const activeDriversSnap = await activeDriversQuery.get();
    if (activeDriversSnap.empty) {
      logger.info("No active drivers with assigned vehicles found.");
      return;
    }

    const tasks = activeDriversSnap.docs.map(async (driverDoc) => {
      const driver = driverDoc.data() as any;
      if (!driver.assignedVehicleId) return;

      const vehicleRef = db.collection("vehicles").doc(driver.assignedVehicleId);
      const vehicleDoc = await vehicleRef.get();

      if (!vehicleDoc.exists || !(vehicleDoc.data() as any)?.dailyRentalCost) {
        logger.warn(
          `Vehicle ${driver.assignedVehicleId} for driver ${driver.name} not found or has no daily rental cost.`
        );
        return;
      }

      const vehicle = vehicleDoc.data() as any;
      const dailyRentalCost = vehicle?.dailyRentalCost;

      const chargesRef = db.collection("dailyRentalCharges");

      // Evitar duplicados en el día: consulta por Timestamp en rango del día
      const existingChargeQuery = chargesRef
        .where("driverId", "==", driverDoc.id)
        .where("date", ">=", AdminFS.Timestamp.fromDate(todayStart))
        .where("date", "<=", AdminFS.Timestamp.fromDate(todayEnd));

      const existingChargeSnap = await existingChargeQuery.get();
      if (!existingChargeSnap.empty) {
        logger.info(`Charge already exists for driver ${driver.name} for today.`);
        return;
      }

      const newCharge = {
        driverId: driverDoc.id,
        vehicleId: vehicleDoc.id,
        date: AdminFS.Timestamp.fromDate(now), // Guardar como Timestamp
        amount: dailyRentalCost,
        vehicleLicensePlate: vehicle?.licensePlate || "",
      };

      await chargesRef.add(newCharge);
      logger.info(`Successfully created charge for driver ${driver.name} for today.`);
    });

    await Promise.all(tasks);
    logger.info("Daily rental charge generation finished successfully.");
  }
);

/**
 * Genera folio para cada servicio recién creado con prefijo YYMMDD-####
 */
export const generateServiceFolio = onDocumentCreated(
  { document: "serviceRecords/{serviceId}", region: "us-central1" },
  async (event) => {
    const serviceId = event.params.serviceId;
    const serviceRef = db.collection("serviceRecords").doc(serviceId);

    const timeZone = "America/Mexico_City";
    const now = toZonedTime(new Date(), timeZone);
    const datePrefix = format(now, "yyMMdd");

    const counterRef = db.collection("counters").doc(`folio_${datePrefix}`);

    try {
      const newFolioNumber = await db.runTransaction(async (tx) => {
        const counterDoc = await tx.get(counterRef);
        const currentCount = counterDoc.exists ? (counterDoc.data() as any)?.count || 0 : 0;
        const newCount = currentCount + 1;
        tx.set(counterRef, { count: newCount }, { merge: true });
        return newCount;
      });

      const folio = `${datePrefix}-${String(newFolioNumber).padStart(4, "0")}`;
      await serviceRef.update({ folio });
      logger.info(`Generated folio ${folio} for service ${serviceId}`);
    } catch (error) {
      logger.error(`Failed to generate folio for service ${serviceId}:`, error as Error);
    }
  }
);
