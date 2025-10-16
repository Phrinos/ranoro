

// src/hooks/useStorageUrl.ts
import { useState, useEffect } from 'react';
import { ref, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebasePublic'; // Usar la configuración pública

/**
 * Hook para obtener la URL de descarga de un archivo en Firebase Storage.
 * @param gsPath - La ruta de Google Storage (ej. "gs://bucket-name/path/to/file.jpg").
 * @returns La URL de descarga o null si hay un error o la ruta es inválida.
 */
export function useStorageUrl(gsPath: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!gsPath || !gsPath.startsWith('gs://')) {
      setUrl(null);
      return;
    }

    let isMounted = true;

    async function fetchUrl() {
      try {
        if (!gsPath) return; // o maneja estado vacío
        const storageRef = ref(storage, gsPath as string);
        const downloadUrl = await getDownloadURL(storageRef);
        if (isMounted) {
          setUrl(downloadUrl);
        }
      } catch (error) {
        console.error(`Error getting download URL for ${gsPath}:`, error);
        if (isMounted) {
          setUrl(null);
        }
      }
    }

    fetchUrl();

    return () => {
      isMounted = false;
    };
  }, [gsPath]);

  return url;
}
