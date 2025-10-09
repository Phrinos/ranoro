
// src/lib/firebaseAdmin.ts
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';

let app: App | null = null;
let db: Firestore | null = null;

export function getAdminDb(): Firestore {
  if (db) return db;

  const existing = getApps().find(a => a.name === 'admin-app');
  if (existing) {
    app = existing;
  } else {
    // Construir la ruta al archivo de clave de servicio
    const keyFilePath = path.join(process.cwd(), 'firebase-admin-key.json');

    if (!fs.existsSync(keyFilePath)) {
      throw new Error(`El archivo de clave de servicio no se encontró en la ruta: ${keyFilePath}. Asegúrate de que el archivo exista.`);
    }

    // Cargar las credenciales desde el archivo JSON
    const serviceAccount = JSON.parse(fs.readFileSync(keyFilePath, 'utf8'));

    app = initializeApp({
      credential: cert(serviceAccount)
    }, 'admin-app');
  }

  db = getFirestore(app!);
  return db!;
}
