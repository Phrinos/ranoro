import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
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
const auth = getAuth();

async function run() {
    const users = await db.collection('users').get();
    for (const doc of users.docs) {
        const email = doc.data().email;
        if (!email) continue;
        try {
           const u = await auth.getUserByEmail(email);
           if (u.uid !== doc.id) {
               console.log(`MISMATCH: ${email} -> Firestore: ${doc.id}, Auth: ${u.uid}`);
           } else {
               console.log(`MATCH: ${email} -> ${u.uid}`);
           }
        } catch(e) {
             console.log(`NO AUTH: ${email} -> Firestore: ${doc.id}`);
        }
    }
}
run().catch(console.error);
