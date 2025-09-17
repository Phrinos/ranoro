// functions/index.ts
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { startOfDay, format as formatDate } from 'date-fns';

admin.initializeApp();

const db = admin.firestore();

export const generateDailyRentalCharges = functions.pubsub
  .schedule('0 3 * * *') // Runs every day at 3:00 AM
  .timeZone('America/Mexico_City')
  .onRun(async (context) => {
    console.log('Starting daily rental charge generation...');
    const today = startOfDay(new Date());
    const todayStr = formatDate(today, 'yyyy-MM-dd');

    const driversRef = db.collection('drivers');
    const activeDriversQuery = driversRef.where('isArchived', '==', false).where('assignedVehicleId', '!=', null);
    
    const activeDriversSnap = await activeDriversQuery.get();
    
    if (activeDriversSnap.empty) {
        console.log("No active drivers found.");
        return null;
    }

    const promises = activeDriversSnap.docs.map(async (driverDoc) => {
        const driver = driverDoc.data();
        if (!driver.assignedVehicleId) return;

        const vehicleRef = db.collection('vehicles').doc(driver.assignedVehicleId);
        const vehicleDoc = await vehicleRef.get();
        if (!vehicleDoc.exists || !vehicleDoc.data()?.dailyRentalCost) {
            console.log(`Vehicle ${driver.assignedVehicleId} not found or has no daily rental cost.`);
            return;
        }
        
        const vehicle = vehicleDoc.data();
        const dailyRentalCost = vehicle?.dailyRentalCost;

        // Check if a charge for today already exists
        const chargesRef = db.collection('dailyRentalCharges');
        const existingChargeQuery = chargesRef
            .where('driverId', '==', driverDoc.id)
            .where('date', '>=', todayStr);
            
        const existingChargeSnap = await existingChargeQuery.get();
        
        if (!existingChargeSnap.empty) {
            console.log(`Charge already exists for driver ${driver.name} for date ${todayStr}.`);
            return;
        }

        // Create the new charge
        const newCharge = {
            driverId: driverDoc.id,
            vehicleId: vehicleDoc.id,
            date: today.toISOString(),
            amount: dailyRentalCost,
            vehicleLicensePlate: vehicle?.licensePlate || '',
        };
        
        await chargesRef.add(newCharge);
        console.log(`Created charge for driver ${driver.name} for date ${todayStr}.`);
    });

    await Promise.all(promises);
    console.log('Daily rental charge generation finished.');
    return null;
});
