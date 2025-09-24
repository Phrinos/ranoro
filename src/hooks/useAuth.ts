
// src/hooks/useAuth.ts
import { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebaseClient';
import type { User } from '@/types';
import { AUTH_USER_LOCALSTORAGE_KEY } from '@/lib/placeholder-data';
import { useRouter } from 'next/navigation';

export function useAuth() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Inicia como true por defecto
  const router = useRouter();

  useEffect(() => {
    // Intenta cargar el usuario desde localStorage para una carga inicial más rápida
    const cachedUser = localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY);
    if (cachedUser) {
        try {
            setCurrentUser(JSON.parse(cachedUser));
        } catch (e) {
            console.error("Error parsing cached user:", e);
            localStorage.removeItem(AUTH_USER_LOCALSTORAGE_KEY);
        }
    }

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        const unsubscribeDoc = onSnapshot(userDocRef, (userDoc) => {
          if (userDoc.exists()) {
            const userData = { id: user.uid, ...userDoc.data() } as User;
            localStorage.setItem(AUTH_USER_LOCALSTORAGE_KEY, JSON.stringify(userData));
            setCurrentUser(userData);
          } else {
            // El usuario existe en Auth pero no en Firestore
            signOut(auth);
          }
          setIsLoading(false);
        });
        return () => unsubscribeDoc();
      } else {
        // No hay usuario
        localStorage.removeItem(AUTH_USER_LOCALSTORAGE_KEY);
        setCurrentUser(null);
        setIsLoading(false);
        router.push('/login');
      }
    });

    return () => unsubscribeAuth();
  }, [router]);

  const handleLogout = async () => {
    await signOut(auth);
  };

  return { currentUser, isLoading, handleLogout };
}
