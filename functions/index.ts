// functions/index.ts
import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';
import { startOfDay, endOfDay } from 'date-fns';
import * as logger from 'firebase-functions/logger';

admin.initializeApp();

const db = admin.firestore();

export const generateDailyRentalCharges = onSchedule({
  schedule: '0 3 * * *',
  timeZone: 'America/Mexico_City',
}, async (_context) => {
    logger.info('Starting daily rental charge generation...');
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);

    const driversRef = db.collection('drivers');
    const activeDriversQuery = driversRef.where('isArchived', '==', false).where('assignedVehicleId', '!=', null);
    
    const activeDriversSnap = await activeDriversQuery.get();
    
    if (activeDriversSnap.empty) {
        logger.info('No active drivers found.');
        return;
    }

    const promises = activeDriversSnap.docs.map(async (driverDoc) => {
        const driver = driverDoc.data();
        if (!driver.assignedVehicleId) return;

        const vehicleRef = db.collection('vehicles').doc(driver.assignedVehicleId);
        const vehicleDoc = await vehicleRef.get();
        if (!vehicleDoc.exists || !vehicleDoc.data()?.dailyRentalCost) {
            logger.warn(`Vehicle ${driver.assignedVehicleId} not found or has no daily rental cost.`);
            return;
        }
        
        const vehicle = vehicleDoc.data();
        const dailyRentalCost = vehicle?.dailyRentalCost;

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
            vehicleLicensePlate: vehicle?.licensePlate || '',
        };
        
        await chargesRef.add(newCharge);
        logger.info(`Created charge for driver ${driver.name} for today.`);
    });

    await Promise.all(promises);
    logger.info('Daily rental charge generation finished.');
});
