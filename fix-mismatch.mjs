import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Initialize explicitely from env because getAdminDb from server-only crashes next
const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (serviceAccountString) {
  initializeApp({ credential: cert(JSON.parse(serviceAccountString)) });
} else {
  initializeApp({
    credential: cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
}

const db = getFirestore();

async function run() {
    // Archive the old duplicate profile
    const docRef = db.collection('users').doc('FlcisYjyV7G9E0PC0SrG');
    const docSnap = await docRef.get();
    if (docSnap.exists) {
        await docRef.update({ isArchived: true, email: 'archived_pandacomputacion@gmail.com' });
        console.log('Old duplicate profile archived successfully!');
    }
}
run().catch(console.error);
