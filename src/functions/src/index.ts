// functions/src/index.ts
import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as logger from 'firebase-functions/logger';
import * as admin from 'firebase-admin';
import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { startOfDay, endOfDay } from 'date-fns';
import { toZonedTime, zonedTimeToUtc, formatInTimeZone } from 'date-fns-tz';

// Initialize Firebase Admin SDK - THIS SHOULD BE DONE ONLY ONCE
if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();
const TZ = 'America/Mexico_City';

// --- Daily Rental Charges Generation (fixed) ---
export const generateDailyRentalCharges = onSchedule(
  {
    schedule: '0 3 * * *', // 03:00 todos los días
    timeZone: TZ,
  },
  async () => {
    logger.info('Starting daily rental charge generation...');

    const nowUtc = new Date();
    const nowZoned = toZonedTime(nowUtc, TZ);
    const dayStartUtc = zonedTimeToUtc(startOfDay(nowZoned), TZ);
    const dayEndUtc = zonedTimeToUtc(endOfDay(nowZoned), TZ);
    const dateKey = formatInTimeZone(nowUtc, TZ, 'yyyy-MM-dd');

    const activeDriversSnap = await db
      .collection('drivers')
      .where('isArchived', '==', false)
      .where('assignedVehicleId', '!=', null)
      .get();

    if (activeDriversSnap.empty) {
      logger.info('No active drivers with assigned vehicles found.');
      return;
    }

    const ops = activeDriversSnap.docs.map(async (driverDoc) => {
      const driver = driverDoc.data() as any;
      const vehicleId = driver.assignedVehicleId as string | undefined;
      if (!vehicleId) return;

      const vehicleDoc = await db.collection('vehicles').doc(vehicleId).get();
      const vehicle = vehicleDoc.data() as any;

      const dailyRentalCost = vehicle?.dailyRentalCost;
      if (!vehicleDoc.exists || !dailyRentalCost) {
        logger.warn(`Vehicle ${vehicleId} for driver ${driver.name} not found or has no daily rental cost.`);
        return;
      }

      const chargeId = `${driverDoc.id}_${dateKey}`;
      const chargeRef = db.collection('dailyRentalCharges').doc(chargeId);

      try {
        await chargeRef.create({
          driverId: driverDoc.id,
          vehicleId,
          amount: dailyRentalCost,
          vehicleLicensePlate: vehicle?.licensePlate || '',
          date: admin.firestore.Timestamp.fromDate(nowUtc),
          dateKey,
          dayStartUtc: admin.firestore.Timestamp.fromDate(dayStartUtc),
          dayEndUtc: admin.firestore.Timestamp.fromDate(dayEndUtc),
        });
        logger.info(`Created daily charge for ${driver.name} (${dateKey}).`);
      } catch (err: any) {
        if (err?.code === 6 || err?.code === 'ALREADY_EXISTS') {
          logger.info(`Charge already exists for ${driver.name} (${dateKey}).`);
        } else {
          logger.error(`Failed to create charge for ${driver.name}:`, err);
        }
      }
    });

    await Promise.all(ops);
    logger.info('Daily rental charge generation finished successfully.');
  }
);


// --- Inventory Functions ---

const isAdmin = async (uid: string): Promise<boolean> => {
    try {
      const user = await admin.auth().getUser(uid);
      return user.customClaims?.role === "admin";
    } catch (error) {
      logger.error(`[Auth] Error checking admin status for UID: ${uid}`, error);
      return false;
    }
};

