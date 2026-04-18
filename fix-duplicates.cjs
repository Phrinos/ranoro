require("dotenv").config({ path: ".env.local" });
const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs, doc, deleteDoc, updateDoc, query, where } = require("firebase/firestore");

const app = initializeApp({
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
});
const db = getFirestore(app);

async function main() {
  console.log("Fetching users...");
  const snap = await getDocs(collection(db, "users"));
  const users = [];
  snap.forEach(d => users.push({ id: d.id, ...d.data() }));
  
  const byEmail = {};
  for (const u of users) {
    if (!u.email) continue;
    if (!byEmail[u.email]) byEmail[u.email] = [];
    byEmail[u.email].push(u);
  }

  for (const [email, list] of Object.entries(byEmail)) {
    if (list.length > 1) {
      console.log(`\nDuplicate found for email: ${email}`);
      list.forEach(u => console.log(`   - ID: ${u.id} (Len: ${u.id.length}), Role: ${u.role}, Name: ${u.name}`));
      
      const authUser = list.find(u => u.id.length >= 28);
      const oldUser = list.find(u => u.id.length < 28 || u.id !== authUser?.id);
      
      if (authUser && oldUser && authUser.id !== oldUser.id) {
         console.log(`   --> Keeping Auth ID: ${authUser.id}. Migrating from: ${oldUser.id}`);
         
         const s1 = await getDocs(query(collection(db, "serviceRecords"), where("serviceAdvisorId", "==", oldUser.id)));
         for (const d of s1.docs) {
            console.log(`      Updating service as advisor: ${d.id}`);
            await updateDoc(doc(db, "serviceRecords", d.id), { serviceAdvisorId: authUser.id });
         }
         
         const s2 = await getDocs(query(collection(db, "serviceRecords"), where("technicianId", "==", oldUser.id)));
         for (const d of s2.docs) {
            console.log(`      Updating service as technician: ${d.id}`);
            await updateDoc(doc(db, "serviceRecords", d.id), { technicianId: authUser.id });
         }
         
         console.log(`      Deleting duplicate user document: ${oldUser.id}`);
         await deleteDoc(doc(db, "users", oldUser.id));
      }
    }
  }
  console.log("\nDone.");
}
main().catch(console.error);
