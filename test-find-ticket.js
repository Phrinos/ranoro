require('dotenv').config({ path: '.env.local' });
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
if (!getApps().length) {
  initializeApp({ credential: cert(serviceAccount) });
}
const db = getFirestore();

async function run() {
  const folio = "6d5BOZNco8";
  const total = 850;
  
  const collections = ['sales', 'serviceRecords'];
  
  for (const c of collections) {
    const doc = await db.collection(c).doc(folio).get();
    if (doc.exists) {
      console.log(`Found in ${c} by ID:`);
      const d = doc.data();
      console.log(`- totalAmount: ${d.totalAmount}`);
      console.log(`- totalCost: ${d.totalCost}`);
      console.log(`- total: ${d.total}`);
    }
    
    const q = await db.collection(c).where('folio', '==', folio).get();
    if (!q.empty) {
      console.log(`Found in ${c} by folio field:`);
      q.forEach(d => console.log(`- ID ${d.id}: totalAmount=${d.data().totalAmount}`));
    }
  }
}
run().then(() => console.log('Done')).catch(console.error);
