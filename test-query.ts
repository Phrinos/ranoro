import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

if (getApps().length === 0) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    })
  });
}
const db = getFirestore();
async function run() {
  const s = await db.collection("vehicles").where("isFleetVehicle", "==", true).get();
  console.log("Fleet vehicles: " + s.docs.length);
  const s2 = await db.collection("vehicles").get();
  console.log("Total vehicles: " + s2.docs.length);
}
run();
