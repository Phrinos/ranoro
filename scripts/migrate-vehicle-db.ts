// scripts/migrate-vehicle-db.ts
import 'dotenv/config';
import { getAdminDb } from '../src/lib/firebaseAdmin';
import * as vehicleDatabase from '../src/lib/data/vehicle-database.json';
import { writeBatch } from 'firebase-admin/firestore';

async function migrateVehicleDatabase() {
  const db = getAdminDb();
  const batch = writeBatch(db);

  console.log('Iniciando migración de la base de datos de vehículos a Firestore...');

  try {
    // The default export might be nested under `default` when using dynamic imports
    const dataToMigrate = (vehicleDatabase as any).default || vehicleDatabase;

    if (!Array.isArray(dataToMigrate)) {
      throw new Error("El archivo JSON no es un array válido.");
    }
    
    dataToMigrate.forEach((makeData: any) => {
      const makeName = makeData.make;
      if (!makeName) {
        console.warn('Omitiendo entrada sin nombre de marca:', makeData);
        return;
      }
      
      const docRef = db.collection('vehicleData').doc(makeName);
      // We are setting the entire make object as the document data, with 'make' as the ID.
      const { make, ...data } = makeData; 
      batch.set(docRef, data);
      console.log(`- Preparando para guardar: ${makeName}`);
    });

    await batch.commit();
    console.log('¡Éxito! La base de datos de vehículos ha sido migrada a la colección "vehicleData" en Firestore.');

  } catch (error) {
    console.error("Error durante la migración:", error);
    process.exit(1); // Salir con código de error
  }
}

migrateVehicleDatabase();
