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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateDailyRentalCharges = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const admin = __importStar(require("firebase-admin"));
const logger = __importStar(require("firebase-functions/logger"));
const date_fns_1 = require("date-fns");
const date_fns_tz_1 = require("date-fns-tz");
admin.initializeApp();
const db = admin.firestore();
const TZ = 'America/Mexico_City';
// --- Daily Rental Charges Generation ---
exports.generateDailyRentalCharges = (0, scheduler_1.onSchedule)({
    schedule: '0 8 * * *', // 08:00 every day (Mexico City Time)
    timeZone: TZ,
}, async () => {
    logger.info('Starting daily rental charge generation...');
    const nowInMexico = (0, date_fns_tz_1.toZonedTime)(new Date(), TZ);
    const startOfTodayInMexico = (0, date_fns_1.startOfDay)(nowInMexico);
    const endOfTodayInMexico = (0, date_fns_1.endOfDay)(nowInMexico);
    const startOfTodayUtc = (0, date_fns_tz_1.toZonedTime)(startOfTodayInMexico, TZ);
    const endOfTodayUtc = (0, date_fns_tz_1.toZonedTime)(endOfTodayInMexico, TZ);
    const dateKey = (0, date_fns_tz_1.formatInTimeZone)(nowInMexico, TZ, 'yyyy-MM-dd');
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
        const driver = driverDoc.data();
        const vehicleId = driver.assignedVehicleId;
        if (!vehicleId)
            return;
        const vehicleDoc = await db.collection('vehicles').doc(vehicleId).get();
        const vehicle = vehicleDoc.data();
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
                date: admin.firestore.Timestamp.fromDate(startOfTodayUtc),
                dateKey,
                dayStartUtc: admin.firestore.Timestamp.fromDate(startOfTodayUtc),
                dayEndUtc: admin.firestore.Timestamp.fromDate(endOfTodayUtc),
            });
            logger.info(`Created daily charge for ${driver.name} (${dateKey}).`);
        }
        catch (err) {
            if (err?.code === 6 || err?.code === 'ALREADY_EXISTS') {
                logger.info(`Charge already exists for ${driver.name} (${dateKey}).`);
            }
            else {
                logger.error(`Failed to create charge for ${driver.name}:`, err);
            }
        }
    });
    await Promise.all(ops);
    logger.info('Daily rental charge generation finished successfully.');
});
// --- Dashboard Stats ---
__exportStar(require("./dashboard"), exports);
__exportStar(require("./stats-cron"), exports);
