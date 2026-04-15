'use server';

import { getAdminAuth } from '@/lib/firebaseAdmin';

export async function syncFirebaseAuthUser(user: { id?: string, email: string, name: string, password?: string }) {
  const auth = getAdminAuth();
  
  if (user.id) {
    // ── EDITING an existing user ──
    try {
      const existingUser = await auth.getUserByEmail(user.email);
      const updateData: any = { displayName: user.name };
      
      // Only update password if a new one is provided
      if (user.password && user.password.trim().length > 0) {
        updateData.password = user.password;
      }
      
      await auth.updateUser(existingUser.uid, updateData);
      return existingUser.uid;
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        // Doesn't exist yet — create it using the existing Firestore ID as the UID
        const authUser = await auth.createUser({
          uid: user.id,
          email: user.email,
          password: user.password || 'ranoro2025',
          displayName: user.name,
        });
        return authUser.uid;
      }
      throw error;
    }
  } else {
    // ── CREATING a new user ──
    if (!user.password || user.password.trim() === '') {
      throw new Error('La contraseña es requerida para nuevos usuarios.');
    }

    // Check if the email already exists in Auth (e.g., from Google sign-in)
    try {
      const existingUser = await auth.getUserByEmail(user.email);
      // User already exists (Google account, etc.) — just update the display name
      // DO NOT reset their provider or password; just return their UID so Firestore doc is linked
      await auth.updateUser(existingUser.uid, { displayName: user.name });
      return existingUser.uid;
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        // Truly new — create with email/password
        try {
          const authUser = await auth.createUser({
            email: user.email,
            password: user.password,
            displayName: user.name,
          });
          return authUser.uid;
        } catch (createError: any) {
          if (createError.code === 'auth/email-already-exists') {
            // Race condition — just look them up
            const existing = await auth.getUserByEmail(user.email);
            return existing.uid;
          }
          throw createError;
        }
      }
      throw error;
    }
  }
}
