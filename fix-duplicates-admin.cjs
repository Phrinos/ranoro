require("dotenv").config({ path: ".env.local" });
const admin = require("firebase-admin");

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}
const db = admin.firestore();

async function main() {
  const snap = await db.collection("users").get();
  const users = [];
  snap.forEach(d => users.push({ firestoreDocId: d.id, innerId: d.data().id, ...d.data() }));
  
  const byEmail = {};
  for (const u of users) {
    if (!u.email) continue;
    if (!byEmail[u.email]) byEmail[u.email] = [];
    byEmail[u.email].push(u);
  }

  for (const [email, list] of Object.entries(byEmail)) {
    if (list.length > 1) {
      console.log(`\nDuplicate found for email: ${email}`);
      list.forEach(u => console.log(`   - Firestore Document ID: ${u.firestoreDocId} | Inner ID: ${u.innerId} | Role: ${u.role}`));
      
      // Let's delete the one whose Firestore Doc ID does NOT match the Auth UID length (or exactly)
      // Usually, the Firebase Auth UID is the one we want to keep as the Document ID.
      // E.g. OO8trvXE5gPhkxigeORlBFpycIs2
      
      const goodDoc = list.find(u => u.firestoreDocId === u.innerId);
      const badDoc = list.find(u => u.firestoreDocId !== u.innerId);
      
      if (goodDoc && badDoc) {
          console.log(`   --> Keeping Doc ID: ${goodDoc.firestoreDocId}. Migrating from: ${badDoc.firestoreDocId}`);
          
          const s1 = await db.collection("serviceRecords").where("serviceAdvisorId", "==", badDoc.firestoreDocId).get();
          for (const d of s1.docs) { await db.collection("serviceRecords").doc(d.id).update({ serviceAdvisorId: goodDoc.firestoreDocId }); }
          
          const s2 = await db.collection("serviceRecords").where("technicianId", "==", badDoc.firestoreDocId).get();
          for (const d of s2.docs) { await db.collection("serviceRecords").doc(d.id).update({ technicianId: goodDoc.firestoreDocId }); }
          
          console.log(`   --> Deleting duplicate old document: ${badDoc.firestoreDocId}`);
          await db.collection("users").doc(badDoc.firestoreDocId).delete();
      }
    }
  }
}
main().catch(console.error);