export const onStockExit = onDocumentUpdated("serviceRecords/{serviceId}", async (event) => {
    const serviceId = event.params.serviceId;
    const dataBefore = event.data?.before.data();
    const dataAfter = event.data?.after.data();

    if (!dataBefore || !dataAfter || dataAfter.status !== "entregado" || dataBefore.status === "entregado") return;

    const items = dataAfter.items;
    if (!items || items.length === 0) return;

    logger.info(`[Inventory] Processing stock exit for service ${serviceId}.`);
    try {
        await db.runTransaction(async (transaction) => {
            for (const item of items) {
                if (!item.id || !item.quantity || item.quantity <= 0) continue;

                const inventoryItemRef = db.collection("inventoryItems").doc(item.id);
                const movementRef = db.collection("inventoryMovements").doc();
                transaction.set(movementRef, {
                    itemId: item.id, serviceId: serviceId, folio: dataAfter.folio || null, type: "sale",
                    quantityChanged: -item.quantity, date: admin.firestore.FieldValue.serverTimestamp(),
                    itemName: item.name || "N/A", itemSku: item.sku || "N/A",
                });
                transaction.update(inventoryItemRef, { stock: admin.firestore.FieldValue.increment(-item.quantity) });
            }
        });
        logger.info(`[Inventory] Stock exit for service ${serviceId} processed successfully.`);
    } catch (error) {
        logger.error(`[Inventory] Transaction failed for service ${serviceId}:`, error);
    }
});

const processStockEntry = async (purchaseSnap: FirebaseFirestore.DocumentSnapshot, purchaseId: string) => {
    const purchaseData = purchaseSnap.data();
    if (!purchaseData?.items || purchaseData.items.length === 0) return;

    logger.info(`[Inventory] Processing stock entry for purchase ${purchaseId}.`);
    try {
        await db.runTransaction(async (transaction) => {
            for (const item of purchaseData.items) {
                if (!item.id || !item.quantity || item.quantity <= 0) continue;
                const inventoryItemRef = db.collection("inventoryItems").doc(item.id);
                const movementRef = db.collection("inventoryMovements").doc();
                transaction.set(movementRef, {
                    itemId: item.id, purchaseId: purchaseId, type: "purchase", quantityChanged: item.quantity,
                    date: admin.firestore.FieldValue.serverTimestamp(), itemName: item.name || "N/A", itemSku: item.sku || "N/A",
                });
                transaction.update(inventoryItemRef, { stock: admin.firestore.FieldValue.increment(item.quantity) });
            }
        });
        logger.info(`[Inventory] Stock entry for purchase ${purchaseId} processed successfully.`);
    } catch (error) {
        logger.error(`[Inventory] Transaction failed for purchase ${purchaseId}:`, error);
    }
};

export const onPurchaseCreated = onDocumentCreated("purchases/{purchaseId}", async (event) => {
    if (event.data?.data()?.status === 'completado') {
        await processStockEntry(event.data, event.params.purchaseId);
    }
});

export const onPurchaseUpdated = onDocumentUpdated("purchases/{purchaseId}", async (event) => {
    if (event.data?.after.data()?.status === 'completado' && event.data?.before.data()?.status !== 'completado') {
        await processStockEntry(event.data.after, event.params.purchaseId);
    }
});

export const adjustStock = onCall(async (request) => {
    if (!request.auth || !(await isAdmin(request.auth.uid))) throw new HttpsError("permission-denied", "Admin permission required.");
    const { itemId, newQuantity, reason } = request.data;
    if (!itemId || typeof newQuantity !== 'number' || newQuantity < 0 || !reason) throw new HttpsError("invalid-argument", "Missing parameters.");

    const inventoryItemRef = db.collection("inventoryItems").doc(itemId);
    const movementRef = db.collection("inventoryMovements").doc();

    try {
        await db.runTransaction(async (transaction) => {
            const itemDoc = await transaction.get(inventoryItemRef);
            if (!itemDoc.exists) throw new HttpsError("not-found", `Item ${itemId} not found.`);
            const currentStock = itemDoc.data()?.stock || 0;
            const quantityChanged = newQuantity - currentStock;
            if (quantityChanged === 0) return;

            transaction.set(movementRef, {
                itemId, type: "adjustment", quantityChanged, reason, previousStock: currentStock, newStock: newQuantity,
                date: admin.firestore.FieldValue.serverTimestamp(), adminId: request.auth?.uid,
                itemName: itemDoc.data()?.name || "N/A", itemSku: itemDoc.data()?.sku || "N/A",
            });
            transaction.update(inventoryItemRef, { stock: newQuantity });
        });
        return { success: true, message: "Inventory adjusted." };
    } catch (error) {
        logger.error(`[Inventory] Stock adjustment failed for item ${itemId}:`, error);
        throw new HttpsError("internal", "Failed to adjust inventory.");
    }
});
