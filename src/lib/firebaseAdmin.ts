import { initializeApp, getApps, cert, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
  : null;

function getAdminApp() {
  if (getApps().some(app => app.name === 'admin-app')) {
    return getApp('admin-app');
  }

  if (!serviceAccount) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set or invalid.');
  }

  return initializeApp({
    credential: cert(serviceAccount)
  }, 'admin-app');
}

export const getAdminDb = () => getFirestore(getAdminApp());
