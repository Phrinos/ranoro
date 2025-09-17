"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateDailyRentalCharges = void 0;
// functions/index.ts
const scheduler_1 = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");
const date_fns_1 = require("date-fns");
const logger = require("firebase-functions/logger");
admin.initializeApp();
const db = admin.firestore();
exports.generateDailyRentalCharges = (0, scheduler_1.onSchedule)({
    schedule: '0 3 * * *',
    timeZone: 'America/Mexico_City',
}, async (_context) => {
    logger.info('Starting daily rental charge generation...');
    const now = new Date();
    const todayStart = (0, date_fns_1.startOfDay)(now);
    const todayEnd = (0, date_fns_1.endOfDay)(now);
    const driversRef = db.collection('drivers');
    const activeDriversQuery = driversRef.where('isArchived', '==', false).where('assignedVehicleId', '!=', null);
    const activeDriversSnap = await activeDriversQuery.get();
    if (activeDriversSnap.empty) {
        logger.info('No active drivers found.');
        return;
    }
    const promises = activeDriversSnap.docs.map(async (driverDoc) => {
        var _a;
        const driver = driverDoc.data();
        if (!driver.assignedVehicleId)
            return;
        const vehicleRef = db.collection('vehicles').doc(driver.assignedVehicleId);
        const vehicleDoc = await vehicleRef.get();
        if (!vehicleDoc.exists || !((_a = vehicleDoc.data()) === null || _a === void 0 ? void 0 : _a.dailyRentalCost)) {
            logger.warn(`Vehicle ${driver.assignedVehicleId} not found or has no daily rental cost.`);
            return;
        }
        const vehicle = vehicleDoc.data();
        const dailyRentalCost = vehicle === null || vehicle === void 0 ? void 0 : vehicle.dailyRentalCost;
        const chargesRef = db.collection('dailyRentalCharges');
        const existingChargeQuery = chargesRef
            .where('driverId', '==', driverDoc.id)
            .where('date', '>=', todayStart)
            .where('date', '<=', todayEnd);
        const existingChargeSnap = await existingChargeQuery.get();
        if (!existingChargeSnap.empty) {
            logger.info(`Charge already exists for driver ${driver.name} for today.`);
            return;
        }
        const newCharge = {
            driverId: driverDoc.id,
            vehicleId: vehicleDoc.id,
            date: now.toISOString(),
            amount: dailyRentalCost,
            vehicleLicensePlate: (vehicle === null || vehicle === void 0 ? void 0 : vehicle.licensePlate) || '',
        };
        await chargesRef.add(newCharge);
        logger.info(`Created charge for driver ${driver.name} for today.`);
    });
    await Promise.all(promises);
    logger.info('Daily rental charge generation finished.');
});
//# sourceMappingURL=index.js.map