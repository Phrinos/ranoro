// scripts/find-services-by-plate.ts
import 'dotenv/config'; // Carga las variables de entorno desde .env
import { getAdminDb } from '../src/lib/firebaseAdmin';

const PLATE_TO_SEARCH = 'PSK127C';

async function findServicesByPlate(plate: string) {
  try {
    const db = getAdminDb();
    console.log(`Buscando servicios para la placa: ${plate}...`);

    const servicesRef = db.collection('serviceRecords');
    const q = query(servicesRef, where('licensePlate', '==', plate));
    
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.log('No se encontraron servicios para esta placa.');
      return;
    }

    console.log(`Se encontraron ${querySnapshot.size} servicio(s):`);
    querySnapshot.forEach(doc => {
      console.log(`\n--- Servicio ID: ${doc.id} ---`);
      console.log(JSON.stringify(doc.data(), null, 2));
    });

  } catch (error) {
    console.error("Error buscando servicios:", error);
  }
}

findServicesByPlate(PLATE_TO_SEARCH);
