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
exports.adjustStock = exports.onPurchaseUpdated = exports.onPurchaseCreated = exports.onStockExit = exports.generateServiceFolio = exports.generateDailyRentalCharges = void 0;
// functions/src/index.ts
const scheduler_1 = require("firebase-functions/v2/scheduler");
const admin = __importStar(require("firebase-admin"));
const firebase_admin_1 = require("firebase-admin");
const date_fns_1 = require("date-fns");
const date_fns_tz_1 = require("date-fns-tz");
const logger = __importStar(require("firebase-functions/logger"));
const firestore_1 = require("firebase-functions/v2/firestore");
const inventory = __importStar(require("./inventory"));
admin.initializeApp();
const db = admin.firestore();
/**
 * Genera el cargo diario de renta para cada chofer con vehículo asignado.
 * Corre diario a las 03:00 AM (America/Mexico_City).
 */
exports.generateDailyRentalCharges = (0, scheduler_1.onSchedule)({
    schedule: "0 3 * * *",
    timeZone: "America/Mexico_City",
    region: "us-central1",
}, async (_context) => {
    logger.info("Starting daily rental charge generation...");
    const timeZone = "America/Mexico_City";
    const now = (0, date_fns_tz_1.toZonedTime)(new Date(), timeZone);
    const todayStart = (0, date_fns_1.startOfDay)(now);
    const todayEnd = (0, date_fns_1.endOfDay)(now);
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
        const driver = driverDoc.data();
        if (!driver.assignedVehicleId)
            return;
        const vehicleRef = db.collection("vehicles").doc(driver.assignedVehicleId);
        const vehicleDoc = await vehicleRef.get();
        if (!vehicleDoc.exists || !vehicleDoc.data()?.dailyRentalCost) {
            logger.warn(`Vehicle ${driver.assignedVehicleId} for driver ${driver.name} not found or has no daily rental cost.`);
            return;
        }
        const vehicle = vehicleDoc.data();
        const dailyRentalCost = vehicle?.dailyRentalCost;
        const chargesRef = db.collection("dailyRentalCharges");
        // Evitar duplicados en el día: consulta por Timestamp en rango del día
        const existingChargeQuery = chargesRef
            .where("driverId", "==", driverDoc.id)
            .where("date", ">=", firebase_admin_1.firestore.Timestamp.fromDate(todayStart))
            .where("date", "<=", firebase_admin_1.firestore.Timestamp.fromDate(todayEnd));
        const existingChargeSnap = await existingChargeQuery.get();
        if (!existingChargeSnap.empty) {
            logger.info(`Charge already exists for driver ${driver.name} for today.`);
            return;
        }
        const newCharge = {
            driverId: driverDoc.id,
            vehicleId: vehicleDoc.id,
            date: firebase_admin_1.firestore.Timestamp.fromDate(now), // Guardar como Timestamp
            amount: dailyRentalCost,
            vehicleLicensePlate: vehicle?.licensePlate || "",
        };
        await chargesRef.add(newCharge);
        logger.info(`Successfully created charge for driver ${driver.name} for today.`);
    });
    await Promise.all(tasks);
    logger.info("Daily rental charge generation finished successfully.");
});
/**
 * Genera folio para cada servicio recién creado con prefijo YYMMDD-####
 */
exports.generateServiceFolio = (0, firestore_1.onDocumentCreated)({ document: "serviceRecords/{serviceId}", region: "us-central1" }, async (event) => {
    const serviceId = event.params.serviceId;
    const serviceRef = db.collection("serviceRecords").doc(serviceId);
    const timeZone = "America/Mexico_City";
    const now = (0, date_fns_tz_1.toZonedTime)(new Date(), timeZone);
    const datePrefix = (0, date_fns_1.format)(now, "yyMMdd");
    const counterRef = db.collection("counters").doc(`folio_${datePrefix}`);
    try {
        const newFolioNumber = await db.runTransaction(async (tx) => {
            const counterDoc = await tx.get(counterRef);
            const currentCount = counterDoc.exists ? counterDoc.data()?.count || 0 : 0;
            const newCount = currentCount + 1;
            tx.set(counterRef, { count: newCount }, { merge: true });
            return newCount;
        });
        const folio = `${datePrefix}-${String(newFolioNumber).padStart(4, "0")}`;
        await serviceRef.update({ folio });
        logger.info(`Generated folio ${folio} for service ${serviceId}`);
    }
    catch (error) {
        logger.error(`Failed to generate folio for service ${serviceId}:`, error);
    }
});
// ===== INVENTORY FUNCTIONS =====
exports.onStockExit = inventory.onStockExit;
exports.onPurchaseCreated = inventory.onPurchaseCreated;
exports.onPurchaseUpdated = inventory.onPurchaseUpdated;
exports.adjustStock = inventory.adjustStock;
