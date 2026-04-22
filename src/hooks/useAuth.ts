"use client";

import { useEffect, useState, useCallback, useRef } from 'react';
import { onAuthStateChanged, signOut, deleteUser, type User as FirebaseUser } from 'firebase/auth';
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
    console.log("[AUTH-AUDIT] User logging out...");
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
    // Iniciamos en loading inmediatamente
    setIsLoading(true);

    const cachedUserString = localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY);
    if (cachedUserString) {
      try {
        const cachedUser = JSON.parse(cachedUserString) as User;
        setCurrentUser(cachedUser);
      } catch (e) {
        localStorage.removeItem(AUTH_USER_LOCALSTORAGE_KEY);
      }
    }
    
    if (!auth || !db) {
        console.warn("[AUTH-AUDIT] Auth or DB instance is null. Skipping listener.");
        setIsLoading(false);
        return;
    }

    console.log("[AUTH-AUDIT] Attaching auth state listener...");
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      cleanupDocListener();

      if (firebaseUser) {
        // --- Midnight Session Stamp ---
        // We always allow the auth state through. We just stamp/re-stamp the login date.
        // The actual daily logout is handled by a separate timer effect below.
        if (typeof window !== 'undefined') {
          const todayStr = new Date().toDateString();
          localStorage.setItem("ranoro_login_date", todayStr);
        }
        // ---------------------------------

        console.log("[AUTH-AUDIT] Firebase User detected UID:", firebaseUser.uid, "Email:", firebaseUser.email);
        
        try {
            // SECURITY AUDIT FIX: Verify exact UID match first
            let targetDocRef = doc(db, 'users', firebaseUser.uid);
            const uidDocSnap = await getDoc(targetDocRef);
            
            // Only fallback to email matching if UID document doesn't exist (legacy migration)
            if (!uidDocSnap.exists() && firebaseUser.email) {
                const emailQuery = query(collection(db, 'users'), where('email', '==', firebaseUser.email));
                const snap = await getDocs(emailQuery);
                if (!snap.empty) {
                    console.log("[AUTH-AUDIT] Matched user by email fallback:", snap.docs[0].id);
                    targetDocRef = doc(db, 'users', snap.docs[0].id);
                }
            }

            // Atamos el listener al documento resuelto
            unsubscribeDocRef.current = onSnapshot(targetDocRef, (userDoc) => {
                if (userDoc.exists()) {
                    const userData = { id: userDoc.id, ...userDoc.data() } as User;
                    if (userData.isArchived) {
                        console.warn("[AUTH-AUDIT] Archived User tried to access.");
                        handleLogout().then(() => {
                            if (typeof window !== "undefined") {
                                window.location.href = '/acceso-denegado';
                            }
                        });
                        return;
                    }
                    
                    setCurrentUser(userData);
                    localStorage.setItem(AUTH_USER_LOCALSTORAGE_KEY, JSON.stringify(userData));
                    console.log("[AUTH-AUDIT] Profile loaded from Firestore and synced securely.");
                    setIsLoading(false);
                } else {
                    console.warn("[SECURITY REJECT] User is NOT registered in DB. Booting out.");
                    
                    const expel = async () => {
                       cleanupDocListener();
                       setCurrentUser(null);
                       localStorage.removeItem(AUTH_USER_LOCALSTORAGE_KEY);
                       if (auth?.currentUser) {
                           try {
                               await deleteUser(auth.currentUser);
                               console.log("[AUTH-AUDIT] Ghost account deleted from Firebase Auth.");
                           } catch (e) {
                               console.warn("Could not delete auth user, signing out instead", e);
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
               console.error("[AUTH-AUDIT] Firestore listener error:", error);
               setIsLoading(false);
            });

        } catch (err) {
            console.error("[AUTH-AUDIT] Verification checks failed:", err);
            setIsLoading(false);
        }

      } else {
        console.log("[AUTH-AUDIT] No active Firebase user. Clearing state.");
        setCurrentUser(null);
        if (typeof window !== 'undefined') {
          localStorage.removeItem(AUTH_USER_LOCALSTORAGE_KEY);
          localStorage.removeItem("ranoro_login_date");
        }
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
  }, [cleanupDocListener, handleLogout]);

  // --- Midnight auto-logout timer ---
  // Schedules a sign-out at exactly 00:00:00 of the next day.
  // Keeps the session alive all day; only logs out at midnight.
  useEffect(() => {
    if (!currentUser) return;

    const now = new Date();
    const midnight = new Date(now);
    midnight.setDate(midnight.getDate() + 1);
    midnight.setHours(0, 0, 0, 0);
    const msUntilMidnight = midnight.getTime() - now.getTime();

    console.log(`[AUTH-AUDIT] Midnight logout scheduled in ${Math.round(msUntilMidnight / 60000)} minutes.`);
    const timer = setTimeout(() => {
      console.warn("[AUTH-AUDIT] Midnight reached. Logging out.");
      handleLogout();
    }, msUntilMidnight);

    return () => clearTimeout(timer);
  }, [currentUser, handleLogout]);

  return { currentUser, isLoading, handleLogout };
}
