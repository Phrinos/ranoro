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
        // --- Midnight Expiration Check ---
        if (typeof window !== 'undefined') {
          const savedLoginDate = localStorage.getItem("ranoro_login_date");
          const todayStr = new Date().toDateString();
          
          if (savedLoginDate && savedLoginDate !== todayStr) {
            console.warn("[AUTH-AUDIT] Session expired (past midnight). Forcing sign out.");
            localStorage.removeItem("ranoro_login_date");
            localStorage.removeItem(AUTH_USER_LOCALSTORAGE_KEY);
            setCurrentUser(null);
            setIsLoading(false);
            if (auth) await signOut(auth);
            return;
          }
          // Stamp the login date on every fresh session (or if missing)
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

  return { currentUser, isLoading, handleLogout };
}
