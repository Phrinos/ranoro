// scripts/migrate-vehicle-db.ts
import 'dotenv/config';
import { getAdminDb } from '../src/lib/firebaseAdmin';
import * as fs from 'fs';
import * as path from 'path';

// Lee los datos del archivo JSON local.
const dbData = JSON.parse(
  fs.readFileSync(
    path.resolve(process.cwd(), 'src/lib/data/vehicle-database.json'),
    'utf-8'
  )
);

async function migrateVehicleDb() {
  try {
    const db = getAdminDb();
    const batch = db.batch();

    console.log(`Iniciando la migración de ${dbData.length} marcas a la colección 'vehicleData'...`);

    for (const makeData of dbData) {
      const makeName = makeData.make;
      if (!makeName) {
        console.warn('Se encontró una marca sin nombre, se omitirá:', makeData);
        continue;
      }
      
      // La ID del documento será el nombre de la marca.
      const makeDocRef = db.collection('vehicleData').doc(makeName);
      
      // El documento contendrá el array de modelos.
      batch.set(makeDocRef, { models: makeData.models });

      console.log(`  - Agregando marca: ${makeName}`);
    }

    await batch.commit();

    console.log(`\n¡Migración completada! Se procesaron ${dbData.length} marcas.`);
    console.log("Los datos ahora están en la colección 'vehicleData' de Firestore.");

  } catch (error) {
    console.error("Error durante la migración:", error);
    process.exit(1);
  }
}

migrateVehicleDb();
