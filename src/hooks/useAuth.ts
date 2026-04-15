"use client";

import { useEffect, useState, useCallback, useRef } from 'react';
import { onAuthStateChanged, signOut, type User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot, collection, query, where, getDocs } from 'firebase/firestore';
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
        console.log("[AUTH-AUDIT] Firebase User detected UID:", firebaseUser.uid, "Email:", firebaseUser.email);
        
        try {
            // SECURITY AUDIT FIX: We must locate the user doc in Firestore to prevent unauthorized access.
            let targetDocRef = doc(db, 'users', firebaseUser.uid); // Default to checking the UID itself.
            
            // Si el login fue hecho y no coincide el UID, busquemos el correo.
            if (firebaseUser.email) {
                const emailQuery = query(collection(db, 'users'), where('email', '==', firebaseUser.email));
                const snap = await getDocs(emailQuery);
                if (!snap.empty) {
                    console.log("[AUTH-AUDIT] Matched user by email:", snap.docs[0].id);
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
                    handleLogout().then(() => {
                        if (typeof window !== "undefined") {
                            window.location.href = '/acceso-denegado';
                        }
                    });
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
  }, [cleanupDocListener, handleLogout]);

  return { currentUser, isLoading, handleLogout };
}
