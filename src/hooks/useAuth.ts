
"use client";

import { useEffect, useState, useCallback, useRef } from 'react';
import { onAuthStateChanged, signOut, type User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebaseClient';
import type { User } from '@/types';
import { AUTH_USER_LOCALSTORAGE_KEY } from '@/lib/placeholder-data';

export function useAuth() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const unsubscribeDocRef = useRef<(() => void) | null>(null);

  const cleanupDocListener = useCallback(() => {
    if (unsubscribeDocRef.current) {
      unsubscribeDocRef.current();
      unsubscribeDocRef.current = null;
    }
  }, []);

  const handleLogout = useCallback(async () => {
    console.log("[AUTH-AUDIT] User logging out...");
    cleanupDocListener();
    setCurrentUser(null);
    localStorage.removeItem(AUTH_USER_LOCALSTORAGE_KEY);
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
        console.warn("[AUTH-AUDIT] Auth instance is null. Skipping listener.");
        setIsLoading(false);
        return;
    }

    console.log("[AUTH-AUDIT] Attaching auth state listener...");
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      cleanupDocListener();

      if (firebaseUser) {
        console.log("[AUTH-AUDIT] Firebase User detected:", firebaseUser.uid);
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        
        unsubscribeDocRef.current = onSnapshot(userDocRef, (userDoc) => {
          if (userDoc.exists()) {
            const userData = { id: firebaseUser.uid, ...userDoc.data() } as User;
            setCurrentUser(userData);
            localStorage.setItem(AUTH_USER_LOCALSTORAGE_KEY, JSON.stringify(userData));
            console.log("[AUTH-AUDIT] Profile loaded from Firestore.");
          } else {
            console.warn("[AUTH-AUDIT] No Firestore profile found for UID. Using fallback.");
            const fallbackUser: User = {
                id: firebaseUser.uid,
                name: firebaseUser.displayName || 'Usuario Nuevo',
                email: firebaseUser.email || '',
                role: 'Usuario',
                isArchived: false
            };
            setCurrentUser(fallbackUser);
            localStorage.setItem(AUTH_USER_LOCALSTORAGE_KEY, JSON.stringify(fallbackUser));
          }
          setIsLoading(false);
        }, (error) => {
           console.error("[AUTH-AUDIT] Firestore listener error:", error);
           setIsLoading(false);
        });

      } else {
        console.log("[AUTH-AUDIT] No active Firebase user. Clearing state.");
        setCurrentUser(null);
        localStorage.removeItem(AUTH_USER_LOCALSTORAGE_KEY);
        setIsLoading(false);
      }
    }, (error) => {
        console.error("[AUTH-AUDIT] Auth state change error:", error);
        setIsLoading(false);
    });

    return () => {
      unsubscribeAuth();
      cleanupDocListener();
    };
  }, [cleanupDocListener]);

  return { currentUser, isLoading, handleLogout };
}
