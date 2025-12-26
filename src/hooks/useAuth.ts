
// src/hooks/useAuth.ts
import { useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged, signOut, type User as FirebaseUser } from 'firebase/auth';
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
    setCurrentUser(null);
    localStorage.removeItem(AUTH_USER_LOCALSTORAGE_KEY);
    if (auth) {
        await signOut(auth);
    }
  }, []);

  useEffect(() => {
    const cachedUserString = localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY);
    if (cachedUserString) {
      try {
        const cachedUser = JSON.parse(cachedUserString) as User;
        setCurrentUser(cachedUser);
      } catch (e) {
        console.error("Failed to parse cached user, clearing.", e);
        localStorage.removeItem(AUTH_USER_LOCALSTORAGE_KEY);
      }
    }
    // We are not done loading until Firebase confirms the state.
    // Setting isLoading to true ensures we wait for the real source of truth.
    setIsLoading(true);
    
    if (!auth) {
        setIsLoading(false);
        return;
    }

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // Auth state is confirmed. We are no longer "loading" the auth state itself.
        setIsLoading(false);
        
        // Now, fetch the user document from Firestore asynchronously.
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const unsubscribeDoc = onSnapshot(userDocRef, (userDoc) => {
          if (userDoc.exists()) {
            const userData = { id: firebaseUser.uid, ...userDoc.data() } as User;
            setCurrentUser(userData);
            localStorage.setItem(AUTH_USER_LOCALSTORAGE_KEY, JSON.stringify(userData));
          } else {
            console.warn(`User ${firebaseUser.uid} authenticated but not found in Firestore. Logging out.`);
            handleLogout();
          }
        }, (error) => {
           console.error("Error listening to user document:", error);
           handleLogout();
        });
        
        // Return the doc listener's unsubscribe function.
        // It will be called when the auth state changes or component unmounts.
        return () => unsubscribeDoc();

      } else {
        // No user is authenticated in Firebase.
        setCurrentUser(null);
        localStorage.removeItem(AUTH_USER_LOCALSTORAGE_KEY);
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
