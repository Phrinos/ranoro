// functions/index.ts
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { firestore } from 'firebase-admin';
import * as admin from 'firebase-admin';
import { startOfDay, endOfDay, format } from 'date-fns';
import { utcToZonedTime } from 'date-fns-tz';
import * as logger from 'firebase-functions/logger';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';

admin.initializeApp();

const db = admin.firestore();

// --- Daily Rental Charges Generation ---
export const generateDailyRentalCharges = onSchedule({
  schedule: '0 3 * * *',
  timeZone: 'America/Mexico_City',
}, async (_context) => {
    logger.info('Starting daily rental charge generation...');
    const timeZone = 'America/Mexico_City';
    const now = utcToZonedTime(new Date(), timeZone);
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


// --- Service Folio Generation ---
export const generateServiceFolio = onDocumentCreated('serviceRecords/{serviceId}', async (event) => {
    const serviceId = event.params.serviceId;
    const serviceRef = db.collection('serviceRecords').doc(serviceId);
    
    const timeZone = 'America/Mexico_City';
    const now = utcToZonedTime(new Date(), timeZone);
    const datePrefix = format(now, 'yyMMdd');
    
    const counterRef = db.collection('counters').doc(`folio_${datePrefix}`);

    try {
        const newFolioNumber = await db.runTransaction(async (transaction) => {
            const counterDoc = await transaction.get(counterRef);
            const currentCount = counterDoc.exists ? counterDoc.data()?.count || 0 : 0;
            const newCount = currentCount + 1;
            
            transaction.set(counterRef, { count: newCount }, { merge: true });
            
            return newCount;
        });

        const folio = `${datePrefix}-${String(newFolioNumber).padStart(4, '0')}`;
        
        await serviceRef.update({ folio });
        logger.info(`Generated folio ${folio} for service ${serviceId}`);

    } catch (error) {
        logger.error(`Failed to generate folio for service ${serviceId}:`, error);
    }
});
