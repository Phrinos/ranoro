
// src/hooks/useAuth.ts
import { useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged, signOut, type Auth, type User as FirebaseUser } from 'firebase/auth';
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
    
    // Elimina la cookie de autenticación del servidor
    await fetch('/api/auth/logout', { method: 'POST' });

    if (auth) {
        await signOut(auth);
    }
    // La redirección al login se hará automáticamente por el layout del servidor
    router.push('/login');
  }, [router]);

  useEffect(() => {
    const cachedUserString = localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY);
    if (cachedUserString) {
      try {
        const cachedUser = JSON.parse(cachedUserString);
        setCurrentUser(cachedUser);
      } catch (e) {
        localStorage.removeItem(AUTH_USER_LOCALSTORAGE_KEY);
      }
    }
    
    if (!auth) {
        setIsLoading(false);
        return;
    }

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const unsubscribeDoc = onSnapshot(userDocRef, (userDoc) => {
          if (userDoc.exists()) {
            const userData = { id: firebaseUser.uid, ...userDoc.data() } as User;
            setCurrentUser(userData);
            localStorage.setItem(AUTH_USER_LOCALSTORAGE_KEY, JSON.stringify(userData));
          } else {
            handleLogout();
          }
          setIsLoading(false);
        }, (error) => {
           console.error("Error listening to user document:", error);
           handleLogout();
           setIsLoading(false);
        });
        return () => unsubscribeDoc();
      } else {
        handleLogout();
        setIsLoading(false);
      }
    }, (error) => {
        console.error("Auth state listener error:", error);
        handleLogout();
        setIsLoading(false);
    });

    return () => unsubscribeAuth();
  }, [handleLogout]);

  return { currentUser, isLoading, handleLogout };
}
