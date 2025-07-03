'use client';

import { storage } from '@/lib/firebaseClient';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import React from 'react';

export default function TestUploadPage() {
  const handle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    console.log('📥 Archivo seleccionado:', file);
    if (!file) return;

    try {
      console.log('🗄️  storage obj:', storage);
      const r = ref(storage, `debug/${Date.now()}_${file.name}`);
      console.log('📍 Path en bucket:', r.fullPath);

      await uploadBytes(r, file);
      console.log('✅ Subida terminada');

      const url = await getDownloadURL(r);
      console.log('🔗 URL:', url);
      alert(url);
    } catch (err) {
      console.error('❌ Error en upload:', err);
      alert((err as Error).message);
    }
  };

  return (
    <main style={{ padding: 24 }}>
      <h1>Prueba de subida a Firebase Storage</h1>
      <input type="file" onChange={handle} />
    </main>
  );
}
