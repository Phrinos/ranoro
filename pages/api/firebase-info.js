// Muestra la configuración que llega al cliente (sin exponer secretos)
export default function handler(req, res) {
    res.status(200).json({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      msg: 'Variables de entorno OK ✅',
    });
  }
  