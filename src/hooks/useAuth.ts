"use client";

import { useEffect, useState, useCallback, useRef } from 'react';
import { onAuthStateChanged, signOut, deleteUser, browserLocalPersistence, setPersistence } from 'firebase/auth';
import { doc, getDoc, onSnapshot, collection, query, where, getDocs } from 'firebase/firestore';
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
    cleanupDocListener();
    setCurrentUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(AUTH_USER_LOCALSTORAGE_KEY);
      localStorage.removeItem("ranoro_login_date");
    }
    if (auth) {
      await signOut(auth);
    }
  }, [cleanupDocListener]);

  useEffect(() => {
    setIsLoading(true);

    const cachedUserString = localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY);
    if (cachedUserString) {
      try {
        const cachedUser = JSON.parse(cachedUserString) as User;
        setCurrentUser(cachedUser);
      } catch {
        localStorage.removeItem(AUTH_USER_LOCALSTORAGE_KEY);
      }
    }

    if (!auth || !db) {
      setIsLoading(false);
      return;
    }

    // Set persistence once on mount (moved here from firebaseClient to avoid Fast Refresh full reloads)
    setPersistence(auth, browserLocalPersistence).catch((err) => {
      console.error("[Auth] Failed to set persistence:", err);
    });

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      cleanupDocListener();

      if (firebaseUser) {
        // Stamp today's date for the midnight timer
        if (typeof window !== 'undefined') {
          localStorage.setItem("ranoro_login_date", new Date().toDateString());
        }

        try {
          // Verify by UID first; fallback to email for legacy accounts
          let targetDocRef = doc(db, 'users', firebaseUser.uid);
          const uidDocSnap = await getDoc(targetDocRef);

          if (!uidDocSnap.exists() && firebaseUser.email) {
            const emailQuery = query(collection(db, 'users'), where('email', '==', firebaseUser.email));
            const snap = await getDocs(emailQuery);
            if (!snap.empty) {
              targetDocRef = doc(db, 'users', snap.docs[0].id);
            }
          }

          unsubscribeDocRef.current = onSnapshot(targetDocRef, (userDoc) => {
            if (userDoc.exists()) {
              const userData = { id: userDoc.id, ...userDoc.data() } as User;
              if (userData.isArchived) {
                handleLogout().then(() => {
                  if (typeof window !== "undefined") {
                    window.location.href = '/acceso-denegado';
                  }
                });
                return;
              }
              setCurrentUser(userData);
              localStorage.setItem(AUTH_USER_LOCALSTORAGE_KEY, JSON.stringify(userData));
              setIsLoading(false);
            } else {
              // User authenticated but not in DB — expel
              const expel = async () => {
                cleanupDocListener();
                setCurrentUser(null);
                localStorage.removeItem(AUTH_USER_LOCALSTORAGE_KEY);
                if (auth?.currentUser) {
                  try {
                    await deleteUser(auth.currentUser);
                  } catch {
                    await signOut(auth);
                  }
                }
                if (typeof window !== "undefined") {
                  window.location.href = '/acceso-denegado';
                }
              };
              expel();
            }
          }, (error) => {
            console.error("[Auth] Firestore listener error:", error);
            setIsLoading(false);
          });

        } catch (err) {
          console.error("[Auth] Verification failed:", err);
          setIsLoading(false);
        }

      } else {
        setCurrentUser(null);
        if (typeof window !== 'undefined') {
          localStorage.removeItem(AUTH_USER_LOCALSTORAGE_KEY);
          localStorage.removeItem("ranoro_login_date");
        }
        setIsLoading(false);
      }
    }, (error) => {
      console.error("[Auth] State change error:", error);
      setIsLoading(false);
    });

    return () => {
      unsubscribeAuth();
      cleanupDocListener();
    };
  }, [cleanupDocListener, handleLogout]);

  // Auto-logout at midnight
  useEffect(() => {
    if (!currentUser) return;
    const now = new Date();
    const midnight = new Date(now);
    midnight.setDate(midnight.getDate() + 1);
    midnight.setHours(0, 0, 0, 0);
    const timer = setTimeout(() => handleLogout(), midnight.getTime() - now.getTime());
    return () => clearTimeout(timer);
  }, [currentUser, handleLogout]);

  return { currentUser, isLoading, handleLogout };
}
