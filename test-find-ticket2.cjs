require('dotenv').config({ path: '.env.local' });
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
if (!getApps().length) {
  initializeApp({ credential: cert(serviceAccount) });
}
const db = getFirestore();

async function run() {
  const folios = ["6d5BOZNco8", "6d5B0ZNco8"];
  const collections = ['sales', 'serviceRecords', 'publicServices'];
  
  for (const folio of folios) {
    for (const c of collections) {
      const doc = await db.collection(c).doc(folio).get();
      if (doc.exists) {
        console.log(`Found ${folio} in ${c} by ID`);
        console.log(doc.data());
      }
    }
  }
}
run().then(() => console.log('Done')).catch(console.error);
