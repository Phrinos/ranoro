"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAdminDb = getAdminDb;
// src/lib/firebaseAdmin.ts
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const fs = require("fs");
const path = require("path");
let app = null;
let db = null;
function getAdminDb() {
    if (db)
        return db;
    const existing = (0, app_1.getApps)().find(a => a.name === 'admin-app');
    if (existing) {
        app = existing;
    }
    else {
        // Construir la ruta al archivo de clave de servicio
        const keyFilePath = path.join(process.cwd(), 'firebase-admin-key.json');
        if (!fs.existsSync(keyFilePath)) {
            throw new Error(`El archivo de clave de servicio no se encontró en la ruta: ${keyFilePath}. Asegúrate de que el archivo exista.`);
        }
        // Cargar las credenciales desde el archivo JSON
        const serviceAccount = JSON.parse(fs.readFileSync(keyFilePath, 'utf8'));
        app = (0, app_1.initializeApp)({
            credential: (0, app_1.cert)(serviceAccount)
        }, 'admin-app');
    }
    db = (0, firestore_1.getFirestore)(app);
    return db;
}
