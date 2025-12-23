// functions/src/index.ts
import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as logger from 'firebase-functions/logger';
import { getAdminDb, serverTimestamp } from '@/lib/firebaseAdmin'; // Importa la instancia centralizada
import { startOfDay, endOfDay } from 'date-fns';
import { toZonedTime, formatInTimeZone } from 'date-fns-tz';
import { onStockExit, onPurchaseCreated, onPurchaseUpdated, adjustStock } from './inventory';

// Obtén la instancia de la base de datos desde el módulo centralizado
const db = getAdminDb();
const TZ = 'America/Mexico_City';

// --- Daily Rental Charges Generation (fixed) ---
export const generateDailyRentalCharges = onSchedule(
  {
    schedule: '0 3 * * *', // 03:00 todos los días
    timeZone: TZ,
  },
  async () => {
    logger.info('Starting daily rental charge generation...');
    
    const nowInMexico = toZonedTime(new Date(), TZ);
    
    const startOfTodayInMexico = startOfDay(nowInMexico);
    const endOfTodayInMexico = endOfDay(nowInMexico);

    const startOfTodayUtc = toZonedTime(startOfTodayInMexico, TZ);
    const endOfTodayUtc = toZonedTime(endOfTodayInMexico, TZ);
    
    const dateKey = formatInTimeZone(nowInMexico, TZ, 'yyyy-MM-dd');

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
        logger.warn(
          `Vehicle ${vehicleId} for driver ${driver.name} not found or has no daily rental cost.`
        );
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
          date: serverTimestamp(),
          dateKey,
          dayStartUtc: startOfTodayUtc,
          dayEndUtc: endOfTodayUtc,
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
export { onStockExit, onPurchaseCreated, onPurchaseUpdated, adjustStock };
