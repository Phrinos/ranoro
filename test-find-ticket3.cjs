require('dotenv').config({ path: '.env.local' });
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
if (!getApps().length) {
  initializeApp({ credential: cert(serviceAccount) });
}
const db = getFirestore();

async function run() {
  const doc = await db.collection('serviceRecords').doc('BmnpvShWz40tSbz9NDD7').get();
  console.log(doc.data());
}
run().then(() => console.log('Done')).catch(console.error);
