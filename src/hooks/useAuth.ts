

// src/hooks/useAuth.ts
import { useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged, signOut, type Auth } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebaseClient';
import type { User } from '@/types';
import { AUTH_USER_LOCALSTORAGE_KEY } from '@/lib/placeholder-data';
import { useRouter } from 'next/navigation';

export function useAuth() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const handleLogout = useCallback(async () => {
    // Limpia inmediatamente el estado local para una respuesta de UI rápida
    setCurrentUser(null);
    localStorage.removeItem(AUTH_USER_LOCALSTORAGE_KEY);
    await signOut(auth as Auth);
    // Redirigir al login ya lo hace el useEffect de AppClientLayout
    // No es necesario hacerlo aquí.
  }, []);

  useEffect(() => {
    // Sincroniza desde localStorage al inicio.
    // Esto es rápido y evita el parpadeo de "Verificando sesión..."
    const cachedUserString = localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY);
    if (cachedUserString) {
      try {
        const cachedUser = JSON.parse(cachedUserString);
        setCurrentUser(cachedUser);
      } catch (e) {
        console.error("Failed to parse cached user, clearing.", e);
        localStorage.removeItem(AUTH_USER_LOCALSTORAGE_KEY);
      }
    }
    
    // El listener de Firebase Auth es la fuente de verdad definitiva.
    const unsubscribeAuth = onAuthStateChanged(auth as Auth, (firebaseUser) => {
      if (firebaseUser) {
        // Usuario autenticado. Escucha su documento en Firestore.
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const unsubscribeDoc = onSnapshot(userDocRef, (userDoc) => {
          if (userDoc.exists()) {
            const userData = { id: firebaseUser.uid, ...userDoc.data() } as User;
            // Actualiza tanto el estado como el localStorage.
            setCurrentUser(userData);
            localStorage.setItem(AUTH_USER_LOCALSTORAGE_KEY, JSON.stringify(userData));
          } else {
            // Caso raro: autenticado en Firebase pero sin documento en Firestore.
            // Cierra la sesión para evitar un estado inconsistente.
            console.warn(`User ${firebaseUser.uid} authenticated but not found in Firestore. Logging out.`);
            handleLogout();
          }
          setIsLoading(false); // Termina la carga después de obtener datos de Firestore.
        }, (error) => {
           console.error("Error listening to user document:", error);
           handleLogout(); // Cierra sesión si hay error leyendo el doc.
           setIsLoading(false);
        });
        return () => unsubscribeDoc();
      } else {
        // No hay usuario en Firebase Auth. Limpia todo.
        setCurrentUser(null);
        localStorage.removeItem(AUTH_USER_LOCALSTORAGE_KEY);
        setIsLoading(false);
        // AppClientLayout se encargará de la redirección.
      }
    }, (error) => {
        console.error("Auth state listener error:", error);
        handleLogout(); // Cierra sesión si hay un error en el listener principal
        setIsLoading(false); // Termina la carga si hay un error en el listener.
    });

    return () => unsubscribeAuth();
  }, [handleLogout]);

  return { currentUser, isLoading, handleLogout };
}
