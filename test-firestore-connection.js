
import { collection, getDocs, query, limit } from 'firebase/firestore';
import { db } from './src/lib/firebasePublic.js'; // Usamos la misma instancia que la app

async function testPublicFirestoreConnection() {
  console.log("Iniciando prueba de conexión a Firestore (Pública)...");
  try {
    const publicServicesCol = collection(db, "publicServices");
    const q = query(publicServicesCol, limit(1));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.log("✅ Conexión a Firestore exitosa, pero la colección 'publicServices' está vacía.");
    } else {
      console.log("✅ ¡Conexión a Firestore y lectura de datos pública exitosa!");
      querySnapshot.forEach(doc => {
        console.log("   => Documento de muestra encontrado:", doc.id);
      });
    }
    process.exit(0);
  } catch (error) {
    console.error("❌ Error al conectar o consultar Firestore:", error.code, error.message);
    process.exit(1);
  }
}

// Timeout de 15 segundos
setTimeout(() => {
  console.error("❌ Error: La prueba ha superado el tiempo de espera.");
  process.exit(1);
}, 15000);

testPublicFirestoreConnection();
