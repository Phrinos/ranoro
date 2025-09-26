
// functions/src/index.ts
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import { DocumentData, Timestamp } from "firebase-admin/firestore";
import { startOfDay, endOfDay, format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import * as logger from "firebase-functions/logger";
import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as inventory from "./inventory";
import { nanoid } from "nanoid";

admin.initializeApp();
const db = admin.firestore();

// --- Interfaces ---
interface ServiceData extends DocumentData {
    folio?: string;
    status?: string;
    publicId?: string;
    vehicle?: any; // <-- vehicle object from service record
    customer?: any; // <-- customer object from service record
    items?: any[];
    reception?: any;
}

interface PublicData {
    folio?: string;
    status?: string;
    publicId?: string;
    vehicle?: any;
    customerName?: string;
    customerPhone?: string;
    vehicleIdentifier?: string;
    // Add other fields that you want to be public
    serviceItems?: any[]; 
    receptionDateTime?: string;
    deliveryDateTime?: string;
    mileage?: number;
    subStatus?: string;
    appointmentStatus?: string;
    customerSignatureReception?: string;
    customerSignatureDelivery?: string;
    notes?: string;
    totalCost?: number;
    payments?: any[];
    nextServiceInfo?: any;
    serviceAdvisorName?: string;
    serviceAdvisorSignatureDataUrl?: string;
    vehicleConditions?: string;
    customerItems?: string;
    fuelLevel?: string;
    safetyInspection?: any;
}


/**
 * Extracts and denormalizes the necessary public-facing data from a service record.
 * This ensures the public document has all data needed, avoiding extra reads from the client.
 */
const getPublicData = (service: ServiceData): PublicData => {
    const publicData: PublicData = {
      folio: service.folio,
      status: service.status,
      publicId: service.publicId,
      subStatus: service.subStatus,
      appointmentStatus: service.appointmentStatus,
      // Denormalize vehicle and customer info directly onto the public doc
      customerName: service.customerName,
      customerPhone: service.customerPhone,
      vehicleIdentifier: service.vehicleIdentifier,
      // Copy the nested vehicle object if it exists
      vehicle: service.vehicle || null,
      serviceItems: service.serviceItems || [],
      receptionDateTime: service.receptionDateTime,
      deliveryDateTime: service.deliveryDateTime,
      mileage: service.mileage,
      customerSignatureReception: service.customerSignatureReception,
      customerSignatureDelivery: service.customerSignatureDelivery,
      notes: service.notes,
      totalCost: service.totalCost,
      payments: service.payments,
      nextServiceInfo: service.nextServiceInfo,
      serviceAdvisorName: service.serviceAdvisorName,
      serviceAdvisorSignatureDataUrl: service.serviceAdvisorSignatureDataUrl,
      vehicleConditions: service.vehicleConditions,
      customerItems: service.customerItems,
      fuelLevel: service.fuelLevel,
      safetyInspection: service.safetyInspection,
    };

    return publicData;
};


/**
 * Sincroniza un documento de servicio a la colección pública.
 */
const syncPublicService = async (serviceId: string, serviceData: ServiceData): Promise<void> => {
    let data = { ...serviceData };
    let needsUpdate = false;

    if (!data.publicId) {
        data.publicId = nanoid(16);
        needsUpdate = true;
    }

    if (needsUpdate) {
        await db.collection('serviceRecords').doc(serviceId).update({ publicId: data.publicId });
    }

    const publicDocRef = db.collection('publicServices').doc(data.publicId);
    const publicDataToSync = getPublicData(data);
    await publicDocRef.set(publicDataToSync, { merge: true });
    logger.info(`Synced service ${serviceId} to public document ${data.publicId}`);
};


// --- TRIGGERS ---

export const onServiceCreated = onDocumentCreated("serviceRecords/{serviceId}", (event) => {
    if (!event.data) {
        logger.error("No data associated with the onServiceCreated event!");
        return;
    }
    const serviceId = event.params.serviceId;
    const serviceData = event.data.data() as ServiceData;
    return syncPublicService(serviceId, serviceData);
});

export const onServiceUpdated = onDocumentUpdated("serviceRecords/{serviceId}", (event) => {
    if (!event.data || !event.data.after) {
        logger.error("No data associated with the onServiceUpdated event!");
        return;
    }
    const serviceId = event.params.serviceId;
    const serviceData = event.data.after.data() as ServiceData;
    return syncPublicService(serviceId, serviceData);
});

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

      const existingChargeQuery = chargesRef
        .where("driverId", "==", driverDoc.id)
        .where("date", ">=", Timestamp.fromDate(todayStart))
        .where("date", "<=", Timestamp.fromDate(todayEnd));

      const existingChargeSnap = await existingChargeQuery.get();
      if (!existingChargeSnap.empty) {
        logger.info(`Charge already exists for driver ${driver.name} for today.`);
        return;
      }

      const newCharge = {
        driverId: driverDoc.id,
        vehicleId: vehicleDoc.id,
        date: Timestamp.fromDate(now),
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


// ===== INVENTORY FUNCTIONS =====
export const onStockExit = inventory.onStockExit;
export const onPurchaseCreated = inventory.onPurchaseCreated;
export const onPurchaseUpdated = inventory.onPurchaseUpdated;
export const adjustStock = inventory.adjustStock;

    

    