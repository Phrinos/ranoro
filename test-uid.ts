import { getAdminDb, getAdminAuth } from './src/lib/firebaseAdmin';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function check() {
  const db = getAdminDb();
  const auth = getAdminAuth();
  const users = await db.collection('users').where('role', '==', 'Superadministrador').get();
  for (const doc of users.docs) {
    const data = doc.data();
    console.log(`User: ${data.name}, Email: ${data.email}, Doc ID: ${doc.id}`);
    try {
       const u = await auth.getUserByEmail(data.email);
       console.log(` -> Auth UID: ${u.uid}`);
       console.log(` -> Match? ${u.uid === doc.id}`);
    } catch (e) {
       console.log(` -> Not found in Auth!`);
    }
  }
}
check().catch(console.error);
