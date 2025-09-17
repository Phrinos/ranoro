
const admin = require('firebase-admin');
const serviceAccount = require('./ranoro-dev-firebase-adminsdk-v1b5n-1c93a0519a.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function migrateQuotes() {
  const quotesRef = db.collection('quotes');
  const serviceRecordsRef = db.collection('serviceRecords');
  
  const snapshot = await quotesRef.get();
  
  if (snapshot.empty) {
    console.log('No quotes found to migrate.');
    return;
  }
  
  const batch = db.batch();
  snapshot.forEach(doc => {
    const quoteData = doc.data();
    const serviceRecordRef = serviceRecordsRef.doc(doc.id);
    batch.set(serviceRecordRef, quoteData);
    batch.delete(doc.ref);
  });
  
  await batch.commit();
  
  console.log(`Successfully migrated ${snapshot.size} quotes.`);
}

migrateQuotes().catch(console.error);
