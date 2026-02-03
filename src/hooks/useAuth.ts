"use client";

// src/hooks/useAuth.ts
import { useEffect, useState, useCallback, useRef } from 'react';
import { onAuthStateChanged, signOut, type User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebaseClient';
import type { User } from '@/types';
import { AUTH_USER_LOCALSTORAGE_KEY } from '@/lib/placeholder-data';
import { useRouter } from 'next/navigation';

export function useAuth() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const unsubscribeDocRef = useRef<(() => void) | null>(null);
  const router = useRouter();

  const cleanupDocListener = useCallback(() => {
    if (unsubscribeDocRef.current) {
      unsubscribeDocRef.current();
      unsubscribeDocRef.current = null;
    }
  }, []);

  const handleLogout = useCallback(async () => {
    // 1. Detener cualquier listener activo ANTES de desloguear para evitar errores de permisos
    cleanupDocListener();
    
    // 2. Limpiar estados locales
    setCurrentUser(null);
    localStorage.removeItem(AUTH_USER_LOCALSTORAGE_KEY);
    
    // 3. Ejecutar el cierre de sesión en Firebase
    if (auth) {
        await signOut(auth);
    }
  }, [cleanupDocListener]);

  useEffect(() => {
    const cachedUserString = localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY);
    if (cachedUserString) {
      try {
        const cachedUser = JSON.parse(cachedUserString) as User;
        setCurrentUser(cachedUser);
      } catch (e) {
        localStorage.removeItem(AUTH_USER_LOCALSTORAGE_KEY);
      }
    }
    
    setIsLoading(true);
    
    if (!auth) {
        setIsLoading(false);
        return;
    }

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      // Limpiar listener previo si el usuario cambió
      cleanupDocListener();

      if (firebaseUser) {
        setIsLoading(false);
        
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        unsubscribeDocRef.current = onSnapshot(userDocRef, (userDoc) => {
          if (userDoc.exists()) {
            const userData = { id: firebaseUser.uid, ...userDoc.data() } as User;
            setCurrentUser(userData);
            localStorage.setItem(AUTH_USER_LOCALSTORAGE_KEY, JSON.stringify(userData));
          } else {
            console.warn(`User ${firebaseUser.uid} not found in Firestore. Logging out.`);
            handleLogout();
          }
        }, (error) => {
           // Si el error es de permisos durante el logout, lo ignoramos silenciosamente
           if (error.code !== 'permission-denied') {
             console.error("Error listening to user document:", error);
           }
        });

      } else {
        setCurrentUser(null);
        localStorage.removeItem(AUTH_USER_LOCALSTORAGE_KEY);
        setIsLoading(false);
      }
    }, (error) => {
        console.error("Auth state listener error:", error);
        setIsLoading(false);
    });

    return () => {
      unsubscribeAuth();
      cleanupDocListener();
    };
  }, [handleLogout, cleanupDocListener]);

  return { currentUser, isLoading, handleLogout };
}
