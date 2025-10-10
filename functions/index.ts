// functions/index.ts
import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import { startOfDay, endOfDay } from 'date-fns';
import { toZonedTime, zonedTimeToUtc, formatInTimeZone } from 'date-fns-tz';

admin.initializeApp();

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

    // 1) Ahora en UTC y representado en la zona horaria local para cálculos de "día"
    const nowUtc = new Date();                 // instante actual (UTC)
    const nowZoned = toZonedTime(nowUtc, TZ);  // “reloj” en CDMX

    // 2) Inicio/fin del día de CDMX convertidos a UTC para consultar en Firestore
    const dayStartUtc = zonedTimeToUtc(startOfDay(nowZoned), TZ);
    const dayEndUtc   = zonedTimeToUtc(endOfDay(nowZoned), TZ);

    // 3) Clave de día estable en CDMX (idempotencia y agrupación)
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
        logger.warn(
          `Vehicle ${vehicleId} for driver ${driver.name} not found or has no daily rental cost.`
        );
        return;
      }

      // 4) Idempotente: un cargo por driver/día local => ID determinista
      const chargeId = `${driverDoc.id}_${dateKey}`;
      const chargeRef = db.collection('dailyRentalCharges').doc(chargeId);

      try {
        await chargeRef.create({
          driverId: driverDoc.id,
          vehicleId,
          amount: dailyRentalCost,
          vehicleLicensePlate: vehicle?.licensePlate || '',
          // guarda siempre en UTC; la presentación se hace con la zona que quieras
          date: admin.firestore.Timestamp.fromDate(nowUtc),
          // metacampos útiles:
          dateKey, // 'yyyy-MM-dd' en CDMX
          dayStartUtc: admin.firestore.Timestamp.fromDate(dayStartUtc),
          dayEndUtc: admin.firestore.Timestamp.fromDate(dayEndUtc),
        });
        logger.info(`Created daily charge for ${driver.name} (${dateKey}).`);
      } catch (err: any) {
        // Ya existe -> ok (pasa en reintentos del job)
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
