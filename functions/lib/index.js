"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateDailyRentalCharges = void 0;
// functions/index.ts
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const date_fns_1 = require("date-fns");
admin.initializeApp();
const db = admin.firestore();
exports.generateDailyRentalCharges = functions.pubsub
    .schedule('0 3 * * *')
    .timeZone('America/Mexico_City')
    .onRun(async (_context) => {
    console.log('Starting daily rental charge generation...');
    const today = (0, date_fns_1.startOfDay)(new Date());
    const todayStr = (0, date_fns_1.format)(today, 'yyyy-MM-dd');
    const driversRef = db.collection('drivers');
    const activeDriversQuery = driversRef.where('isArchived', '==', false).where('assignedVehicleId', '!=', null);
    const activeDriversSnap = await activeDriversQuery.get();
    if (activeDriversSnap.empty) {
        console.log('No active drivers found.');
        return null;
    }
    const promises = activeDriversSnap.docs.map(async (driverDoc) => {
        var _a;
        const driver = driverDoc.data();
        if (!driver.assignedVehicleId)
            return;
        const vehicleRef = db.collection('vehicles').doc(driver.assignedVehicleId);
        const vehicleDoc = await vehicleRef.get();
        if (!vehicleDoc.exists || !((_a = vehicleDoc.data()) === null || _a === void 0 ? void 0 : _a.dailyRentalCost)) {
            console.log(`Vehicle ${driver.assignedVehicleId} not found or has no daily rental cost.`);
            return;
        }
        const vehicle = vehicleDoc.data();
        const dailyRentalCost = vehicle === null || vehicle === void 0 ? void 0 : vehicle.dailyRentalCost;
        const chargesRef = db.collection('dailyRentalCharges');
        const existingChargeQuery = chargesRef
            .where('driverId', '==', driverDoc.id)
            .where('date', '>=', todayStr);
        const existingChargeSnap = await existingChargeQuery.get();
        if (!existingChargeSnap.empty) {
            console.log(`Charge already exists for driver ${driver.name} for date ${todayStr}.`);
            return;
        }
        const newCharge = {
            driverId: driverDoc.id,
            vehicleId: vehicleDoc.id,
            date: today.toISOString(),
            amount: dailyRentalCost,
            vehicleLicensePlate: (vehicle === null || vehicle === void 0 ? void 0 : vehicle.licensePlate) || '',
        };
        await chargesRef.add(newCharge);
        console.log(`Created charge for driver ${driver.name} for date ${todayStr}.`);
    });
    await Promise.all(promises);
    console.log('Daily rental charge generation finished.');
    return null;
});
//# sourceMappingURL=index.js.map